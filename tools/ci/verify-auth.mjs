import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function expectedAccess({ eventName, ref, repository, actor, event }) {
  if (!repository || event?.repository?.full_name !== repository) return 'off';
  if (eventName === 'push' && ref === 'refs/heads/main') return 'shared-write';
  if (
    eventName === 'pull_request' &&
    actor !== 'dependabot[bot]' &&
    event?.pull_request?.head?.repo?.full_name === repository
  )
    return 'shared-read';
  return 'off';
}

export function verifyAuth(context, { disabled, tokenPresent, aliasPresent }) {
  const access = expectedAccess(context);
  assert.equal(aliasPresent, false, 'Unexpected alternate Nx Cloud credential');
  assert.equal(
    disabled,
    access === 'off',
    'Nx Cloud enablement disagrees with event trust',
  );
  assert.equal(
    tokenPresent,
    access !== 'off',
    'Nx Cloud credential presence disagrees with event trust',
  );
  return access;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const access = verifyAuth(
    {
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      repository: process.env.GITHUB_REPOSITORY,
      actor: process.env.GITHUB_ACTOR,
      event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
    },
    {
      disabled: process.env.NX_NO_CLOUD === 'true',
      tokenPresent: Boolean(process.env.NX_CLOUD_ACCESS_TOKEN?.trim()),
      aliasPresent: Boolean(process.env.NX_CLOUD_AUTH_TOKEN?.trim()),
    },
  );
  // Never print credentials, prefixes, lengths, event payloads or environment dumps.
  console.log(
    `CI cache trust: ${access}; credential presence and enablement verified.`,
  );
}
