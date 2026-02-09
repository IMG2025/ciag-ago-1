#!/usr/bin/env node
/**
 * Enforce fail-closed semantics for operator selection.
 * Abort if queue.jsonl is empty or unparsable.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const ROOT = process.cwd();
const FILE = path.join(ROOT,"scripts","select_first_operator_from_queue_v1.mjs");
if(!fs.existsSync(FILE)) throw new Error("Missing selector script");

let src = read(FILE);

if(!src.includes("if (!rows.length)")) {
  src = src.replace(
    /rows\.sort\([\s\S]*?\);/,
    match => `${match}
if (!rows.length) {
  throw new Error("Operator selection failed: empty Tier-1 queue");
}`
  );
  write(FILE, src);
}

run("npm run build");
