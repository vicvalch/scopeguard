import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";

const sanitizeFileName = (input: string) => input.replace(/[^a-zA-Z0-9._-]/g, "_");

export interface StorageProvider {
  upload(params: {
    fileId: string;
    projectId: string;
    companyId: string;
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<{ storageRef: string }>;

  delete(storageRef: string): Promise<void>;
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "pmfreak-documents";

class SupabaseStorageProvider implements StorageProvider {
  async upload(params: {
    fileId: string;
    projectId: string;
    companyId: string;
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<{ storageRef: string }> {
    // PRIVILEGED_ACCESS: storage operations require service role (no user RLS on storage)
    // AUDIT_REF: service-role-risk-register.md
    const supabase = createPrivilegedSupabaseClient({
      routeId: "/api/upload",
      operation: "storage.upload",
      reason: "Server-side document ingestion; user context verified at route layer",
      actorUserId: null,
      systemActor: "background_job",
    });

    if (process.env.UPLOAD_VERIFY_BUCKET === "true") {
      const { data: bucket, error: bucketErr } = await supabase.storage.getBucket(BUCKET);
      if (bucketErr || !bucket) {
        throw new Error(`Storage bucket "${BUCKET}" is not accessible: ${bucketErr?.message ?? "not found"}`);
      }
    }

    const safeName = sanitizeFileName(params.originalName);
    // Path: companyId/projectId/fileId-safeName — UUID prevents enumeration; scoped for tenant isolation
    const storagePath = `${params.companyId}/${params.projectId}/${params.fileId}-${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, params.buffer, {
        contentType: params.mimeType,
        cacheControl: "no-store",
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed for path "${storagePath}": ${error.message}`);
    }

    return { storageRef: storagePath };
  }

  async delete(storageRef: string): Promise<void> {
    // PRIVILEGED_ACCESS: storage operations require service role (no user RLS on storage)
    // AUDIT_REF: service-role-risk-register.md
    const supabase = createPrivilegedSupabaseClient({
      routeId: "/api/upload",
      operation: "storage.delete",
      reason: "Rollback of failed upload batch; cleaning orphaned objects",
      actorUserId: null,
      systemActor: "background_job",
    });

    // Supabase remove() is idempotent — it does not error when the object is already absent
    const { error } = await supabase.storage.from(BUCKET).remove([storageRef]);
    if (error) {
      throw new Error(`Storage delete failed for path "${storageRef}": ${error.message}`);
    }
  }
}

const memoryStore = new Map<string, Buffer>();

class MemoryStorageProvider implements StorageProvider {
  async upload(params: {
    fileId: string;
    projectId: string;
    companyId: string;
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<{ storageRef: string }> {
    memoryStore.set(params.fileId, params.buffer);
    return { storageRef: params.fileId };
  }

  async delete(storageRef: string): Promise<void> {
    memoryStore.delete(storageRef);
  }
}

export const clearMemoryStore = () => memoryStore.clear();

export const getUploadProvider = (): StorageProvider => {
  const provider = process.env.STORAGE_PROVIDER;

  if (provider === "local") {
    throw new Error(
      "local filesystem storage is not supported in production. Set STORAGE_PROVIDER=supabase",
    );
  }

  if (provider === "memory") {
    return new MemoryStorageProvider();
  }

  return new SupabaseStorageProvider();
};
