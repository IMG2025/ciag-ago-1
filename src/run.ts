import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateIntake } from './intake/validateIntake.js';

// ESM-safe paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
  console.error('Usage: node run.js <intake.json>');
  process.exit(1);
}

const intakePath = path.resolve(process.cwd(), process.argv[2]);

if (!fs.existsSync(intakePath)) {
  console.error(`Intake file not found: ${intakePath}`);
  process.exit(1);
}

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf-8'));

// Validate intake
const validation = validateIntake(intake);

if (!validation.accepted) {
  console.log(
    JSON.stringify(
      { accepted: false, reasons: validation.reasons },
      null,
      2,
    ),
  );
  process.exit(0);
}

// Delegate to pipeline
import('./pipeline/runPipeline.js');
