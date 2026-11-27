import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest } from '../boundaries/policy.mjs';
import { config } from './prepare.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (path, value) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const shellQuote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";

// A controller-owned workspace: no candidate Nx plugins, build tasks, dotenv
// files or lifecycle scripts are loaded in the credential-bearing process.
export function createPublishWorkspace(
  directory,
  workspace,
  report,
  histories,
  publishNames,
) {
  directory = resolve(directory);
  workspace = resolve(workspace);
  assert.ok(publishNames.length > 0);
  assert.equal(new Set(publishNames).size, publishNames.length);
  for (const name of publishNames)
    assert.ok(config.packages[name] && report.artifacts[name]);
  mkdirSync(workspace, { recursive: false });
  symlinkSync(
    join(root, 'node_modules'),
    join(workspace, 'node_modules'),
    'dir',
  );
  json(join(workspace, 'package.json'), {
    name: 'foundation-publication-controller',
    private: true,
    packageManager: JSON.parse(readFileSync(join(root, 'package.json')))
      .packageManager,
    workspaces: ['projects/*'],
  });
  json(join(workspace, 'nx.json'), {
    plugins: [],
    release: {
      projects: publishNames,
      projectsRelationship: 'independent',
      version: { adjustSemverBumpsForZeroMajorVersion: true },
      git: { commit: false, tag: false, push: false, stageChanges: false },
    },
  });
  json(join(workspace, 'context.json'), {
    directory,
    report,
    histories,
    publishNames,
  });
  const gate = (name, phase) => ({
    executor: 'nx:run-commands',
    cache: false,
    options: {
      command: `node ${shellQuote(join(root, 'tools/publishing/nx-publish-gate.mjs'))} ${phase} ${name}`,
      cwd: workspace,
      forwardAllArgs: false,
    },
  });
  for (const name of publishNames) {
    const artifact = report.artifacts[name];
    assert.equal(basename(artifact.file), artifact.file);
    const archive = join(directory, artifact.file);
    assert.equal(digest(readFileSync(archive)), artifact.sha256);
    const destination = join(workspace, 'distribution', name);
    mkdirSync(destination, { recursive: true });
    const listing = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
      .trim()
      .split('\n');
    for (const path of listing)
      assert.match(path, /^package\/(?!.*(?:^|\/)\.\.(?:\/|$))[^\\]+$/);
    const verbose = execFileSync('tar', ['-tvf', archive], {
      encoding: 'utf8',
    });
    assert.ok(
      verbose
        .trim()
        .split('\n')
        .every((line) => /^[d-]/.test(line)),
      'Archive links/devices forbidden',
    );
    execFileSync('tar', [
      '-xf',
      archive,
      '--strip-components=1',
      '-C',
      destination,
    ]);
    const manifest = JSON.parse(
      readFileSync(join(destination, 'package.json')),
    );
    assert.deepEqual(manifest, artifact.manifest);
    assert.equal(
      manifest.scripts,
      undefined,
      'Candidate lifecycle scripts forbidden',
    );
    assert.deepEqual(manifest.publishConfig, {
      access: 'public',
      registry: config.registry,
      provenance: true,
    });
    const packed = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          destination,
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          workspace,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            npm_config_ignore_scripts: 'true',
            npm_config_cache: join(workspace, '.npm-cache'),
          },
        },
      ),
    )[0];
    assert.equal(
      digest(readFileSync(join(workspace, packed.filename))),
      artifact.sha256,
      'Nx directory publication must repack to the exact approved bytes',
    );
    const project = join(workspace, 'projects', name);
    mkdirSync(project, { recursive: true });
    json(join(project, 'package.json'), {
      name: manifest.name,
      version: manifest.version,
      dependencies: manifest.dependencies,
    });
    const before = gate(name, 'before');
    if (name === 'modeling-metamodel' && publishNames.includes('modeling-core'))
      before.dependsOn = [
        { projects: ['modeling-core'], target: 'verify-published' },
      ];
    json(join(project, 'project.json'), {
      name,
      targets: {
        'publication-preflight': before,
        'nx-release-publish': {
          executor: '@nx/js:release-publish',
          cache: false,
          dependsOn: ['publication-preflight'],
          options: {
            packageRoot: `distribution/${name}`,
            registry: config.registry,
            access: 'public',
            tag: 'latest',
          },
        },
        'verify-published': {
          ...gate(name, 'after'),
          dependsOn: ['nx-release-publish'],
        },
      },
    });
  }
  return workspace;
}

export function runNxPublication(workspace) {
  // No project filter: all and only the approved set is configured above. Nx
  // preserves task dependencies (a CLI project filter would disable them).
  execFileSync(
    process.execPath,
    [join(root, 'node_modules/nx/dist/bin/nx.js'), 'release', 'publish'],
    {
      cwd: workspace,
      stdio: 'inherit',
      env: {
        ...process.env,
        NX_WORKSPACE_ROOT_PATH: workspace,
        NX_DAEMON: 'false',
        NX_ISOLATE_PLUGINS: 'false',
        NX_NO_CLOUD: 'true',
        NX_LOAD_DOT_ENV_FILES: 'false',
        NX_INTERACTIVE: 'false',
        NX_WORKSPACE_DATA_DIRECTORY: join(workspace, '.nx/workspace-data'),
        npm_config_ignore_scripts: 'true',
        npm_config_provenance: 'true',
      },
    },
  );
}

// Preparation-only entry point: verify exact repacking before owner review.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [directory, workspace] = process.argv.slice(2);
  assert.ok(
    directory && workspace,
    'Candidate directory and new workspace required',
  );
  const report = JSON.parse(readFileSync(join(directory, 'candidate.json')));
  createPublishWorkspace(
    directory,
    workspace,
    report,
    {},
    Object.keys(report.artifacts),
  );
  json(join(directory, 'nx-publication-check.json'), {
    sourceSha: report.sourceSha,
    nx: JSON.parse(readFileSync(join(root, 'node_modules/nx/package.json')))
      .version,
    npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    artifacts: Object.fromEntries(
      Object.entries(report.artifacts).map(([name, a]) => [name, a.sha256]),
    ),
    result: 'exact-repack-verified',
  });
}
