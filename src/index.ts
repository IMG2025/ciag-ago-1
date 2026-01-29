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
export function registerCIAG(reg: { registerExecutor: (spec: any) => void }): void {
  reg.registerExecutor(ciagExecutorSpec);
}
