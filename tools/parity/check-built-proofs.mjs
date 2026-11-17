import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const manifest = JSON.parse(
  readFileSync(new URL('./portable-proofs.json', import.meta.url), 'utf8'),
);
const baseline = JSON.parse(
  readFileSync(
    new URL('../boundaries/runtime-baseline.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(manifest.sourceRevision, baseline.originalSourceCommit);
const sourceRoot = process.env.FOUNDATION_PARITY_SOURCE_ROOT;
const label = sourceRoot
  ? `pinned source ${manifest.sourceRevision}`
  : 'extracted Foundation';
const packageRoot = (name) =>
  sourceRoot
    ? join(sourceRoot, 'packages/modeling', name.replace('modeling-', ''))
    : join(root, 'packages', name);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const temporary = realpathSync(
  mkdtempSync(join(tmpdir(), 'foundation-built-proofs-')),
);

try {
  mkdirSync(join(temporary, 'node_modules/@anarchitects'), { recursive: true });
  for (const name of Object.keys(baseline.packages)) {
    const directory = realpathSync(packageRoot(name));
    // The optional historical comparison accepts only the pinned runtime bytes,
    // not an arbitrary sibling checkout or a branch with a familiar name.
    for (const [file, expected] of Object.entries(
      baseline.packages[name].source,
    )) {
      assert.equal(
        hash(readFileSync(join(directory, 'src', file))),
        expected,
        `${name}/${file}: source revision mismatch`,
      );
    }
    for (const [file, expected] of Object.entries(
      baseline.packages[name].javascript,
    )) {
      assert.equal(
        hash(readFileSync(join(directory, 'dist', file))),
        expected,
        `${name}/${file}: built runtime mismatch`,
      );
    }
    symlinkSync(
      directory,
      join(temporary, 'node_modules/@anarchitects', name),
      'dir',
    );
  }
  symlinkSync(
    join(root, 'node_modules/vitest'),
    join(temporary, 'node_modules/vitest'),
    'dir',
  );
  writeFileSync(
    join(temporary, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );

  for (const spec of manifest.specs) {
    const original = readFileSync(
      join(packageRoot(spec.package), spec.path),
      'utf8',
    );
    assert.equal(
      hash(original),
      spec.sha256,
      `${spec.path}: historical fixture changed`,
    );
    const syntax = ts.createSourceFile(
      spec.path,
      original,
      ts.ScriptTarget.Latest,
      true,
    );
    const edits = [];
    for (const statement of syntax.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const module = statement.moduleSpecifier;
      assert.ok(ts.isStringLiteral(module));
      if (
        module.text === '../index.js' ||
        (spec.package === 'modeling-metamodel' &&
          spec.path === 'src/lib/modeling-metamodel.spec.ts' &&
          module.text === './modeling-metamodel.js')
      ) {
        edits.push({
          start: module.getStart(syntax) + 1,
          end: module.end - 1,
          value: `@anarchitects/${spec.package}`,
        });
      } else
        assert.equal(
          module.text,
          '@anarchitects/modeling-core',
          `Unreviewed fixture import: ${module.text}`,
        );
    }
    assert.equal(
      edits.length,
      1,
      `${spec.path}: expected one own-package import`,
    );
    let rewritten = original;
    for (const edit of edits.reverse())
      rewritten =
        rewritten.slice(0, edit.start) + edit.value + rewritten.slice(edit.end);
    // Only module-specifier bytes change. Fixture data, assertions, diagnostics,
    // unsupported expectations and parameterization are otherwise untouched.
    const destination = join(
      temporary,
      'fixtures',
      spec.package,
      spec.path.split('/').at(-1),
    );
    mkdirSync(join(temporary, 'fixtures', spec.package), { recursive: true });
    writeFileSync(destination, rewritten);
  }

  const entries = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    for (const name of ['modeling-core', 'modeling-metamodel']) {
      const entry = import.meta.resolve('@anarchitects/' + name);
      assert.ok(entry.endsWith('/dist/index.js'), entry);
    }
  `,
    ],
    { cwd: temporary, encoding: 'utf8' },
  );
  assert.equal(entries.status, 0, entries.stderr);
  const report = join(temporary, 'results.json');
  const config = join(temporary, 'vitest.config.mjs');
  writeFileSync(
    config,
    `export default {
    root: ${JSON.stringify(temporary)},
    cacheDir: ${JSON.stringify(join(temporary, 'cache'))},
    plugins: [{ name: 'reject-runtime-source-fallback', load(id) {
      if (id.replaceAll('\\\\', '/').includes('/src/') && !id.startsWith(${JSON.stringify(temporary + '/fixtures/')})) {
        throw new Error('Built-proof runtime fell back to source: ' + id);
      }
    } }],
    test: { globals: true, environment: 'node', watch: false, allowOnly: false,
      include: ['fixtures/**/*.spec.ts'], reporters: ['json'], outputFile: ${JSON.stringify(report)} }
  };`,
  );
  const result = spawnSync('yarn', ['vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const summary = JSON.parse(readFileSync(report, 'utf8'));
  assert.equal(summary.success, true);
  assert.equal(summary.numTotalTests, manifest.cases);
  assert.equal(summary.numPassedTests, manifest.cases);
  assert.equal(summary.numPendingTests, 0);
  assert.equal(summary.testResults.length, manifest.specs.length);
  for (const spec of manifest.specs) {
    const filename = join(
      temporary,
      'fixtures',
      spec.package,
      spec.path.split('/').at(-1),
    );
    const suite = summary.testResults.find((item) => item.name === filename);
    assert.ok(suite, `Missing proof suite ${spec.path}`);
    assert.equal(suite.assertionResults.length, spec.cases);
    assert.ok(suite.assertionResults.every((item) => item.status === 'passed'));
    console.log(
      `${spec.package}/${spec.path}: ${spec.cases} built-public-entry cases passed`,
    );
  }
  console.log(
    `${label}: ${manifest.cases} cases in ${manifest.specs.length} unchanged portable specs passed through built public entries; zero skipped. Only own-package import specifiers were redirected in temporary copies.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
