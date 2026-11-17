import { prepareDocumentEdit } from './document-edit-preparation.js';
import { stageViewEdits } from './view-edit-staging.js';
import type {
  DocumentCheckpoint,
  DocumentCommand,
  DocumentContext,
  PrepareDocumentResult,
} from './document-session-contracts.js';

/** Prepare view-only edits under the shared document revision; semantic targets remain unchanged. */
export function prepareViewCommand(
  checkpoint: DocumentCheckpoint,
  command: DocumentCommand,
  context: DocumentContext,
): PrepareDocumentResult {
  return prepareDocumentEdit(checkpoint, command, context, stageViewEdits);
}
