#!/usr/bin/env bash
set -euo pipefail

find src -name "*.ts" -print0 | while IFS= read -r -d '' file; do
  sed -i \
    -E 's/(\.js)\.js/\1/g; s/_js\.js/\.js/g' \
    "$file"
done

npm run build
