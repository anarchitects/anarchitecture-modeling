import type {
  DiagramView,
  ViewOccurrence,
  ViewOccurrenceIdentity,
  ViewReference,
} from '@anarchitects/modeling-core';
import { copyData, equalData } from './change-data.js';
import type {
  DocumentDiagnostic,
  DocumentEdit,
  DocumentSnapshot,
} from './document-session-contracts.js';

const identity = (o: ViewOccurrence): ViewOccurrenceIdentity =>
  o.kind === 'element-occurrence'
    ? { kind: o.kind, id: o.id }
    : { kind: o.kind, id: o.id };

/** Guards read the original checkpoint; only the complete privately staged result is assessed. */
export function stageViewEdits(
  original: DocumentSnapshot,
  edits: readonly DocumentEdit[],
) {
  let candidate: DocumentSnapshot = {
    ...original,
    model: copyData(original.model),
    views: copyData(original.views),
    constraints: copyData(original.constraints),
    notationBindings: copyData(original.notationBindings),
  };
  const diagnostics: DocumentDiagnostic[] = [];
  const inverse: DocumentEdit[] = [];
  const touched = new Map<string, Set<string>>();
  edits.forEach((edit, index) => {
    const reference =
      'view' in edit
        ? edit.view
        : edit.kind === 'create-view'
          ? { modelId: edit.value.modelId, id: edit.value.id }
          : edit.kind === 'remove-view'
            ? { modelId: edit.expected.modelId, id: edit.expected.id }
            : undefined;
    const occurrence =
      edit.kind === 'add-occurrence'
        ? edit.value
        : edit.kind === 'replace-occurrence' ||
            edit.kind === 'remove-occurrence'
          ? edit.expected
          : undefined;
    const fail = (code: string, message: string) =>
      diagnostics.push({
        code,
        severity: 'error',
        message,
        location: {
          modelId: original.model.id,
          section: 'command',
          path: ['edits', index],
          ...(reference && { view: reference }),
          ...(occurrence && {
            occurrence: identity(occurrence),
          }),
        },
      });
    function touch(view: ViewReference, field = '*') {
      const key = JSON.stringify([view.modelId, view.id]);
      const fields = touched.get(key) ?? new Set<string>();
      if (
        fields.has('*') ||
        fields.has(field) ||
        (field === '*' && fields.size)
      ) {
        fail(
          'command.overlap',
          'Use one write per view field/occurrence; whole-view edits cannot overlap other edits to that view.',
        );
        return false;
      }
      fields.add(field);
      touched.set(key, fields);
      return true;
    }
    function write(view: DiagramView) {
      candidate = {
        ...candidate,
        views: candidate.views.map((v) => (v.id === view.id ? view : v)),
      };
    }
    if (!reference) {
      fail(
        'command.unsupported-operation',
        'The view executor accepts only view/occurrence edits; semantic changes use their dedicated executor.',
      );
      return;
    }
    if (reference.modelId !== original.model.id) {
      fail('command.precondition', 'Select a view in the current model.');
      return;
    }
    const matches = original.views.filter((v) => v.id === reference.id);
    if (edit.kind === 'create-view') {
      if (
        matches.length ||
        !edit.value.id.trim() ||
        !edit.value.name.trim() ||
        edit.notationBindings.some((b) => !equalData(b.view, reference))
      ) {
        fail(
          'command.precondition',
          'Create an absent named view with only its own explicit notation bindings.',
        );
        return;
      }
      if (!touch(reference)) return;
      candidate = {
        ...candidate,
        views: [...candidate.views, copyData(edit.value)],
        notationBindings: [
          ...candidate.notationBindings,
          ...copyData(edit.notationBindings),
        ],
      };
      inverse.push(
        copyData({
          kind: 'remove-view',
          expected: edit.value,
          expectedNotations: edit.notationBindings,
        }),
      );
      return;
    }
    if (matches.length !== 1) {
      fail(
        'command.precondition',
        'Resolve one view in the original checkpoint; a newly created view must include its complete initial content.',
      );
      return;
    }
    const view = matches[0];
    const current = candidate.views.find((v) => v.id === view.id);
    if (!current) {
      fail(
        'command.overlap',
        'A removed view cannot receive another edit in the same batch.',
      );
      return;
    }
    const bindings = original.notationBindings.filter((b) =>
      equalData(b.view, reference),
    );
    if (edit.kind === 'rename-view') {
      if (view.name !== edit.expected || !edit.value.trim()) {
        fail(
          'command.precondition',
          'Guard the exact original view name and supply a nonblank replacement.',
        );
        return;
      }
      if (!touch(reference, 'name')) return;
      write({ ...current, name: edit.value });
      inverse.push(
        copyData({ ...edit, expected: edit.value, value: edit.expected }),
      );
      return;
    }
    if (edit.kind === 'remove-view') {
      if (
        !equalData(view, edit.expected) ||
        !equalData(bindings, edit.expectedNotations)
      ) {
        fail(
          'command.precondition',
          'Review the complete view, including its connectors and exact notation bindings.',
        );
        return;
      }
      if (!touch(reference)) return;
      candidate = {
        ...candidate,
        views: candidate.views.filter((v) => v.id !== view.id),
        notationBindings: candidate.notationBindings.filter(
          (b) => !equalData(b.view, reference),
        ),
      };
      inverse.push(
        copyData({
          kind: 'create-view',
          value: view,
          notationBindings: bindings,
        }),
      );
      return;
    }
    if (
      edit.kind !== 'add-occurrence' &&
      edit.kind !== 'replace-occurrence' &&
      edit.kind !== 'remove-occurrence'
    )
      return;
    const basis = edit.kind === 'add-occurrence' ? edit.value : edit.expected;
    const key = basis.kind === 'element-occurrence' ? 'elements' : 'connectors';
    const found = view[key].filter((o) => o.id === basis.id);
    if (
      edit.kind === 'add-occurrence'
        ? found.length !== 0
        : found.length !== 1 || !equalData(found[0], basis)
    ) {
      fail(
        'command.precondition',
        'Use an absent occurrence identity or guard the exact original occurrence in this view and kind.',
      );
      return;
    }
    if (
      edit.kind === 'replace-occurrence' &&
      (edit.value.kind !== edit.expected.kind ||
        edit.value.id !== edit.expected.id ||
        !equalData(edit.value.target, edit.expected.target))
    ) {
      fail(
        'command.conversion',
        'Keep occurrence kind, identity and semantic target; replacement only changes presentation and corresponding endpoint occurrences.',
      );
      return;
    }
    const notation = bindings.filter(
      (b) => b.occurrence.kind === basis.kind && b.occurrence.id === basis.id,
    );
    if (
      edit.kind === 'remove-occurrence' &&
      (notation.length !== 1 ||
        !equalData(notation[0].notation, edit.expectedNotation))
    ) {
      fail(
        'command.precondition',
        'Guard the exact notation binding when removing this occurrence.',
      );
      return;
    }
    if (!touch(reference, JSON.stringify([basis.kind, basis.id]))) return;
    const next: ViewOccurrence[] = [...current[key]];
    if (edit.kind === 'add-occurrence') next.push(copyData(edit.value));
    else {
      const at = next.findIndex((o) => o.id === basis.id);
      if (edit.kind === 'remove-occurrence') next.splice(at, 1);
      else next.splice(at, 1, copyData(edit.value));
    }
    // Kind preservation above makes the computed collection type-safe.
    write({ ...current, [key]: next });
    if (edit.kind === 'add-occurrence') {
      candidate = {
        ...candidate,
        notationBindings: [
          ...candidate.notationBindings,
          copyData({
            view: reference,
            occurrence: identity(basis),
            notation: edit.notation,
          }),
        ],
      };
      inverse.push(
        copyData({
          kind: 'remove-occurrence',
          view: reference,
          expected: edit.value,
          expectedNotation: edit.notation,
        }),
      );
    } else if (edit.kind === 'remove-occurrence') {
      candidate = {
        ...candidate,
        notationBindings: candidate.notationBindings.filter(
          (b) =>
            !(
              equalData(b.view, reference) &&
              b.occurrence.kind === basis.kind &&
              b.occurrence.id === basis.id
            ),
        ),
      };
      inverse.push(
        copyData({
          kind: 'add-occurrence',
          view: reference,
          value: edit.expected,
          notation: edit.expectedNotation,
        }),
      );
    } else
      inverse.push(
        copyData({ ...edit, expected: edit.value, value: edit.expected }),
      );
  });
  return { candidate, diagnostics, inverse: inverse.reverse() };
}
