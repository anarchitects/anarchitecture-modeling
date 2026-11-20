import assert from 'node:assert/strict';
import { config } from './prepare.mjs';

// A recovery selects existing reviewed bytes, not a new Nx version calculation.
// Keep this first-release path bounded to the observed core-only outcome.
export function recoverySource(approval, context) {
  const recovery = approval.recovery;
  assert.equal(context.operation, 'recover');
  assert.ok(recovery, 'Explicit recovery authorization required');
  assert.match(approval.sourceSha ?? '', /^[a-f0-9]{40}$/);
  assert.match(recovery.executionSha ?? '', /^[a-f0-9]{40}$/);
  assert.equal(recovery.executionSha, context.sha, 'Recovery executor changed');
  assert.ok(
    Number.isSafeInteger(recovery.candidateRun) && recovery.candidateRun > 0,
  );
  assert.ok(Number.isSafeInteger(recovery.priorRun) && recovery.priorRun > 0);
  assert.equal(String(recovery.candidateRun), context.candidateRun);
  assert.notEqual(recovery.candidateRun, recovery.priorRun);
  assert.deepEqual(recovery.publish, ['modeling-metamodel']);
  assert.deepEqual(recovery.alreadyPublished, ['modeling-core']);
  assert.equal(approval.authentication, 'bootstrap');
  return approval.sourceSha;
}

export function checkPriorRun(run, approval) {
  assert.equal(run.id, approval.recovery.priorRun);
  assert.equal(run.repository?.full_name, config.repository);
  assert.equal(run.head_repository?.full_name, config.repository);
  assert.equal(run.path, `.github/workflows/${config.workflow}`);
  assert.equal(run.head_sha, approval.sourceSha);
  assert.equal(run.head_branch, 'main');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.actor?.id, config.ownerId);
  assert.equal(run.status, 'completed');
  assert.ok(['failure', 'cancelled'].includes(run.conclusion));
}

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
