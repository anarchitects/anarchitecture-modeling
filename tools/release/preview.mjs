import { readFileSync, writeFileSync } from 'node:fs';
import { releaseVersion } from 'nx/release';

// This entry point is deliberately preview-only; it cannot publish, push or tag.
// Nx remains the version calculator. First distribution is an explicit operation.
const [output, mode, ...projects] = process.argv.slice(2);
if (!output || !['first', 'next'].includes(mode) || !projects.length)
  throw new Error(
    'Usage: node tools/release/preview.mjs OUTPUT.json first|next PROJECT...',
  );
const configured = JSON.parse(readFileSync('nx.json', 'utf8')).release.projects;
if (projects.some((name) => !configured.includes(name)))
  throw new Error(
    'Use exact configured Nx project names, not scopes or filters',
  );
const result = await releaseVersion({
  projects,
  dryRun: true,
  gitCommit: false,
  gitTag: false,
  gitPush: false,
  stageChanges: false,
  ...(mode === 'first' ? { firstRelease: true, specifier: '0.0.1' } : {}),
});
writeFileSync(
  output,
  `${JSON.stringify(result.projectsVersionData, null, 2)}\n`,
);
