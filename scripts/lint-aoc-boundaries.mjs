import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const forbiddenMatchers = [
  /from\s+["']@\/lib\/security\/governance-runtime["']/g,
  /from\s+["']src\/lib\/security\/governance-runtime["']/g,
  /from\s+["'][^"']*security\/governance-runtime["']/g,
];
const allowlist = new Set(["src/lib/security/governance-runtime.ts", "src/aoc/enterprise/runtime/index.ts"]);

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
};
walk(srcRoot);

const violations = [];
for (const full of files) {
  const rel = path.relative(root, full).replaceAll(path.sep, "/");
  if (allowlist.has(rel)) continue;
  const lines = fs.readFileSync(full, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("governance-runtime")) continue;
    if (forbiddenMatchers.some((re) => re.test(line))) violations.push({ file: rel, line: i + 1, text: line.trim() });
  }
}

if (violations.length) {
  console.error("AOC boundary violations detected: direct legacy governance runtime imports are forbidden outside approved internal locations.\n");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line}`);
    console.error(`  ${v.text}`);
  }
  process.exit(1);
}
console.log("AOC boundary lint passed: no forbidden product/API/SDK imports of legacy governance runtime.");
