# CIAG Policy — Evidence Threshold (v1)

## Purpose
This policy prevents "paper mitigation." Risks only move to **Mitigated** when we have **observed evidence** at or above a defined confidence threshold.

## Enforcement Rules (v1)
A risk row is eligible for mitigation only if:
- The risk row has **system_type** populated (e.g., PMS, POS, HRIS, Payments).
- There exists an evidence item where:
  - `item.systemType === row.system_type`
  - `item.status === "observed"`
  - `item.confidence >= 7`

## Automated Effects
When the threshold is met:
- `status` becomes **Mitigated**
- `likelihood` becomes **Low**
- `notes` is appended with: `policy=threshold-v1; derivedFromEvidence=[<evidenceId>]`

## Audit Notes
- This policy is deterministic, fail-closed, and system-scoped.
- The authoritative policy JSON is: `docs/policy/governance_policy_v1.json`
