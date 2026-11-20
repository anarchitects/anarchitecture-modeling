import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  verifyPublishedArtifact,
  waitForPublishedArtifact,
} from './registry.mjs';
import { executePublication } from './execute.mjs';

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

function execution(recovery = false) {
  const events = [],
    receipts = [];
  return {
    events,
    receipts,
    input: {
      report: {
        artifacts: {
          'modeling-core': artifact,
          'modeling-metamodel': {
            ...artifact,
            manifest: {
              dependencies: { '@anarchitects/modeling-core': '0.0.1' },
            },
          },
        },
      },
      histories: {
        'modeling-core': recovery ? ['0.0.1'] : [],
        'modeling-metamodel': [],
      },
      publishNames: recovery
        ? ['modeling-metamodel']
        : ['modeling-core', 'modeling-metamodel'],
      alreadyPublished: recovery ? ['modeling-core'] : [],
      registryVersions: async (n) =>
        recovery && n === 'modeling-core' ? ['0.0.1'] : [],
      verifyPublished: async (n) => {
        events.push(`verify ${n}`);
      },
      waitForPublished: async (n) => {
        events.push(`wait ${n}`);
      },
      upload: async (n) => {
        events.push(`upload ${n}`);
      },
      saveReceipt: (r) => receipts.push(structuredClone(r)),
    },
  };
}
test('normal pair waits for core before uploading metamodel and waits for the final package', async () => {
  const { input, events, receipts } = execution();
  await executePublication(input);
  assert.deepEqual(events, [
    'upload modeling-core',
    'wait modeling-core',
    'verify modeling-core',
    'upload modeling-metamodel',
    'wait modeling-metamodel',
  ]);
  assert.equal(receipts[0][0].status, 'upload-started');
  assert.equal(receipts[1][0].status, 'submitted');
  assert.ok(receipts.at(-1).every((r) => r.status === 'available-verified'));
});
test('explicit recovery verifies core before skipping it and uploads only metamodel once', async () => {
  const { input, events } = execution(true);
  const receipts = await executePublication(input);
  assert.deepEqual(events, [
    'verify modeling-core',
    'verify modeling-core',
    'upload modeling-metamodel',
    'wait modeling-metamodel',
  ]);
  assert.equal(receipts[0].status, 'already-published-verified');
  assert.equal(receipts[1].status, 'available-verified');
});
test('interrupted upload or availability timeout never advances to the dependent or retries', async () => {
  for (const failure of ['upload', 'waitForPublished']) {
    const { input, events, receipts } = execution();
    input[failure] = async (n) => {
      events.push(`failed ${n}`);
      throw new Error('interrupted');
    };
    await assert.rejects(executePublication(input), /interrupted/);
    assert.ok(events.every((e) => !e.includes('metamodel')));
    assert.equal(events.filter((e) => e === 'failed modeling-core').length, 1);
    assert.equal(
      receipts.at(-1)[0].status,
      failure === 'upload' ? 'upload-started' : 'submitted',
    );
  }
});
test('missing or mismatched skipped core, changed history and mismatched dependency block recovery upload', async () => {
  for (const failure of [
    'missing core',
    'bad bytes',
    'changed history',
    'dependency',
  ]) {
    const { input, events } = execution(true);
    if (failure === 'changed history')
      input.registryVersions = async () => ['0.0.1', '0.0.2'];
    else if (failure === 'dependency')
      input.report.artifacts['modeling-metamodel'].manifest.dependencies[
        '@anarchitects/modeling-core'
      ] = '0.0.2';
    else
      input.verifyPublished = async () => {
        throw new Error(failure);
      };
    await assert.rejects(executePublication(input));
    assert.ok(!events.some((e) => e.startsWith('upload')));
  }
});
