import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { digest, checkManifest } from '../boundaries/policy.mjs';
import { config } from './prepare.mjs';
import {
  authorize,
  requiredReadinessIssues,
  verifyReadinessGates,
  ownerRecord,
} from './authorization.mjs';
import { verifyLegalFiles } from './legal.mjs';
import { verifyDocumentation } from './documentation.mjs';
import { executePublication } from './execute.mjs';
import {
  verifyPublishedArtifact,
  waitForPublishedArtifact,
} from './registry.mjs';

// Fail before any network request or external mutation while activation is pending.
assert.equal(config.enabled, true, 'Publication disabled until #23 activation');
assert.equal(
  process.env.GITHUB_ACTIONS,
  'true',
  'Publication requires GitHub Actions',
);
assert.equal(process.env.GITHUB_REPOSITORY, config.repository);
const [directory, authorizationId, readinessId] = process.argv.slice(2);
assert.ok(
  [authorizationId, readinessId].every((id) => /^\d+$/.test(id ?? '')),
  'Review comment IDs required',
);
const report = JSON.parse(
  readFileSync(join(directory, 'candidate.json'), 'utf8'),
);
async function github(path) {
  const response = await fetch(
    `https://api.github.com/repos/${config.repository}/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  assert.ok(
    response.ok,
    `GitHub prerequisite unavailable: ${path} (${response.status})`,
  );
  return response.json();
}
async function pages(path, field) {
  const all = [];
  for (let page = 1; ; page++) {
    const response = await github(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    const items = field ? response[field] : response;
    all.push(...items);
    if (items.length < 100) return all;
  }
}
async function registryVersions(name) {
  const response = await fetch(`${config.registry}/@anarchitects%2f${name}`);
  if (response.status === 404) return [];
  assert.ok(response.ok, `Registry lookup failed (${response.status})`);
  return Object.keys((await response.json()).versions ?? {}).sort();
}
const repoResponse = await fetch(
  `https://api.github.com/repos/${config.repository}`,
  {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}` },
  },
);
assert.ok(repoResponse.ok);
const repo = await repoResponse.json();
const authorizationComment = await github(`issues/comments/${authorizationId}`);
const readinessComment = await github(`issues/comments/${readinessId}`);
const approval = ownerRecord(
  authorizationComment,
  23,
  'foundation-release-authorization',
);
const operation = process.env.OPERATION ?? 'publish';
assert.ok(['publish', 'recover'].includes(operation));
let previewRun, priorRun;
if (operation === 'recover') {
  assert.ok(Number.isSafeInteger(approval.recovery?.priorRun));
  assert.match(process.env.CANDIDATE_RUN ?? '', /^\d+$/);
  previewRun = await github(`actions/runs/${process.env.CANDIDATE_RUN}`);
  priorRun = await github(`actions/runs/${approval.recovery.priorRun}`);
}
const environment = await github(`environments/${config.environment}`);
const branchPolicies = await pages(
  `environments/${config.environment}/deployment-branch-policies`,
  'branch_policies',
);
const workflow = await github(`actions/workflows/${config.workflow}`);
verifyReadinessGates(
  await Promise.all(
    requiredReadinessIssues.map((issue) => github(`issues/${issue}`)),
  ),
);
const tags = Object.fromEntries(
  (await pages('tags')).map((tag) => [tag.name, tag.commit.sha]),
);
const histories = {};
for (const name of Object.keys(report.artifacts))
  histories[name] = await registryVersions(name);
// Derive archive identities from actual bytes, never trust a substituted report.
for (const [name, artifact] of Object.entries(report.artifacts)) {
  assert.equal(basename(artifact.file), artifact.file);
  const archive = join(directory, artifact.file);
  assert.equal(digest(readFileSync(archive)), artifact.sha256);
  const read = (path) =>
    execFileSync('tar', ['-xOf', archive, `package/${path}`], {
      encoding: 'utf8',
    });
  const manifest = JSON.parse(read('package.json'));
  assert.deepEqual(manifest, artifact.manifest);
  assert.equal(manifest.private, false);
  assert.equal(manifest.name, `@anarchitects/${name}`);
  assert.equal(manifest.version, artifact.manifestVersion);
  assert.equal(manifest.version, artifact.artifactVersion);
  assert.equal(manifest.license, config.license.spdx);
  assert.notEqual(manifest.license, 'UNLICENSED');
  verifyLegalFiles(manifest, read, config.license);
  verifyDocumentation(
    name,
    manifest,
    read,
    report.sourceSha,
    config.repository,
  );
  checkManifest(manifest, name, {
    packed: true,
    coreVersion:
      report.projectsVersionData['modeling-core'].newVersion ??
      report.projectsVersionData['modeling-core'].currentVersion,
  });
  for (const path of ['LICENSE', 'NOTICE'])
    assert.doesNotMatch(read(path), /PENDING|NOT CLEARED/i);
}
const mode = authorize({
  report,
  authorizationComment,
  readinessComment,
  repo,
  environment,
  branchPolicies,
  workflow,
  histories,
  tags,
  previewRun,
  priorRun,
  context: {
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    actor: process.env.GITHUB_ACTOR,
    sha: process.env.GITHUB_SHA,
    operation,
    candidateRun: process.env.CANDIDATE_RUN,
    runId: process.env.GITHUB_RUN_ID,
  },
});
if (mode === 'bootstrap')
  assert.ok(process.env.NODE_AUTH_TOKEN, 'Bootstrap credential required');
else {
  assert.ok(
    !process.env.NODE_AUTH_TOKEN,
    'OIDC must not fall back to a publishing token',
  );
  assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, 'OIDC unavailable');
}
async function releasedCore(version) {
  const response = await fetch(
    `${config.registry}/@anarchitects%2fmodeling-core/${version}`,
    { signal: AbortSignal.timeout(30000), redirect: 'error' },
  );
  assert.ok(
    response.ok,
    'Exact core dependency must already be available from npm',
  );
  const manifest = await response.json();
  assert.equal(manifest.name, '@anarchitects/modeling-core');
  assert.equal(manifest.version, version);
}
const request = (url, options) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
try {
  await executePublication({
    report,
    histories,
    publishNames:
      operation === 'recover'
        ? approval.recovery.publish
        : ['modeling-core', 'modeling-metamodel'].filter(
            (name) => report.artifacts[name],
          ),
    alreadyPublished:
      operation === 'recover' ? approval.recovery.alreadyPublished : [],
    registryVersions,
    verifyPublished: (name, artifact) =>
      artifact
        ? verifyPublishedArtifact(name, artifact, request)
        : releasedCore(
            report.artifacts['modeling-metamodel'].manifest.dependencies[
              '@anarchitects/modeling-core'
            ],
          ),
    waitForPublished: waitForPublishedArtifact,
    upload: (_name, artifact) => {
      execFileSync(
        'npm',
        [
          'publish',
          join(directory, artifact.file),
          '--access',
          'public',
          '--provenance',
          '--ignore-scripts',
          '--registry',
          config.registry,
        ],
        { stdio: 'inherit' },
      );
    },
    saveReceipt: (receipts) => {
      writeFileSync(
        join(directory, 'publication-receipt.json'),
        JSON.stringify(receipts, null, 2) + '\n',
      );
    },
  });
} catch (error) {
  console.error(
    'Publication stopped; inspect registry state and receipt before any recovery. No rollback or upload retry attempted.',
  );
  throw error;
}
