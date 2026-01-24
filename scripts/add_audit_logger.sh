#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR/src/audit"
mkdir -p "$ROOT_DIR/audit"

cat > "$ROOT_DIR/src/audit/logAudit.ts" <<'TS'
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AuditEntry {
  run_id: string;
  timestamp: string;
  client: string;
  tier: string;
  intake_hash: string;
  package_hash: string;
  artifact_count: number;
  status: 'SUCCESS' | 'REJECTED' | 'ERROR';
}

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function logAudit(
  auditDir: string,
  intake: any,
  tier: string,
  outputDir: string,
  status: AuditEntry['status'],
) {
  const runId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const intakeHash = sha256(Buffer.from(JSON.stringify(intake)));
  const pkgHash = fs.existsSync(path.join(outputDir, 'package.sha256'))
    ? fs.readFileSync(path.join(outputDir, 'package.sha256'), 'utf-8').trim()
    : '';

  const artifactsDir = path.join(outputDir, 'artifacts');
  const artifactCount = fs.existsSync(artifactsDir)
    ? fs.readdirSync(artifactsDir).length
    : 0;

  const entry: AuditEntry = {
    run_id: runId,
    timestamp,
    client: String(intake.company?.name ?? 'unknown'),
    tier,
    intake_hash: intakeHash,
    package_hash: pkgHash,
    artifact_count: artifactCount,
    status,
  };

  const logPath = path.join(auditDir, 'audit-log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}
TS

cd "$ROOT_DIR"
npm run build
