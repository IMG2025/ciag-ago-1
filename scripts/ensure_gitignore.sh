#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITIGNORE="$ROOT_DIR/.gitignore"

touch "$GITIGNORE"

ensure_line() {
  grep -qxF "$1" "$GITIGNORE" || echo "$1" >> "$GITIGNORE"
}

ensure_line "dist/"
ensure_line "output/"
ensure_line "audit/*.jsonl"
ensure_line "*.log"
