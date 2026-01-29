#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Build once (owned by npm test).
# This audit assumes dist/ exists and is importable under Node ESM.

node - <<'NODE'
async function main() {
  const targets = [
    "./dist/index.js",
    "./dist/executor.js",
  ];
  for (const t of targets) {
    try {
      await import(t);
    } catch (e) {
      console.error("FAIL: dist import failed:", t);
      console.error(String((e && e.stack) || e));
      process.exit(1);
    }
  }
  console.log("OK: CIAG dist entrypoints importable:", targets);
}
main();
NODE
