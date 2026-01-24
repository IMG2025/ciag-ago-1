#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/artifacts/T1"

mkdir -p "$OUT_DIR"

# -------------------------------
# Governance Gap Map
# -------------------------------
cat > "$OUT_DIR/governance-gap-map.md" <<'MD'
# Governance Gap Map
**Engagement Tier:** T1 – Governance Diagnostic  
**Purpose:** Identify structural, authority, and control gaps that materially impair execution.

## Identified Gaps
| Area | Observed State | Required State | Risk Level |
|-----|---------------|----------------|------------|
| Decision Authority | Undefined / Fragmented | Explicit owner | High |
| Control Layer | Absent | Enforced governance | High |
| Execution Ownership | Informal | Named accountable | Medium |

## Material Impact
- Delayed execution
- Unbounded scope
- Accountability diffusion

## Advisory Note
Resolution of high-risk gaps is mandatory prior to system build or automation.
MD

# -------------------------------
# Readiness Scorecard
# -------------------------------
cat > "$OUT_DIR/readiness-scorecard.md" <<'MD'
# System Readiness Scorecard
**Engagement Tier:** T1 – Governance Diagnostic

## Dimension Scores (0–5)
| Dimension | Score | Notes |
|---------|-------|-------|
| Governance Maturity | 1 | Ad hoc controls |
| Decision Velocity | 2 | Founder-dependent |
| Process Clarity | 1 | Undefined workflows |
| Automation Readiness | 1 | Premature |

## Overall Readiness
**Status:** NOT READY

Proceeding to build at this stage introduces compounding risk.
MD

# -------------------------------
# Risk & Drift Register
# -------------------------------
cat > "$OUT_DIR/risk-drift-register.md" <<'MD'
# Risk & Drift Register
**Engagement Tier:** T1 – Governance Diagnostic

## Active Risks
| Risk | Trigger | Impact | Mitigation |
|-----|--------|--------|------------|
| Scope Creep | Unbounded goals | Cost overrun | Scope lock |
| Founder Bottleneck | Centralized authority | Execution stall | Delegation |

## Drift Indicators
- Strategy changes without documentation
- Tool adoption without governance review
MD

# -------------------------------
# Build-Deferral Flags
# -------------------------------
cat > "$OUT_DIR/build-deferral-flags.md" <<'MD'
# Build-Deferral Flags
**Engagement Tier:** T1 – Governance Diagnostic

## Mandatory Deferrals
The following conditions require remediation before any build activity:

- Undefined decision authority
- Absent governance controls
- Unvalidated economic model

## Advisory Position
System construction prior to remediation is not recommended and will not be supported.
MD

# -------------------------------
# Build gate
# -------------------------------
cd "$ROOT_DIR"
npm run build
