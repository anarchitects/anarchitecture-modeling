import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedAccess, verifyAuth } from './verify-auth.mjs';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = 'owner/modeling';
const main = {
  repository,
  eventName: 'push',
  ref: 'refs/heads/main',
  actor: 'owner',
  event: { repository: { full_name: repository } },
};
const pr = {
  ...main,
  eventName: 'pull_request',
  ref: 'refs/pull/1/merge',
  event: {
    ...main.event,
    pull_request: {
      user: { login: 'contributor' },
      head: { repo: { full_name: repository } },
    },
  },
};

test('only main pushes and same-repository non-Dependabot PRs may use cache credentials', () => {
  assert.equal(expectedAccess(main), 'shared-write');
  assert.equal(expectedAccess(pr), 'shared-read');
  for (const context of [
    { ...main, ref: 'refs/tags/main' },
    { ...main, ref: 'refs/heads/feature' },
    { ...pr, actor: 'dependabot[bot]' },
    {
      ...pr,
      actor: 'owner',
      event: {
        ...pr.event,
        action: 'edited',
        pull_request: {
          ...pr.event.pull_request,
          user: { login: 'dependabot[bot]' },
        },
      },
    },
    {
      ...pr,
      actor: 'owner',
      event: {
        ...pr.event,
        action: 'reopened',
        pull_request: {
          ...pr.event.pull_request,
          user: { login: 'dependabot[bot]' },
        },
      },
    },
    {
      ...pr,
      event: {
        ...pr.event,
        pull_request: { ...pr.event.pull_request, user: undefined },
      },
    },
    { ...pr, eventName: 'pull_request_target' },
    { ...pr, eventName: 'workflow_dispatch' },
    {
      ...pr,
      event: {
        ...main.event,
        pull_request: { head: { repo: { full_name: 'fork/modeling' } } },
      },
    },
    { ...pr, event: main.event },
    { ...pr, event: {} },
    { ...pr, repository: '' },
  ]) {
    assert.equal(expectedAccess(context), 'off');
    assert.equal(
      verifyAuth(context, {
        disabled: true,
        tokenPresent: false,
        aliasPresent: false,
      }),
      'off',
    );
    assert.throws(() =>
      verifyAuth(context, {
        disabled: true,
        tokenPresent: true,
        aliasPresent: false,
      }),
    );
    assert.throws(() =>
      verifyAuth(context, {
        disabled: false,
        tokenPresent: false,
        aliasPresent: false,
      }),
    );
  }
});

test('Dependabot author stays credential-free on a human event or rerun; trusted PR author remains readable', () => {
  const botPr = {
    ...pr,
    event: {
      ...pr.event,
      pull_request: {
        ...pr.event.pull_request,
        user: { login: 'dependabot[bot]' },
      },
    },
  };
  for (const actor of ['dependabot[bot]', 'owner', 'github-actions[bot]']) {
    assert.equal(expectedAccess({ ...botPr, actor }), 'off');
  }
  assert.equal(expectedAccess({ ...pr, actor: 'owner' }), 'shared-read');
});

test('trusted contexts require the configured credential and reject an alternate credential', () => {
  for (const context of [main, pr]) {
    assert.equal(
      verifyAuth(context, {
        disabled: false,
        tokenPresent: true,
        aliasPresent: false,
      }),
      expectedAccess(context),
    );
    for (const change of [
      { disabled: true },
      { tokenPresent: false },
      { aliasPresent: true },
    ]) {
      assert.throws(() =>
        verifyAuth(context, {
          disabled: false,
          tokenPresent: true,
          aliasPresent: false,
          ...change,
        }),
      );
    }
  }
});

test('CLI records sanitized event provenance and rejects personal-token injection without disclosure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ci-trust-proof-'));
  try {
    const eventFile = join(directory, 'event.json');
    writeFileSync(
      eventFile,
      JSON.stringify({
        ...pr.event,
        action: 'edited',
        pull_request: {
          ...pr.event.pull_request,
          number: 123,
          user: { login: 'dependabot[bot]' },
          head: { repo: { full_name: repository }, sha: 'a'.repeat(40) },
          base: { sha: 'b'.repeat(40) },
        },
      }),
    );
    const env = {
      GITHUB_EVENT_PATH: eventFile,
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REF: pr.ref,
      GITHUB_REPOSITORY: repository,
      GITHUB_ACTOR: 'owner',
      GITHUB_TRIGGERING_ACTOR: 'owner',
      GITHUB_SHA: 'c'.repeat(40),
      GITHUB_RUN_ID: '42',
      GITHUB_RUN_ATTEMPT: '2',
      NX_NO_CLOUD: 'true',
    };
    const command = fileURLToPath(
      new URL('./verify-auth.mjs', import.meta.url),
    );
    const run = (extra) =>
      spawnSync(process.execPath, [command], {
        cwd: directory,
        env: { ...env, ...extra },
        encoding: 'utf8',
      });
    const good = run({});
    assert.equal(good.status, 0, good.stderr);
    const evidence = JSON.parse(
      readFileSync(join(directory, 'tmp/ci-trust.json')),
    );
    assert.equal(evidence.author, 'dependabot[bot]');
    assert.equal(evidence.actor, 'owner');
    assert.equal(evidence.testedSha, env.GITHUB_SHA);
    assert.equal(evidence.runAttempt, '2');
    assert.equal(evidence.access, 'off');
    assert.equal(evidence.tokenPresent, false);
    assert.equal(evidence.aliasPresent, false);
    rmSync(join(directory, 'tmp'), { recursive: true });
    const injected = run({
      NX_CLOUD_PERSONAL_ACCESS_TOKEN: 'synthetic-do-not-log',
    });
    assert.notEqual(injected.status, 0);
    assert.doesNotMatch(
      injected.stdout + injected.stderr,
      /synthetic-do-not-log/,
    );
    assert.equal(existsSync(join(directory, 'tmp/ci-trust.json')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
