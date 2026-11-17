import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  checkHelper,
  checkManifest,
  inspectLayer,
} from '../boundaries/policy.mjs';
const boundaryBaseline = JSON.parse(
  readFileSync(
    new URL('../boundaries/runtime-baseline.json', import.meta.url),
    'utf8',
  ),
);

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = realpathSync(
  mkdtempSync(join(tmpdir(), 'foundation-package-check-')),
);
const packageNames = ['modeling-core', 'modeling-metamodel'];
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const run = (command, args, cwd = root) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const runtimeSources = (directory) =>
  readdirSync(directory, { recursive: true })
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.test.ts'),
    )
    .map((file) => file.replaceAll('\\', '/'))
    .sort();

try {
  const versions = Object.fromEntries(
    packageNames.map((name) => [
      name,
      readJson(join(root, 'packages', name, 'package.json')).version,
    ]),
  );
  for (const name of packageNames) {
    const packageRoot = join(root, 'packages', name);
    const archive = join(temporary, `${name}.tgz`);
    run('yarn', [
      'workspace',
      `@anarchitects/${name}`,
      'pack',
      '--out',
      archive,
    ]);
    const entries = run('tar', ['-tzf', archive])
      .trim()
      .split('\n')
      .filter((file) => !file.endsWith('/'))
      .sort();
    // Exact allowlist: compiled runtime only; neither broad dist globs nor stale
    // compiler outputs may smuggle tests, maps, source or tooling into a package.
    const sources = runtimeSources(join(packageRoot, 'src'));
    const expected = [
      'package/README.md',
      'package/package.json',
      ...sources.flatMap((file) => [
        `package/dist/${file.replace(/\.ts$/, '.js')}`,
        `package/dist/${file.replace(/\.ts$/, '.d.ts')}`,
      ]),
    ].sort();
    assert.deepEqual(entries, expected, `${name}: packed file inventory`);
    const destination = join(temporary, 'node_modules', '@anarchitects', name);
    mkdirSync(destination, { recursive: true });
    run('tar', ['-xzf', archive, '--strip-components=1', '-C', destination]);
    const manifest = readJson(join(destination, 'package.json'));
    checkManifest(manifest, name, {
      packed: true,
      coreVersion: versions['modeling-core'],
    });
    for (const layer of ['javascript', 'declaration'])
      inspectLayer(
        join(destination, 'dist'),
        name,
        layer,
        boundaryBaseline.packages[name][layer],
      );
    assert.equal(manifest.name, `@anarchitects/${name}`);
    assert.equal(manifest.version, versions[name]);
    assert.equal(
      manifest.private,
      true,
      'Packaging proof must not enable publication',
    );
    assert.equal(manifest.type, 'module');
    assert.equal(manifest.main, './dist/index.js');
    assert.equal(manifest.module, manifest.main);
    assert.equal(manifest.types, './dist/index.d.ts');
    assert.deepEqual(manifest.exports, {
      './package.json': './package.json',
      '.': {
        types: manifest.types,
        import: manifest.main,
        default: manifest.main,
      },
    });
    assert.equal(manifest.nx, undefined, 'Nx metadata stays in project.json');
    assert.equal(manifest.scripts, undefined, 'No package lifecycle hooks');
    assert.equal(manifest.devDependencies, undefined);
    assert.equal(manifest.peerDependencies, undefined);
    assert.equal(manifest.optionalDependencies, undefined);
    assert.deepEqual(
      manifest.dependencies,
      name === 'modeling-core'
        ? { tslib: '^2.3.0' }
        : {
            '@anarchitects/modeling-core': versions['modeling-core'],
            tslib: '^2.3.0',
          },
    );
    for (const file of entries.filter((file) =>
      file.startsWith('package/dist/'),
    )) {
      const text = readFileSync(
        join(destination, file.slice('package/'.length)),
        'utf8',
      );
      assert.doesNotMatch(
        text,
        /sourceMappingURL=|@archimatrix\/source|@anarchitecture-modeling\/source/,
      );
    }
    console.log(
      `${name}: ${entries.length} packed files; ${sources.length} JS + ${sources.length} declarations; metadata/allowlist passed`,
    );
  }

  // Supply the declared compiler helper from the installed locked dependency,
  // without a node_modules symlink back to the workspace. Registry installation
  // and transitive dependency-boundary acceptance are separate follow-up gates.
  cpSync(
    dirname(fileURLToPath(import.meta.resolve('tslib/package.json'))),
    join(temporary, 'node_modules', 'tslib'),
    { recursive: true },
  );
  checkHelper(
    readJson(join(temporary, 'node_modules', 'tslib', 'package.json')),
  );
  console.log(
    'Packed runtime/declaration imports, provenance and compiler-helper dependency closure passed.',
  );
  writeFileSync(
    join(temporary, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  cpSync(
    join(root, 'tools/proofs/foundation-smoke.mjs'),
    join(temporary, 'smoke.mjs'),
  );
  process.stdout.write(run(process.execPath, ['smoke.mjs'], temporary));
  writeFileSync(
    join(temporary, 'exports.mjs'),
    `
    import assert from 'node:assert/strict';
    import { realpathSync } from 'node:fs';
    import { fileURLToPath } from 'node:url';
    for (const name of ${JSON.stringify(packageNames)}) {
      const specifier = '@anarchitects/' + name;
      const resolved = fileURLToPath(import.meta.resolve(specifier));
      assert.ok(realpathSync(resolved).startsWith(process.cwd() + '/node_modules/'));
      assert.ok(resolved.endsWith('/dist/index.js'));
      assert.equal((await import(specifier + '/package.json', { with: { type: 'json' } })).default.name, specifier);
      for (const path of ['/src/index.ts', '/dist/index.js', '/dist/lib/identity.js', '/missing']) {
        await assert.rejects(import(specifier + path), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
      }
    }
  `,
  );
  run(process.execPath, ['exports.mjs'], temporary);
  // Even the historical custom condition cannot select source any longer.
  run(
    process.execPath,
    ['--conditions=@archimatrix/source', 'exports.mjs'],
    temporary,
  );

  const consumer = join(temporary, 'consumer.mts');
  writeFileSync(
    consumer,
    `
    import { createModel, type ModelDocument, type DiagramView } from '@anarchitects/modeling-core';
    import { composeModelingProfile, DOCUMENT_CODEC_LIMITS, type DocumentCheckpoint } from '@anarchitects/modeling-metamodel';
    const model: ModelDocument = createModel('id', 'Name', { id: 'profile', version: '1' });
    const view: DiagramView = { id: 'view' as DiagramView['id'], modelId: model.id, name: 'View', elements: [], connectors: [] };
    export const proof = { model, view, composeModelingProfile, DOCUMENT_CODEC_LIMITS };
    export type Checkpoint = DocumentCheckpoint;
    // @ts-expect-error Source is not a public package entry.
    import type { ModelDocument as PrivateModel } from '@anarchitects/modeling-core/src/index.ts';
    // @ts-expect-error Emitted implementation paths are not public package entries.
    import type { DocumentCheckpoint as PrivateCheckpoint } from '@anarchitects/modeling-metamodel/dist/index.js';
  `,
  );
  const options = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    types: [],
    customConditions: [],
    disableSourceOfProjectReferenceRedirect: true,
  };
  for (const name of packageNames) {
    const resolution = ts.resolveModuleName(
      `@anarchitects/${name}`,
      consumer,
      options,
      ts.sys,
    ).resolvedModule;
    assert.equal(
      resolve(resolution?.resolvedFileName ?? ''),
      join(temporary, 'node_modules', '@anarchitects', name, 'dist/index.d.ts'),
    );
  }
  const program = ts.createProgram([consumer], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => temporary,
      getNewLine: () => '\n',
    }),
  );
  const compilerLib = dirname(fileURLToPath(import.meta.resolve('typescript')));
  for (const source of program.getSourceFiles()) {
    const file = resolve(source.fileName);
    assert.ok(
      file.startsWith(temporary + '/') || file.startsWith(compilerLib + '/'),
      `Unexpected source resolution: ${relative(root, file)}`,
    );
  }
  console.log(
    'Packed Node ESM, exported package metadata, blocked deep imports and strict TypeScript NodeNext declarations passed without source conditions or workspace redirects.',
  );
  // The exact consumer example linked by the guide is compiled and executed
  // against extracted archives. No source aliases or workspace package links.
  const example = join(temporary, 'lifecycle.mts');
  cpSync(join(root, 'docs/consumer/examples/lifecycle.mts'), example);
  const exampleProgram = ts.createProgram([example], {
    ...options,
    noEmit: false,
    outDir: join(temporary, 'example-output'),
  });
  const exampleDiagnostics = ts.getPreEmitDiagnostics(exampleProgram);
  assert.equal(
    exampleDiagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(exampleDiagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => temporary,
      getNewLine: () => '\n',
    }),
  );
  for (const source of exampleProgram.getSourceFiles()) {
    const file = resolve(source.fileName);
    assert.ok(
      file.startsWith(temporary + '/') || file.startsWith(compilerLib + '/'),
      `Example escaped packed consumer: ${file}`,
    );
  }
  const apiReference = readFileSync(join(root, 'docs/consumer/api.md'), 'utf8');
  const checker = exampleProgram.getTypeChecker();
  for (const name of packageNames) {
    const entry = exampleProgram.getSourceFile(
      join(temporary, 'node_modules', '@anarchitects', name, 'dist/index.d.ts'),
    );
    assert.ok(entry, `Missing packed declaration entry for ${name}`);
    const exports = checker.getExportsOfModule(
      checker.getSymbolAtLocation(entry),
    );
    for (const [kind, flag] of [
      ['runtime', ts.SymbolFlags.Value],
      ['types', ts.SymbolFlags.Type],
    ]) {
      const marker = `<!-- exports:${name}:${kind} -->`;
      const start = apiReference.indexOf(marker);
      assert.notEqual(
        start,
        -1,
        `Missing documented export list: ${name}/${kind}`,
      );
      const block = apiReference.slice(start + marker.length).trimStart();
      assert.ok(block.startsWith('```text\n'), 'Expected a fenced export list');
      const documented = block
        .slice('```text\n'.length)
        .split('\n```')[0]
        .trim()
        .split('\n');
      const actual = exports
        .filter((symbol) => symbol.flags & flag)
        .map((symbol) => symbol.name)
        .sort();
      assert.deepEqual(
        documented,
        actual,
        `Public API reference drift: ${name}/${kind}`,
      );
    }
  }
  console.log(
    'Consumer API reference matches all 54 core and 116 metamodel root exports (runtime/type split).',
  );
  assert.equal(exampleProgram.emit().emitSkipped, false);
  process.stdout.write(
    run(process.execPath, ['example-output/lifecycle.mjs'], temporary),
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
