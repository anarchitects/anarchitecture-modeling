import { prepareSessionInternal } from './session-preparation.js';
import { DEFAULT_DOCUMENT_HISTORY_POLICY } from './session-preparation.js';
import type {
  DocumentSession,
  DocumentCommand,
  DocumentContext,
  DocumentHistoryPolicy,
  PrepareSessionResult,
} from './document-session-contracts.js';
export { DEFAULT_DOCUMENT_HISTORY_POLICY } from './session-preparation.js';

/** Strict public preparation retains the valid-only result guarantee. */
export function prepareSessionCommand(
  session: DocumentSession,
  command: DocumentCommand,
  context: DocumentContext,
  policy: DocumentHistoryPolicy = DEFAULT_DOCUMENT_HISTORY_POLICY,
): PrepareSessionResult {
  const result = prepareSessionInternal(session, command, context, policy);
  if (result.status !== 'prepared') return result;
  // The engine's default admission checked these invariants; keep narrowing
  // explicit so future engine changes cannot silently broaden the public type.
  if (
    result.assessment.status !== 'valid' ||
    result.assessment.lifecycle !== 'valid'
  )
    throw new Error('Strict preparation returned a non-valid candidate.');
  return {
    ...result,
    assessment: { ...result.assessment, status: 'valid', lifecycle: 'valid' },
  };
}
