import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './prepare.mjs';
import {
  verifyPublishedArtifact,
  waitForPublishedArtifact,
} from './registry.mjs';

export async function publicationGate(context, phase, name, request = fetch) {
  const { directory, report, histories, publishNames } = context;
  assert.ok(publishNames.includes(name));
  const artifact = report.artifacts[name];
  const path = join(directory, `receipt-${name}.json`);
  if (phase === 'after') {
    if (
      existsSync(path) &&
      JSON.parse(readFileSync(path)).status === 'available-verified'
    )
      return;
    await waitForPublishedArtifact(name, artifact, { request });
  } else {
    assert.equal(phase, 'before');
    const response = await request(
      `${config.registry}/@anarchitects%2f${name}`,
    );
    assert.ok(
      response.ok || response.status === 404,
      `Registry lookup failed (${response.status})`,
    );
    const versions =
      response.status === 404
        ? []
        : Object.keys((await response.json()).versions ?? {}).sort();
    assert.deepEqual(
      versions,
      histories[name],
      'Registry changed during release',
    );
    assert.ok(
      !versions.includes(artifact.artifactVersion),
      'Version already exists; no implicit retry or dist-tag mutation',
    );
    if (name === 'modeling-metamodel') {
      const version =
        artifact.manifest.dependencies['@anarchitects/modeling-core'];
      const core = report.artifacts['modeling-core'];
      if (core) {
        assert.equal(version, core.artifactVersion);
        await verifyPublishedArtifact('modeling-core', core, request);
      } else {
        // A support archive proves compatibility, but is not the historical
        // registry archive: its documentation may reflect this newer source.
        const response = await request(
          `${config.registry}/@anarchitects%2fmodeling-core/${version}`,
        );
        assert.ok(response.ok, 'Exact released core dependency unavailable');
        const manifest = await response.json();
        assert.equal(manifest.name, '@anarchitects/modeling-core');
        assert.equal(manifest.version, version);
      }
    }
  }
  writeFileSync(
    path,
    JSON.stringify(
      {
        name,
        version: artifact.artifactVersion,
        sha256: artifact.sha256,
        status: phase === 'before' ? 'upload-started' : 'available-verified',
      },
      null,
      2,
    ) + '\n',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const context = JSON.parse(readFileSync('context.json'));
  await publicationGate(
    context,
    process.argv[2],
    process.argv[3],
    (url, options) =>
      fetch(url, {
        ...options,
        signal: options?.signal ?? AbortSignal.timeout(30000),
        redirect: 'error',
      }),
  );
}
