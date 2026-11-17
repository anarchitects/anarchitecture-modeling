import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedAccess, verifyAuth } from './verify-auth.mjs';

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
    pull_request: { head: { repo: { full_name: repository } } },
  },
};

test('only main pushes and same-repository non-Dependabot PRs may use cache credentials', () => {
  assert.equal(expectedAccess(main), 'shared-write');
  assert.equal(expectedAccess(pr), 'shared-read');
  for (const context of [
    { ...main, ref: 'refs/tags/main' },
    { ...main, ref: 'refs/heads/feature' },
    { ...pr, actor: 'dependabot[bot]' },
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
