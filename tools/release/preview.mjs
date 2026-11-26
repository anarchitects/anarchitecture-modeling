import { writeFileSync } from 'node:fs';
import { releaseVersion } from 'nx/release';
import { versionOptions } from './versioning.mjs';

// This entry point is deliberately preview-only; it cannot publish, push or tag.
// Nx remains the version calculator. First distribution is an explicit operation.
const [output, mode, ...projects] = process.argv.slice(2);
if (!output || !['first', 'next'].includes(mode) || !projects.length)
  throw new Error(
    'Usage: node tools/release/preview.mjs OUTPUT.json first|next PROJECT...',
  );
const result = await releaseVersion({
  ...versionOptions(mode, projects),
  dryRun: true,
});
writeFileSync(
  output,
  `${JSON.stringify(result.projectsVersionData, null, 2)}\n`,
);
