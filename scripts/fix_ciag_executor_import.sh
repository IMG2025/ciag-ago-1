#!/usr/bin/env bash
set -euo pipefail

INDEX="src/index.ts"

# Replace any executor.js import with executor (TS-safe)
sed -i 's|from "./executor\.js"|from "./executor"|g' "$INDEX"

npm run build
