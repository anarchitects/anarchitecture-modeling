import { copyData, equalData } from './change-data.js';
import {
  authoringError,
  assessAuthoringCheckpoint,
  classifyAuthoring,
  resolveAuthoringBinding,
  validAuthoringOrigin,
} from './authoring-assessment.js';
import {
  DEFAULT_DOCUMENT_HISTORY_POLICY,
  prepareSessionInternal,
} from './session-preparation.js';
import type {
  AuthoringCommand,
  AuthoringContext,
  AuthoringSession,
  PrepareAuthoringResult,
} from './authoring-contracts.js';
import type {
  DocumentCheckpoint,
  DocumentCommand,
  DocumentHistoryPolicy,
} from './document-session-contracts.js';

/** Explicit adoption of a legacy checkpoint, with a new guarded zero-edit revision. */
export function prepareAuthoringImport(
  checkpoint: DocumentCheckpoint,
  command: DocumentCommand,
  context: AuthoringContext,
  historyPolicy: DocumentHistoryPolicy = DEFAULT_DOCUMENT_HISTORY_POLICY,
): PrepareAuthoringResult {
  const binding = resolveAuthoringBinding(checkpoint, context);
  if (
    !binding ||
    command.kind !== 'edit' ||
    command.edits.length ||
    command.deletionReviews.length ||
    checkpoint.commands.some((r) => r.command.id === command.id)
  )
    return {
      status: 'rejected',
      diagnostics: [
        authoringError(
          checkpoint,
          'authoring.import',
          'Import requires a resolved policy, a new command identity and an empty guarded edit.',
        ),
      ],
    };
  const session: AuthoringSession = {
    checkpoint: { document: checkpoint, binding, importCommandId: command.id },
    history: { undo: [], redo: [] },
  };
  return prepare(session, { command, binding }, context, historyPolicy, true);
}
/** No state adoption occurs here. The host owns current revision and selection authorization. */
export function prepareAuthoringCommand(
  session: AuthoringSession,
  request: AuthoringCommand,
  context: AuthoringContext,
  historyPolicy: DocumentHistoryPolicy = DEFAULT_DOCUMENT_HISTORY_POLICY,
): PrepareAuthoringResult {
  return prepare(session, request, context, historyPolicy, false);
}
function prepare(
  session: AuthoringSession,
  request: AuthoringCommand,
  context: AuthoringContext,
  historyPolicy: DocumentHistoryPolicy,
  importing: boolean,
): PrepareAuthoringResult {
  const cp = session.checkpoint;
  const reject = (code: string, message: string): PrepareAuthoringResult => ({
    status: 'rejected',
    diagnostics: [authoringError(cp.document, code, message)],
  });
  if (!equalData(request.binding, cp.binding))
    return reject(
      'authoring.identity-conflict',
      'Command policy/definition binding differs from this authoring history.',
    );
  if (!importing && !validAuthoringOrigin(cp))
    return reject('authoring.import', 'Retain the explicit import receipt.');
  const origin = cp.document.commands.findIndex(
    (r) => r.command.id === cp.importCommandId,
  );
  const prior = cp.document.commands.findIndex(
    (r) => r.command.id === request.command.id,
  );
  if (!importing && prior >= 0 && prior < origin)
    return reject(
      'authoring.legacy-replay',
      'A legacy command cannot be reinterpreted as a policy-bound authoring command.',
    );
  if (
    !importing &&
    prior < 0 &&
    [...session.history.undo, ...session.history.redo].some(
      (id) =>
        cp.document.commands.findIndex((r) => r.command.id === id) <= origin,
    )
  )
    return reject(
      'authoring.history-boundary',
      'Live authoring history cannot reverse the import or pre-import transactions.',
    );
  const checked = prepareSessionInternal(
    { checkpoint: cp.document, history: session.history },
    request.command,
    context.document,
    historyPolicy,
    (document, assessment) =>
      classifyAuthoring(document, context, cp.binding, assessment).admission !==
      'blocked',
  );
  if (checked.status === 'rejected') return checked;
  if (checked.status === 'replayed') {
    // Plan-based replay can select a different command ID; preserve its provenance.
    if (
      cp.document.commands.findIndex(
        (r) => r.command.id === checked.receipt.command.id,
      ) < origin
    )
      return reject(
        'authoring.legacy-replay',
        'A legacy plan receipt is not an authoring receipt.',
      );
    return {
      status: 'authoring-replayed',
      receipt: checked.receipt,
      binding: copyData(cp.binding),
    };
  }
  const candidate: AuthoringSession = {
    checkpoint: {
      document: checked.candidate.checkpoint,
      binding: copyData(cp.binding),
      importCommandId: cp.importCommandId,
    },
    // Import is a durable boundary, not an undoable transition back to legacy mode.
    history: importing ? { undo: [], redo: [] } : checked.candidate.history,
  };
  return {
    status: 'authoring-prepared',
    command: copyData(request),
    expectedRevision: checked.expectedRevision,
    candidate,
    assessment: assessAuthoringCheckpoint(candidate.checkpoint, context),
  };
}
