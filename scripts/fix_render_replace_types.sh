#!/usr/bin/env bash
set -euo pipefail

FILE="src/render/renderTemplate.ts"

sed -i \
  's/out = out.replace(pattern, value);/out = out.replace(pattern as string | RegExp, value as string);/' \
  "$FILE"

npm run build
