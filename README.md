## Tier-1 Target Intake (Authoritative Contract)

This repo **does not score prospects** and **does not select targets manually**.
Tier-1 targets are consumed **read-only** from **ago-tier1-engine** via the export contract:
- Source: `IMG2025/ago-tier1-engine`
- Contract path: `exports/tier1/`
- Consumer script: `scripts/pull_tier1_targets_from_engine_v1.mjs`
- Local inputs: `data/tier1/`

Any changes to ICP, scoring, confidence, or tier logic occur **only** in `ago-tier1-engine` and are versioned there.

