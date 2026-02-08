# CIAG Governance Triage Recommendation
**Operator:** Cole Hospitality (cole-hospitality)
**Locations:** 70
**Confidence Score:** 10
**Priority:** Immediate
**Outreach Status:** simulation-pin
**Generated At:** 2026-02-08T23:32:53.053Z
## Executive Summary
We ran a governance-first triage for **Cole Hospitality** to determine pilot readiness and the minimum viable control set.
- **Total risks:** 8
- **Mitigated:** 1
- **Open:** 7
- **Blocking candidates:** 2
## Systems cleared by evidence
- PMS
## Outstanding risk areas (open)
### HRIS

**R-SYS-HRIS** — HRIS governance coverage unknown — sev=Medium — lik=Medium — status=Open — evidence=[]

### Other

**R-SYS-OTHER** — Other governance coverage unknown — sev=Medium — lik=Medium — status=Open — evidence=[]

### Payments

**R-SYS-PAYMENTS** — Payments governance coverage unknown — sev=High — lik=Medium — status=Open — evidence=[]

### POS

**R-SYS-POS** — POS governance coverage unknown — sev=Medium — lik=Medium — status=Open — evidence=[]

### Scheduling

**R-SYS-SCHEDULING** — Scheduling governance coverage unknown — sev=Medium — lik=Medium — status=Open — evidence=[]

### Unknown

**R-001** — Unknown AI usage scope — sev=High — lik=Medium — status=Open — evidence=[]
  - Notes: Inventory AI-enabled tools and workflows

### WFM

**R-SYS-WFM** — WFM governance coverage unknown — sev=Medium — lik=Medium — status=Open — evidence=[]

## Immediate next actions (30–60 days)
- **HRIS**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (2):
    - 039a4ce70add51425c78378ba7d1fbb32b6fbf47: PII categories processed not yet enumerated
    - 9449cf6ba42e59ef1309a8a194ab30990f0d20e3: HRIS vendor/product not yet evidenced

- **Other**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (1):
    - bbfe83a45773950f79bb1586b35bde728cb7ed47: AI-enabled vendor features not yet enumerated

- **Payments**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (2):
    - 428407cb031c83cd8c1caf956bad9a91da91effd: Payment processor not yet evidenced
    - 80c56547c4a6031deb3a79217e31bc219cc1ab79: PCI scope/adjacency not yet mapped

- **POS**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (1):
    - 39294f3795d8a947842528bc0ccb5112d535d84f: POS vendor/product not yet evidenced

- **Scheduling**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (1):
    - 8633cb443b97b4305756faf6ec55a4aa9cacef3f: Scheduling tool not yet evidenced

- **Unknown**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence: no open gaps recorded for this system type.

- **WFM**: confirm vendor/product, AI-enabled features, and governance surface.
  - Evidence gaps (1):
    - cf7eea5bc0d78b0258b8fb5a1f5fe3976000695c: Workforce/WFM vendor not yet evidenced
## Pilot readiness verdict
**Pilot-Safe with Conditions** — proceed only after closing blocking risks and confirming remaining system evidence gaps.
### Blocking risks (must address)

- **R-001** — Unknown AI usage scope — sev=High — lik=Medium — status=Open — evidence=[]
    - Notes: Inventory AI-enabled tools and workflows
- **R-SYS-PAYMENTS** — Payments governance coverage unknown — sev=High — lik=Medium — status=Open — evidence=[]

