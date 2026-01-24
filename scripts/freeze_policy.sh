#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=$(node -p "require('./package.json').version")

POLICY_DIR="$ROOT_DIR/policies/v$VERSION"
mkdir -p "$POLICY_DIR"

cp "$ROOT_DIR/artifacts/artifact-index.json" "$POLICY_DIR/"
cp "$ROOT_DIR/rules/disqualification.rules.json" "$POLICY_DIR/"

sha256sum \
  "$POLICY_DIR/artifact-index.json" \
  "$POLICY_DIR/disqualification.rules.json" \
  | sha256sum | awk '{print $1}' > "$POLICY_DIR/policy.sha256"

cd "$ROOT_DIR"
npm run build
