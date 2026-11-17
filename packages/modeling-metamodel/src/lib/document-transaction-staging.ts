import { stageSemanticEdits } from './semantic-edit-staging.js';
import { stageViewEdits } from './view-edit-staging.js';
import { invertDocumentEdits } from './document-execution.js';
import type {
  DocumentEdit,
  DocumentSnapshot,
} from './document-session-contracts.js';

/** Both halves guard original state; validation runs only after their disjoint stores are combined. */
export function stageDocumentTransaction(
  snapshot: DocumentSnapshot,
  edits: readonly DocumentEdit[],
) {
  const indexed = edits.map((edit, index) => ({ edit, index }));
  const isView = (edit: DocumentEdit) =>
    edit.kind.endsWith('-view') || edit.kind.endsWith('-occurrence');
  const semantic = indexed.filter((e) => !isView(e.edit));
  const views = indexed.filter((e) => isView(e.edit));
  const s = stageSemanticEdits(
    snapshot,
    semantic.map((e) => e.edit),
  );
  const v = stageViewEdits(
    snapshot,
    views.map((e) => e.edit),
  );
  const remap = (result: typeof s, items: typeof indexed) =>
    result.diagnostics.map((d) => ({
      ...d,
      location: {
        ...d.location,
        path: [
          'edits',
          items[Number(d.location.path[1])].index,
          ...d.location.path.slice(2),
        ],
      },
    }));
  return {
    candidate: {
      ...s.candidate,
      views: v.candidate.views,
      notationBindings: v.candidate.notationBindings,
    },
    diagnostics: [...remap(s, semantic), ...remap(v, views)],
    inverse: invertDocumentEdits(edits),
  };
}
