import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createModelId, createElementId } from '@anarchitects/modeling-core';
import { decodeDocument } from '@anarchitects/modeling-metamodel';

assert.equal(process.env.NODE_PATH, undefined);
assert.equal(process.env.NODE_OPTIONS, undefined);
const root = realpathSync(process.cwd());
const installed = (name) =>
  JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json')));
for (const name of ['modeling-core', 'modeling-metamodel']) {
  const specifier = `@anarchitects/${name}`;
  const entry = realpathSync(fileURLToPath(import.meta.resolve(specifier)));
  assert.equal(entry, join(root, 'node_modules', specifier, 'dist/index.js'));
  assert.equal(
    (await import(`${specifier}/package.json`, { with: { type: 'json' } }))
      .default.name,
    specifier,
  );
  for (const suffix of ['/src/index.ts', '/dist/index.js', '/missing']) {
    await assert.rejects(import(specifier + suffix), {
      code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    });
  }
}
const fromMetamodel = createRequire(
  import.meta.resolve('@anarchitects/modeling-metamodel'),
);
assert.equal(
  realpathSync(fromMetamodel.resolve('@anarchitects/modeling-core')),
  realpathSync(
    fileURLToPath(import.meta.resolve('@anarchitects/modeling-core')),
  ),
);
assert.equal(
  installed('@anarchitects/modeling-metamodel').dependencies[
    '@anarchitects/modeling-core'
  ],
  installed('@anarchitects/modeling-core').version,
);
for (const forbidden of [
  'nx',
  '@nx/js',
  'vscode',
  '@angular/core',
  '@nestjs/core',
  '@archimatrix/source',
]) {
  assert.throws(() => fromMetamodel.resolve(forbidden), {
    code: 'MODULE_NOT_FOUND',
  });
}
assert.equal(createModelId(' exact identity '), ' exact identity ');
assert.equal(createElementId('element'), 'element');
assert.throws(() => createModelId('  '), /non-empty/);
const future = new TextEncoder().encode(
  JSON.stringify({
    format: 'archimatrix-document',
    envelopeVersion: 2,
    checkpoint: {},
  }),
);
const refused = decodeDocument(future, {
  packs: [],
  validationRules: [],
  defaultRules: [],
  notations: [],
});
assert.equal(refused.status, 'not-decoded');
assert.equal(refused.reason, 'unsupported-format');
assert.equal(refused.source, future);
console.log(
  'Independent ESM resolution, exact dependency, identities, blocked deep imports and future-format refusal passed.',
);
