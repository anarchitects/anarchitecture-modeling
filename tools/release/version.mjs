import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { releaseVersion, releaseChangelog } from 'nx/release';
import { versionOptions, assertSourceVersions } from './versioning.mjs';

/** Apply Nx's calculation to tracked source files; never commit, tag or publish. */
export async function versionSource(mode, projects) {
  const options = versionOptions(mode, projects);
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
    '',
    'Versioning requires a clean working tree',
  );
  const preview = await releaseVersion({ ...options, dryRun: true });
  if (mode === 'first')
    for (const data of Object.values(preview.projectsVersionData))
      assert.equal(
        data.currentVersion,
        '0.0.0',
        'First release requires an unreleased source baseline',
      );
  const manifests = Object.fromEntries(
    Object.keys(preview.projectsVersionData).map((name) => [
      name,
      JSON.parse(readFileSync(`packages/${name}/package.json`, 'utf8')),
    ]),
  );
  assertSourceVersions(preview.projectsVersionData, manifests, 'before');
  if (
    !Object.values(preview.projectsVersionData).some((data) => data.newVersion)
  )
    return preview;
  // Include dependents selected by Nx even when the caller selected only core.
  const selected = {
    ...options,
    projects: Object.keys(preview.projectsVersionData),
    dryRun: false,
  };
  const result = await releaseVersion(selected);
  assert.deepEqual(
    result.projectsVersionData,
    preview.projectsVersionData,
    'Nx version calculation changed after preview',
  );
  await releaseChangelog({
    ...selected,
    versionData: result.projectsVersionData,
  });
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode = 'next', ...selected] = process.argv.slice(2);
  const projects = selected.length
    ? selected
    : JSON.parse(readFileSync('nx.json', 'utf8')).release.projects;
  await versionSource(mode, projects);
  console.log(
    'Review and commit the version, lockfile and changelog changes. No commits, tags, pushes or publication were performed.',
  );
}
