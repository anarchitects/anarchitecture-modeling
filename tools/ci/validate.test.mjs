import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { nxArguments, runValidation, selectComparison } from './validate.mjs';
import { checkProjectGraph, packages } from './check-project-graph.mjs';

test('only complete ancestor history narrows verification', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'modeling-ci-history-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', 'main');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '/dev/null');
  git('config', 'user.name', 'CI fixture');
  git('config', 'user.email', 'ci@example.invalid');
  git('commit', '--allow-empty', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  git('commit', '--allow-empty', '-m', 'head');
  const head = git('rev-parse', 'HEAD');
  const valid = { status: 'success', base, head, cwd };
  assert.equal(selectComparison(valid).mode, 'affected');
  for (const change of [
    { status: 'failure' },
    { status: 'skipped' },
    { status: 'cancelled' },
    { base: undefined },
    { base: '--all' },
    { base: 'a'.repeat(40) },
    { head: base },
    { base: head },
  ])
    assert.equal(selectComparison({ ...valid, ...change }).mode, 'all');
  git('checkout', '--orphan', 'unrelated');
  git('commit', '--allow-empty', '-m', 'unrelated');
  const unrelated = git('rev-parse', 'HEAD');
  git('checkout', 'main');
  assert.equal(selectComparison({ ...valid, base: unrelated }).mode, 'all');
  writeFileSync(join(cwd, '.git/shallow'), `${base}\n`);
  assert.equal(selectComparison(valid).mode, 'all');
});

test('fallback runs all targets and task failures/signals cannot pass', () => {
  const selection = { mode: 'all' };
  assert.deepEqual(nxArguments(selection), [
    'nx',
    'run-many',
    '-t',
    'lint',
    'test',
    'build',
    'typecheck',
  ]);
  for (const status of [0, 1, 17, null]) {
    const exitCode = runValidation(selection, {
      env: { NX_BASE: 'unsafe', NX_HEAD: 'unsafe', RETAIN: 'yes' },
      run: (command, args, options) => {
        assert.equal(command, 'yarn');
        assert.deepEqual(args, nxArguments(selection));
        assert.deepEqual(options.env, { RETAIN: 'yes' });
        return { status };
      },
    });
    assert.equal(exitCode, status ?? 1);
  }
  assert.deepEqual(
    nxArguments({ mode: 'affected', base: 'base', head: 'head' }).slice(-2),
    ['--base=base', '--head=head'],
  );
});

function graphFixture() {
  return {
    nodes: Object.fromEntries(
      Object.entries(packages).map(([name, { root, type }]) => [
        name,
        {
          data: {
            root,
            tags: ['scope:foundation', `type:${type}`, 'lifecycle:unreleased'],
            targets: Object.fromEntries(
              ['build', 'lint', 'test', 'typecheck'].map((target) => [
                target,
                {
                  cache: true,
                  inputs: ['default', '^default'],
                  outputs: ['{projectRoot}/dist'],
                },
              ]),
            ),
          },
        },
      ]),
    ),
    dependencies: {
      'modeling-core': [],
      'modeling-metamodel': [{ target: 'modeling-core' }],
    },
  };
}

test('graph admits bootstrap, core alone, and metamodel -> core', () => {
  assert.deepEqual(checkProjectGraph({ nodes: {}, dependencies: {} }), []);
  const graph = graphFixture();
  assert.equal(checkProjectGraph(graph).length, 2);
  delete graph.nodes['modeling-metamodel'];
  delete graph.dependencies['modeling-metamodel'];
  assert.deepEqual(checkProjectGraph(graph), ['modeling-core']);
});

test('graph rejects reverse edges and incomplete projects', () => {
  const mutations = [
    (g) =>
      g.dependencies['modeling-core'].push({ target: 'modeling-metamodel' }),
    (g) => (g.dependencies['modeling-metamodel'] = []),
    (g) => delete g.nodes['modeling-core'].data.targets.test,
    (g) => (g.nodes['modeling-core'].data.targets.build.outputs = []),
    (g) => (g.nodes['modeling-core'].data.targets.test.cache = false),
    (g) => (g.nodes['modeling-core'].data.tags = ['scope:foundation']),
    (g) => (g.nodes['modeling-core'].data.root = 'wrong'),
    (g) => (g.nodes.host = { data: {} }),
  ];
  for (const mutate of mutations) {
    const graph = graphFixture();
    mutate(graph);
    assert.throws(() => checkProjectGraph(graph));
  }
  assert.throws(() => checkProjectGraph({}));
});
