import { copyData } from './change-data.js';
import { inspectDocumentDeletion } from './document-deletion.js';
import { inspectDocumentLifecycle } from './document-lifecycle.js';
import { reverseBaselines, transitionBaselines } from './document-execution.js';
import type {
  DocumentCheckpoint,
  DocumentDiagnostic,
  DocumentExecution,
  DocumentSession,
} from './document-session-contracts.js';

/** A trusted checkpoint starts a new live session, never rehydrating executable stacks from receipts. */
export function openDocumentSession(
  checkpoint: DocumentCheckpoint,
): DocumentSession {
  return { checkpoint, history: { undo: [], redo: [] } };
}
/** Ephemeral history eviction only. All command/default receipts and baselines remain intact. */
export function pruneDocumentHistory(
  session: DocumentSession,
  keepUndo = 0,
): DocumentSession {
  if (!Number.isSafeInteger(keepUndo) || keepUndo < 0)
    throw new RangeError('keepUndo must be a nonnegative safe integer.');
  return {
    checkpoint: session.checkpoint,
    history: {
      undo: keepUndo ? session.history.undo.slice(-keepUndo) : [],
      redo: [],
    },
  };
}
export function historyDiagnostics(
  session: DocumentSession,
): DocumentDiagnostic[] {
  const lifecycle = inspectDocumentLifecycle(session.checkpoint);
  const ids = [...session.history.undo, ...session.history.redo];
  const bad =
    new Set(ids).size !== ids.length ||
    session.history.undo.some((id) => !lifecycle.heads.get(id)?.active) ||
    session.history.redo.some(
      (id) => lifecycle.heads.get(id)?.active !== false,
    );
  return bad
    ? [
        {
          code: 'history.invalid-stack',
          severity: 'error',
          message:
            'History entries must be unique known transactions in the matching active/undone state.',
          location: {
            modelId: session.checkpoint.snapshot.model.id,
            section: 'command',
            path: ['history'],
          },
        },
      ]
    : [];
}

export type DocumentReversalPreview =
  | {
      readonly status: 'rejected';
      readonly diagnostics: readonly DocumentDiagnostic[];
    }
  | {
      readonly status: 'ready';
      readonly transactionId: string;
      readonly execution: DocumentExecution;
      readonly deletions: readonly {
        readonly operationIndex: number;
        readonly coverage: 'complete' | 'partial' | 'not-applicable';
        readonly dependents: ReturnType<
          typeof inspectDocumentDeletion
        >['dependents'];
      }[];
    };

/** Inspect intent for explicit review; no automatic resolver selection and no permission to commit. */
export function inspectDocumentReversal(
  session: DocumentSession,
  kind: 'undo' | 'redo',
  transactionId: string,
): DocumentReversalPreview {
  const cp = session.checkpoint;
  const fail = (code: string, message: string): DocumentReversalPreview => ({
    status: 'rejected',
    diagnostics: [
      {
        code,
        severity: 'error',
        message,
        location: {
          modelId: cp.snapshot.model.id,
          section: 'command',
          path: ['transactionId'],
        },
      },
    ],
  });
  const history = historyDiagnostics(session);
  if (history.length) return { status: 'rejected', diagnostics: history };
  if (!session.history[kind].length)
    return fail(
      'history.empty',
      'There is no eligible transaction on this live session stack.',
    );
  if (session.history[kind].at(-1) !== transactionId)
    return fail(
      'history.order',
      'Select the most recent eligible transaction on this stack.',
    );
  const metadata = inspectDocumentLifecycle(cp);
  if (metadata.status !== 'valid')
    return fail(
      'history.incomplete',
      'Resolve invalid or unsupported lifecycle evidence before reversing a transaction.',
    );
  const head = metadata.heads.get(transactionId);
  if (!head?.receipt.inverse)
    return fail(
      'history.missing-inverse',
      'This transaction has no complete executable inverse evidence.',
    );
  const execution = copyData({
    edits: head.receipt.inverse,
    baselines: reverseBaselines(head.receipt.execution?.baselines ?? []),
  });
  const transitioned = transitionBaselines(
    cp.snapshot.baselines,
    execution.baselines,
  );
  if (!transitioned.ok)
    return fail(
      'history.baseline-conflict',
      'Generated metadata changed since this transaction; preserve it and resolve the conflict.',
    );
  // Dropping this transaction's own baseline is explicit inverse metadata intent, not an implicit cascade.
  const snapshot = { ...cp.snapshot, baselines: transitioned.baselines };
  return {
    status: 'ready',
    transactionId,
    execution,
    deletions: execution.edits.flatMap((edit, operationIndex) =>
      edit.kind.startsWith('remove-')
        ? [{ operationIndex, ...inspectDocumentDeletion(snapshot, edit) }]
        : [],
    ),
  };
}
