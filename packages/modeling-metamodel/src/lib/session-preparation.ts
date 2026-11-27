import { applyChangePlanInternal } from './plan-preparation.js';
import { assessDocument } from './document-assessment.js';
import {
  changeTarget,
  copyData,
  currentSnapshot,
  equalData,
  targetKey,
} from './change-data.js';
import { reviewDeletion } from './document-deletion.js';
import {
  invertDocumentEdits,
  planExecution,
  transitionBaselines,
} from './document-execution.js';
import {
  historyDiagnostics,
  inspectDocumentReversal,
} from './document-history.js';
import { stageDocumentTransaction } from './document-transaction-staging.js';
import type {
  DocumentAssessment,
  DocumentCommand,
  DocumentContext,
  DocumentDiagnostic,
  DocumentExecution,
  DocumentHistoryPolicy,
  DocumentSession,
  DocumentCheckpoint,
  PrepareSessionResult,
} from './document-session-contracts.js';

export const DEFAULT_DOCUMENT_HISTORY_POLICY: DocumentHistoryPolicy = {
  maxTransactions: 100,
  maxReceipts: 10000,
};

/** Prepare one grouped live-session transaction. Host compare-and-swap and durable storage remain separate. */
export type SessionPreparation =
  | Exclude<PrepareSessionResult, { status: 'prepared' }>
  | {
      readonly status: 'prepared';
      readonly command: DocumentCommand;
      readonly expectedRevision: DocumentCommand['expectedRevision'];
      readonly candidate: DocumentSession;
      readonly assessment: DocumentAssessment;
    };

/** Internal only: public entry points supply fixed admission semantics, never caller callbacks. */
export function prepareSessionInternal(
  session: DocumentSession,
  command: DocumentCommand,
  context: DocumentContext,
  policy: DocumentHistoryPolicy = DEFAULT_DOCUMENT_HISTORY_POLICY,
  admission?: (
    checkpoint: DocumentCheckpoint,
    assessment: DocumentAssessment,
  ) => boolean,
): SessionPreparation {
  const cp = session.checkpoint;
  const s = cp.snapshot;
  const error = (
    code: string,
    message: string,
    path: readonly (string | number)[] = [],
  ): DocumentDiagnostic => ({
    code,
    severity: 'error',
    message,
    commandId: command.id,
    location: { modelId: s.model.id, section: 'command', path },
  });
  const reject = (
    diagnostics: readonly DocumentDiagnostic[],
    assessment?: DocumentAssessment,
  ): SessionPreparation => ({
    status: 'rejected',
    diagnostics,
    ...(assessment && { assessment }),
  });
  if (
    !command.id.trim() ||
    command.modelId !== s.model.id ||
    !command.actor.trim() ||
    !command.source.id.trim() ||
    !command.source.revision.trim()
  )
    return reject([
      error(
        'command.identity',
        'Supply nonblank command/actor/source identities for this model.',
      ),
    ]);
  const assessment = assessDocument(cp, context);
  if (assessment.lifecycle === 'invalid')
    return reject(assessment.diagnostics, assessment);
  const prior = cp.commands.find((r) => r.command.id === command.id);
  if (prior)
    return equalData(prior.command, command)
      ? { status: 'replayed', receipt: copyData(prior) }
      : reject([
          error(
            'command.identity-conflict',
            'A recorded command ID cannot identify changed content.',
          ),
        ]);
  if (command.kind === 'apply-defaults') {
    const priorPlan = cp.commands.find(
      (r) =>
        r.command.kind === 'apply-defaults' &&
        r.command.plan.id === command.plan.id,
    );
    if (priorPlan?.command.kind === 'apply-defaults')
      return equalData(priorPlan.command.plan, command.plan)
        ? { status: 'replayed', receipt: copyData(priorPlan) }
        : reject([
            error(
              'plan.identity-conflict',
              'A retained plan ID cannot identify different reviewed content.',
            ),
          ]);
  }
  if (command.expectedRevision !== s.model.revision)
    return reject([
      error(
        'command.stale-revision',
        'Review the current coordinated revision before preparing a transaction.',
      ),
    ]);
  if (
    !command.nextRevision.trim() ||
    command.nextRevision === s.model.revision ||
    cp.commands.some(
      (r) =>
        r.beforeRevision === command.nextRevision ||
        r.afterRevision === command.nextRevision,
    ) ||
    s.applied.some(
      (r) =>
        r.beforeRevision === command.nextRevision ||
        r.afterRevision === command.nextRevision,
    )
  )
    return reject([
      error(
        'command.reused-revision',
        'Use a fresh revision, including after undo and for metadata-only transactions.',
      ),
    ]);
  if (
    !Number.isSafeInteger(policy.maxTransactions) ||
    policy.maxTransactions < 0 ||
    !Number.isSafeInteger(policy.maxReceipts) ||
    policy.maxReceipts < 1
  )
    return reject([
      error(
        'history.invalid-policy',
        'Use nonnegative finite history capacity and positive finite receipt capacity.',
      ),
    ]);
  if (cp.commands.length >= policy.maxReceipts)
    return reject([
      error(
        'history.receipt-capacity',
        'Receipt capacity is exhausted; do not discard retry evidence to accept a new command.',
      ),
    ]);
  const historyErrors = historyDiagnostics(session);
  if (historyErrors.length) return reject(historyErrors);
  // Defaults may repair missing required values, but never bypass incomplete semantic or lifecycle coverage.
  const repairable =
    command.kind === 'apply-defaults' &&
    assessment.semantics.structure === 'valid' &&
    assessment.semantics.semantics === 'complete' &&
    !assessment.views.length &&
    !assessment.diagnostics.length &&
    assessment.notation.every((n) => n.result.ok);
  if (
    assessment.lifecycle !== 'valid' ||
    (admission
      ? !admission(cp, assessment)
      : assessment.status !== 'valid' && !repairable)
  )
    return reject(
      [
        error(
          'command.not-editable',
          'Resolve invalid or unsupported semantic/view/notation/lifecycle coverage before editing.',
        ),
      ],
      assessment,
    );
  let execution: DocumentExecution;
  let candidateSnapshot = s;
  let deletionReviews = command.kind === 'edit' ? command.deletionReviews : [];
  if (command.kind === 'apply-defaults') {
    const plan = command.plan;
    if (
      plan.modelId !== command.modelId ||
      plan.expectedRevision !== command.expectedRevision ||
      plan.nextRevision !== command.nextRevision ||
      !equalData(plan.source, command.source)
    )
      return reject([
        error(
          'plan.coordination',
          'The reviewed plan must share this command’s model, revisions and source.',
        ),
      ]);
    for (const [i, op] of plan.operations.entries()) {
      if (op.origin.kind !== 'generated') continue;
      const target = changeTarget(op.change);
      const baseline = s.baselines.find(
        (b) => targetKey(b.target) === targetKey(target),
      );
      if (
        baseline &&
        !equalData(currentSnapshot(s.model, target), baseline.snapshot)
      )
        return reject([
          error(
            'plan.manual-conflict',
            'Generated writes cannot overwrite a changed human value; re-propose or explicitly resolve the conflict first.',
            ['plan', 'operations', i],
          ),
        ]);
    }
    const applied = applyChangePlanInternal(
      s,
      plan,
      {
        defaultRules: context.defaultRules,
        validation: {
          profile: s.profile,
          registry: context.packs,
          constraints: s.constraints,
          extensions: s.extensions,
          rules: context.validationRules,
        },
        // Authoring admission runs on the complete coordinated candidate below,
        // after the plan's revision and receipt have been added to the same chain.
      },
      admission ? () => true : undefined,
    );
    if (!applied.ok)
      return reject(
        applied.diagnostics.map((d) => ({
          ...error(d.code, d.message, ['plan', ...d.location.path]),
          location: {
            modelId: s.model.id,
            section: 'model',
            path: d.location.path,
          },
        })),
      );
    if (applied.status !== 'applied')
      return reject([
        error(
          'plan.uncoordinated-replay',
          'A legacy plan receipt cannot be silently adopted as a new document transaction.',
        ),
      ]);
    execution = planExecution(plan);
    candidateSnapshot = { ...s, ...applied.state };
  } else {
    if (command.kind === 'edit')
      execution = { edits: command.edits, baselines: [] };
    else {
      const preview = inspectDocumentReversal(
        session,
        command.kind,
        command.transactionId,
      );
      if (preview.status === 'rejected') return preview;
      execution = preview.execution;
      deletionReviews = command.deletionReviews ?? [];
    }
    const metadata = transitionBaselines(s.baselines, execution.baselines);
    if (!metadata.ok)
      return reject([
        error(
          'history.baseline-conflict',
          'Generated metadata no longer matches the guarded reversal.',
        ),
      ]);
    const base = { ...s, baselines: metadata.baselines };
    const staged = stageDocumentTransaction(base, execution.edits);
    if (staged.diagnostics.length)
      return reject(
        staged.diagnostics.map((d) => ({ ...d, commandId: command.id })),
      );
    const review = reviewDeletion(base, execution.edits, deletionReviews);
    if (review.length)
      return reject(
        review.map((r) => ({
          ...error('command.deletion-review', r.message, [
            'deletionReviews',
            r.index,
          ]),
          ...(r.location && { location: r.location }),
        })),
      );
    candidateSnapshot = staged.candidate;
  }
  const copiedExecution = copyData(execution);
  const candidate = {
    snapshot: {
      ...candidateSnapshot,
      profile: copyData(candidateSnapshot.profile),
      model: { ...candidateSnapshot.model, revision: command.nextRevision },
    },
    commands: [
      ...copyData(cp.commands),
      {
        command: copyData(command),
        beforeRevision: command.expectedRevision,
        afterRevision: command.nextRevision,
        execution: copiedExecution,
        inverse: invertDocumentEdits(copiedExecution.edits),
      },
    ],
  };
  const checked = assessDocument(candidate, context);
  if (
    checked.lifecycle !== 'valid' ||
    (admission ? !admission(candidate, checked) : checked.status !== 'valid')
  )
    return reject(
      [
        error(
          'command.invalid-candidate',
          'The complete coordinated reversal/edit is invalid or unsupported; no state or history was changed.',
        ),
      ],
      checked,
    );
  const undo = [...session.history.undo];
  const redo = [...session.history.redo];
  if (command.kind === 'undo') {
    undo.pop();
    redo.push(command.transactionId);
  } else if (command.kind === 'redo') {
    redo.pop();
    undo.push(command.transactionId);
  } else {
    undo.push(command.id);
    redo.length = 0;
  }
  // Capacity applies to both stacks; evict oldest undo first, then farthest redo.
  while (undo.length + redo.length > policy.maxTransactions) {
    if (undo.length) undo.shift();
    else redo.shift();
  }
  return {
    status: 'prepared',
    command: copyData(command),
    expectedRevision: command.expectedRevision,
    candidate: { checkpoint: candidate, history: { undo, redo } },
    assessment: checked,
  };
}
