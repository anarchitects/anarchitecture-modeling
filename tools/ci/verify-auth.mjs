import assert from 'node:assert/strict';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';

export function expectedAccess({ eventName, ref, repository, actor, event }) {
  if (!repository || event?.repository?.full_name !== repository) return 'off';
  if (eventName === 'push' && ref === 'refs/heads/main') return 'shared-write';
  if (
    eventName === 'pull_request' &&
    actor !== 'dependabot[bot]' &&
    event?.pull_request?.user?.login &&
    event.pull_request.user.login !== 'dependabot[bot]' &&
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
  const context = {
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    repository: process.env.GITHUB_REPOSITORY,
    actor: process.env.GITHUB_ACTOR,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
  };
  const observed = {
    disabled: process.env.NX_NO_CLOUD === 'true',
    tokenPresent: Boolean(process.env.NX_CLOUD_ACCESS_TOKEN?.trim()),
    aliasPresent: Boolean(
      process.env.NX_CLOUD_AUTH_TOKEN?.trim() ||
        process.env.NX_CLOUD_PERSONAL_ACCESS_TOKEN?.trim(),
    ),
  };
  const access = verifyAuth(context, observed);
  // Never print credentials, prefixes, lengths, event payloads or environment dumps.
  console.log(
    `CI cache trust: ${access}; credential presence and enablement verified.`,
  );
  const pr = context.event.pull_request;
  const record = {
    event: context.eventName,
    action: context.event.action ?? null,
    actor: context.actor,
    triggeringActor: process.env.GITHUB_TRIGGERING_ACTOR,
    repository: context.repository,
    ref: context.ref,
    pullRequest: pr?.number ?? null,
    author: pr?.user?.login ?? null,
    headRepository: pr?.head?.repo?.full_name ?? null,
    headSha: pr?.head?.sha ?? null,
    baseSha: pr?.base?.sha ?? null,
    testedSha: process.env.GITHUB_SHA,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
    workflowSha: process.env.GITHUB_WORKFLOW_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    access,
    ...observed,
  };
  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/ci-trust.json', JSON.stringify(record, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      'Verified CI event/cache context (no credential values):\n```json\n' +
        JSON.stringify(record, null, 2) +
        '\n```\n',
    );
}
