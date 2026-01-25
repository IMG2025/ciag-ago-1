#!/usr/bin/env bash
set -euo pipefail

INDEX="src/index.ts"

# Ensure registerCIAG is exported
if ! grep -q "export function registerCIAG" "$INDEX"; then
  sed -i 's/^function registerCIAG/export function registerCIAG/' "$INDEX" || true
fi

# Ensure explicit export block exists
if ! grep -q "export { registerCIAG }" "$INDEX"; then
  echo -e "\nexport { registerCIAG };" >> "$INDEX"
fi

npm run build
