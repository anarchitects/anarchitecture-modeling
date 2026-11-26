import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  documentationFiles,
  verifyDocumentation,
  verifyDocumentationLinks,
  quickStart,
} from './documentation.mjs';

const sha = '1'.repeat(40);
const repository = 'anarchitects/anarchitecture-modeling';
function fixture(
  name = 'modeling-core',
  version = '0.0.1',
  coreVersion = '0.0.1',
) {
  const { homepage, files } = documentationFiles(
    name,
    version,
    sha,
    repository,
    coreVersion,
  );
  for (const path of ['LICENSE', 'NOTICE'])
    files[path] = readFileSync(
      new URL(`../../${path}`, import.meta.url),
      'utf8',
    );
  return {
    files,
    manifest: {
      name: `@anarchitects/${name}`,
      version,
      homepage,
      ...(name === 'modeling-metamodel'
        ? { dependencies: { '@anarchitects/modeling-core': coreVersion } }
        : {}),
    },
  };
}
test('registry instructions pin independently versioned packages without replacing the local proof', () => {
  const { files, manifest } = fixture('modeling-metamodel', '0.2.3', '0.1.7');
  const result = verifyDocumentation(
    'modeling-metamodel',
    manifest,
    (p) => files[p],
    sha,
    repository,
  );
  assert.equal(
    result.registryInstall,
    'npm init -y\nnpm install --save-exact @anarchitects/modeling-core@0.1.7 @anarchitects/modeling-metamodel@0.2.3',
  );
  assert.equal(
    result.install,
    'npm init -y\nnpm install --save-exact ./core.tgz ./metamodel.tgz',
  );
  assert.doesNotMatch(files['README.md'], /<(CORE|METAMODEL)_VERSION>/);
  assert.throws(
    () =>
      verifyDocumentation(
        'modeling-metamodel',
        {
          ...manifest,
          dependencies: { '@anarchitects/modeling-core': '0.1.8' },
        },
        (p) => files[p],
        sha,
        repository,
      ),
    /differs from reviewed package documentation/,
  );
  assert.throws(() => fixture('modeling-metamodel', '0.2.3', '^0.1.7'));
});
for (const name of ['modeling-core', 'modeling-metamodel']) {
  test(`${name}: pinned offline documentation and exactly one executable quick start`, () => {
    const { files, manifest } = fixture(name);
    const result = verifyDocumentation(
      name,
      manifest,
      (p) => files[p],
      sha,
      repository,
    );
    assert.match(result.source, /@anarchitects\/modeling-core/);
    assert.ok(result.output.length);
    assert.doesNotMatch(files['README.md'], /\/blob\/main\/|\/tree\/main\//);
    assert.match(files['README.md'], new RegExp(`${name}@0\\.0\\.1`));
    assert.match(files['docs/api.md'], /\]\(proofs\/semantic-comparison\.md\)/);
    assert.match(
      files['docs/proofs/semantic-comparison.md'],
      /\]\(\.\.\/examples\/semantic-comparison\.mts\)/,
    );
    assert.match(
      files['docs/examples/semantic-comparison.mts'],
      /compareDocumentSnapshots/,
    );
    if (name === 'modeling-metamodel')
      assert.ok(
        files['README.md'].includes(
          `https://github.com/${repository}/blob/${sha}/docs/proofs/semantic-comparison.md`,
        ),
      );
  });
}
test('rejects missing/wrong-package/stale README and changed shipped example even with matching candidate metadata', () => {
  const { files, manifest } = fixture();
  const wrong = fixture('modeling-metamodel').files['README.md'];
  for (const replacement of [
    undefined,
    '',
    wrong,
    files['README.md'].replace('core@0.0.1', 'core@9.0.0'),
  ]) {
    assert.throws(
      () =>
        verifyDocumentation(
          'modeling-core',
          manifest,
          (p) => (p === 'README.md' ? replacement : files[p]),
          sha,
          repository,
        ),
      /differs from reviewed package documentation/,
    );
  }
  for (const path of [
    'docs/examples/lifecycle.mts',
    'docs/examples/semantic-comparison.mts',
    'docs/proofs/semantic-comparison.md',
  ])
    for (const replacement of [undefined, 'stale documentation'])
      assert.throws(
        () =>
          verifyDocumentation(
            'modeling-core',
            manifest,
            (p) => (p === path ? replacement : files[p]),
            sha,
            repository,
          ),
        /differs from reviewed package documentation/,
      );
  assert.throws(
    () =>
      verifyDocumentation(
        'modeling-core',
        { ...manifest, homepage: 'https://example.com/latest' },
        (p) => files[p],
        sha,
        repository,
      ),
    /homepage/,
  );
  assert.throws(
    () =>
      verifyDocumentation(
        'modeling-core',
        manifest,
        (p) => files[p],
        '2'.repeat(40),
        repository,
      ),
    /homepage/,
  );
});
test('rejects broken or escaping local links and anchors', () => {
  for (const href of [
    'missing.md',
    '../outside.md',
    'guide.md#missing',
    'file:///secret',
  ]) {
    assert.throws(
      () =>
        verifyDocumentationLinks({
          'README.md': `[Guide](${href})`,
          'guide.md': '# Guide\n',
        }),
      /Missing|Escaping|Unsafe/,
    );
  }
  assert.doesNotThrow(() =>
    verifyDocumentationLinks({
      'README.md': '[Guide](guide.md#guide)',
      'guide.md': '# Guide\n',
    }),
  );
});
test('rejects missing or duplicated executable markers', () => {
  const { files } = fixture();
  assert.throws(
    () =>
      quickStart(files['README.md'].replace('quickstart:source', 'removed')),
    /quickstart:source/,
  );
  assert.throws(
    () => quickStart(files['README.md'] + files['README.md']),
    /quickstart:install/,
  );
});
