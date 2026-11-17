import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

// Infrastructure proof only. These synthetic run-commands targets are never
// installed in the real graph and never use Nx Cloud or consumer source code.
test(
  'Nx conventions select dependents, skip unrelated changes and restore a valid local cache',
  { timeout: 120_000 },
  (t) => {
    const cwd = mkdtempSync(join(tmpdir(), 'modeling-nx-proof-'));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    const env = {
      ...process.env,
      NX_DAEMON: 'false',
      NX_ISOLATE_PLUGINS: 'false',
      NX_NO_CLOUD: 'true',
      NX_TUI: 'false',
    };
    delete env.NX_CLOUD_ACCESS_TOKEN;
    delete env.NX_BASE;
    delete env.NX_HEAD;
    delete env.NX_SKIP_NX_CACHE;
    delete env.NX_CACHE_DIRECTORY;
    const write = (path, content) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(
        join(cwd, path),
        typeof content === 'string' ? content : JSON.stringify(content),
      );
    };
    const git = (...args) =>
      execFileSync('git', args, {
        cwd,
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    const nxBin = resolve(
      'node_modules/nx',
      JSON.parse(readFileSync('node_modules/nx/package.json', 'utf8')).bin.nx,
    );
    const nx = (...args) =>
      execFileSync(process.execPath, [nxBin, ...args], {
        cwd,
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 45_000,
      }).trim();
    const commit = () => {
      git('add', '.');
      git('commit', '-m', 'fixture');
      return git('rev-parse', 'HEAD');
    };
    const config = JSON.parse(readFileSync('nx.json', 'utf8'));
    delete config.nxCloudId;
    // Exercise the workspace input/default rules, not TypeScript package inference.
    config.plugins = [];
    write('nx.json', config);
    write('package.json', { name: 'isolated-ci-proof', private: true });
    write('.gitignore', 'node_modules\n.nx\n**/dist\nexecutions.log\n');
    symlinkSync(resolve('node_modules'), join(cwd, 'node_modules'), 'dir');
    write(
      'tools/ci/build.mjs',
      `import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const name = process.argv[2];
const root = 'packages/' + name;
mkdirSync(root + '/dist', { recursive: true });
const own = readFileSync(root + '/source.txt', 'utf8');
const dependency = name === 'modeling-metamodel' ? readFileSync('packages/modeling-core/dist/value.txt', 'utf8') : '';
writeFileSync(root + '/dist/value.txt', own + dependency);
appendFileSync('executions.log', name + '\\n');
`,
    );
    for (const name of ['modeling-core', 'modeling-metamodel']) {
      write(`packages/${name}/source.txt`, name);
      write(`packages/${name}/project.json`, {
        name,
        implicitDependencies:
          name === 'modeling-metamodel' ? ['modeling-core'] : [],
        targets: {
          build: {
            command: `node tools/ci/build.mjs ${name}`,
            outputs: ['{projectRoot}/dist'],
          },
        },
      });
    }
    git('init', '-b', 'main');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'core.hooksPath', '/dev/null');
    git('config', 'user.name', 'CI fixture');
    git('config', 'user.email', 'ci@example.invalid');
    const base = commit();
    const affected = (head) =>
      JSON.parse(
        nx(
          'show',
          'projects',
          '--affected',
          `--base=${base}`,
          `--head=${head}`,
          '--json',
        ),
      ).sort();
    write('README.md', 'unrelated documentation');
    assert.deepEqual(affected(commit()), []);
    write('packages/modeling-metamodel/source.txt', 'metamodel changed');
    assert.deepEqual(affected(commit()), ['modeling-metamodel']);
    write('packages/modeling-core/source.txt', 'core changed');
    assert.deepEqual(affected(commit()), [
      'modeling-core',
      'modeling-metamodel',
    ]);
    const durations = [];
    const build = () => {
      const start = performance.now();
      const result = nx('run-many', '-t', 'build', '--outputStyle=static');
      durations.push(Math.round(performance.now() - start));
      return result;
    };
    const executions = () =>
      readFileSync(join(cwd, 'executions.log'), 'utf8').trim().split('\n')
        .length;
    const output = () =>
      readFileSync(
        join(cwd, 'packages/modeling-metamodel/dist/value.txt'),
        'utf8',
      );
    build();
    assert.equal(executions(), 2, 'cold run executes both tasks');
    const expected = output();
    build();
    assert.equal(executions(), 2, 'warm run replays both tasks');
    for (const name of ['modeling-core', 'modeling-metamodel'])
      rmSync(join(cwd, `packages/${name}/dist`), { recursive: true });
    build();
    assert.equal(executions(), 2, 'clean outputs restore without executing');
    assert.equal(output(), expected);
    write('packages/modeling-core/source.txt', 'dependency invalidation');
    build();
    assert.equal(executions(), 4, 'core change invalidates core and dependent');
    assert.match(output(), /dependency invalidation/);
    write('packages/modeling-metamodel/source.txt', 'own source invalidation');
    build();
    assert.equal(executions(), 5, 'metamodel source leaves core cached');
    write('tsconfig.base.json', { compilerOptions: { strict: true } });
    build();
    assert.equal(
      executions(),
      7,
      'shared compiler configuration invalidates both',
    );
    write('yarn.lock', '# synthetic dependency resolution change\n');
    build();
    assert.equal(executions(), 9, 'shared lockfile invalidates both');
    console.log(
      'Local fixture: selection, 2 cold executions, warm replay, clean restoration and source/dependency/config/lockfile invalidation passed. Remote cache and real package tasks untested.',
    );
    console.log(
      `Fixture build wall time (ms), cold/warm/restore/core-source/metamodel-source/config/lockfile: ${durations.join('/')}`,
    );
  },
);
