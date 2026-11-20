import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

const readSource = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const guides = [
  'README.md',
  'api.md',
  'migration.md',
  'release-notes.md',
  'examples/lifecycle.mts',
];

// The archive is self-contained. GitHub's source reference is supplementary and
// pinned; its public accessibility is a separate #22/#23 live check.
export function documentationFiles(
  name,
  version,
  sourceSha,
  repository,
  coreVersion,
) {
  assert.ok(['modeling-core', 'modeling-metamodel'].includes(name));
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const compatibleCore = name === 'modeling-core' ? version : coreVersion;
  assert.match(compatibleCore, /^\d+\.\d+\.\d+$/);
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  assert.equal(repository, 'anarchitects/anarchitecture-modeling');
  const homepage = `https://github.com/${repository}/blob/${sourceSha}/packages/${name}/README.md`;
  const source = `https://github.com/${repository}/blob/${sourceSha}`;
  const sourceReadme = readSource(`packages/${name}/README.md`);
  const sourceGuides = Object.fromEntries(
    guides.map((file) => [
      `docs/consumer/${file}`,
      readSource(`docs/consumer/${file}`),
    ]),
  );
  verifyDocumentationLinks({
    [`packages/${name}/README.md`]: sourceReadme,
    ...sourceGuides,
    LICENSE: readSource('LICENSE'),
    NOTICE: readSource('NOTICE'),
  });
  const readme = sourceReadme
    .replaceAll('<CORE_VERSION>', compatibleCore)
    .replaceAll('<METAMODEL_VERSION>', version)
    .replaceAll('../../docs/consumer/', `${source}/docs/consumer/`)
    .replaceAll('../../LICENSE', `${source}/LICENSE`)
    .replaceAll('../../NOTICE', `${source}/NOTICE`);
  return {
    homepage,
    files: {
      'README.md': `${readme}\n## Artifact reference\n\nThis documentation accompanies \`@anarchitects/${name}@${version}\`.\nThe bundled guides describe this candidate; retain them with your lockfile.\nOffline, open \`docs/README.md\`, \`docs/api.md\`, \`docs/migration.md\` and\n\`docs/examples/lifecycle.mts\` inside this package; \`LICENSE\` and \`NOTICE\`\nare included alongside this README. Online links use this exact source revision\nand require repository access until public disclosure is authorized.\n[Source snapshot](${homepage}).\n`,
      ...Object.fromEntries(
        guides.map((file) => [
          `docs/${file}`,
          sourceGuides[`docs/consumer/${file}`],
        ]),
      ),
    },
  };
}

// Small, deliberately bounded inline-Markdown checker for these hand-authored
// pages. It checks local destinations/anchors, not remote HTTP availability.
export function verifyDocumentationLinks(files) {
  for (const [path, text] of Object.entries(files)) {
    if (!path.endsWith('.md')) continue;
    const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
    for (const [, href] of prose.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^(https:\/\/|mailto:)/.test(href)) continue;
      assert.ok(!/^(\/|[a-z]+:)/i.test(href), `Unsafe link: ${path}: ${href}`);
      const [target, anchor] = href.split('#');
      const destination = target
        ? posix.normalize(posix.join(posix.dirname(path), target))
        : path;
      assert.ok(!destination.startsWith('../'), `Escaping link: ${href}`);
      assert.ok(
        Object.hasOwn(files, destination),
        `Missing link: ${path}: ${href}`,
      );
      if (anchor) {
        const headings = [
          ...files[destination].matchAll(/^#{1,6} (.+)$/gm),
        ].map((m) =>
          m[1]
            .toLowerCase()
            .replace(/[^\p{L}\p{N}_\- ]/gu, '')
            .replaceAll(' ', '-'),
        );
        assert.ok(
          headings.includes(anchor),
          `Missing anchor: ${path}: ${href}`,
        );
      }
    }
  }
}

export function quickStart(readme) {
  const block = (part, language) => {
    const matches = [
      ...readme.matchAll(
        new RegExp(
          `<!-- quickstart:${part} -->\\s*\x60\x60\x60${language}\\n([\\s\\S]*?)\\n\x60\x60\x60`,
          'g',
        ),
      ),
    ];
    assert.equal(matches.length, 1, `Expected one README quickstart:${part}`);
    return matches[0][1];
  };
  return {
    install: block('install', 'sh'),
    registryInstall: block('registry-install', 'sh'),
    source: block('source', 'js'),
    output: block('output', 'text'),
  };
}

export function verifyDocumentation(
  name,
  manifest,
  read,
  sourceSha,
  repository,
) {
  assert.equal(manifest.name, `@anarchitects/${name}`);
  const expected = documentationFiles(
    name,
    manifest.version,
    sourceSha,
    repository,
    manifest.dependencies?.['@anarchitects/modeling-core'],
  );
  assert.equal(
    manifest.homepage,
    expected.homepage,
    'Documentation homepage must pin reviewed source',
  );
  const actual = {};
  for (const [path, content] of Object.entries(expected.files)) {
    actual[path] = String(read(path));
    assert.equal(
      actual[path],
      content,
      `${path} differs from reviewed package documentation`,
    );
  }
  for (const path of ['LICENSE', 'NOTICE']) actual[path] = String(read(path));
  verifyDocumentationLinks(actual);
  return quickStart(actual['README.md']);
}
