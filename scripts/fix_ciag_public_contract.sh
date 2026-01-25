#!/usr/bin/env bash
set -euo pipefail

# Canonical CIAG public contract:
# - exports registerCIAG(reg)
# - avoids hard dependency on ago-1-chc-ops types (structural typing is enough)
# - registers ciagExecutorSpec

cat > src/index.ts <<'TS'
/**
 * CIAG package public contract.
 * CHC Ops should import ONLY from here.
 */

/** Structural registrar type (keeps CIAG decoupled from CHC Ops implementation). */
export type PluginRegistrar<TSpec = unknown> = {
  registerExecutor: (spec: TSpec) => void;
};

import { ciagExecutorSpec } from "./executor.js";

/** Public registrar used by CHC Ops to mount CIAG into the executor registry. */
export function registerCIAG(reg: PluginRegistrar<typeof ciagExecutorSpec>): void {
  reg.registerExecutor(ciagExecutorSpec);
}
TS

npm run build
