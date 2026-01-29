#!/usr/bin/env bash
set -euo pipefail

# 1) Ensure package.json exports/types/main are set for ESM consumers
node - <<'NODE'
import fs from "fs";

const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));

pkg.name ||= "ciag-ago-1";
pkg.type ||= "module";
pkg.main = "dist/index.js";
pkg.types = "dist/index.d.ts";

pkg.exports ||= {};
pkg.exports["."] = {
  import: "./dist/index.js",
  types: "./dist/index.d.ts"
};
pkg.exports["./executor"] = {
  import: "./dist/executor.js",
  types: "./dist/executor.d.ts"
};

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
console.log("Patched package.json exports for CIAG.");
NODE

# 2) Force ESM-safe explicit .js extensions in compiled-facing TS imports
#    Any internal import that targets a sibling module should use ./x.js in TS
#    so it compiles to valid Node ESM.
node - <<'NODE'
import fs from "fs";

const files = ["src/index.ts", "src/run.ts", "src/executor.ts"].filter(f => fs.existsSync(f));
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");

  // Replace `from "./executor"` or `from './executor'` with `from "./executor.js"`
  s = s.replace(/from\s+["'](\.\/executor)["']/g, 'from "$1.js"');

  // Replace `from "./run"` with `from "./run.js"` (if present anywhere)
  s = s.replace(/from\s+["'](\.\/run)["']/g, 'from "$1.js"');

  fs.writeFileSync(f, s);
}
console.log("Normalized CIAG TS imports to ESM .js extensions where applicable.");
NODE

npm run build
