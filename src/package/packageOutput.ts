import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

export function packageOutput(outputDir: string, intake: any, tier: string) {
  const artifactsDir = path.join(outputDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  // Move rendered artifacts into artifacts/
  for (const file of fs.readdirSync(outputDir)) {
    if (file.endsWith('.md')) {
      fs.renameSync(
        path.join(outputDir, file),
        path.join(artifactsDir, file),
      );
    }
  }

  const manifest = {
    client: intake.company?.name,
    tier,
    generated_at: new Date().toISOString(),
    artifacts: fs.readdirSync(artifactsDir),
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const zipPath = path.join(outputDir, 'package.zip');
  execSync(`cd "${outputDir}" && zip -r package.zip artifacts manifest.json`);

  const zipBuffer = fs.readFileSync(zipPath);
  const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');

  fs.writeFileSync(
    path.join(outputDir, 'package.sha256'),
    checksum,
  );
}
