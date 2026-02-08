#!/usr/bin/env node
/**
 * CIAG consumer: pull Tier-1 targets from ago-tier1-engine export contract v1
 * - Downloads exports/tier1/* from GitHub raw URLs
 * - Writes to data/tier1/ (read-only inputs)
 * - Adds local provenance mirror
 * - Idempotent writes
 * - Ends with: npm run build
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ciag-ago-1" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    }).on("error", reject);
  });
}

const OWNER = "IMG2025";
const REPO = "ago-tier1-engine";
const BRANCH = "main";
const BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/exports/tier1`;

const ROOT = process.cwd();
process.chdir(ROOT);

const DEST = path.join(ROOT, "data", "tier1");
ensureDir(DEST);

const files = ["tier1.csv", "evidence.manifest.json", "meta.json"];

for (const f of files) {
  const url = `${BASE}/${f}`;
  const body = await fetch(url);
  writeIfChanged(path.join(DEST, f), body.endsWith("\n") ? body : body + "\n");
}

const mirror = {
  pulled_at: new Date().toISOString(),
  source: { owner: OWNER, repo: REPO, branch: BRANCH, base_url: BASE },
  files,
};
writeIfChanged(path.join(DEST, "pull.meta.json"), JSON.stringify(mirror, null, 2) + "\n");

// required gate
run("npm run build");
