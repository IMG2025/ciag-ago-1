#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
import fs from "fs";

function readJSON(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJSON(p,obj){ fs.writeFileSync(p, JSON.stringify(obj,null,2) + "\n"); }

const tsPath = "tsconfig.json";
const pkgPath = "package.json";

const ts = readJSON(tsPath);
ts.compilerOptions ||= {};

// FORCE (overwrite) correct emit shape
ts.compilerOptions.noEmit = false;
ts.compilerOptions.declaration = true;
ts.compilerOptions.declarationMap = true;
ts.compilerOptions.emitDeclarationOnly = false;
ts.compilerOptions.outDir = "dist";
ts.compilerOptions.rootDir = "src";

// Ensure include points at src so rootDir actually applies
ts.include = ["src"];
ts.exclude = Array.from(new Set([...(ts.exclude || []), "dist", "node_modules"]));

writeJSON(tsPath, ts);

const pkg = readJSON(pkgPath);

// FORCE entrypoints to the expected dist root
pkg.main = "dist/index.js";
pkg.types = "dist/index.d.ts";

pkg.exports ||= {};
pkg.exports["."] ||= {};
pkg.exports["."].import = "./dist/index.js";
pkg.exports["."].types = "./dist/index.d.ts";

writeJSON(pkgPath, pkg);

console.log("CIAG: forced rootDir=src, outDir=dist, and package entrypoints to dist/index.*");
NODE

rm -rf dist
npm run build
