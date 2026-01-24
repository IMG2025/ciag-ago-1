#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------
# T2 Artifacts
# ---------------------------
mkdir -p "$ROOT_DIR/artifacts/T2"

cat > "$ROOT_DIR/artifacts/T2/target-operating-model.md" <<'MD'
# Target Operating Model
**Engagement Tier:** T2 – Operating Blueprint

## Objective
Define the future-state operating model required to support governed execution.

## Core Components
- Decision authority map
- Process ownership model
- Control enforcement points

## Advisory Position
This model is mandatory prior to automation or agent deployment.
MD

cat > "$ROOT_DIR/artifacts/T2/ai-architecture.md" <<'MD'
# AI / Automation Architecture
**Engagement Tier:** T2 – Operating Blueprint

## Scope
Logical architecture for governed AI and automation systems.

## Layers
- Governance & controls
- Orchestration
- Execution agents

## Constraints
No autonomous execution without explicit control boundaries.
MD

cat > "$ROOT_DIR/artifacts/T2/governance-controls.md" <<'MD'
# Governance & Control Layer
**Engagement Tier:** T2 – Operating Blueprint

## Controls
- Authority enforcement
- Change management
- Auditability

## Failure Modes
Uncontrolled automation introduces systemic risk.
MD

cat > "$ROOT_DIR/artifacts/T2/execution-roadmap.md" <<'MD'
# 12-Month Execution Roadmap
**Engagement Tier:** T2 – Operating Blueprint

## Phases
1. Governance remediation
2. Process stabilization
3. Controlled automation

## Exit Criteria
Readiness for pilot deployment.
MD

# ---------------------------
# T3 Artifacts
# ---------------------------
mkdir -p "$ROOT_DIR/artifacts/T3"

cat > "$ROOT_DIR/artifacts/T3/agent-architecture.md" <<'MD'
# Agent Architecture
**Engagement Tier:** T3 – Pilot / POC Advisory

## Objective
Define the scoped agent architecture for pilot deployment.

## Components
- Agent roles
- Authority constraints
- Escalation paths

## Risk Position
Agents operate under governance, not autonomy.
MD

cat > "$ROOT_DIR/artifacts/T3/workflow-spec.md" <<'MD'
# Governance-Ready Workflows
**Engagement Tier:** T3 – Pilot / POC Advisory

## Scope
Executable workflows with embedded control logic.

## Characteristics
- Deterministic
- Auditable
- Reversible
MD

cat > "$ROOT_DIR/artifacts/T3/kpi-roi-model.md" <<'MD'
# KPI & ROI Model
**Engagement Tier:** T3 – Pilot / POC Advisory

## Metrics
- Cost reduction
- Cycle time
- Risk exposure

## Advisory Position
ROI must be validated prior to scale.
MD

cat > "$ROOT_DIR/artifacts/T3/platform-transition.md" <<'MD'
# Platform Transition Plan
**Engagement Tier:** T3 – Pilot / POC Advisory

## Objective
Transition from pilot to CoreIdentity platform.

## Preconditions
- Governance validation
- Economic validation
- Operational readiness
MD

cd "$ROOT_DIR"
npm run build
