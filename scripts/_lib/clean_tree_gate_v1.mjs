import { execSync } from "node:child_process";
export function assertCleanTree(label) {
  const dirty = execSync("git status --porcelain", { encoding: "utf8" });
  if (dirty.trim()) {
    console.error("[FATAL]", label, "repo dirty:");
    console.error(dirty);
    process.exit(1);
  }
}
