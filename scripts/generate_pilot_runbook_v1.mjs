#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TRIAGE = path.join(ROOT, "docs", "triage");
const SEL = path.join(ROOT, ".ago", "operator_selected.json");

if (!fs.existsSync(SEL)) throw new Error("Missing .ago/operator_selected.json");
const op = JSON.parse(fs.readFileSync(SEL, "utf8"));
const slug = op.operator_slug;

const DIR = path.join(TRIAGE, `TRG-${slug}`);
const REC = path.join(DIR, "recommendation.md");
const RISK = path.join(DIR, "risk-register.csv");
const OUT = path.join(DIR, "pilot-runbook.md");

if (!fs.existsSync(REC)) throw new Error("Missing recommendation.md");
if (!fs.existsSync(RISK)) throw new Error("Missing risk-register.csv");

const now = new Date().toISOString();

const runbook = `
# CIAG Pilot Runbook

**Operator:** ${op.operator_name} (${slug})  
**Locations:** ${op.locations}  
**Priority:** ${op.priority}  
**Outreach Status:** ${op.outreach_status}  
**Generated At:** ${now}

---

## 1. Pilot Objective

Execute a **governance-observed pilot** to validate AI usage visibility, control readiness, and evidence capture across core hospitality systems.

This pilot is classified as:

> **Pilot-Safe with Conditions**

Proceeding is permitted **only with explicit closure of blocking governance items during the pilot window**.

---

## 2. Pilot Scope

### Included Systems
- PMS (cleared)
- Payments (cleared – Toast)

### Observed / In-Scope
- POS
- HRIS
- WFM
- Scheduling
- Other AI-enabled vendors

---

## 3. Mandatory Day-0 / Day-14 Actions (Non-Negotiable)

### R-001 — AI Usage Inventory (BLOCKER)

**Requirement**
Within the first **14 days**, the operator must complete an AI usage inventory covering:

- AI-enabled vendor features
- Embedded AI in SaaS platforms
- Shadow AI usage (marketing, ops, HR, finance)
- Data classes processed by AI (PII, PCI adjacency, workforce data)

**Evidence Artifacts Required**
- Vendor list + AI features
- Data category mapping
- Responsible owner per system

Failure to complete this action **pauses pilot progression**.

---

## 4. Evidence Capture Rules

- All evidence is captured via CIAG artifacts
- No verbal attestations
- No screenshots without provenance
- All updates are timestamped and attributed

---

## 5. Governance Gates

| Gate | Requirement | Outcome |
|-----|------------|--------|
| Gate 1 | AI inventory complete | Proceed |
| Gate 2 | Evidence linked to risks | Proceed |
| Gate 3 | Policy re-applied | Proceed |
| Gate 4 | Recommendation regenerated | Exit / Expand |

---

## 6. Pilot Exit Criteria

The pilot is considered **successful** when:

- All blocking risks are closed or downgraded
- Remaining open risks have owners and timelines
- A post-pilot governance roadmap is generated

---

## 7. Commercial Boundary

This pilot is:
- Non-production
- Governance-observed
- Non-expansive beyond scoped systems

Any expansion requires **new governance approval**.

---

## 8. Deliverables

- Updated risk register
- Updated recommendation
- Pilot summary memo
- Governance readiness score

---

**End of Runbook**
`;

fs.writeFileSync(OUT, runbook.trim() + "\n", { mode: 0o644 });
console.log("Pilot runbook generated:", OUT);
