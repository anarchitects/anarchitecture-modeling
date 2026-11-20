import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from './prepare.mjs';

class RegistryPending extends Error {}

async function response(url, request) {
  const result = await request(url, { redirect: 'error' });
  if (result.status === 404 || result.status === 429 || result.status >= 500)
    throw new RegistryPending(`Registry not ready (${result.status})`);
  assert.ok(result.ok, `Registry lookup failed (${result.status})`);
  return result;
}

// Read-only verification: both metadata and downloaded bytes must match.
// No registry request uses the publishing credential.
export async function verifyPublishedArtifact(name, artifact, request = fetch) {
  const manifest = await (
    await response(
      `${config.registry}/@anarchitects%2f${name}/${artifact.artifactVersion}`,
      request,
    )
  ).json();
  assert.equal(manifest.name, `@anarchitects/${name}`);
  assert.equal(manifest.version, artifact.artifactVersion);
  assert.equal(
    manifest.dist?.integrity,
    artifact.integrity,
    'Published integrity mismatch',
  );
  const url = new URL(manifest.dist.tarball);
  assert.equal(
    url.origin,
    config.registry,
    'Unexpected registry archive origin',
  );
  assert.equal(url.username + url.password, '');
  const bytes = Buffer.from(
    await (await response(url.href, request)).arrayBuffer(),
  );
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    artifact.sha256,
    'Published archive bytes mismatch',
  );
  assert.equal(
    `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    artifact.integrity,
  );
  return manifest;
}

export async function waitForPublishedArtifact(
  name,
  artifact,
  {
    timeoutMs = 15 * 60 * 1000,
    intervalMs = 10 * 1000,
    request = fetch,
    now = () => performance.now(),
    pause = sleep,
    log = console.log,
  } = {},
) {
  const deadline = now() + timeoutMs;
  const boundedRequest = (url, options) =>
    request(url, {
      ...options,
      signal: AbortSignal.timeout(
        Math.max(1, Math.ceil(Math.min(30000, deadline - now()))),
      ),
    });
  while (now() < deadline) {
    try {
      return await verifyPublishedArtifact(name, artifact, boundedRequest);
    } catch (error) {
      if (!(error instanceof RegistryPending) && error.name !== 'TimeoutError')
        throw error;
      const remaining = deadline - now();
      if (remaining <= 0) break;
      log(
        `Waiting for ${name}@${artifact.artifactVersion} registry availability; no upload retry`,
      );
      await pause(Math.min(intervalMs, remaining));
    }
  }
  throw new Error(
    `${name}: registry availability timed out; inspect registry before any recovery`,
  );
}
