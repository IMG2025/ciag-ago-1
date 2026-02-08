#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = exists(p) ? read(p) : "";
  if(prev !== next) fs.writeFileSync(p,next);
}

const ROOT = process.cwd();
const FILE = path.join(ROOT,"docs","Commercial-Terms.md");

const CONTENT = `# CIAG Commercial Terms (Authoritative)

## Pricing (Non-Negotiable)
| Operator Size | Fee |
|--------------|-----|
| 15–40 sites  | $85,000 |
| 41–100 sites | $105,000 |
| 101–150 sites| $125,000 |

## Included Deliverables
- Tier-1 Target Intake (AGO Engine)
- Governance Triage Packet
- Risk Register
- Recommendation Memo
- Executive Narrative

## Explicit Exclusions
- Custom scoring logic
- Model retraining
- Vendor-specific remediation work
- Ongoing monitoring (sold separately)

## Definition of Done
Delivery of all artifacts listed above, generated from the authoritative AGO Tier-1 Engine.

## Change Control
Any request outside scope requires:
- Written change request
- New commercial agreement
`;

writeIfChanged(FILE, CONTENT + "\n");
run("npm run build");
