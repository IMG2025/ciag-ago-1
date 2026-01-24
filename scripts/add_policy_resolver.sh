#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR/src/policy"

cat > "$ROOT_DIR/src/policy/resolvePolicy.ts" <<'TS'
import path from "path";
import fs from "fs";
import pkg from "../../package.json";

export function resolvePolicyVersion(): string {
  return process.env.AGO_POLICY_VERSION ?? pkg.version;
}

export function resolvePolicyPath(...segments: string[]): string {
  const version = resolvePolicyVersion();
  return path.resolve(
    process.cwd(),
    "policies",
    `v${version}`,
    ...segments
  );
}

export function loadPolicyFile<T>(filename: string): T {
  const filePath = resolvePolicyPath(filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
TS

cd "$ROOT_DIR"
npm run build
