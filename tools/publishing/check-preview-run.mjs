import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { config } from './prepare.mjs';

export function checkPreviewRun(run, context) {
  assert.equal(run.repository?.full_name, config.repository);
  assert.equal(run.head_repository?.full_name, config.repository);
  assert.equal(run.path, `.github/workflows/${config.workflow}`);
  assert.equal(run.head_sha, context.sha);
  assert.equal(run.head_branch, 'main');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  assert.notEqual(String(run.id), context.runId);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  assert.equal(
    config.enabled,
    true,
    'Publication disabled until #23 activation',
  );
  assert.match(process.env.CANDIDATE_RUN ?? '', /^\d+$/);
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
  const response = await fetch(
    `https://api.github.com/repos/${config.repository}/actions/runs/${process.env.CANDIDATE_RUN}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  assert.ok(response.ok, 'Candidate preview run is unavailable');
  checkPreviewRun(await response.json(), {
    sha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
  });
}
