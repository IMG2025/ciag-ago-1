#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node - <<'NODE'
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['ago'] = 'node dist/src/index.js';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
NODE

cd "$ROOT_DIR"
npm run build
