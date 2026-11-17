import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCommit, validateCandidate } from './policy.mjs';

const { release } = JSON.parse(
  readFileSync(new URL('../../nx.json', import.meta.url)),
);
const core = 'modeling-core',
  meta = 'modeling-metamodel';
const graph = {
  nodes: Object.fromEntries(
    [core, meta].map((name) => [
      name,
      {
        data: { root: `packages/${name}`, tags: ['lifecycle:unreleased'] },
      },
    ]),
  ),
};
const check = (
  message,
  files = [`packages/${core}/src/index.ts`],
  released = [],
) =>
  validateCommit({
    message,
    files,
    graph,
    types: release.conventionalCommits.types,
    released,
  });

test('commit types, exact graph scopes and package lifecycle are enforced', () => {
  check(`init(${core}): implement`);
  check('ci: configure release checks', ['tools/release/check-commits.mjs']);
  for (const message of [
    `unknown(${core}): x`,
    'fix(core): x',
    'init: x',
    `init(${core})!: x`,
    `init(${core}): x\n\nBREAKING CHANGE: changed`,
    `init(${core}): x\n\nBREAKING-CHANGE: changed`,
    `feat(${core}): x`,
    'feat: hide package change',
    `init(${meta}): wrong package`,
  ]) {
    assert.throws(() => check(message), undefined, message);
  }
  assert.throws(() => check(`init(${core}): x`, undefined, [core]));
  assert.throws(() =>
    check(
      `init(${core}): mixed`,
      [`packages/${core}/src/index.ts`, `packages/${meta}/src/index.ts`],
      [meta],
    ),
  );
  check(`feat(${core}): released package`, undefined, [core]);
  for (const type of Object.keys(release.conventionalCommits.types).filter(
    (t) => t !== 'init',
  ))
    check(`${type}: reviewed repository work`, ['README.md']);
});

const sha = 'a'.repeat(40),
  hash = 'b'.repeat(64);
function candidate(current = '0.3.2', next = '0.3.3', level = 'patch') {
  return {
    sourceSha: sha,
    projectsVersionData: {
      [core]: { currentVersion: current, newVersion: next },
    },
    history: {
      [core]: {
        sourceSha: sha,
        versions: current === '0.0.0' ? [] : [current],
        checkedAt: new Date().toISOString(),
        registryChecked: true,
        tagsChecked: true,
        otherChannelsReviewed: true,
        reference: 'review/history',
      },
    },
    impacts: { [core]: { level, reference: 'review/compatibility' } },
    authorization: {
      owner: 'vrxj81',
      sourceSha: sha,
      reference: 'review/authorization',
      versions: { [core]: next },
      artifactHashes: { [core]: hash },
    },
    artifacts: {
      [core]: {
        manifestVersion: next,
        artifactVersion: next,
        tag: `${core}@${next}`,
        sha256: hash,
      },
    },
  };
}

test('candidate guard rejects insufficient bumps, unapproved stabilization and first-version exceptions', () => {
  for (const c of [
    candidate('0.0.0', '0.0.1'),
    candidate(),
    candidate('0.3.2', '0.3.3', 'feature'),
    candidate('0.3.2', '0.4.0', 'breaking'),
    candidate('1.3.2', '1.4.0', 'feature'),
    candidate('1.3.2', '2.0.0', 'breaking'),
  ])
    assert.deepEqual(validateCandidate(c), [core]);
  for (const c of [
    candidate('0.0.0', '0.1.0'),
    candidate('0.0.0', '0.0.1-rc.1'),
    candidate('0.3.2', '0.3.3', 'breaking'),
    candidate('1.3.2', '1.3.3', 'feature'),
    candidate('1.3.2', '1.4.0', 'breaking'),
    candidate('0.3.2', '1.0.0', 'breaking'),
  ])
    assert.throws(() => validateCandidate(c));
  const stable = candidate('0.3.2', '1.0.0', 'breaking');
  stable.authorization.stabilizations = { [core]: '1.0.0' };
  validateCandidate(stable);
});

test('candidate evidence binds history, owner, compatibility, source and archive identity', () => {
  for (const mutate of [
    (c) => {
      c.history[core].versions = [];
    },
    (c) => {
      c.projectsVersionData.unknown = {
        currentVersion: '0.0.0',
        newVersion: '0.0.1',
      };
    },
    (c) => {
      c.history[core].registryChecked = false;
    },
    (c) => {
      c.history[core].checkedAt = '2020-01-01';
    },
    (c) => {
      c.history[core].versions.push('0.5.0');
    },
    (c) => {
      c.history[core].sourceSha = 'c'.repeat(40);
    },
    (c) => {
      delete c.impacts[core].reference;
    },
    (c) => {
      c.authorization.sourceSha = 'c'.repeat(40);
    },
    (c) => {
      c.authorization.owner = 'bot';
    },
    (c) => {
      c.authorization.versions[core] = '0.3.4';
    },
    (c) => {
      c.artifacts[core].artifactVersion = '0.3.4';
    },
    (c) => {
      c.artifacts[core].tag = 'v0.3.3';
    },
    (c) => {
      c.artifacts[core].sha256 = 'c'.repeat(64);
    },
  ]) {
    const c = candidate();
    mutate(c);
    assert.throws(() => validateCandidate(c));
  }
});
