import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

// Exact published baseline authorized/verified in #23 comment 7204975899.
const sourceSha = 'fa82048545613c7f3dcc8b367af9bfc30ef6e448';
const releaseRun = '45905753413';
const pins = {
  'modeling-core': {
    version: '0.0.2',
    sha256: '34a09c2efb87a7338f53caccc53264885ec9f8707d58203396fe656b8c5c7c88',
  },
  'modeling-metamodel': {
    version: '0.0.2',
    sha256: '62955b7dc05cba8426543715896334c55fbc55ce7aff58bd628d01907cb5a0f5',
  },
};
const root = fileURLToPath(new URL('../../', import.meta.url));
const evidence = mkdtempSync(join(tmpdir(), 'foundation-contract-evidence-'));
const temporary = realpathSync(
  mkdtempSync(join(tmpdir(), 'foundation-contract-consumer-')),
);
assert.ok(!temporary.startsWith(realpathSync(root) + '/'));
const home = join(temporary, 'home'),
  consumer = join(temporary, 'consumer');
mkdirSync(home);
mkdirSync(consumer);
writeFileSync(join(home, 'user.npmrc'), '');
writeFileSync(join(home, 'global.npmrc'), '');
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
  npm_config_cache: join(temporary, 'cache'),
  npm_config_registry: 'https://registry.npmjs.org',
  npm_config_ignore_scripts: 'true',
  npm_config_audit: 'false',
  npm_config_fund: 'false',
  npm_config_engine_strict: 'true',
};
const run = (command, args, cwd = consumer) =>
  execFileSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = (bytes, algorithm = 'sha256', encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);
const report = {
  sourceSha,
  releaseRun,
  checkedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  artifacts: {},
  checks: [],
};
console.log(`Contract proof evidence: ${evidence}`);
try {
  write(join(consumer, 'package.json'), {
    private: true,
    type: 'module',
    dependencies: {
      '@anarchitects/modeling-core': '0.0.2',
      '@anarchitects/modeling-metamodel': '0.0.2',
      tslib: '2.9.1',
    },
  });
  run('npm', ['install']);
  const lock = json(join(consumer, 'package-lock.json'));
  assert.deepEqual(Object.keys(lock.packages).sort(), [
    '',
    'node_modules/@anarchitects/modeling-core',
    'node_modules/@anarchitects/modeling-metamodel',
    'node_modules/tslib',
  ]);
  for (const [name, pin] of Object.entries(pins)) {
    const entry = lock.packages[`node_modules/@anarchitects/${name}`];
    assert.equal(entry.version, pin.version);
    assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//);
    const response = await fetch(entry.resolved);
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(
      hash(bytes),
      pin.sha256,
      'Registry archive differs from accepted release',
    );
    assert.equal(`sha512-${hash(bytes, 'sha512', 'base64')}`, entry.integrity);
    const directory = join(consumer, 'node_modules/@anarchitects', name);
    const manifest = json(join(directory, 'package.json'));
    assert.equal(manifest.license, 'Apache-2.0');
    assert.equal(manifest.version, pin.version);
    for (const file of ['LICENSE', 'NOTICE'])
      assert.ok(readFileSync(join(directory, file)).length);
    if (name === 'modeling-metamodel')
      assert.equal(
        manifest.dependencies['@anarchitects/modeling-core'],
        '0.0.2',
      );
    report.artifacts[name] = {
      ...pin,
      integrity: entry.integrity,
      dependencies: manifest.dependencies,
    };
  }
  for (const file of [
    'runtime.mjs',
    'types.mts',
    'typecheck.mjs',
    'conceptual-logical.mts',
  ])
    cpSync(join(root, 'tools/consumer', file), join(consumer, file));
  report.checks.push(run(process.execPath, ['runtime.mjs']).trim());
  run('npm', ['install', '--save-dev', '--save-exact', 'typescript@6.0.3']);
  for (const mode of ['NodeNext', 'Node16'])
    write(join(consumer, `tsconfig.${mode}.json`), {
      compilerOptions: {
        target: 'ES2022',
        module: mode,
        moduleResolution: mode,
        strict: true,
        skipLibCheck: false,
        types: [],
        outDir: `out-${mode}`,
      },
      include: ['types.mts', 'conceptual-logical.mts'],
    });
  const execute = () => {
    report.checks.push(run(process.execPath, ['typecheck.mjs']).trim());
    const next = JSON.parse(
      run(process.execPath, ['out-NodeNext/conceptual-logical.mjs']),
    );
    const node16 = JSON.parse(
      run(process.execPath, ['out-Node16/conceptual-logical.mjs']),
    );
    assert.deepEqual(
      next,
      node16,
      'Both module resolution modes must execute the same proof',
    );
    return next;
  };
  const result = execute();
  // Actual old reader, isolated from both the current consumer and the workspace.
  const old = join(temporary, 'old-reader');
  mkdirSync(old);
  write(join(old, 'package.json'), {
    private: true,
    type: 'module',
    dependencies: {
      '@anarchitects/modeling-core': '0.0.1',
      '@anarchitects/modeling-metamodel': '0.0.1',
      tslib: '2.9.1',
    },
  });
  run('npm', ['install'], old);
  write(join(old, 'documents.json'), result.documents);
  writeFileSync(
    join(old, 'reader.mjs'),
    `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as api from '@anarchitects/modeling-metamodel';
assert.equal(api.compareDocumentSnapshots, undefined);
for (const item of Object.values(JSON.parse(readFileSync('documents.json', 'utf8')))) {
  const bytes = new TextEncoder().encode(JSON.stringify(item.envelope));
  const decoded = api.decodeDocument(bytes, item.context);
  assert.equal(decoded.status, 'decoded');
  assert.equal(decoded.classification, item.classification);
  // The codec deliberately returns null-prototype records; compare wire content.
  assert.deepEqual(JSON.parse(JSON.stringify(decoded.checkpoint)), item.envelope.checkpoint);
}
console.log('0.0.1 reader preserves all four 0.0.2 fixture envelopes and coverage; comparator absent.');
`,
  );
  report.checks.push(run(process.execPath, ['reader.mjs'], old).trim());
  cpSync(
    join(old, 'package-lock.json'),
    join(evidence, 'old-reader-package-lock.json'),
  );
  rmSync(join(consumer, 'node_modules'), { recursive: true });
  rmSync(join(temporary, 'cache'), { recursive: true, force: true });
  run('npm', ['ci']);
  report.checks.push(run(process.execPath, ['runtime.mjs']).trim());
  assert.deepEqual(
    execute(),
    result,
    'Lockfile reinstall must reproduce every observation',
  );
  const signatures = run('npm', [
    'audit',
    'signatures',
    '--include-attestations',
  ]);
  writeFileSync(join(evidence, 'signatures.txt'), signatures);
  report.checks.push(
    'npm registry signatures/attestations verified; exact lockfile reinstall reproduced fixture',
  );
  cpSync(
    join(consumer, 'package-lock.json'),
    join(evidence, 'package-lock.json'),
  );
  write(join(evidence, 'fixture.json'), result);
  report.fixtureSha256 = hash(
    readFileSync(join(root, 'tools/consumer/conceptual-logical.mts')),
  );
  report.fixtureChecks = result.checks.length;
  write(join(evidence, 'evidence.json'), report);
  console.log(
    `Passed ${result.checks.length} fixture assertions in NodeNext and Node16, before and after reinstall; old reader passed.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
