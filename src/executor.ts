/**
 * CIAG Executor Specification
 * This is the single source of truth for CIAG execution capabilities.
 */

export const ciagExecutorSpec = {
  domain_id: "ciag",
  executor_id: "ciag.executor",
  supported_task_types: ["EXECUTE", "ANALYZE"] as const,
  required_scopes: {
    EXECUTE: ["ciag:execute"],
    ANALYZE: ["ciag:analyze"]
  },
  validate_inputs(raw: unknown) {
    return raw;
  },
  execute(raw: unknown) {
    return {
      status: "STUB",
      input: raw
    };
  }
} as const;
