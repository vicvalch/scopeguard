import fs from "fs";

try {
  JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log("[ok] package.json valid");
} catch (error) {
  console.error("[fail] package.json invalid");
  console.error(error);
  process.exit(1);
}
