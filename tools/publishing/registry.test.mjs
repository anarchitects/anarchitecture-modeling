import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  verifyPublishedArtifact,
  waitForPublishedArtifact,
} from './registry.mjs';

const name = 'modeling-core',
  bytes = Buffer.from('approved archive');
const artifact = {
  artifactVersion: '0.0.1',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
};
const manifest = () => ({
  name: `@anarchitects/${name}`,
  version: '0.0.1',
  dist: {
    integrity: artifact.integrity,
    tarball: 'https://registry.npmjs.org/core.tgz',
  },
});
const success = (url) =>
  Promise.resolve(
    new Response(url.endsWith('.tgz') ? bytes : JSON.stringify(manifest())),
  );
function clock(request) {
  let time = 0;
  return {
    request,
    timeoutMs: 30,
    intervalMs: 10,
    now: () => time,
    pause: async (ms) => {
      time += ms;
    },
    log: () => {},
  };
}
test('waits through registry scanning and verifies actual archive bytes', async () => {
  let calls = 0;
  const options = clock((url, init) => {
    assert.ok(init.signal);
    assert.equal(init.redirect, 'error');
    return ++calls <= 2
      ? Promise.resolve(new Response('', { status: 404 }))
      : success(url);
  });
  assert.equal(
    (await waitForPublishedArtifact(name, artifact, options)).version,
    '0.0.1',
  );
  assert.equal(calls, 4);
});
test('tarball propagation, throttling and temporary server failures are bounded', async () => {
  for (const status of [404, 429, 503]) {
    let archiveCalls = 0;
    await waitForPublishedArtifact(
      name,
      artifact,
      clock((url) => {
        if (url.endsWith('.tgz') && archiveCalls++ === 0)
          return Promise.resolve(new Response('', { status }));
        return success(url);
      }),
    );
    assert.equal(archiveCalls, 2);
  }
});
test('registry timeout stops without any publication retry', async () => {
  let calls = 0;
  await assert.rejects(
    waitForPublishedArtifact(
      name,
      artifact,
      clock(async () => {
        calls++;
        return new Response('', { status: 404 });
      }),
    ),
    /availability timed out/,
  );
  assert.equal(calls, 3);
});
test('request timeouts can recover, while malformed metadata fails immediately', async () => {
  let calls = 0;
  await waitForPublishedArtifact(
    name,
    artifact,
    clock(async (url) => {
      if (calls++ === 0) throw new DOMException('timed out', 'TimeoutError');
      return success(url);
    }),
  );
  assert.equal(calls, 3);
  let malformed = 0;
  await assert.rejects(
    waitForPublishedArtifact(
      name,
      artifact,
      clock(async () => {
        malformed++;
        return new Response('invalid JSON');
      }),
    ),
    SyntaxError,
  );
  assert.equal(malformed, 1);
});
test('mismatched metadata, bytes, foreign hosts and denied access fail immediately', async () => {
  for (const change of [
    (m) => {
      m.version = '0.0.2';
    },
    (m) => {
      m.name = '@someone/else';
    },
    (m) => {
      m.dist.integrity = 'sha512-other';
    },
    (m) => {
      m.dist.tarball = 'https://other.invalid/core.tgz';
    },
  ]) {
    let calls = 0;
    const value = manifest();
    change(value);
    await assert.rejects(
      waitForPublishedArtifact(
        name,
        artifact,
        clock(async () => {
          calls++;
          return Response.json(value);
        }),
      ),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    verifyPublishedArtifact(name, artifact, async (url) =>
      url.endsWith('.tgz')
        ? new Response('substituted bytes')
        : Response.json(manifest()),
    ),
    /archive bytes mismatch/,
  );
  let denied = 0;
  await assert.rejects(
    waitForPublishedArtifact(
      name,
      artifact,
      clock(async () => {
        denied++;
        return new Response('', { status: 403 });
      }),
    ),
    /403/,
  );
  assert.equal(denied, 1);
});
