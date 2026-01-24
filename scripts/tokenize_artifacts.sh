#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

token_header () {
cat <<'HDR'
**Client:** {{COMPANY_NAME}}  
**Industry:** {{INDUSTRY}} | **Employees:** {{EMPLOYEES}} | **Revenue Range:** {{REVENUE_RANGE}}  
**Objective:** {{OBJECTIVE_PRIMARY}} | **Timeline (months):** {{TIMELINE_MONTHS}}  
**Budget (USD):** {{BUDGET_USD}} | **Regulatory:** {{REGULATORY}}  
**Tier:** {{TIER}} | **Run Date:** {{RUN_DATE}}

---
HDR
}

# T1
cat > "$ROOT_DIR/artifacts/T1/governance-gap-map.md" <<MD
# Governance Gap Map
$(token_header)
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

cat > "$ROOT_DIR/artifacts/T1/readiness-scorecard.md" <<MD
# System Readiness Scorecard
$(token_header)
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

cat > "$ROOT_DIR/artifacts/T1/risk-drift-register.md" <<MD
# Risk & Drift Register
$(token_header)
## Active Risks
| Risk | Trigger | Impact | Mitigation |
|-----|--------|--------|------------|
| Scope Creep | Unbounded goals | Cost overrun | Scope lock |
| Founder Bottleneck | Centralized authority | Execution stall | Delegation |

## Drift Indicators
- Strategy changes without documentation
- Tool adoption without governance review
MD

cat > "$ROOT_DIR/artifacts/T1/build-deferral-flags.md" <<MD
# Build-Deferral Flags
$(token_header)
## Mandatory Deferrals
The following conditions require remediation before any build activity:
- Undefined decision authority
- Absent governance controls
- Unvalidated economic model

## Advisory Position
System construction prior to remediation is not recommended and will not be supported.
MD

# T2
cat > "$ROOT_DIR/artifacts/T2/target-operating-model.md" <<MD
# Target Operating Model
$(token_header)
## Objective
Define the future-state operating model required to support governed execution.

## Core Components
- Decision authority map
- Process ownership model
- Control enforcement points

## Advisory Position
This model is mandatory prior to automation or agent deployment.
MD

cat > "$ROOT_DIR/artifacts/T2/ai-architecture.md" <<MD
# AI / Automation Architecture
$(token_header)
## Scope
Logical architecture for governed AI and automation systems.

## Layers
- Governance & controls
- Orchestration
- Execution agents

## Constraints
No autonomous execution without explicit control boundaries.
MD

cat > "$ROOT_DIR/artifacts/T2/governance-controls.md" <<MD
# Governance & Control Layer
$(token_header)
## Controls
- Authority enforcement
- Change management
- Auditability

## Failure Modes
Uncontrolled automation introduces systemic risk.
MD

cat > "$ROOT_DIR/artifacts/T2/execution-roadmap.md" <<MD
# 12-Month Execution Roadmap
$(token_header)
## Phases
1. Governance remediation
2. Process stabilization
3. Controlled automation

## Exit Criteria
Readiness for pilot deployment.
MD

# T3
cat > "$ROOT_DIR/artifacts/T3/agent-architecture.md" <<MD
# Agent Architecture
$(token_header)
## Objective
Define the scoped agent architecture for pilot deployment.

## Components
- Agent roles
- Authority constraints
- Escalation paths

## Risk Position
Agents operate under governance, not autonomy.
MD

cat > "$ROOT_DIR/artifacts/T3/workflow-spec.md" <<MD
# Governance-Ready Workflows
$(token_header)
## Scope
Executable workflows with embedded control logic.

## Characteristics
- Deterministic
- Auditable
- Reversible
MD

cat > "$ROOT_DIR/artifacts/T3/kpi-roi-model.md" <<MD
# KPI & ROI Model
$(token_header)
## Metrics
- Cost reduction
- Cycle time
- Risk exposure

## Advisory Position
ROI must be validated prior to scale.
MD

cat > "$ROOT_DIR/artifacts/T3/platform-transition.md" <<MD
# Platform Transition Plan
$(token_header)
## Objective
Transition from pilot to CoreIdentity platform.

## Preconditions
- Governance validation
- Economic validation
- Operational readiness
MD

cd "$ROOT_DIR"
npm run build
