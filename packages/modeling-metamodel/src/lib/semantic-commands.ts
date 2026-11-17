import { prepareDocumentEdit } from './document-edit-preparation.js';
import { stageSemanticEdits } from './semantic-edit-staging.js';
import type {
  DocumentCheckpoint,
  DocumentCommand,
  DocumentContext,
  PrepareDocumentResult,
} from './document-session-contracts.js';

/** Prepare authored semantic edits and reviewed view cleanup without committing host state. */
export function prepareSemanticCommand(
  checkpoint: DocumentCheckpoint,
  command: DocumentCommand,
  context: DocumentContext,
): PrepareDocumentResult {
  return prepareDocumentEdit(checkpoint, command, context, stageSemanticEdits);
}
