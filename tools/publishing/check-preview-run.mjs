import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { config } from './prepare.mjs';
import { ownerRecord } from './authorization.mjs';
import { recoverySource, checkPreviewRun } from './recovery.mjs';

export { checkPreviewRun } from './recovery.mjs';

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
  let sourceSha = process.env.GITHUB_SHA;
  if (process.env.OPERATION === 'recover') {
    assert.match(process.env.AUTHORIZATION_COMMENT ?? '', /^\d+$/);
    const approvalResponse = await fetch(
      `https://api.github.com/repos/${config.repository}/issues/comments/${process.env.AUTHORIZATION_COMMENT}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    assert.ok(approvalResponse.ok, 'Recovery authorization unavailable');
    const approval = ownerRecord(
      await approvalResponse.json(),
      23,
      'foundation-release-authorization',
    );
    sourceSha = recoverySource(approval, {
      operation: process.env.OPERATION,
      sha: process.env.GITHUB_SHA,
      candidateRun: process.env.CANDIDATE_RUN,
    });
  }
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
    sha: sourceSha,
    runId: process.env.GITHUB_RUN_ID,
  });
}
