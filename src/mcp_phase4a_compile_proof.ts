/**
 * CIAG Phase 4A — Compile-Time Proof (MCP via ago-1-core)
 *
 * This file intentionally does NOT execute at runtime.
 * It proves CIAG can build a valid MCP tool request using the core Nexus plane.
 */
import { mcp } from "ago-1-core";

export function ciagMcpCompileProof() {
  const transport = mcp.createHttpToolTransport({ baseUrl: "http://127.0.0.1:8787" });

  const req: mcp.ToolRequest = {
    tool: "shared.artifact_registry.read",
    args: {},
    ctx: {
      tenant: "shared",
      actor: "ciag-ago-1",
      purpose: "ciag-phase4a-compile-proof",
      classification: "internal",
      traceId: "ciag-compile-proof"
    }
  };

  // Compile-time validation of call shape + policy surface.
  void mcp.callTool(transport, req);
}
