import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  digest,
  filesWithoutLinks,
  checkManifest,
  inspectLayer,
} from '../boundaries/policy.mjs';
import { documentationFiles } from './documentation.mjs';
import { assertSourceVersions } from '../release/versioning.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const config = JSON.parse(
  readFileSync(new URL('./config.json', import.meta.url)),
);
const baseline = JSON.parse(
  readFileSync(new URL('../boundaries/runtime-baseline.json', import.meta.url)),
);
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const run = (command, args, cwd = root) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

export function prepare(output, mode = 'next') {
  output = resolve(output);
  assert.ok(
    !existsSync(output),
    'Use a new output directory; never overwrite reviewed artifacts',
  );
  assert.ok(
    ['first', 'next', 'snapshot'].includes(mode),
    'Expected first, next or non-publishable snapshot',
  );
  assert.equal(
    run('git', ['status', '--porcelain']).trim(),
    '',
    'Preparation requires a clean tracked tree',
  );
  mkdirSync(output, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), 'foundation-publish-prepare-'));
  try {
    const planFile = join(temporary, 'nx-versions.json');
    const manifests = Object.fromEntries(
      Object.keys(config.packages).map((name) => [
        name,
        json(join(root, 'packages', name, 'package.json')),
      ]),
    );
    if (mode !== 'snapshot')
      run(process.execPath, [
        'tools/release/preview.mjs',
        planFile,
        mode,
        ...Object.keys(config.packages),
      ]);
    // CI packaging checks inspect source versions without proposing a release.
    // The publisher rejects snapshots even if someone supplies owner records.
    const projectsVersionData =
      mode === 'snapshot'
        ? Object.fromEntries(
            Object.entries(manifests).map(([name, manifest]) => [
              name,
              {
                currentVersion: manifest.version,
                newVersion: manifest.version,
              },
            ]),
          )
        : json(planFile);
    assertSourceVersions(projectsVersionData, manifests, 'after');
    const sourceSha = run('git', ['rev-parse', 'HEAD']).trim();
    assert.equal(
      run('git', ['status', '--porcelain']).trim(),
      '',
      'Preparation requires a clean tracked tree',
    );
    const core = projectsVersionData['modeling-core'];
    const coreVersion = core.newVersion ?? core.currentVersion;
    const report = {
      schemaVersion: 1,
      sourceSha,
      mode,
      lockfileSha256: digest(readFileSync(join(root, 'yarn.lock'))),
      toolchain: {
        node: process.version,
        npm: run('npm', ['--version']).trim(),
        yarn: json(join(root, 'package.json')).packageManager,
        nx: json(join(root, 'node_modules/nx/package.json')).version,
      },
      licenseStatus: config.license.status,
      projectsVersionData,
      artifacts: {},
      supportArtifacts: {},
    };
    for (const [name, description] of Object.entries(config.packages)) {
      const data = projectsVersionData[name];
      const version = data.newVersion ?? data.currentVersion;
      const source = join(root, 'packages', name);
      const stage = join(temporary, name);
      mkdirSync(stage);
      const manifest = manifests[name];
      checkManifest(manifest, name);
      // Copy only the exact accepted runtime inventory; fail on extra outputs.
      for (const [layer, suffix] of [
        ['javascript', '.js'],
        ['declaration', '.d.ts'],
      ]) {
        inspectLayer(
          join(source, 'dist'),
          name,
          layer,
          baseline.packages[name][layer],
        );
        for (const file of filesWithoutLinks(join(source, 'dist')).filter((f) =>
          f.endsWith(suffix),
        )) {
          const destination = join(
            stage,
            'dist',
            relative(join(source, 'dist'), file),
          );
          mkdirSync(dirname(destination), { recursive: true });
          cpSync(file, destination);
        }
      }
      const documentation = documentationFiles(
        name,
        version,
        sourceSha,
        config.repository,
        coreVersion,
      );
      for (const [path, content] of Object.entries(documentation.files)) {
        mkdirSync(dirname(join(stage, path)), { recursive: true });
        writeFileSync(join(stage, path), content);
      }
      cpSync(join(root, config.license.licenseFile), join(stage, 'LICENSE'));
      cpSync(join(root, config.license.noticeFile), join(stage, 'NOTICE'));
      const prepared = {
        ...manifest,
        private: config.license.status !== 'accepted',
        description,
        license: config.license.spdx,
        repository: {
          type: 'git',
          url: `git+https://github.com/${config.repository}.git`,
          directory: `packages/${name}`,
        },
        homepage: documentation.homepage,
        bugs: { url: `https://github.com/${config.repository}/issues` },
        files: [
          'dist/**/*.js',
          'dist/**/*.d.ts',
          'README.md',
          'docs/**',
          'LICENSE',
          'NOTICE',
        ],
        publishConfig: {
          access: 'public',
          registry: config.registry,
          provenance: true,
        },
        dependencies: {
          ...manifest.dependencies,
          ...(name === 'modeling-metamodel'
            ? { '@anarchitects/modeling-core': coreVersion }
            : {}),
        },
      };
      checkManifest(prepared, name, { packed: true, coreVersion });
      assert.equal(prepared.scripts, undefined, 'No lifecycle hooks');
      writeFileSync(
        join(stage, 'package.json'),
        JSON.stringify(prepared, null, 2) + '\n',
      );
      const [packed] = JSON.parse(
        run(
          'npm',
          ['pack', '--json', '--ignore-scripts', '--pack-destination', output],
          stage,
        ),
      );
      const files = packed.files
        .map((f) => ({ path: f.path, size: f.size }))
        .sort((a, b) => a.path.localeCompare(b.path));
      assert.deepEqual(
        files.map((f) => f.path).sort(),
        filesWithoutLinks(stage)
          .map((f) => relative(stage, f))
          .sort(),
      );
      for (const file of files)
        assert.ok(
          !/(^|\/)\.|\.map$|\.spec\.|\.test\.|tsbuildinfo|\.npmrc/.test(
            file.path,
          ),
          `Forbidden packed file: ${file.path}`,
        );
      const archive = join(output, packed.filename);
      // Unchanged companions are exercised by the independent consumer, but are
      // never included in the publisher's release set or republished.
      const artifacts =
        data.newVersion === null ? report.supportArtifacts : report.artifacts;
      artifacts[name] = {
        file: packed.filename,
        manifestVersion: version,
        artifactVersion: version,
        tag: `${name}@${version}`,
        sha256: digest(readFileSync(archive)),
        integrity: packed.integrity,
        size: packed.size,
        unpackedSize: packed.unpackedSize,
        files,
        manifest: prepared,
      };
    }
    assert.ok(
      Object.keys(report.artifacts).length,
      'Nx proposed no release artifacts',
    );
    writeFileSync(
      join(output, 'candidate.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    return report;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = prepare(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify(
      {
        sourceSha: result.sourceSha,
        licenseStatus: result.licenseStatus,
        artifacts: Object.fromEntries(
          Object.entries(result.artifacts).map(([n, a]) => [
            n,
            {
              file: a.file,
              sha256: a.sha256,
              size: a.size,
              files: a.files.length,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}
