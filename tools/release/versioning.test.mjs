import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSourceVersions, versionOptions } from './versioning.mjs';

test('source version guards reject stale, premature and changed companion manifests', () => {
  const versions = {
    'modeling-core': { currentVersion: '0.0.1', newVersion: null },
    'modeling-metamodel': { currentVersion: '0.0.1', newVersion: '0.0.2' },
  };
  const before = {
    'modeling-core': { version: '0.0.1' },
    'modeling-metamodel': { version: '0.0.1' },
  };
  const after = { ...before, 'modeling-metamodel': { version: '0.0.2' } };
  assert.doesNotThrow(() => assertSourceVersions(versions, before, 'before'));
  assert.doesNotThrow(() => assertSourceVersions(versions, after, 'after'));
  assert.throws(
    () => assertSourceVersions(versions, before, 'after'),
    /apply Nx versions and commit/,
  );
  assert.throws(
    () => assertSourceVersions(versions, after, 'before'),
    /reconcile the published baseline/,
  );
  assert.throws(() =>
    assertSourceVersions(
      versions,
      { ...after, 'modeling-core': { version: '0.0.2' } },
      'after',
    ),
  );
});

test('preview and application have the same explicit Git-disabled Nx options', () => {
  const options = versionOptions('next', ['modeling-metamodel']);
  for (const key of ['gitCommit', 'gitTag', 'gitPush', 'stageChanges'])
    assert.equal(options[key], false);
  assert.equal(options.specifier, undefined);
  assert.equal(versionOptions('first', ['modeling-core']).specifier, '0.0.1');
  assert.throws(() => versionOptions('next', ['@anarchitects/modeling-core']));
  assert.throws(() =>
    versionOptions('next', ['modeling-core', 'modeling-core']),
  );
  assert.throws(() => versionOptions('0.0.5', ['modeling-core']));
});
