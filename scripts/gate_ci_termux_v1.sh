#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "OK: CIAG Termux gate: start"

# Sanity
git status --porcelain=v1 >/dev/null

# Tests + build
npm test
npm run build

# Enforce clean tree after gates (prevents silent drift)
if [[ -n "$(git status --porcelain=v1)" ]]; then
  echo "FAIL: working tree dirty after gates";
  git status --porcelain=v1 || true
  exit 1
fi

echo "OK: CIAG Termux gate: green + clean tree"
