import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const packageNames = ['modeling-core', 'modeling-metamodel'];
export const digest = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export function assertInside(root, file) {
  const path = relative(resolve(root), resolve(file));
  assert.ok(
    path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path),
    `Path leaves package: ${file}`,
  );
}
export function filesWithoutLinks(root) {
  assert.equal(lstatSync(root).isSymbolicLink(), false, `Symlink: ${root}`);
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `Symlink: ${file}`);
    if (entry.isDirectory()) files.push(...filesWithoutLinks(file));
    else {
      assert.ok(entry.isFile(), `Non-regular file: ${file}`);
      files.push(file);
    }
  }
  return files.sort();
}
export function checkImports(text, file, packageRoot, name, layer) {
  const syntax = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  );
  assert.equal(syntax.parseDiagnostics.length, 0, `Cannot parse ${file}`);
  assert.equal(
    syntax.referencedFiles.length + syntax.typeReferenceDirectives.length,
    0,
    `External reference directive: ${file}`,
  );
  const allowed =
    name === 'modeling-metamodel'
      ? ['tslib', '@anarchitects/modeling-core']
      : ['tslib'];
  const specifier = (value) => {
    assert.ok(typeof value === 'string', `Nonliteral import: ${file}`);
    if (value.startsWith('./') || value.startsWith('../')) {
      assert.ok(!/[\\?#%]/.test(value), `Ambiguous relative import: ${value}`);
      assert.ok(value.endsWith('.js'), `Use emitted .js imports: ${value}`);
      const target = resolve(file, '..', value);
      assertInside(packageRoot, target);
      const actual =
        layer === 'source'
          ? target.replace(/\.js$/, '.ts')
          : layer === 'declaration'
            ? target.replace(/\.js$/, '.d.ts')
            : target;
      assert.ok(
        lstatSync(actual).isFile(),
        `Missing relative module: ${actual}`,
      );
      assert.equal(
        lstatSync(actual).isSymbolicLink(),
        false,
        `Linked relative module: ${actual}`,
      );
      assertInside(realpathSync(packageRoot), realpathSync(actual));
    } else
      assert.ok(allowed.includes(value), `${name}: forbidden import ${value}`);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier)
        specifier(
          ts.isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : undefined,
        );
    }
    if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name))
      specifier(node.name.text);
    if (ts.isImportEqualsDeclaration(node))
      assert.fail(`Non-ESM import: ${file}`);
    if (ts.isImportTypeNode(node)) {
      specifier(
        ts.isLiteralTypeNode(node.argument) &&
          ts.isStringLiteral(node.argument.literal)
          ? node.argument.literal.text
          : undefined,
      );
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require') ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'require'))
    ) {
      assert.fail(`Dynamic module loading: ${file}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(syntax);
}
export function checkManifest(
  manifest,
  name,
  { packed = false, coreVersion = '0.0.0' } = {},
) {
  assert.equal(manifest.name, `@anarchitects/${name}`);
  const expected = { tslib: '^2.3.0' };
  if (name === 'modeling-metamodel')
    expected['@anarchitects/modeling-core'] = packed
      ? coreVersion
      : 'workspace:*';
  assert.deepEqual(
    manifest.dependencies,
    expected,
    `${name}: runtime dependency allowlist`,
  );
  for (const key of [
    'peerDependencies',
    'optionalDependencies',
    'bundledDependencies',
    'bundleDependencies',
    'imports',
  ]) {
    assert.equal(manifest[key], undefined, `${name}: unreviewed ${key}`);
  }
  assert.deepEqual(
    manifest.exports,
    {
      './package.json': './package.json',
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    },
    `${name}: built public exports only`,
  );
}
export function checkCompilerOptions(options) {
  assert.ok(
    !options.paths || Object.keys(options.paths).length === 0,
    'Source aliases are forbidden',
  );
  assert.ok(
    !options.customConditions?.length,
    'Custom source conditions are forbidden',
  );
  assert.ok(
    !options.rootDirs?.length && !options.baseUrl,
    'Alternate source roots are forbidden',
  );
}
export function checkGitEntries(entries) {
  for (const entry of entries.split('\0').filter(Boolean)) {
    assert.ok(!entry.startsWith('160000 '), 'Submodules are forbidden');
    assert.ok(
      !entry.startsWith('120000 '),
      'Tracked repository symlinks require explicit review',
    );
  }
}
export function checkBaseline(files, baseline) {
  assert.deepEqual(
    Object.keys(files).sort(),
    Object.keys(baseline).sort(),
    'Unreviewed runtime module inventory',
  );
  for (const [file, bytes] of Object.entries(files)) {
    assert.equal(
      digest(bytes),
      baseline[file],
      `Runtime provenance changed: ${file}; review and update the baseline explicitly`,
    );
  }
}
export function checkHelper(manifest) {
  assert.equal(manifest.name, 'tslib');
  assert.equal(
    manifest.version,
    '2.9.1',
    'Review the resolved compiler helper on dependency updates',
  );
  for (const key of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    assert.equal(
      Object.keys(manifest[key] ?? {}).length,
      0,
      `tslib has an unreviewed ${key} edge`,
    );
  }
  for (const key of ['bundledDependencies', 'bundleDependencies'])
    assert.equal(manifest[key], undefined);
  assert.notEqual(manifest.private, true);
}
export function inspectLayer(directory, name, layer, baseline) {
  const suffix =
    layer === 'source' ? '.ts' : layer === 'declaration' ? '.d.ts' : '.js';
  const files = filesWithoutLinks(directory).filter(
    (file) =>
      file.endsWith(suffix) &&
      (layer !== 'source' ||
        (!file.endsWith('.spec.ts') && !file.endsWith('.test.ts'))),
  );
  const contents = Object.fromEntries(
    files.map((file) => [
      relative(directory, file).replaceAll('\\', '/'),
      readFileSync(file),
    ]),
  );
  checkBaseline(contents, baseline);
  for (const file of files)
    checkImports(readFileSync(file, 'utf8'), file, directory, name, layer);
  return files.length;
}
