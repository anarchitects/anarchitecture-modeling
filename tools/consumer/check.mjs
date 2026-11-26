import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
  delimiter,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkHelper,
  checkManifest,
  digest,
  filesWithoutLinks,
  inspectLayer,
} from '../boundaries/policy.mjs';
import { config, prepare } from '../publishing/prepare.mjs';
import { verifyLegalFiles } from '../publishing/legal.mjs';
import {
  verifyDocumentation,
  quickStart,
} from '../publishing/documentation.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const output = resolve(process.argv[2] ?? 'tmp/independent-consumer');
assert.ok(
  !existsSync(output),
  'Use a new evidence directory; never overwrite reviewed evidence',
);
mkdirSync(output, { recursive: true });
// Optional input consumes exactly the preview workflow's archives, not repacked copies.
const candidateDirectory = process.argv[3]
  ? resolve(process.argv[3])
  : join(output, 'candidate');
const candidate = process.argv[3]
  ? json(join(candidateDirectory, 'candidate.json'))
  : prepare(candidateDirectory, 'snapshot');
assert.equal(
  candidate.sourceSha,
  execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
);
assert.ok(
  Object.keys(candidate.supportArtifacts ?? {}).every(
    (name) => !Object.hasOwn(candidate.artifacts, name),
  ),
  'Release and support artifact sets must not overlap',
);
const consumerArtifacts = {
  ...candidate.supportArtifacts,
  ...candidate.artifacts,
};
assert.deepEqual(Object.keys(consumerArtifacts).sort(), [
  'modeling-core',
  'modeling-metamodel',
]);
const baseline = json(join(root, 'tools/boundaries/runtime-baseline.json'));
const temporary = realpathSync(
  mkdtempSync(join(tmpdir(), 'foundation-independent-')),
);
assert.ok(
  !temporary.startsWith(realpathSync(root) + '/'),
  'Consumer must be outside the workspace',
);
const consumer = join(temporary, 'consumer'),
  home = join(temporary, 'home');
mkdirSync(consumer);
mkdirSync(home);
mkdirSync(join(consumer, 'artifacts'));
writeFileSync(join(home, 'user.npmrc'), '');
writeFileSync(join(home, 'global.npmrc'), '');
// Explicit allowlist: no inherited npm auth/config, NODE_PATH, NODE_OPTIONS, Nx,
// GitHub token, compiler switches, workspace .bin or user HOME/cache/config.
const env = {
  PATH: [
    dirname(process.execPath),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
  ].join(delimiter),
  HOME: home,
  TMPDIR: temporary,
  CI: 'true',
  npm_config_userconfig: join(home, 'user.npmrc'),
  npm_config_globalconfig: join(home, 'global.npmrc'),
  npm_config_cache: join(temporary, 'npm-cache'),
  npm_config_registry: 'https://registry.npmjs.org',
  npm_config_ignore_scripts: 'true',
  npm_config_audit: 'false',
  npm_config_fund: 'false',
  npm_config_engine_strict: 'true',
};
const run = (command, args) =>
  execFileSync(command, args, {
    cwd: consumer,
    env,
    encoding: 'utf8',
    timeout: 120000,
  });
const node = (args) => run(process.execPath, args);
const names = ['modeling-core', 'modeling-metamodel'];
const manifests = {};
const inventory = () =>
  readdirSync(join(consumer, 'node_modules'))
    .filter((n) => !n.startsWith('.'))
    .flatMap((n) =>
      n.startsWith('@')
        ? readdirSync(join(consumer, 'node_modules', n)).map((p) => `${n}/${p}`)
        : [n],
    )
    .sort();
const report = {
  sourceSha: candidate.sourceSha,
  checkedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  npm: run('npm', ['--version']).trim(),
  typescript: '6.0.3',
  moduleResolution: ['NodeNext', 'Node16'],
  artifacts: {},
  runtimeClosure: {},
  documentation: {},
  checks: [],
};
try {
  for (const name of names) {
    const artifact = consumerArtifacts[name];
    assert.equal(basename(artifact.file), artifact.file);
    const archive = join(candidateDirectory, artifact.file);
    assert.equal(
      digest(readFileSync(archive)),
      artifact.sha256,
      'Candidate archive hash mismatch',
    );
    cpSync(archive, join(consumer, 'artifacts', artifact.file));
    cpSync(
      archive,
      join(consumer, name === 'modeling-core' ? 'core.tgz' : 'metamodel.tgz'),
    );
    report.artifacts[name] = {
      version: artifact.artifactVersion,
      sha256: artifact.sha256,
      integrity: artifact.integrity,
      size: artifact.size,
      unpackedSize: artifact.unpackedSize,
      files: artifact.files,
    };
  }
  const runReadme = (name) => {
    const readme = readFileSync(
      join(consumer, 'node_modules', '@anarchitects', name, 'README.md'),
      'utf8',
    );
    const example = quickStart(readme);
    writeFileSync(join(consumer, 'quickstart.mjs'), example.source + '\n');
    const observed = node(['quickstart.mjs']).trim();
    assert.equal(observed, example.output, `${name}: README expected output`);
    return {
      expected: example.output,
      observed,
      readmeSha256: digest(readme),
      sourceSha256: digest(example.source),
    };
  };
  for (const name of names) {
    // Each README starts with no package configuration or installed dependencies.
    // Retain only the supplied archives and this run's isolated npm cache.
    for (const path of [
      'node_modules',
      'package.json',
      'package-lock.json',
      'quickstart.mjs',
    ])
      rmSync(join(consumer, path), { recursive: true, force: true });
    const artifact = consumerArtifacts[name];
    const read = (path) =>
      execFileSync(
        'tar',
        ['-xOf', join(candidateDirectory, artifact.file), `package/${path}`],
        { encoding: 'utf8' },
      );
    const example = verifyDocumentation(
      name,
      artifact.manifest,
      read,
      candidate.sourceSha,
      config.repository,
    );
    const commands = example.install.split('\n');
    const registryCommands = [
      'npm init -y',
      `npm install --save-exact @anarchitects/modeling-core@${consumerArtifacts['modeling-core'].artifactVersion}${name === 'modeling-metamodel' ? ` @anarchitects/modeling-metamodel@${artifact.artifactVersion}` : ''}`,
    ];
    assert.deepEqual(
      example.registryInstall.split('\n'),
      registryCommands,
      'Registry instructions must pin the exact candidate pair',
    );
    // Execute the documented install steps, without a shell or arbitrary code.
    const expected = [
      'npm init -y',
      `npm install --save-exact ./core.tgz${name === 'modeling-metamodel' ? ' ./metamodel.tgz' : ''}`,
    ];
    assert.deepEqual(
      commands,
      expected,
      'Review changes to README install commands',
    );
    for (const command of commands)
      console.log(run('npm', command.split(' ').slice(1)));
    if (name === 'modeling-core')
      assert.deepEqual(inventory(), ['@anarchitects/modeling-core', 'tslib']);
    report.documentation[name] = {
      commands: [...commands, 'node quickstart.mjs'],
      registryCommands,
      registryInstallExecuted: false,
      ...runReadme(name),
    };
  }
  assert.deepEqual(inventory(), [
    '@anarchitects/modeling-core',
    '@anarchitects/modeling-metamodel',
    'tslib',
  ]);
  const lock = json(join(consumer, 'package-lock.json'));
  for (const name of names) {
    const specifier = `@anarchitects/${name}`,
      directory = join(consumer, 'node_modules', specifier);
    const artifact = consumerArtifacts[name],
      manifest = json(join(directory, 'package.json'));
    manifests[name] = manifest;
    assert.deepEqual(manifest, artifact.manifest);
    assert.equal(manifest.version, artifact.artifactVersion);
    assert.equal(
      lock.packages[`node_modules/${specifier}`].integrity,
      artifact.integrity,
    );
    checkManifest(manifest, name, {
      packed: true,
      coreVersion: consumerArtifacts['modeling-core'].artifactVersion,
    });
    const files = filesWithoutLinks(directory);
    assert.deepEqual(
      files.map((f) => relative(directory, f)).sort(),
      artifact.files.map((f) => f.path).sort(),
    );
    for (const file of files) {
      const path = relative(directory, file);
      const packed = execFileSync('tar', [
        '-xOf',
        join(candidateDirectory, artifact.file),
        `package/${path}`,
      ]);
      assert.deepEqual(
        readFileSync(file),
        packed,
        `Installed bytes differ: ${specifier}/${path}`,
      );
      assert.ok(!/\.map$|\.spec\.|\.test\.|tsbuildinfo|\.npmrc/.test(path));
      if (/\.(js|ts)$/.test(path))
        assert.doesNotMatch(
          readFileSync(file, 'utf8'),
          /sourceMappingURL|sourceURL|@archimatrix\/source/,
        );
    }
    for (const layer of ['javascript', 'declaration'])
      inspectLayer(
        join(directory, 'dist'),
        name,
        layer,
        baseline.packages[name][layer],
      );
    for (const path of [
      manifest.main,
      manifest.module,
      manifest.types,
      'LICENSE',
      'NOTICE',
    ])
      assert.ok(readFileSync(join(directory, path)).length);
    verifyLegalFiles(
      manifest,
      (path) => readFileSync(join(directory, path)),
      config.license,
    );
    verifyDocumentation(
      name,
      manifest,
      (path) => readFileSync(join(directory, path)),
      candidate.sourceSha,
      config.repository,
    );
    report.runtimeClosure[specifier] = {
      version: manifest.version,
      dependencies: manifest.dependencies,
      integrity: lock.packages[`node_modules/${specifier}`].integrity,
    };
  }
  const helper = json(join(consumer, 'node_modules/tslib/package.json'));
  checkHelper(helper);
  filesWithoutLinks(join(consumer, 'node_modules/tslib'));
  assert.match(
    lock.packages['node_modules/tslib'].resolved,
    /^https:\/\/registry\.npmjs\.org\//,
  );
  report.runtimeClosure.tslib = {
    version: helper.version,
    dependencies: {},
    ...lock.packages['node_modules/tslib'],
  };
  write(
    join(output, 'runtime-dependencies.json'),
    JSON.parse(run('npm', ['ls', '--all', '--omit=dev', '--json'])),
  );
  for (const [source, destination] of [
    ['tools/consumer/runtime.mjs', 'runtime.mjs'],
    ['tools/proofs/foundation-smoke.mjs', 'smoke.mjs'],
    ['tools/consumer/types.mts', 'types.mts'],
    ['tools/consumer/typecheck.mjs', 'typecheck.mjs'],
  ])
    cpSync(join(root, source), join(consumer, destination));
  cpSync(
    join(
      consumer,
      'node_modules/@anarchitects/modeling-metamodel/docs/examples/lifecycle.mts',
    ),
    join(consumer, 'lifecycle.mts'),
  );
  console.log(node(['runtime.mjs']));
  console.log(node(['smoke.mjs']));
  report.checks.push(
    'runtime-only install: exact files/exports/legal files/documentation/dependency closure; core-only and paired README quick starts; no compiler or Nx; public behavior and negative cases',
  );

  // Remove the actual core package, then use a fresh process (no ESM module cache).
  const coreDirectory = join(
    consumer,
    'node_modules/@anarchitects/modeling-core',
  );
  renameSync(coreDirectory, join(temporary, 'removed-core'));
  try {
    const missing = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import assert from 'node:assert/strict'; await assert.rejects(import('@anarchitects/modeling-metamodel'), {code:'ERR_MODULE_NOT_FOUND'});",
      ],
      { cwd: consumer, env, encoding: 'utf8' },
    );
    assert.equal(missing.status, 0, missing.stderr);
  } finally {
    renameSync(join(temporary, 'removed-core'), coreDirectory);
  }
  const coreFile = join(coreDirectory, 'package.json'),
    original = readFileSync(coreFile);
  try {
    write(coreFile, { ...manifests['modeling-core'], version: '999.0.0' });
    const incompatible = spawnSync('npm', ['ls', '--all', '--json'], {
      cwd: consumer,
      env,
      encoding: 'utf8',
    });
    assert.notEqual(incompatible.status, 0);
    assert.match(
      incompatible.stderr + incompatible.stdout,
      /invalid|ELSPROBLEMS/,
    );
  } finally {
    writeFileSync(coreFile, original);
  }
  report.checks.push(
    'removed core cannot resolve from ambient workspace; incompatible installed core rejected by npm dependency validation',
  );

  console.log(
    run('npm', [
      'install',
      '--save-dev',
      '--save-exact',
      'typescript@6.0.3',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ]),
  );
  assert.deepEqual(inventory(), [
    '@anarchitects/modeling-core',
    '@anarchitects/modeling-metamodel',
    'tslib',
    'typescript',
  ]);
  for (const mode of report.moduleResolution)
    write(join(consumer, `tsconfig.${mode}.json`), {
      compilerOptions: {
        module: mode,
        moduleResolution: mode,
        target: 'ES2022',
        strict: true,
        skipLibCheck: false,
        types: [],
        noEmitOnError: true,
        outDir: `out-${mode}`,
      },
      include: ['lifecycle.mts', 'types.mts'],
    });
  console.log(node(['typecheck.mjs']));
  for (const mode of report.moduleResolution)
    console.log(node([`out-${mode}/lifecycle.mjs`]));
  report.checks.push(
    'consumer-installed TypeScript: strict NodeNext and Node16 declaration closure, branded identities and blocked paths; emitted lifecycle examples',
  );
  cpSync(
    join(consumer, 'package-lock.json'),
    join(output, 'consumer-package-lock.json'),
  );
  report.consumerLockSha256 = digest(
    readFileSync(join(consumer, 'package-lock.json')),
  );

  // Reinstall from the generated lock after deleting the actual installation.
  rmSync(join(consumer, 'node_modules'), { recursive: true, force: true });
  console.log(
    run('npm', [
      'ci',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ]),
  );
  assert.equal(
    digest(readFileSync(join(consumer, 'package-lock.json'))),
    report.consumerLockSha256,
  );
  console.log(node(['runtime.mjs']));
  console.log(node(['smoke.mjs']));
  for (const name of names) runReadme(name);
  console.log(node(['typecheck.mjs']));
  for (const mode of report.moduleResolution)
    console.log(node([`out-${mode}/lifecycle.mjs`]));
  report.checks.push(
    'lockfile reinstall from disposable cache: runtime, resolution, declarations and lifecycle proofs repeated',
  );
  write(join(output, 'evidence.json'), report);
  console.log(
    `Independent consumer passed: ${names.join(', ')}, Node ${report.node}, TypeScript ${report.typescript}, ${report.moduleResolution.join('/')}. Evidence: ${output}`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
