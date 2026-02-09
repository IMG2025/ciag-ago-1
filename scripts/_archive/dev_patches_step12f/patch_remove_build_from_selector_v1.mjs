#!/usr/bin/env node
/**
 * Remove npm run build from selector.
 * Build must be a gate, not a side effect.
 * Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const FILE = path.join(
  process.cwd(),
  "scripts",
  "select_first_operator_from_queue_v1.mjs"
);

let src = read(FILE);

// Remove any run("npm run build") lines
src = src.replace(/.*npm run build.*\n/g, "");

write(FILE, src);

// Gate explicitly
execSync("npm run build", { stdio: "inherit" });
