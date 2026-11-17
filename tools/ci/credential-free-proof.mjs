import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Run only on the fresh credential-free hosted job, never against developer login.
assert.equal(process.env.GITHUB_ACTIONS, 'true');
for (const name of [
  'NX_CLOUD_ACCESS_TOKEN',
  'NX_CLOUD_AUTH_TOKEN',
  'NX_CLOUD_PERSONAL_ACCESS_TOKEN',
])
  assert.ok(!process.env[name], `The proof must not receive ${name}`);
assert.equal(process.env.NX_NO_CLOUD, 'true');
const cache = mkdtempSync(join(tmpdir(), 'foundation-anonymous-cache-'));
try {
  const result = spawnSync(
    'yarn',
    ['nx', 'run', 'modeling-core:build', '--output-style=static'],
    {
      encoding: 'utf8',
      timeout: 120000,
      env: {
        ...process.env,
        NX_NO_CLOUD: 'false',
        NX_CACHE_DIRECTORY: cache,
        NX_DAEMON: 'false',
      },
    },
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert.ok(!result.error, 'Anonymous probe failed to execute or timed out');
  assert.match(
    output,
    /(?:401|403|unable to authenticate|unauthorized|access denied)/i,
    'Expected an explicit remote authorization rejection, not a network failure',
  );
  console.log(
    'Anonymous real-build cache request was explicitly rejected; no credentials supplied.',
  );
} finally {
  rmSync(cache, { recursive: true, force: true });
}
