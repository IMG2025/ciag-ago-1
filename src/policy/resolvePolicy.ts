import path from "path";
import fs from "fs";
import pkg from "../../package.json";

export function resolvePolicyVersion(): string {
  return process.env.AGO_POLICY_VERSION ?? pkg.version;
}

export function resolvePolicyPath(...segments: string[]): string {
  const version = resolvePolicyVersion();
  return path.resolve(
    process.cwd(),
    "policies",
    `v${version}`,
    ...segments
  );
}

export function loadPolicyFile<T>(filename: string): T {
  const filePath = resolvePolicyPath(filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
