import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  packageNames,
  assertInside,
  checkCompilerOptions,
  checkGitEntries,
  checkHelper,
  checkManifest,
  inspectLayer,
} from './policy.mjs';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const baseline = JSON.parse(
  readFileSync(new URL('./runtime-baseline.json', import.meta.url), 'utf8'),
);
assert.equal(
  existsSync(join(root, '.gitmodules')),
  false,
  'Submodule configuration is forbidden',
);
checkGitEntries(
  execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd: root,
    encoding: 'utf8',
  }),
);
const helpers = new Set();
for (const name of packageNames) {
  const directory = join(root, 'packages', name);
  assert.equal(
    lstatSync(directory).isSymbolicLink(),
    false,
    'Package roots must not link to sibling repositories',
  );
  assert.equal(
    realpathSync(directory),
    directory,
    'Package ancestry must stay inside this checkout',
  );
  checkManifest(
    JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')),
    name,
  );
  const requireFromPackage = createRequire(join(directory, 'package.json'));
  const helper = realpathSync(requireFromPackage.resolve('tslib/package.json'));
  assertInside(join(root, 'node_modules'), helper);
  checkHelper(JSON.parse(readFileSync(helper, 'utf8')));
  helpers.add(helper);
  if (name === 'modeling-metamodel') {
    assert.equal(
      realpathSync(
        requireFromPackage.resolve('@anarchitects/modeling-core/package.json'),
      ),
      join(root, 'packages/modeling-core/package.json'),
      'Core must resolve to this workspace, not a sibling checkout',
    );
  }
  for (const layer of ['source', 'javascript', 'declaration']) {
    const count = inspectLayer(
      join(directory, layer === 'source' ? 'src' : 'dist'),
      name,
      layer,
      baseline.packages[name][layer],
    );
    console.log(
      `${name}: ${count} ${layer} modules match approved provenance and import boundaries`,
    );
  }
  const config = ts.getParsedCommandLineOfConfigFile(
    join(directory, 'tsconfig.lib.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      },
    },
  );
  assert.equal(
    config.errors.length,
    0,
    'Invalid effective TypeScript configuration',
  );
  checkCompilerOptions(config.options);
  assert.equal(
    config.options.rootDir,
    join(directory, 'src'),
    'Runtime source root must be local',
  );
  assert.equal(
    config.options.outDir,
    join(directory, 'dist'),
    'Runtime output must be local',
  );
  assert.deepEqual(
    (config.projectReferences ?? []).map((reference) => reference.path),
    name === 'modeling-metamodel'
      ? [join(root, 'packages/modeling-core/tsconfig.lib.json')]
      : [],
    'Only the inward core project reference is allowed',
  );
}
console.log(
  `Runtime dependency closure: metamodel -> workspace core; both -> tslib@2.9.1 (${helpers.size} resolved copy), no transitive/peer/optional edges. Root Nx tooling is development-only.`,
);
