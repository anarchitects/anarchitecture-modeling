import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const nxJson = JSON.parse(readFileSync(join(root, 'nx.json'), 'utf8'));
const names = ['modeling-core', 'modeling-metamodel'];

function dryRun({
  versions,
  commits,
  first = false,
  projects = names,
  dependency = false,
  apply = false,
}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'foundation-release-')));
  const env = {
    ...process.env,
    NX_WORKSPACE_ROOT_PATH: dir,
    NX_DAEMON: 'false',
    NX_ISOLATE_PLUGINS: 'false',
    NX_NO_CLOUD: 'true',
    NX_INTERACTIVE: 'false',
    NX_WORKSPACE_DATA_DIRECTORY: join(dir, '.nx/workspace-data'),
  };
  // Never forward CI tokens to disposable fixtures.
  for (const key of [
    'NX_CLOUD_ACCESS_TOKEN',
    'NX_CLOUD_AUTH_TOKEN',
    'NX_CLOUD_PERSONAL_ACCESS_TOKEN',
    'GITHUB_TOKEN',
    'GH_TOKEN',
    'NODE_AUTH_TOKEN',
    'NPM_TOKEN',
  ])
    delete env[key];
  const run = (cmd, args) =>
    execFileSync(cmd, args, {
      cwd: dir,
      env,
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe',
    });
  const git = (...args) => run('git', args).trim();
  const json = (file, value) =>
    writeFileSync(join(dir, file), JSON.stringify(value));
  try {
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
    writeFileSync(
      join(dir, '.gitignore'),
      'node_modules/\n.nx/\nresult.json\n',
    );
    json('nx.json', { release: nxJson.release });
    json('package.json', {
      private: true,
      workspaces: ['packages/*'],
      packageManager: 'yarn@4.18.1',
    });
    writeFileSync(join(dir, 'yarn.lock'), '__metadata:\n  version: 8\n');
    for (const name of names) {
      mkdirSync(join(dir, 'packages', name), { recursive: true });
      json(`packages/${name}/project.json`, {
        name,
        root: `packages/${name}`,
        ...(dependency && name === names[1]
          ? { implicitDependencies: [names[0]] }
          : {}),
      });
      json(`packages/${name}/package.json`, {
        name: `@anarchitects/${name}`,
        version: versions[name] ?? '0.0.0',
        ...(dependency && name === names[1]
          ? { dependencies: { '@anarchitects/modeling-core': 'workspace:*' } }
          : {}),
      });
      writeFileSync(
        join(dir, 'packages', name, 'index.js'),
        'export const initial = true;\n',
      );
    }
    git('init', '--quiet');
    git('config', 'user.name', 'Release fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'tag.gpgsign', 'false');
    git('add', '.');
    git('commit', '--quiet', '-m', 'chore: synthetic baseline');
    for (const [name, version] of Object.entries(versions)) {
      if (version !== '0.0.0') git('tag', `${name}@${version}`);
    }
    for (const [index, commit] of commits.entries()) {
      writeFileSync(
        join(dir, 'packages', commit.project, 'index.js'),
        `export const value = ${index};\n`,
      );
      git('add', '.');
      git('commit', '--quiet', '-m', commit.message);
    }
    const before = {
      head: git('rev-parse', 'HEAD'),
      tags: git('tag'),
      status: git('status', '--porcelain'),
    };
    const args = {
      projects,
      dryRun: true,
      gitCommit: false,
      gitTag: false,
      gitPush: false,
      stageChanges: false,
      ...(first ? { firstRelease: true, specifier: '0.0.1' } : {}),
    };
    // Fixture-only disk fallback permits proving non-bumping init without an existing tag.
    const override = { version: { fallbackCurrentVersionResolver: 'disk' } };
    const script = apply
      ? `import(${JSON.stringify(new URL('./version.mjs', import.meta.url).href)}).then(({versionSource})=>versionSource(${JSON.stringify(first ? 'first' : 'next')},${JSON.stringify(projects)}))
      .then(r=>require('node:fs').writeFileSync('result.json',JSON.stringify(r.projectsVersionData)))
      .catch(e=>{console.error(e);process.exitCode=1});`
      : `const {ReleaseClient}=require(${JSON.stringify(resolve(root, 'node_modules/nx/dist/release/index.js'))});
      new ReleaseClient(${JSON.stringify(override)}).releaseVersion(${JSON.stringify(args)})
      .then(r=>require('node:fs').writeFileSync('result.json',JSON.stringify(r.projectsVersionData)))
      .catch(e=>{console.error(e);process.exitCode=1});`;
    try {
      const output = run(process.execPath, ['-e', script]);
      if (process.env.RELEASE_TEST_DEBUG) console.log(output);
    } catch (e) {
      throw new Error(`Nx dry run failed:\n${e.stdout}\n${e.stderr}`);
    }
    if (apply) {
      const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
      assert.equal(
        git('rev-parse', 'HEAD'),
        before.head,
        'No automatic release commit',
      );
      assert.equal(git('tag'), before.tags, 'No automatic tags');
      assert.equal(
        git('diff', '--cached', '--name-only'),
        '',
        'Changes remain unstaged for review',
      );
      for (const [name, data] of Object.entries(result)) {
        const manifest = JSON.parse(
          readFileSync(join(dir, 'packages', name, 'package.json'), 'utf8'),
        );
        assert.equal(manifest.version, data.newVersion ?? data.currentVersion);
        if (data.newVersion)
          assert.ok(
            readFileSync(
              join(dir, 'packages', name, 'CHANGELOG.md'),
              'utf8',
            ).includes(data.newVersion),
          );
        if (dependency && name === names[1])
          assert.equal(
            manifest.dependencies['@anarchitects/modeling-core'],
            'workspace:*',
          );
      }
      if (first) {
        git('add', '.');
        git('commit', '--quiet', '-m', 'chore: prepare first release');
        run(process.execPath, [
          '-e',
          `const {releaseVersion}=require(${JSON.stringify(resolve(root, 'node_modules/nx/dist/release/index.js'))});
          releaseVersion(${JSON.stringify(args)}).then(r=>require('node:fs').writeFileSync('result.json',JSON.stringify(r.projectsVersionData)));`,
        ]);
        const candidate = JSON.parse(
          readFileSync(join(dir, 'result.json'), 'utf8'),
        );
        for (const data of Object.values(candidate)) {
          assert.equal(data.currentVersion, '0.0.1');
          assert.equal(data.newVersion, '0.0.1');
        }
      }
      return result;
    }
    assert.deepEqual(
      {
        head: git('rev-parse', 'HEAD'),
        tags: git('tag'),
        status: git('status', '--porcelain'),
      },
      before,
      'Dry runs must not change manifests, lockfiles, commits or tags',
    );
    return JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('first release writes source versions and remains reproducible before tagging', () => {
  dryRun({
    versions: {},
    commits: [],
    first: true,
    apply: true,
    dependency: true,
  });
});

test('installed Nx calculates lifecycle, zero-major and stable versions without mutation', () => {
  const core = names[0],
    meta = names[1];
  const cases = [
    ['0.0.0', `init(${core}): initial implementation`, null],
    ['0.3.2', `fix(${core}): repair`, '0.3.3'],
    ['0.3.2', `feat(${core}): compatible extension`, '0.3.3'],
    ['0.3.2', `feat(${core})!: incompatible extension`, '0.4.0'],
    ['0.3.2', `fix(${core}): change\n\nBREAKING CHANGE: incompatible`, '0.4.0'],
    ['0.3.2', `docs(${core}): explain`, null],
    ['1.3.2', `feat(${core}): compatible extension`, '1.4.0'],
    ['1.3.2', `fix(${core})!: incompatible extension`, '2.0.0'],
    ...['perf', 'refactor', 'revert'].map((type) => [
      '0.3.2',
      `${type}(${core}): change`,
      '0.3.3',
    ]),
    ...['chore', 'style', 'test', 'e2e', 'build', 'ci'].map((type) => [
      '0.3.2',
      `${type}(${core}): maintain`,
      null,
    ]),
  ];
  for (const [version, message, expected] of cases) {
    const result = dryRun({
      versions: { [core]: version, [meta]: '0.1.7' },
      commits: [{ project: core, message }],
    });
    assert.equal(result[core].newVersion, expected, message);
    assert.equal(
      result[meta].newVersion,
      null,
      'independent unchanged package',
    );
  }
  const first = dryRun({
    versions: {},
    commits: [{ project: core, message: `init(${core}): create` }],
    first: true,
  });
  assert.equal(first[core].newVersion, '0.0.1');
  assert.equal(first[meta].newVersion, '0.0.1');
  const mixed = dryRun({
    versions: { [core]: '0.3.2' },
    commits: [
      { project: core, message: `fix(${core}): repair` },
      { project: meta, message: `init(${meta}): create` },
    ],
  });
  assert.equal(mixed[core].newVersion, '0.3.3');
  assert.equal(mixed[meta].newVersion, null);
  const dependent = dryRun({
    versions: { [core]: '0.3.2', [meta]: '0.1.7' },
    dependency: true,
    projects: [core],
    commits: [{ project: core, message: `fix(${core}): repair` }],
  });
  assert.equal(dependent[core].newVersion, '0.3.3');
  assert.equal(
    dependent[meta].newVersion,
    '0.1.8',
    'filtered release still includes dependent patch',
  );
});

test('source versioning uses installed Nx to update manifests and changelogs without commits or tags', () => {
  const [core, meta] = names;
  const result = dryRun({
    apply: true,
    dependency: true,
    projects: [core],
    versions: { [core]: '0.0.1', [meta]: '0.0.1' },
    commits: [{ project: core, message: `fix(${core}): repair` }],
  });
  assert.equal(result[core].newVersion, '0.0.2');
  assert.equal(result[meta].newVersion, '0.0.2');
});
