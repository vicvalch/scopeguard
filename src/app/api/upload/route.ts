import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanySubscription } from "@/lib/billing";
import { canUploadDocuments, getCompanyUsage, getUploadLimitForPlan, incrementUploadUsage } from "@/lib/usage-limits";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { appendOperationalMemory, extractOperationalMemoryCandidates } from "@/lib/operational-memory-v1";
import { enforceRuntimeAuthorization } from "@/lib/aoc/enterprise/runtime";

type ExtractedFile = {
  fileName: string;
  contentType: string;
  size: number;
  extractedText: string;
  savedTo: string;
};

type UploadSuccessResponse = {
  ok: true;
  projectId: string;
  projectName: string;
  uploadedCount: number;
  uploadedFileNames: string[];
  ingestion: {
    startedAt: string;
    completedAt: string;
    status: "completed";
    extractedSignals: {
      risks: number;
      stakeholders: number;
    };
  };
  files: ExtractedFile[];
};

type UploadErrorResponse = {
  ok: false;
  error: string;
  code:
    | "UNAUTHORIZED"
    | "MALFORMED_MULTIPART"
    | "INVALID_PROJECT"
    | "MISSING_PROJECT"
    | "MISSING_FILES"
    | "INVALID_FILE_FIELD"
    | "INVALID_FILE_TYPE"
    | "FILE_TOO_LARGE"
    | "UPLOAD_LIMIT_REACHED"
    | "INGESTION_FAILED";
};

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const sanitizeFileName = (input: string) => input.replace(/[^a-zA-Z0-9._-]/g, "_");
const riskTerms = /\b(risk|blocker|delay|dependency|escalation)\b/gi;
const stakeholderTerms = /\b(stakeholder|owner|sponsor|team|vendor|client)\b/gi;

const errorResponse = (status: number, error: UploadErrorResponse["error"], code: UploadErrorResponse["code"]) =>
  Response.json({ ok: false, error, code } satisfies UploadErrorResponse, { status });

const extractTextFromFile = async (file: File, buffer: Buffer) => {
  if (file.type === "text/plain") {
    return buffer.toString("utf-8").slice(0, 12000);
  }

  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, 12000);
  }

  if (file.type === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text.slice(0, 12000);
  }

  return "";
};

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return errorResponse(401, "Unauthorized", "UNAUTHORIZED");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "Malformed multipart/form-data payload.", "MALFORMED_MULTIPART");
  }

  const subscription = await getCompanySubscription(user.companyId);
  const usage = await getCompanyUsage(user.companyId);

  const projectId = (formData.get("projectId") ?? "").toString().trim();
  const incomingFiles = formData.getAll("documents");

  if (!projectId) {
    return errorResponse(400, "projectId is required.", "MISSING_PROJECT");
  }


  const supabase = await createSupabaseServerClient();
  const governance = await enforceRuntimeAuthorization({
    actorType: "user",
    actorUserId: user.id,
    projectId,
    action: "document.upload",
    routeId: "/api/upload",
    resourceType: "document",
  });
  if (governance.response) {
    console.warn("[security] upload_project_access_denied", governance.decision);
    return errorResponse(403, "Invalid project context.", "INVALID_PROJECT");
  }

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();

  if (!project) {
    return errorResponse(403, "Invalid project context.", "INVALID_PROJECT");
  }

  if (incomingFiles.length === 0) {
    return errorResponse(400, "At least one file is required in `documents` field.", "MISSING_FILES");
  }

  const files = incomingFiles.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return errorResponse(400, "No valid files found in `documents` field.", "INVALID_FILE_FIELD");
  }

  if (!canUploadDocuments(subscription.plan, usage.uploadCount, files.length)) {
    const limit = getUploadLimitForPlan(subscription.plan);
    return errorResponse(
      403,
      limit === null ? "Upload limit reached." : `Free plan limit reached (${limit} uploads/month). Upgrade to Pro for unlimited uploads.`,
      "UPLOAD_LIMIT_REACHED",
    );
  }

  const resolvedProjectName = project.name.trim();
  const projectSlug = sanitizeFileName(resolvedProjectName.toLowerCase().replace(/\s+/g, "-"));
  const uploadDir = path.join(process.cwd(), "uploads", projectSlug);
  await mkdir(uploadDir, { recursive: true });

  const processedFiles: ExtractedFile[] = [];
  const ingestionStartedAt = new Date().toISOString();
  console.info("[upload] upload_started", { userId: user.id, companyId: user.companyId, projectId, fileCount: files.length, fileNames: files.map((f) => f.name) });

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      console.warn("[upload] upload_failed", { reason: "invalid_file_type", projectId, fileName: file.name, fileType: file.type });
      return errorResponse(400, `Unsupported file type: ${file.name}`, "INVALID_FILE_TYPE");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.warn("[upload] upload_failed", { reason: "file_too_large", projectId, fileName: file.name, fileSize: file.size });
      return errorResponse(400, `File too large: ${file.name}`, "FILE_TOO_LARGE");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeFileName(file.name);
    const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`);

    await writeFile(filePath, buffer);

    let extractedText = "";
    try {
      extractedText = await extractTextFromFile(file, buffer);
    } catch (error) {
      console.error("[upload] ingestion_failed", { projectId, fileName: file.name, error: error instanceof Error ? error.message : "unknown" });
      return errorResponse(500, `Ingestion failed for ${file.name}.`, "INGESTION_FAILED");
    }

    processedFiles.push({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      extractedText,
      savedTo: filePath,
    });
  }

  await incrementUploadUsage(user.companyId, files.length);
  const allExtractedText = processedFiles.map((file) => file.extractedText).join("\n");
  const riskCount = (allExtractedText.match(riskTerms) ?? []).length;
  const stakeholderCount = (allExtractedText.match(stakeholderTerms) ?? []).length;
  const ingestionCompletedAt = new Date().toISOString();

  const uploadSource = processedFiles.map((file) => file.fileName).join(", ") || "upload";
  const extracted = extractOperationalMemoryCandidates({
    text: allExtractedText,
    sourceType: "upload",
    sourceReference: `upload:${uploadSource}`,
  });
  await appendOperationalMemory({
    companyId: user.companyId,
    projectId: project.id,
    entries: extracted,
  });
  console.info("[upload] ingestion_completed", {
    userId: user.id,
    companyId: user.companyId,
    projectId,
    uploadedCount: processedFiles.length,
    uploadedFileNames: processedFiles.map((file) => file.fileName),
    extractedSignals: { risks: riskCount, stakeholders: stakeholderCount },
  });

  return Response.json({
    ok: true,
    projectId: project.id,
    projectName: resolvedProjectName,
    uploadedCount: processedFiles.length,
    uploadedFileNames: processedFiles.map((file) => file.fileName),
    ingestion: {
      startedAt: ingestionStartedAt,
      completedAt: ingestionCompletedAt,
      status: "completed",
      extractedSignals: { risks: riskCount, stakeholders: stakeholderCount },
    },
    files: processedFiles,
  } satisfies UploadSuccessResponse);
}
