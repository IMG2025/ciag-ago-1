#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Artifact index
sed -i \
  's|readFileSync(.*artifact-index.json.*)|loadPolicyFile("artifact-index.json")|g' \
  "$ROOT_DIR/src/pipeline/runPipeline.ts"

# Disqualification rules
sed -i \
  's|readFileSync(.*disqualification.rules.json.*)|loadPolicyFile("disqualification.rules.json")|g' \
  "$ROOT_DIR/src/intake/disqualification.rules.ts"

cd "$ROOT_DIR"
npm run build
