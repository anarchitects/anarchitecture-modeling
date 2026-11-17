import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import ts from 'typescript';

// This file runs inside the disposable consumer. Its compiler is npm-installed
// there, never imported from the workspace that orchestrates the proof.
const root = realpathSync(process.cwd());
assert.equal(ts.version, '6.0.3');
for (const mode of ['NodeNext', 'Node16']) {
  const config = ts.readConfigFile(`tsconfig.${mode}.json`, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }),
  );
  for (const source of program.getSourceFiles()) {
    assert.ok(
      realpathSync(source.fileName).startsWith(root + '/'),
      `Source escaped consumer: ${source.fileName}`,
    );
  }
  for (const name of ['modeling-core', 'modeling-metamodel']) {
    const resolution = ts.resolveModuleName(
      `@anarchitects/${name}`,
      join(root, 'types.mts'),
      parsed.options,
      ts.sys,
    ).resolvedModule;
    assert.equal(
      resolve(resolution?.resolvedFileName ?? ''),
      join(root, 'node_modules', '@anarchitects', name, 'dist/index.d.ts'),
    );
  }
  assert.equal(program.emit().emitSkipped, false);
  console.log(
    `Independent TypeScript ${ts.version}, strict ${mode}, full declaration checking passed.`,
  );
}
