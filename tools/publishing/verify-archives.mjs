import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, prepare } from './prepare.mjs';
import { verifyLegalFiles } from './legal.mjs';
import { verifyDocumentation } from './documentation.mjs';

// Fresh-state verification, never cache this command. A clean commit binds bytes.
execFileSync('yarn', ['nx', 'run-many', '-t', 'build'], { stdio: 'inherit' });
const directory = mkdtempSync(join(tmpdir(), 'foundation-archive-proof-'));
try {
  const first = prepare(join(directory, 'one')),
    second = prepare(join(directory, 'two'));
  for (const name of ['modeling-core', 'modeling-metamodel']) {
    const a = first.artifacts[name],
      b = second.artifacts[name];
    assert.equal(
      a.sha256,
      b.sha256,
      'Identical source/toolchain must produce identical archive bytes',
    );
    const archive = join(directory, 'one', a.file);
    const read = (path) =>
      execFileSync('tar', ['-xOf', archive, `package/${path}`], {
        encoding: 'utf8',
      });
    assert.deepEqual(JSON.parse(read('package.json')), a.manifest);
    assert.equal(first.licenseStatus, 'pending');
    assert.equal(a.manifest.private, true);
    assert.equal(a.manifest.license, 'Apache-2.0');
    assert.equal(a.manifestVersion, '0.0.1');
    verifyLegalFiles(a.manifest, read, config.license);
    verifyDocumentation(
      name,
      a.manifest,
      read,
      first.sourceSha,
      config.repository,
    );
    assert.match(read('NOTICE'), /Optimalist BV and Anarchitects contributors/);
    assert.equal(a.manifest.repository.directory, `packages/${name}`);
    assert.equal(a.manifest.type, 'module');
    assert.equal(a.manifest.engines.node, '^24.0.0');
    for (const entry of [a.manifest.main, a.manifest.module, a.manifest.types])
      assert.ok(read(entry.replace(/^\.\//, '')).length);
    for (const file of a.files.filter((f) => /\.(js|ts)$/.test(f.path)))
      assert.doesNotMatch(read(file.path), /sourceMappingURL|sourceURL/);
    if (name === 'modeling-metamodel')
      assert.equal(
        a.manifest.dependencies['@anarchitects/modeling-core'],
        '0.0.1',
      );
    const packedPaths = execFileSync('tar', ['-tf', archive], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .sort();
    assert.deepEqual(
      packedPaths,
      a.files.map((f) => `package/${f.path}`).sort(),
    );
    assert.deepEqual(
      readFileSync(archive),
      readFileSync(join(directory, 'two', b.file)),
    );
    console.log(
      `${name}: ${a.files.length} files, ${a.size} packed bytes, ${a.unpackedSize} unpacked bytes; repeat SHA-256 ${a.sha256}`,
    );
  }
  assert.throws(() => prepare(join(directory, 'one')), /never overwrite/);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
