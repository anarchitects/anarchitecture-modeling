import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { authorize, verifyReadinessGates } from './authorization.mjs';
import { config } from './prepare.mjs';
import { checkPreviewRun } from './check-preview-run.mjs';

const sha = 'a'.repeat(40),
  hash = 'b'.repeat(64),
  name = 'modeling-core';
const acceptedPolicy = {
  ...config,
  enabled: true,
  license: { ...config.license, status: 'accepted' },
};
function fixture() {
  const comment = (issue, marker, record) => ({
    id: issue,
    user: { login: config.owner, id: config.ownerId },
    issue_url: `https://api.github.com/repos/${config.repository}/issues/${issue}`,
    html_url: `https://github.com/${config.repository}/issues/${issue}#issuecomment-${issue}`,
    updated_at: new Date().toISOString(),
    body: '```' + marker + '\n' + JSON.stringify(record) + '\n```',
  });
  return {
    report: {
      sourceSha: sha,
      licenseStatus: 'accepted',
      projectsVersionData: {
        [name]: { currentVersion: '0.0.0', newVersion: '0.0.1' },
      },
      artifacts: {
        [name]: {
          manifestVersion: '0.0.1',
          artifactVersion: '0.0.1',
          tag: `${name}@0.0.1`,
          sha256: hash,
        },
      },
    },
    authorizationComment: comment(23, 'foundation-release-authorization', {
      sourceSha: sha,
      readinessCommentId: 22,
      authentication: 'bootstrap',
      artifactHashes: { [name]: hash },
      historyBaselines: { [name]: [] },
      versions: { [name]: '0.0.1' },
    }),
    readinessComment: comment(22, 'foundation-release-readiness', {
      decision: 'ready',
      sourceSha: sha,
      artifactHashes: { [name]: hash },
      otherChannelsReviewed: { [name]: true },
      impacts: {
        [name]: { level: 'none', reference: 'https://example.invalid/review' },
      },
    }),
    repo: { full_name: config.repository, private: false },
    environment: {
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: false,
          reviewers: [{ type: 'User', reviewer: { id: config.ownerId } }],
        },
      ],
      can_admins_bypass: false,
      deployment_branch_policy: {
        custom_branch_policies: true,
        protected_branches: false,
      },
    },
    branchPolicies: [{ name: 'main', type: 'branch' }],
    workflow: { path: '.github/workflows/publish.yml' },
    histories: { [name]: [] },
    tags: { [`${name}@0.0.1`]: sha },
    context: {
      event: 'workflow_dispatch',
      ref: 'refs/heads/main',
      actor: config.owner,
      sha,
    },
  };
}
function record(input, key, change) {
  const comment = input[key],
    lines = comment.body.split('\n');
  const value = JSON.parse(lines[1]);
  change(value);
  lines[1] = JSON.stringify(value);
  comment.body = lines.join('\n');
}
test('disabled policy still rejects publication', () => {
  assert.throws(
    () => authorize(fixture(), { ...config, enabled: false }),
    /Publication is disabled/,
  );
});
test('activated publisher rejects local execution before fetching anything', () => {
  const result = spawnSync(process.execPath, ['tools/publishing/publish.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'false' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Publication requires GitHub Actions/);
});
test('activated production policy still requires exact owner authorization', () => {
  assert.equal(authorize(fixture()), 'bootstrap');
  const input = fixture();
  input.authorizationComment.body = 'PR merged';
  assert.throws(() => authorize(input), /Expected one exact review record/);
});
const completedGates = () =>
  [20, 21, 22, 55].map((number) => ({
    number,
    state: 'closed',
    state_reason: 'completed',
  }));
test('open Dependabot follow-up does not block completed readiness gates', () => {
  assert.doesNotThrow(() =>
    verifyReadinessGates([
      ...completedGates(),
      { number: 44, state: 'open', state_reason: null },
    ]),
  );
});
test('open, missing or uncompleted required outcomes still block publication', () => {
  for (const number of [20, 21, 22, 55]) {
    for (const change of [{ state: 'open' }, { state_reason: 'not_planned' }]) {
      const issues = completedGates().map((issue) =>
        issue.number === number ? { ...issue, ...change } : issue,
      );
      assert.throws(
        () => verifyReadinessGates(issues),
        new RegExp(`Readiness gate #${number}`),
      );
    }
    assert.throws(
      () =>
        verifyReadinessGates(
          completedGates().filter((issue) => issue.number !== number),
        ),
      new RegExp(`Readiness gate #${number}`),
    );
  }
});
test('accepted exact first distribution passes with a bootstrap decision', () => {
  assert.equal(authorize(fixture(), acceptedPolicy), 'bootstrap');
});
test('established package uses OIDC and a reviewed current history', () => {
  const input = fixture();
  input.report.projectsVersionData[name] = {
    currentVersion: '0.0.1',
    newVersion: '0.0.2',
  };
  input.report.artifacts[name] = {
    ...input.report.artifacts[name],
    manifestVersion: '0.0.2',
    artifactVersion: '0.0.2',
    tag: `${name}@0.0.2`,
  };
  input.histories[name] = ['0.0.1'];
  input.tags[`${name}@0.0.2`] = sha;
  record(input, 'authorizationComment', (r) => {
    r.authentication = 'oidc';
    r.versions[name] = '0.0.2';
    r.historyBaselines[name] = ['0.0.1'];
  });
  assert.equal(authorize(input, acceptedPolicy), 'oidc');
});
const rejected = {
  'private repository': (x) => {
    x.repo.private = true;
  },
  'fork identity': (x) => {
    x.repo.full_name = 'someone/fork';
  },
  'pull request execution': (x) => {
    x.context.event = 'pull_request';
  },
  'feature branch': (x) => {
    x.context.ref = 'refs/heads/feature';
  },
  'non-owner dispatcher': (x) => {
    x.context.actor = 'other';
  },
  'different source': (x) => {
    x.context.sha = 'c'.repeat(40);
  },
  'wrong workflow': (x) => {
    x.workflow.path = '.github/workflows/other.yml';
  },
  'missing reviewer': (x) => {
    x.environment.protection_rules = [];
  },
  'team with owner numeric ID': (x) => {
    x.environment.protection_rules[0].reviewers[0].type = 'Team';
  },
  'untyped reviewer': (x) => {
    delete x.environment.protection_rules[0].reviewers[0].type;
  },
  'additional reviewer': (x) => {
    x.environment.protection_rules[0].reviewers.push({
      type: 'User',
      reviewer: { id: 1 },
    });
  },
  'self-review disabled': (x) => {
    x.environment.protection_rules[0].prevent_self_review = true;
  },
  'unverified self-review setting': (x) => {
    delete x.environment.protection_rules[0].prevent_self_review;
  },
  'all protected branches policy': (x) => {
    x.environment.deployment_branch_policy.protected_branches = true;
  },
  'admin bypass': (x) => {
    x.environment.can_admins_bypass = true;
  },
  'broader branches': (x) => {
    x.branchPolicies.push({ name: '*', type: 'branch' });
  },
  'impersonated owner login': (x) => {
    x.authorizationComment.user.id = 1;
  },
  'wrong issue': (x) => {
    x.authorizationComment.issue_url += '0';
  },
  'stale approval': (x) => {
    x.authorizationComment.updated_at = '2000-01-01T00:00:00Z';
  },
  'duplicate approval': (x) => {
    x.authorizationComment.body += '\n' + x.authorizationComment.body;
  },
  'unbound readiness': (x) => {
    x.readinessComment.id = 999;
  },
  'pending license': (x) => {
    x.report.licenseStatus = 'pending';
  },
  'missing tag': (x) => {
    x.tags = {};
  },
  'tag wrong commit': (x) => {
    x.tags[`${name}@0.0.1`] = 'c'.repeat(40);
  },
  'already published version': (x) => {
    x.histories[name] = ['0.0.1'];
  },
  'unavailable registry': (x) => {
    delete x.histories[name];
  },
  'unexpected artifact': (x) => {
    x.report.artifacts.extra = x.report.artifacts[name];
  },
  'archive substitution': (x) => {
    x.report.artifacts[name].sha256 = 'c'.repeat(64);
  },
  'unreviewed history': (x) => {
    x.histories[name] = ['0.0.0'];
  },
  'unapproved version': (x) =>
    record(x, 'authorizationComment', (r) => {
      r.versions[name] = '0.0.2';
    }),
  'first publication by OIDC': (x) =>
    record(x, 'authorizationComment', (r) => {
      r.authentication = 'oidc';
    }),
  'unreviewed other channels': (x) =>
    record(x, 'readinessComment', (r) => {
      r.otherChannelsReviewed[name] = false;
    }),
  'missing compatibility review': (x) =>
    record(x, 'readinessComment', (r) => {
      delete r.impacts[name];
    }),
};
for (const [label, change] of Object.entries(rejected))
  test(`rejects ${label}`, () => {
    const input = fixture();
    change(input);
    assert.throws(() => authorize(input, acceptedPolicy));
  });
test('activation alone cannot bypass license clearance', () => {
  assert.throws(
    () =>
      authorize(fixture(), {
        ...config,
        enabled: true,
        license: { ...config.license, status: 'pending' },
      }),
    /license\/NOTICE clearance/,
  );
});
test('candidate downloads require a successful same-source main workflow run', () => {
  const run = {
    id: 12,
    repository: { full_name: config.repository },
    head_repository: { full_name: config.repository },
    path: '.github/workflows/publish.yml',
    head_sha: sha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
  };
  const context = { sha, runId: '13' };
  assert.doesNotThrow(() => checkPreviewRun(run, context));
  for (const change of [
    { head_sha: 'c'.repeat(40) },
    { path: '.github/workflows/ci.yml' },
    { conclusion: 'failure' },
    { head_branch: 'feature' },
    { event: 'pull_request' },
    { head_repository: { full_name: 'other/fork' } },
    { id: 13 },
  ]) {
    assert.throws(() => checkPreviewRun({ ...run, ...change }, context));
  }
});

function recoveryFixture() {
  const input = fixture(),
    meta = 'modeling-metamodel';
  input.report.projectsVersionData[meta] = {
    currentVersion: '0.0.0',
    newVersion: '0.0.1',
  };
  input.report.artifacts[meta] = {
    ...input.report.artifacts[name],
    tag: `${meta}@0.0.1`,
    sha256: 'c'.repeat(64),
  };
  input.histories = { [name]: ['0.0.0-stage', '0.0.1'], [meta]: [] };
  input.tags[`${meta}@0.0.1`] = sha;
  input.context = {
    ...input.context,
    operation: 'recover',
    sha: 'd'.repeat(40),
    candidateRun: '12',
    runId: '15',
  };
  input.previewRun = {
    id: 12,
    repository: { full_name: config.repository },
    head_repository: { full_name: config.repository },
    path: '.github/workflows/publish.yml',
    head_sha: sha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
  };
  input.priorRun = {
    ...input.previewRun,
    id: 14,
    conclusion: 'failure',
    actor: { id: config.ownerId },
  };
  record(input, 'authorizationComment', (r) => {
    r.versions[meta] = '0.0.1';
    r.artifactHashes[meta] = 'c'.repeat(64);
    r.historyBaselines = structuredClone(input.histories);
    r.recovery = {
      executionSha: input.context.sha,
      candidateRun: 12,
      priorRun: 14,
      publish: [meta],
      alreadyPublished: [name],
    };
  });
  record(input, 'readinessComment', (r) => {
    r.artifactHashes[meta] = 'c'.repeat(64);
    r.otherChannelsReviewed[meta] = true;
    r.impacts[meta] = {
      level: 'none',
      reference: 'https://example.invalid/review',
    };
  });
  return input;
}
test('fresh recovery authorizes only the missing original metamodel candidate', () => {
  assert.equal(authorize(recoveryFixture(), acceptedPolicy), 'bootstrap');
  const input = recoveryFixture();
  input.histories[name] = ['0.0.1'];
  record(input, 'authorizationComment', (r) => {
    r.historyBaselines[name] = ['0.0.1'];
  });
  assert.equal(authorize(input, acceptedPolicy), 'bootstrap');
});
const recoveryRejected = {
  'missing recovery decision': (x) =>
    record(x, 'authorizationComment', (r) => {
      delete r.recovery;
    }),
  'ordinary operation using recovery approval': (x) => {
    x.context.operation = 'publish';
  },
  'wrong executor SHA': (x) => {
    x.context.sha = 'e'.repeat(40);
  },
  'wrong candidate input': (x) => {
    x.context.candidateRun = '13';
  },
  'substituted preview run': (x) => {
    x.previewRun.id = 13;
  },
  'wrong preview source': (x) => {
    x.previewRun.head_sha = 'e'.repeat(40);
  },
  'failed preview': (x) => {
    x.previewRun.conclusion = 'failure';
  },
  'wrong prior run': (x) => {
    x.priorRun.id = 13;
  },
  'wrong prior source': (x) => {
    x.priorRun.head_sha = 'e'.repeat(40);
  },
  'prior PR run': (x) => {
    x.priorRun.event = 'pull_request';
  },
  'prior foreign workflow': (x) => {
    x.priorRun.path = '.github/workflows/other.yml';
  },
  'prior fork': (x) => {
    x.priorRun.head_repository.full_name = 'someone/fork';
  },
  'prior non-owner run': (x) => {
    x.priorRun.actor.id = 1;
  },
  'prior incomplete run': (x) => {
    x.priorRun.status = 'in_progress';
  },
  'prior successful run': (x) => {
    x.priorRun.conclusion = 'success';
  },
  'republishing core': (x) =>
    record(x, 'authorizationComment', (r) => {
      r.recovery.publish.unshift(name);
    }),
  'unverified skip set': (x) =>
    record(x, 'authorizationComment', (r) => {
      r.recovery.alreadyPublished = [];
    }),
  'missing published core': (x) => {
    x.histories[name] = ['0.0.0-stage'];
  },
  'metamodel already published': (x) => {
    x.histories['modeling-metamodel'] = ['0.0.1'];
  },
  'unreviewed placeholder': (x) =>
    record(x, 'authorizationComment', (r) => {
      r.historyBaselines[name] = ['0.0.1'];
    }),
  'new published history': (x) => {
    x.histories[name].push('0.0.2');
  },
  'substituted skipped archive': (x) => {
    x.report.artifacts[name].sha256 = 'e'.repeat(64);
  },
  'changed skipped version': (x) => {
    x.report.artifacts[name].artifactVersion = '0.0.2';
  },
  'retagged original': (x) => {
    x.tags[`${name}@0.0.1`] = x.context.sha;
  },
  'stale recovery': (x) => {
    x.authorizationComment.updated_at = '2000-01-01T00:00:00Z';
  },
  'wrong recovery owner': (x) => {
    x.authorizationComment.user.id = 1;
  },
  'broader environment': (x) => {
    x.branchPolicies.push({ name: '*', type: 'branch' });
  },
};
for (const [label, change] of Object.entries(recoveryRejected))
  test(`recovery rejects ${label}`, () => {
    const input = recoveryFixture();
    change(input);
    assert.throws(() => authorize(input, acceptedPolicy));
  });
