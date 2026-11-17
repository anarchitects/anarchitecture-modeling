import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkBaseline,
  checkCompilerOptions,
  checkGitEntries,
  checkHelper,
  checkImports,
  checkManifest,
  digest,
  filesWithoutLinks,
} from './policy.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'foundation-boundary-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'lib'));
  for (const suffix of ['.ts', '.js', '.d.ts'])
    writeFileSync(join(root, 'lib/local' + suffix), 'export {};\n');
  return root;
}
const forbidden = [
  'vscode',
  '@anarchitects/archimate-metamodel-3_2',
  '@angular/core',
  '@nestjs/common',
  'nx',
  '@nx/devkit',
  'node:fs',
  'fs/promises',
  'node:sqlite',
  'better-sqlite3',
  '@prisma/client',
  'pg',
  '@anarchitects/blueprint',
  '@anarchitects/private-shared',
  '@archimatrix/source',
  '#source',
  'file:../sibling',
  '/sibling/index.js',
  '@anarchitects/modeling-core/dist/index.js',
];
for (const layer of ['source', 'javascript', 'declaration']) {
  for (const value of forbidden) {
    test(`${layer} rejects ${value}`, (t) => {
      const root = fixture(t);
      assert.throws(
        () =>
          checkImports(
            `import * as forbidden from '${value}';`,
            join(root, layer === 'javascript' ? 'index.js' : 'index.d.ts'),
            root,
            'modeling-metamodel',
            layer,
          ),
        /forbidden import/,
      );
    });
  }
  test(`${layer} rejects reverse core -> metamodel`, (t) => {
    const root = fixture(t);
    assert.throws(
      () =>
        checkImports(
          "export * from '@anarchitects/modeling-metamodel';",
          join(root, 'index.ts'),
          root,
          'modeling-core',
          layer,
        ),
      /forbidden import/,
    );
  });
  test(`${layer} permits local relative modules, tslib and inward public core`, (t) => {
    const root = fixture(t);
    checkImports(
      "export * from './lib/local.js'; import * as helper from 'tslib';",
      join(root, 'index.ts'),
      root,
      'modeling-core',
      layer,
    );
    checkImports(
      "export * from '@anarchitects/modeling-core';",
      join(root, 'index.ts'),
      root,
      'modeling-metamodel',
      layer,
    );
  });
}
for (const [name, code] of Object.entries({
  'ambient host module':
    "declare module 'vscode' { export interface Extension {} }",
  'named re-export': "export { readFile } from 'node:fs';",
  'type import': "import type { File } from 'node:fs';",
  'inline declaration import': "export type File = import('node:fs').Stats;",
  'literal dynamic import': "void import('node:fs');",
  'computed dynamic import': 'void import(name);',
  require: "require('node:fs');",
  'module require': "module.require('node:fs');",
  'import equals': "import fs = require('node:fs');",
  'reference types': '/// <reference types="node" />\nexport {};',
  'reference path':
    '/// <reference path="../sibling/index.d.ts" />\nexport {};',
})) {
  test(`rejects ${name}`, (t) => {
    const root = fixture(t);
    assert.throws(
      () =>
        checkImports(
          code,
          join(root, 'index.d.ts'),
          root,
          'modeling-core',
          'declaration',
        ),
      /forbidden import|Dynamic module loading|Non-ESM import|External reference directive/,
    );
  });
}
test('relative escapes and encoded/backslash paths cannot bypass package boundaries', (t) => {
  const root = fixture(t);
  for (const path of [
    '../sibling/index.js',
    './lib/../../sibling/index.js',
    './%2e%2e/sibling.js',
    './lib\\sibling.js',
  ]) {
    assert.throws(
      () =>
        checkImports(
          `export * from ${JSON.stringify(path)};`,
          join(root, 'index.ts'),
          root,
          'modeling-core',
          'source',
        ),
      /Path leaves package|Ambiguous relative import/,
    );
  }
});
test('source, declaration and artifact symlinks are rejected', (t) => {
  const root = fixture(t);
  symlinkSync(join(root, 'lib/local.ts'), join(root, 'linked.ts'));
  assert.throws(() => filesWithoutLinks(root), /Symlink/);
  assert.throws(() => filesWithoutLinks(join(root, 'linked.ts')), /Symlink/);
});
const manifest = (name = 'modeling-core') => ({
  name: `@anarchitects/${name}`,
  dependencies: {
    tslib: '^2.3.0',
    ...(name === 'modeling-metamodel'
      ? { '@anarchitects/modeling-core': 'workspace:*' }
      : {}),
  },
  exports: {
    './package.json': './package.json',
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    },
  },
});
test('workspace and packed inward core dependencies pass; root dev tools are outside this manifest policy', () => {
  checkManifest(manifest(), 'modeling-core');
  checkManifest(manifest('modeling-metamodel'), 'modeling-metamodel');
  const packed = manifest('modeling-metamodel');
  packed.dependencies['@anarchitects/modeling-core'] = '0.0.0';
  checkManifest(packed, 'modeling-metamodel', { packed: true });
});
for (const value of forbidden.concat('@anarchitects/modeling-metamodel')) {
  test(`runtime manifest rejects ${value}`, () => {
    const m = manifest();
    m.dependencies[value] = '*';
    assert.throws(
      () => checkManifest(m, 'modeling-core'),
      /runtime dependency allowlist/,
    );
  });
}
for (const field of [
  'peerDependencies',
  'optionalDependencies',
  'bundledDependencies',
  'bundleDependencies',
  'imports',
]) {
  test(`manifest rejects unreviewed ${field}`, () => {
    const m = manifest();
    m[field] = field.includes('bundl') ? ['vscode'] : { vscode: '*' };
    assert.throws(() => checkManifest(m, 'modeling-core'), /unreviewed/);
  });
}
for (const range of [
  'file:../core',
  'link:../core',
  'portal:../core',
  'git+https://example.invalid/private',
  'workspace:*',
]) {
  test(`packed dependency rejects ${range}`, () => {
    const m = manifest('modeling-metamodel');
    m.dependencies['@anarchitects/modeling-core'] = range;
    assert.throws(
      () => checkManifest(m, 'modeling-metamodel', { packed: true }),
      /runtime dependency allowlist/,
    );
  });
}
test('source export conditions, aliases, custom conditions and alternate roots fail', () => {
  const m = manifest();
  m.exports['.']['@archimatrix/source'] = './src/index.ts';
  assert.throws(
    () => checkManifest(m, 'modeling-core'),
    /built public exports/,
  );
  for (const options of [
    { paths: { '@source/*': ['../sibling/*'] } },
    { customConditions: ['@archimatrix/source'] },
    { baseUrl: '../sibling' },
    { rootDirs: ['src', '../host'] },
  ])
    assert.throws(
      () => checkCompilerOptions(options),
      /Source aliases|Custom source|Alternate source/,
    );
  checkCompilerOptions({ moduleResolution: 99 });
});
test('gitlink and tracked sibling symlink modes fail; ordinary tracked files pass', () => {
  checkGitEntries('100644 abc 0\tpackages/core/src/index.ts\0');
  assert.throws(
    () => checkGitEntries('160000 abc 0\tvendor/product\0'),
    /Submodules/,
  );
  assert.throws(
    () => checkGitEntries('120000 abc 0\tpackages/core\0'),
    /symlinks/,
  );
});
test('unreviewed vendored file and code inserted into an approved module fail provenance', () => {
  const baseline = { 'index.ts': digest('export {};\n') };
  checkBaseline({ 'index.ts': 'export {};\n' }, baseline);
  assert.throws(
    () =>
      checkBaseline(
        { 'index.ts': 'export {};\n', 'vendor/product.ts': 'product' },
        baseline,
      ),
    /module inventory/,
  );
  assert.throws(
    () =>
      checkBaseline(
        { 'index.ts': 'export {};\n// copied product implementation' },
        baseline,
      ),
    /Runtime provenance changed/,
  );
});
test('compiler helper remains a reviewed leaf; transitive/peer/optional/bundled additions fail', () => {
  const helper = { name: 'tslib', version: '2.9.1' };
  checkHelper(helper);
  for (const key of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'bundledDependencies',
    'bundleDependencies',
  ]) {
    assert.throws(() =>
      checkHelper({
        ...helper,
        [key]: { '@anarchitects/private-product': '*' },
      }),
    );
  }
  assert.throws(
    () => checkHelper({ ...helper, version: '3.0.0' }),
    /Review the resolved compiler helper/,
  );
});
