import { readFileSync } from 'node:fs';
import { validateCandidate } from './policy.mjs';

const candidate = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log(
  `Release evidence checks passed: ${validateCandidate(candidate).join(', ')}. No mutation performed.`,
);
