import assert from 'node:assert/strict';
import { validateCandidate } from '../release/policy.mjs';
import { config } from './prepare.mjs';

// #44's genuine Dependabot event remains a nonblocking follow-up after #70.
// These completed outcomes are still required alongside exact owner records.
export const requiredReadinessIssues = [20, 21, 22, 55];

export function verifyReadinessGates(issues) {
  for (const number of requiredReadinessIssues) {
    const issue = issues.find((entry) => entry.number === number);
    assert.equal(
      issue?.state,
      'closed',
      `Readiness gate #${number} is open or unavailable`,
    );
    assert.equal(
      issue.state_reason,
      'completed',
      `Readiness gate #${number} is not completed`,
    );
  }
}

export function ownerRecord(
  comment,
  issue,
  marker,
  now = Date.now(),
  policy = config,
) {
  assert.equal(
    comment.user?.id,
    policy.ownerId,
    'Review must be authored by the accountable owner',
  );
  assert.equal(comment.user?.login, policy.owner);
  assert.equal(
    comment.issue_url,
    `https://api.github.com/repos/${policy.repository}/issues/${issue}`,
  );
  assert.ok(
    Number.isFinite(Date.parse(comment.updated_at)),
    'Review timestamp required',
  );
  const age = now - Date.parse(comment.updated_at);
  assert.ok(
    age >= 0 && age <= 86400000,
    'Review must be current (at most 24 hours)',
  );
  const match = new RegExp('```' + marker + '\\s*\\n([\\s\\S]*?)\\n```', 'g');
  const blocks = [...comment.body.matchAll(match)];
  assert.equal(blocks.length, 1, 'Expected one exact review record');
  return JSON.parse(blocks[0][1]);
}

export function authorize(
  {
    report,
    authorizationComment,
    readinessComment,
    repo,
    environment,
    branchPolicies,
    workflow,
    histories,
    tags,
    context,
  },
  policy = config,
) {
  assert.equal(
    policy.enabled,
    true,
    'Publication is disabled; activate only through #23 authorization',
  );
  assert.equal(
    policy.license.status,
    'accepted',
    'Final license/NOTICE clearance required',
  );
  assert.equal(report.licenseStatus, 'accepted');
  assert.equal(repo.full_name, config.repository);
  assert.equal(repo.private, false, 'Public provenance requires public source');
  assert.equal(context.event, 'workflow_dispatch');
  assert.equal(context.ref, 'refs/heads/main');
  assert.equal(context.actor, config.owner);
  assert.equal(context.sha, report.sourceSha);
  assert.equal(workflow.path, `.github/workflows/${config.workflow}`);
  const reviewerRule = environment.protection_rules?.find(
    (r) => r.type === 'required_reviewers',
  );
  assert.deepEqual(
    reviewerRule?.reviewers?.map((r) => ({
      type: r.type,
      id: r.reviewer?.id,
    })),
    [{ type: 'User', id: config.ownerId }],
    'Exact owner environment reviewer required',
  );
  assert.equal(
    reviewerRule.prevent_self_review,
    false,
    'Owner must be able to approve their own release',
  );
  assert.equal(
    environment.can_admins_bypass,
    false,
    'Environment bypass must be disabled',
  );
  assert.equal(
    environment.deployment_branch_policy?.custom_branch_policies,
    true,
  );
  assert.equal(environment.deployment_branch_policy?.protected_branches, false);
  assert.deepEqual(
    branchPolicies.map((p) => ({ name: p.name, type: p.type })),
    [{ name: 'main', type: 'branch' }],
  );
  const approval = ownerRecord(
    authorizationComment,
    23,
    'foundation-release-authorization',
    Date.now(),
    policy,
  );
  const readiness = ownerRecord(
    readinessComment,
    22,
    'foundation-release-readiness',
    Date.now(),
    policy,
  );
  assert.equal(
    approval.readinessCommentId,
    readinessComment.id,
    'Authorization must identify the reviewed readiness record',
  );
  assert.equal(readiness.decision, 'ready');
  assert.equal(readiness.sourceSha, report.sourceSha);
  assert.equal(approval.sourceSha, report.sourceSha);
  assert.ok(
    ['bootstrap', 'oidc'].includes(approval.authentication),
    'Explicit authentication mode required',
  );
  const authorization = {
    ...approval,
    owner: config.owner,
    reference: authorizationComment.html_url,
  };
  const artifacts = {},
    history = {};
  assert.deepEqual(
    Object.keys(report.artifacts).sort(),
    Object.entries(report.projectsVersionData)
      .filter(([, value]) => value.newVersion !== null)
      .map(([name]) => name)
      .sort(),
    'Exact Nx candidate artifact set required',
  );
  for (const [name, artifact] of Object.entries(report.artifacts)) {
    assert.equal(
      readiness.artifactHashes?.[name],
      artifact.sha256,
      'Readiness must cover the actual archive',
    );
    assert.equal(
      approval.artifactHashes?.[name],
      artifact.sha256,
      'Authorization must cover the actual archive',
    );
    const observed = histories[name];
    assert.ok(Array.isArray(observed), 'Registry history unavailable');
    assert.ok(
      !observed.includes(artifact.artifactVersion),
      'Version already exists; never republish',
    );
    assert.equal(
      tags[artifact.tag],
      report.sourceSha,
      'Owner-authorized tag must exist at exact candidate SHA',
    );
    const earlierTags = Object.entries(tags)
      .filter(([tag]) => tag.startsWith(`${name}@`) && tag !== artifact.tag)
      .map(([tag]) => tag.slice(name.length + 1));
    const versions = [...new Set([...observed, ...earlierTags])].sort();
    assert.deepEqual(
      approval.historyBaselines?.[name],
      versions,
      'History changed after authorization',
    );
    assert.equal(readiness.otherChannelsReviewed?.[name], true);
    if (!versions.length)
      assert.equal(
        approval.authentication,
        'bootstrap',
        'First publish needs a separately authorized bootstrap credential',
      );
    else
      assert.equal(
        approval.authentication,
        'oidc',
        'Released packages use trusted publishing',
      );
    artifacts[name] = artifact;
    history[name] = {
      sourceSha: report.sourceSha,
      versions,
      checkedAt: new Date().toISOString(),
      registryChecked: true,
      tagsChecked: true,
      otherChannelsReviewed: true,
      reference: readinessComment.html_url,
    };
  }
  validateCandidate({
    sourceSha: report.sourceSha,
    projectsVersionData: report.projectsVersionData,
    authorization,
    artifacts,
    history,
    impacts: readiness.impacts,
  });
  return approval.authentication;
}
