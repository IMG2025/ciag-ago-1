#!/usr/bin/env bash
set -euo pipefail

# Rewrite extensionless relative imports to .js for Node ESM
find src -name "*.ts" -print0 | while IFS= read -r -d '' file; do
  sed -i \
    -E 's|(from\s+["'\'']\./[^"'\'']+)(["'\''])|\1.js\2|g' \
    "$file"
done

npm run build
