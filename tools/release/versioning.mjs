import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// One set of Nx options for preview and application. Neither operation performs
// Git mutations or publication; release files are reviewed and committed normally.
export function versionOptions(mode, projects) {
  assert.ok(['first', 'next'].includes(mode), 'Expected first or next');
  const configured = JSON.parse(readFileSync('nx.json', 'utf8')).release
    .projects;
  assert.ok(projects.length && new Set(projects).size === projects.length);
  assert.ok(
    projects.every((name) => configured.includes(name)),
    'Use exact configured Nx project names',
  );
  return {
    projects,
    gitCommit: false,
    gitTag: false,
    gitPush: false,
    stageChanges: false,
    ...(mode === 'first' ? { firstRelease: true, specifier: '0.0.1' } : {}),
  };
}

export function assertSourceVersions(versions, manifests, phase) {
  for (const [name, data] of Object.entries(versions)) {
    const expected =
      phase === 'before'
        ? data.currentVersion
        : (data.newVersion ?? data.currentVersion);
    assert.equal(
      manifests[name]?.version,
      expected,
      `${name}: source version must be ${expected}; ${phase === 'before' ? 'reconcile the published baseline before versioning' : 'apply Nx versions and commit them before preparing a release candidate'}`,
    );
  }
}
