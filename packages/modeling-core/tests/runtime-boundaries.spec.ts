import { ESLint } from 'eslint';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: root });
const filePath = 'packages/modeling-core/src/lib/modeling-core.ts';
async function diagnostics(code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  expect(result.fatalErrorCount).toBe(0);
  return result.messages.map((message) => message.ruleId);
}

// Adapted from the accepted source boundary proof; these injections never alter source files.
describe('core runtime boundaries', () => {
  it('rejects metamodel, method, host, framework, persistence and deep imports', async () => {
    for (const specifier of [
      '@anarchitects/modeling-metamodel',
      '@anarchitects/archimate-metamodel-3_2',
      'vscode',
      '@angular/core',
      '@nestjs/common',
      'nx',
      '@nx/devkit',
      'node:fs',
      'fs/promises',
      'node:sqlite',
      'better-sqlite3',
      '@prisma/client',
      '@anarchitects/modeling-core/src/lib/identity.js',
    ]) {
      expect(
        await diagnostics(
          `import * as dependency from '${specifier}'; void dependency;`,
        ),
      ).toContain('no-restricted-imports');
    }
    expect(
      await diagnostics(
        "import * as meta from '@anarchitects/modeling-metamodel'; void meta;",
      ),
    ).toContain('@nx/enforce-module-boundaries');
  });
  it('rejects re-exports and dynamic loading as well as ordinary imports', async () => {
    expect(await diagnostics("export * from 'node:fs';")).toContain(
      'no-restricted-imports',
    );
    expect(await diagnostics("export { readFile } from 'node:fs';")).toContain(
      'no-restricted-imports',
    );
    for (const code of [
      "void import('node:fs');",
      "const name = 'node:fs'; void import(name);",
      "void require('node:fs');",
      "type File = import('node:fs').Stats;",
    ]) {
      expect(await diagnostics(code)).toContain('no-restricted-syntax');
    }
  });
  it('permits relative runtime imports and keeps runtime dependencies bounded', async () => {
    expect(
      await diagnostics(
        "import * as identity from './identity.js'; void identity;",
      ),
    ).toEqual([]);
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    );
    expect(manifest.dependencies).toEqual({ tslib: '^2.3.0' });
    expect(manifest.private).toBe(true);
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.optionalDependencies).toBeUndefined();
  });
});
