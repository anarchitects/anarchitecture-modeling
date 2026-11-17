import { assessDocument } from './document-assessment.js';
import { copyData, equalData } from './change-data.js';
import { reviewDeletion } from './document-deletion.js';
import type {
  DocumentAssessment,
  DocumentCheckpoint,
  DocumentCommand,
  DocumentContext,
  DocumentDiagnostic,
  DocumentEdit,
  DocumentSnapshot,
  PrepareDocumentResult,
} from './document-session-contracts.js';

/**
 * Shared internal preparation lifecycle; executors supply a fixed local staging function.
 * No input mutation, host commit, defaulting, undo execution or durable authentication.
 */
export function prepareDocumentEdit(
  checkpoint: DocumentCheckpoint,
  command: DocumentCommand,
  context: DocumentContext,
  stage: (
    snapshot: DocumentSnapshot,
    edits: readonly DocumentEdit[],
  ) => {
    candidate: DocumentSnapshot;
    diagnostics: readonly DocumentDiagnostic[];
    inverse: readonly DocumentEdit[];
  },
): PrepareDocumentResult {
  const model = checkpoint.snapshot.model;
  const error = (
    code: string,
    path: readonly (string | number)[],
    message: string,
  ): DocumentDiagnostic => ({
    code,
    severity: 'error',
    commandId: command.id,
    message,
    location: { modelId: model.id, section: 'command', path },
  });
  const reject = (
    diagnostics: readonly DocumentDiagnostic[],
    assessment?: DocumentAssessment,
  ): PrepareDocumentResult => ({
    status: 'rejected',
    diagnostics,
    ...(assessment && { assessment }),
  });
  if (
    !command.id.trim() ||
    command.modelId !== model.id ||
    !command.actor.trim() ||
    !command.source.id.trim() ||
    !command.source.revision.trim()
  )
    return reject([
      error(
        'command.identity',
        ['id'],
        'Supply nonblank command/actor/source identities for the current model.',
      ),
    ]);
  // Receipt integrity and current coverage are inspected independently of exact replay.
  const assessment = assessDocument(checkpoint, context);
  if (assessment.lifecycle === 'invalid')
    return reject(
      assessment.diagnostics.map((d) => ({ ...d, commandId: command.id })),
      assessment,
    );
  const receipts = checkpoint.commands.filter(
    (r) => r.command.id === command.id,
  );
  if (receipts.length) {
    if (receipts.length === 1 && equalData(receipts[0].command, command))
      return { status: 'replayed', receipt: copyData(receipts[0]) };
    return reject([
      error(
        'command.identity-conflict',
        ['id'],
        'A recorded command ID cannot identify different content.',
      ),
    ]);
  }
  const diagnostics: DocumentDiagnostic[] = [];
  if (command.expectedRevision !== model.revision)
    diagnostics.push(
      error(
        'command.stale-revision',
        ['expectedRevision'],
        'Review the current revision before preparing a new command.',
      ),
    );
  if (
    !command.nextRevision.trim() ||
    command.nextRevision === model.revision ||
    checkpoint.commands.some(
      (r) =>
        r.beforeRevision === command.nextRevision ||
        r.afterRevision === command.nextRevision,
    ) ||
    checkpoint.snapshot.applied.some(
      (r) =>
        r.beforeRevision === command.nextRevision ||
        r.afterRevision === command.nextRevision,
    )
  )
    diagnostics.push(
      error(
        'command.reused-revision',
        ['nextRevision'],
        'Use a fresh nonblank revision, including for metadata-only transactions.',
      ),
    );
  if (diagnostics.length) return reject(diagnostics);
  if (assessment.status !== 'valid' || assessment.lifecycle !== 'valid')
    return reject(
      [
        error(
          'command.not-editable',
          [],
          'Resolve invalid/unsupported semantic, view, notation or lifecycle coverage before editing.',
        ),
      ],
      assessment,
    );
  if (command.kind !== 'edit')
    return reject([
      error(
        'command.unsupported-kind',
        ['kind'],
        'Default application and executed undo/redo belong to their dedicated executors.',
      ),
    ]);
  const staged = stage(checkpoint.snapshot, command.edits);
  if (staged.diagnostics.length)
    return reject(
      staged.diagnostics.map((d) => ({ ...d, commandId: command.id })),
    );
  const review = reviewDeletion(
    checkpoint.snapshot,
    command.edits,
    command.deletionReviews,
  );
  if (review.length)
    return reject(
      review.map((r) => ({
        ...error(
          'command.deletion-review',
          ['deletionReviews', r.index],
          r.message,
        ),
        ...(r.location && { location: r.location }),
      })),
    );
  const copiedCommand = copyData(command);
  const candidate: DocumentCheckpoint = {
    snapshot: {
      ...staged.candidate,
      profile: copyData(staged.candidate.profile),
      model: { ...staged.candidate.model, revision: command.nextRevision },
    },
    commands: [
      ...copyData(checkpoint.commands),
      {
        command: copiedCommand,
        beforeRevision: command.expectedRevision,
        afterRevision: command.nextRevision,
        inverse: copyData(staged.inverse),
      },
    ],
  };
  const checked = assessDocument(candidate, context);
  if (checked.status !== 'valid' || checked.lifecycle !== 'valid')
    return reject(
      [
        error(
          'command.invalid-candidate',
          [],
          'The complete proposed transaction is invalid or unsupported; nothing has been committed.',
        ),
      ],
      checked,
    );
  return {
    status: 'prepared',
    command: copiedCommand,
    expectedRevision: command.expectedRevision,
    candidate,
    assessment: { ...checked, status: 'valid', lifecycle: 'valid' },
  };
}
