#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function exists(p){ return fs.existsSync(p); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeIfChanged(p, next){
  const prev = exists(p) ? fs.readFileSync(p,"utf8") : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function mkdirp(p){ fs.mkdirSync(p, { recursive:true }); }

const ROOT = process.cwd();
const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing .ago/operator_selected.json");

const op = readJson(SEL);
const slug = op.operator_slug || op.slug;
if (!slug) throw new Error("operator_slug missing");

const TRIAGE = path.join(ROOT, "docs", "triage", `TRG-${slug}`);
mkdirp(TRIAGE);

const now = new Date().toISOString();

const jsonPath = path.join(TRIAGE, "pilot-intake.json");
const mdPath   = path.join(TRIAGE, "pilot-intake.md");

const payload = {
  meta: {
    generatedAt: now,
    operator: {
      name: op.operator_name,
      slug,
      locations: op.locations,
      priority: op.priority,
      outreach_status: op.outreach_status
    }
  },
  objective: "Close R-001 (AI usage inventory) and evidence all open system types.",
  sections: [
    {
      id: "R-001",
      title: "AI Usage Inventory (BLOCKER)",
      prompts: [
        "List all AI-enabled tools and embedded AI features",
        "Identify shadow AI usage",
        "Map data classes processed (PII / PCI adjacency / workforce)",
        "Assign system owners and evidence sources"
      ]
    },
    {
      id: "systems",
      title: "System Evidence",
      systems: ["POS","HRIS","WFM","Scheduling","Other"]
    },
    {
      id: "payments",
      title: "Payments Confirmation (Toast)",
      prompts: [
        "Confirm Toast modules in use",
        "Confirm PCI scope assumptions"
      ]
    }
  ]
};

const md = `# CIAG Pilot Intake Pack

**Operator:** ${op.operator_name} (${slug})  
**Locations:** ${op.locations}  
**Priority:** ${op.priority}  
**Generated At:** ${now}

---

## Objective
Close **R-001 (AI usage inventory)** and evidence all open systems.

---

## 1. AI Usage Inventory (BLOCKER)
- AI-enabled tools and features
- Shadow AI usage
- Data classes processed
- Responsible owners

---

## 2. System Evidence
- POS
- HRIS
- WFM
- Scheduling
- Other AI-enabled vendors

---

## 3. Payments (Toast)
- Toast modules in use
- PCI scope / adjacency confirmation
`;

writeIfChanged(jsonPath, JSON.stringify(payload, null, 2) + "\n");
writeIfChanged(mdPath, md + "\n");

console.log("Pilot intake pack generated:");
console.log(jsonPath);
console.log(mdPath);
