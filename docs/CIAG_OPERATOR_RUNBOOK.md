# CIAG AGO-1 Operator Runbook

Version: 1.0  
Applies to: CIAG AGO-1 v0.1.0+  
Authority: CoreIdentity Advisory Group (CIAG)

## Purpose
This runbook defines the human-operated control plane governing CIAG advisory executions.
It is the canonical operational reference for intake, execution, audit, and delivery.

## Non-Negotiables
- Deterministic execution
- Policy-versioned governance
- Append-only audit trails
- Reproducible client outputs
- Explicit authority boundaries

## Section 1: Operator Roles & Authority

CIAG operates under strict role separation. No individual may perform multiple roles
within the same advisory run.

### Intake Operator (IO)
- Executes advisory runs
- Supplies intake JSON
- Has no governance discretion

### Governance Reviewer (GR)
- Reviews rejected or escalated runs
- Interprets disqualification rules
- Cannot execute or modify runs

### Release Authority (RA)
- Approves final client delivery
- Verifies manifests, checksums, and policy pins
- Sole authority for T3 release

### Escalation Owner (EO)
- Handles ERROR or UNKNOWN states
- May halt CIAG operations
- Owns incident remediation and postmortems

### Authority Matrix
Actions are explicitly constrained. No overrides exist outside escalation.

## Section 2: Standard Operating Flows

CIAG executes advisory services through deterministic, tier-resolved flows.

### Flow 1: New Client Intake (T1)
Executed by Intake Operator using npm run ago. Validation, tier resolution,
artifact generation, and audit logging are mandatory.

### Flow 2: Tier Advancement
Tier escalation occurs only via new intake JSON. Prior outputs remain immutable.

### Flow 3: Rejection & Appeal
Rejected runs are reviewed by Governance Reviewer. No re-run occurs without
revised intake.

### Flow 4: Artifact Delivery
Release Authority verifies manifests, checksums, and policy versions before
authorizing delivery.

### Flow 5: Incident Handling
ERROR or UNKNOWN states trigger Escalation Owner intervention and halt operations.

## Section 3: Command Surface & Exit Codes

CIAG exposes a single canonical execution command:
npm run ago -- <intake.json>

STDOUT is informational. Exit codes are authoritative.

### Exit Codes
0  - SUCCESS: advisory completed and eligible for delivery  
10 - REJECTED: intake invalid or disqualified  
20 - POLICY_BLOCKED: blocked by frozen policy  
30 - ERROR: system or pipeline failure

Automation and human operators must rely exclusively on exit codes
for control flow decisions.

## Section 4: Audit, Compliance & Evidence Handling

All CIAG advisory runs are logged in an append-only audit log.
Evidence artifacts are immutable and checksum-verified.

### Audit Log
Each run appends one JSONL record capturing inputs, decisions,
outputs, and status.

### Evidence Artifacts
Successful runs produce sealed packages including rendered artifacts,
a manifest, and a SHA-256 checksum.

### Retention
Audit records and intake hashes are retained permanently.
Packages are retained for a minimum of seven years.

Any deviation constitutes a compliance incident.

## Section 5: Failure Modes & Escalation

CIAG handles failure through explicit classification and escalation.

### Failure Classes
Validation failures, policy blocks, system errors, and operator errors
are handled through defined ownership and exit codes.

### Escalation
Exit codes 20 and 30 require immediate escalation to Escalation Owner.
No overrides or silent retries are permitted.

### Postmortems
All escalations require documented postmortems and corrective actions
prior to resuming operations.

## Appendix A: Client Communication Templates

All client communications must use the templates below.
No ad-hoc language is permitted.

---

### A1. Intake Accepted

**Subject:** CIAG Advisory Intake Accepted

Hello {{CLIENT_NAME}},

Your advisory intake has been accepted and processed under CIAG policy.

**Engagement Tier:** {{TIER}}  
**Policy Version:** {{POLICY_VERSION}}

Your advisory package is now in production. You will receive delivery
notification once the package has been finalized and verified.

No action is required at this time.

— CoreIdentity Advisory Group

---

### A2. Intake Rejected

**Subject:** CIAG Advisory Intake — Action Required

Hello {{CLIENT_NAME}},

Your advisory intake was reviewed but could not be accepted under current CIAG policy.

**Reason(s):**
{{REJECTION_REASONS}}

You may submit a revised intake reflecting updated scope or constraints.
Previous submissions remain on record and are not overwritten.

— CoreIdentity Advisory Group

---

### A3. Advisory Package Delivered (T1 / T2 / T3)

**Subject:** CIAG Advisory Package Delivered — {{TIER}}

Hello {{CLIENT_NAME}},

Your CIAG advisory package has been completed and verified.

**Engagement Tier:** {{TIER}}  
**Policy Version:** {{POLICY_VERSION}}

The delivered package includes:
- Sealed advisory artifacts
- Delivery manifest
- Integrity checksum

Please confirm receipt. No further action will be taken unless requested.

— CoreIdentity Advisory Group

---

### A4. Escalation / Delay Notice

**Subject:** CIAG Advisory Update — Escalation in Progress

Hello {{CLIENT_NAME}},

Your advisory engagement has entered an escalation state due to a system or policy issue.

All activity has been paused to preserve integrity.
You will be notified once resolution is complete.

No action is required from you at this time.

— CoreIdentity Advisory Group


## Appendix B: Pricing & Commercial Terms

CIAG pricing is deterministic, tier-bound, and non-negotiable.

### Tier Pricing
T1: $2,500 — Governance Diagnostic  
T2: $7,500 — Operating Blueprint  
T3: $15,000 — Pilot Architecture & Transition

### Payment
Payment is required prior to execution. No work begins until payment clears.

### Refunds
Rejected or undelivered engagements are refundable.
Delivered advisory packages are non-refundable.

### Scope
CIAG advisory excludes implementation, custom development,
and ongoing consulting.

### Revisions
One constrained revision is permitted. Additional changes
require a new intake and tier evaluation.

## Appendix C: Pilot Launch Playbook

CIAG pilots are governed, limited, and policy-bound.

### Objectives
Pilots validate system behavior, delivery clarity, and audit integrity.

### Eligibility
Pilot clients must accept fixed scope, pricing, and process.

### Limits
A maximum of five pilots may be conducted, with no more than two concurrent.

### Execution
Pilots run on frozen policy versions. No draft or experimental code is permitted.

### Feedback
Feedback is collected post-delivery and does not alter in-flight pilots.

### Exit
Pilots conclude upon delivery confirmation, feedback capture,
and audit review.
