import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));

test(
  'versioned source is required for release archives; unchanged core stays a non-published companion',
  { timeout: 120000 },
  () => {
    const temporary = realpathSync(
      mkdtempSync(join(tmpdir(), 'foundation-source-release-')),
    );
    const workspace = join(temporary, 'workspace');
    mkdirSync(workspace);
    const env = {
      ...process.env,
      NX_WORKSPACE_ROOT_PATH: workspace,
      NX_DAEMON: 'false',
      NX_ISOLATE_PLUGINS: 'false',
      NX_NO_CLOUD: 'true',
      NX_INTERACTIVE: 'false',
      NX_WORKSPACE_DATA_DIRECTORY: join(workspace, '.nx/workspace-data'),
      npm_config_cache: join(temporary, 'npm-cache'),
    };
    for (const key of Object.keys(env))
      if (/TOKEN|SECRET|PASSWORD|PRIVATE_KEY/.test(key)) delete env[key];
    const run = (cmd, args) =>
      execFileSync(cmd, args, {
        cwd: workspace,
        env,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 90000,
      });
    const git = (...args) => run('git', args).trim();
    const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
    try {
      // Documentation-only CI may have selected no builds. This proof needs the
      // real outputs, so resolve them through Nx (including its normal cache).
      execFileSync('yarn', ['nx', 'run-many', '-t', 'build'], {
        cwd: source,
        env: {
          ...env,
          NX_WORKSPACE_ROOT_PATH: source,
          NX_WORKSPACE_DATA_DIRECTORY: join(temporary, 'source-graph'),
        },
        stdio: 'pipe',
        timeout: 90000,
      });
      const files = execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { cwd: source, encoding: 'utf8' },
      )
        .split('\0')
        .filter(Boolean);
      for (const file of files.filter(
        (file) =>
          /^(tools\/|packages\/|docs\/|\.github\/workflows\/)/.test(file) ||
          !file.includes('/'),
      )) {
        const destination = join(workspace, file);
        mkdirSync(dirname(destination), { recursive: true });
        cpSync(join(source, file), destination);
      }
      // Copy only the validated runtime output needed by archive preparation.
      for (const name of ['modeling-core', 'modeling-metamodel']) {
        cpSync(
          join(source, 'packages', name, 'dist'),
          join(workspace, 'packages', name, 'dist'),
          { recursive: true },
        );
        const path = join(workspace, 'packages', name, 'package.json');
        writeFileSync(
          path,
          JSON.stringify({ ...json(path), version: '0.0.1' }, null, 2) + '\n',
        );
      }
      symlinkSync(
        join(source, 'node_modules'),
        join(workspace, 'node_modules'),
        'dir',
      );
      git('init', '--quiet');
      git('config', 'user.name', 'Release fixture');
      git('config', 'user.email', 'fixture@example.invalid');
      git('config', 'commit.gpgsign', 'false');
      git('config', 'tag.gpgsign', 'false');
      git('add', '.');
      git('commit', '--quiet', '-m', 'chore: synthetic published baseline');
      for (const name of ['modeling-core', 'modeling-metamodel'])
        git('tag', `${name}@0.0.1`);
      writeFileSync(
        join(workspace, 'packages/modeling-metamodel/release-fixture.txt'),
        'synthetic feature\n',
      );
      git('add', '.');
      git(
        'commit',
        '--quiet',
        '-m',
        'feat(modeling-metamodel): synthetic change',
      );
      const stale = spawnSync(
        process.execPath,
        ['tools/publishing/prepare.mjs', join(temporary, 'stale'), 'next'],
        { cwd: workspace, env, encoding: 'utf8' },
      );
      assert.notEqual(stale.status, 0);
      assert.match(stale.stderr, /apply Nx versions and commit/);
      run(process.execPath, [
        'tools/publishing/prepare.mjs',
        join(temporary, 'snapshot'),
        'snapshot',
      ]);
      assert.equal(
        json(join(temporary, 'snapshot/candidate.json')).mode,
        'snapshot',
      );
      run(process.execPath, ['tools/release/version.mjs', 'next']);
      assert.equal(
        json(join(workspace, 'packages/modeling-metamodel/package.json'))
          .version,
        '0.0.2',
      );
      assert.equal(
        json(join(workspace, 'packages/modeling-core/package.json')).version,
        '0.0.1',
      );
      assert.ok(
        readFileSync(
          join(workspace, 'packages/modeling-metamodel/CHANGELOG.md'),
          'utf8',
        ).includes('0.0.2'),
      );
      git('add', '.');
      git('commit', '--quiet', '-m', 'chore: prepare package release');
      const candidateDirectory = join(temporary, 'candidate');
      run(process.execPath, [
        'tools/publishing/prepare.mjs',
        candidateDirectory,
        'next',
      ]);
      const candidate = json(join(candidateDirectory, 'candidate.json'));
      assert.equal(candidate.sourceSha, git('rev-parse', 'HEAD'));
      assert.deepEqual(Object.keys(candidate.artifacts), [
        'modeling-metamodel',
      ]);
      assert.deepEqual(Object.keys(candidate.supportArtifacts), [
        'modeling-core',
      ]);
      assert.equal(
        candidate.artifacts['modeling-metamodel'].manifest.version,
        '0.0.2',
      );
      assert.equal(
        candidate.artifacts['modeling-metamodel'].manifest.dependencies[
          '@anarchitects/modeling-core'
        ],
        '0.0.1',
      );
      assert.equal(
        candidate.supportArtifacts['modeling-core'].manifest.version,
        '0.0.1',
      );
      if (process.env.RELEASE_TEST_CONSUMER === 'true')
        run(process.execPath, [
          'tools/consumer/check.mjs',
          join(temporary, 'consumer'),
          candidateDirectory,
        ]);
      git('tag', 'modeling-metamodel@0.0.2');
      const tagged = spawnSync(
        process.execPath,
        ['tools/publishing/prepare.mjs', join(temporary, 'tagged'), 'next'],
        { cwd: workspace, env, encoding: 'utf8' },
      );
      assert.notEqual(
        tagged.status,
        0,
        'After tagging reuse reviewed archives, never recalculate',
      );
      assert.match(tagged.stderr, /Nx proposed no release artifacts/);
      assert.equal(git('status', '--porcelain'), '');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  },
);
