// Uncached local-development proof: private Yarn archives, no release preparation or publication.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  documentationFiles,
  verifyDocumentation,
  quickStart,
} from '../publishing/documentation.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const evidence = realpathSync(
  mkdtempSync(join(tmpdir(), 'foundation-authoring-proof-')),
);
const consumer = join(evidence, 'consumer'),
  legacy = join(evidence, 'legacy'),
  home = join(evidence, 'home');
for (const dir of [consumer, legacy, home]) mkdirSync(dir);
for (const file of ['user.npmrc', 'global.npmrc'])
  writeFileSync(join(home, file), '');
const env = {
  PATH: [
    dirname(process.execPath),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].join(':'),
  HOME: home,
  TMPDIR: evidence,
  npm_config_userconfig: join(home, 'user.npmrc'),
  npm_config_globalconfig: join(home, 'global.npmrc'),
  npm_config_cache: join(evidence, 'cache'),
  npm_config_registry: 'https://registry.npmjs.org',
  npm_config_ignore_scripts: 'true',
  npm_config_audit: 'false',
  npm_config_fund: 'false',
};
const run = (cmd, args, cwd = consumer) =>
  execFileSync(cmd, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
const write = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const report = {
  kind: 'unpublished-working-tree-archives',
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  node: process.version,
  runtimeBaselineSha256: hash(
    readFileSync(join(root, 'tools/boundaries/runtime-baseline.json')),
  ),
  exampleSha256: hash(
    readFileSync(
      join(root, 'docs/consumer/examples/incremental-authoring.mts'),
    ),
  ),
  artifacts: {},
  checks: [],
};
console.log(`Authoring evidence: ${evidence}`);
for (const name of ['modeling-core', 'modeling-metamodel']) {
  const archive = join(evidence, `${name}.tgz`);
  execFileSync(
    'yarn',
    ['workspace', `@anarchitects/${name}`, 'pack', '--out', archive],
    { cwd: root, stdio: 'pipe' },
  );
  const manifest = JSON.parse(
    execFileSync('tar', ['-xOf', archive, 'package/package.json'], {
      encoding: 'utf8',
    }),
  );
  assert.equal(
    manifest.private,
    true,
    'Local proof must retain private package metadata',
  );
  // Exercise the same documentation transformation as publication, while
  // retaining private metadata and explicitly labeling these working-tree bytes.
  const staging = join(evidence, 'staging', name, 'package');
  mkdirSync(staging, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', staging]);
  const docs = documentationFiles(
    name,
    manifest.version,
    report.baseCommit,
    'anarchitects/anarchitecture-modeling',
    read(join(root, 'packages/modeling-core/package.json')).version,
  );
  for (const [file, content] of Object.entries(docs.files)) {
    mkdirSync(dirname(join(staging, file)), { recursive: true });
    writeFileSync(join(staging, file), content);
  }
  for (const file of ['LICENSE', 'NOTICE'])
    cpSync(join(root, file), join(staging, file));
  manifest.homepage = docs.homepage;
  manifest.files = [...manifest.files, 'docs', 'LICENSE', 'NOTICE'];
  write(join(staging, 'package.json'), manifest);
  verifyDocumentation(
    name,
    manifest,
    (file) => readFileSync(join(staging, file)),
    report.baseCommit,
    'anarchitects/anarchitecture-modeling',
  );
  execFileSync('tar', ['-czf', archive, '-C', dirname(staging), 'package']);
  report.artifacts[name] = {
    version: manifest.version,
    sha256: hash(readFileSync(archive)),
    readmeSha256: hash(readFileSync(join(staging, 'README.md'))),
  };
}
write(join(consumer, 'package.json'), { private: true, type: 'module' });
run('npm', [
  'install',
  '--save-exact',
  '../modeling-core.tgz',
  '../modeling-metamodel.tgz',
  'tslib@2.9.1',
  'typescript@6.0.3',
]);
const runReadmes = () => {
  for (const name of ['modeling-core', 'modeling-metamodel']) {
    const dir = join(consumer, 'node_modules/@anarchitects', name);
    const manifest = read(join(dir, 'package.json'));
    verifyDocumentation(
      name,
      manifest,
      (file) => readFileSync(join(dir, file)),
      report.baseCommit,
      'anarchitects/anarchitecture-modeling',
    );
    const example = quickStart(readFileSync(join(dir, 'README.md'), 'utf8'));
    writeFileSync(join(consumer, 'quickstart.mjs'), example.source);
    assert.equal(
      run(process.execPath, ['quickstart.mjs']).trim(),
      example.output,
    );
    console.log(
      `${name}: installed README quick start and shipped documentation match.`,
    );
  }
};
runReadmes();
report.checks.push(
  'Actual staged documentation, offline links/resources, license/notices and installed README examples',
);
for (const name of ['modeling-core', 'modeling-metamodel']) {
  const installed = join(consumer, 'node_modules/@anarchitects', name);
  assert.ok(realpathSync(installed).startsWith(consumer + '/'));
  assert.equal(
    read(join(installed, 'package.json')).version,
    report.artifacts[name].version,
  );
}
cpSync(
  join(root, 'docs/consumer/examples/incremental-authoring.mts'),
  join(consumer, 'authoring.mts'),
);
cpSync(join(root, 'tools/consumer/types.mts'), join(consumer, 'types.mts'));
cpSync(
  join(root, 'tools/consumer/typecheck.mjs'),
  join(consumer, 'typecheck.mjs'),
);
for (const mode of ['NodeNext', 'Node16'])
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
    include: ['types.mts', 'authoring.mts'],
  });
const prove = () => {
  console.log(run(process.execPath, ['typecheck.mjs']).trim());
  for (const mode of ['NodeNext', 'Node16'])
    console.log(run(process.execPath, [`out-${mode}/authoring.mjs`]).trim());
};
prove();
report.checks.push(
  'Actual npm file-archive installation; strict consumer-installed TypeScript 6.0.3 NodeNext/Node16; runtime, negative cases and distinct legacy commit types',
);
const lock = read(join(consumer, 'package-lock.json'));
report.installed = lock.packages;
cpSync(
  join(consumer, 'package-lock.json'),
  join(evidence, 'consumer-package-lock.json'),
);
rmSync(join(consumer, 'node_modules'), { recursive: true });
run('npm', ['ci']);
runReadmes();
prove();
report.checks.push(
  'Lockfile reinstall and repeated public-root runtime/type proof',
);
run(process.execPath, [
  '--input-type=module',
  '-e',
  "import {writeFileSync} from 'node:fs'; import {draftBytes} from './out-NodeNext/authoring.mjs'; writeFileSync('../draft.json', draftBytes);",
]);
write(join(legacy, 'package.json'), { private: true, type: 'module' });
run(
  'npm',
  [
    'install',
    '--save-exact',
    '@anarchitects/modeling-core@0.0.2',
    '@anarchitects/modeling-metamodel@0.0.2',
    'tslib@2.9.1',
  ],
  legacy,
);
writeFileSync(
  join(legacy, 'reader.mjs'),
  `import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeDocument} from '@anarchitects/modeling-metamodel';
const bytes = readFileSync('../draft.json');
const result = decodeDocument(bytes, {packs:[], validationRules:[], defaultRules:[], notations:[], theme:{id:'plain',tokens:{}}});
assert.equal(result.status, 'not-decoded'); assert.equal(result.reason, 'unsupported-format'); assert.equal(result.source, bytes);
console.log('Actual registry 0.0.2 old reader rejected authoring envelope and preserved original bytes.');\n`,
);
console.log(run(process.execPath, ['reader.mjs'], legacy).trim());
cpSync(
  join(legacy, 'package-lock.json'),
  join(evidence, 'old-reader-package-lock.json'),
);
report.checks.push(
  'Actual registry core/metamodel 0.0.2 reader refuses new envelope without discarding bytes',
);
write(join(evidence, 'report.json'), report);
console.log(
  `All authoring archive/installed/old-reader checks passed; retained ${join(evidence, 'report.json')}`,
);
