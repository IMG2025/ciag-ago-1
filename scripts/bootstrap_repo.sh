#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR"/{src,products,schemas,artifacts,prompts/T1,prompts/T2,prompts/T3,rules,scripts,output}

# ---------------------------
# package.json
# ---------------------------
cat > "$ROOT_DIR/package.json" <<'JSON'
{
  "name": "ciag-ago-1",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
JSON

# ---------------------------
# tsconfig.json
# ---------------------------
cat > "$ROOT_DIR/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts", "prompts/**/*.ts"],
  "exclude": ["node_modules", "dist", "output"]
}
JSON

# ---------------------------
# minimal src entry
# ---------------------------
cat > "$ROOT_DIR/src/index.ts" <<'TS'
export function healthcheck(): string {
  return 'ciag-ago-1:ok';
}

if (process.argv.includes('--healthcheck')) {
  console.log(healthcheck());
}
TS

# ---------------------------
# products
# ---------------------------
cat > "$ROOT_DIR/products/ciag-products.json" <<'JSON'
{
  "tiers": [
    { "id": "T1", "name": "Governance Diagnostic" },
    { "id": "T2", "name": "Operating Blueprint" },
    { "id": "T3", "name": "Pilot / POC Advisory" }
  ]
}
JSON

# ---------------------------
# build
# ---------------------------
cd "$ROOT_DIR"
npm install
npm run build
