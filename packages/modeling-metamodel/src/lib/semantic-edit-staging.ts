import type {
  ModelElement,
  ModelMember,
  ModelRelationship,
  ModelValue,
  PropertyState,
} from '@anarchitects/modeling-core';
import { copyData, equalData } from './change-data.js';
import type {
  DocumentDiagnostic,
  DocumentEdit,
  DocumentSnapshot,
} from './document-session-contracts.js';

type Entity = ModelElement | ModelMember | ModelRelationship;
type Collection = 'elements' | 'members' | 'relationships';
const collection = (kind: string): Collection =>
  kind === 'element'
    ? 'elements'
    : kind === 'member'
      ? 'members'
      : 'relationships';
/** Guards always read original; writes stage privately and never run external code. */
export function stageSemanticEdits(
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
  // Bind replacements/removals to original slots, never to another operation's output.
  const constraintSlots: (
    | DocumentSnapshot['constraints'][number]
    | undefined
  )[] = [...candidate.constraints];
  const addedConstraints: DocumentSnapshot['constraints'][number][] = [];
  const touched = new Map<string, Set<string>>();
  function report(index: number, code: string, message: string) {
    diagnostics.push({
      code,
      severity: 'error',
      message,
      location: {
        modelId: original.model.id,
        section: 'command',
        path: ['edits', index],
      },
    });
  }
  function touch(index: number, owner: string, field = '*') {
    const fields = touched.get(owner) ?? new Set<string>();
    if (
      fields.has('*') ||
      fields.has(field) ||
      (field === '*' && fields.size > 0)
    ) {
      report(
        index,
        'command.overlap',
        'Use one unambiguous write per field; whole-record and field writes cannot overlap.',
      );
      return false;
    }
    fields.add(field);
    touched.set(owner, fields);
    return true;
  }
  function writeEntity(key: Collection, id: string, value?: Entity) {
    const values: Entity[] = candidate.model[key].filter((e) => e.id !== id);
    const priorIndex = candidate.model[key].findIndex((e) => e.id === id);
    if (value)
      values.splice(
        priorIndex < 0 ? values.length : priorIndex,
        0,
        copyData(value),
      );
    // The operation kind fixes collection/entity kind; all three variants are checked below.
    candidate = { ...candidate, model: { ...candidate.model, [key]: values } };
  }
  edits.forEach((edit, i) => {
    const fail = (code: string, message: string) => report(i, code, message);
    if (
      [
        'create-element',
        'replace-element',
        'remove-element',
        'create-member',
        'replace-member',
        'remove-member',
        'create-relationship',
        'replace-relationship',
        'remove-relationship',
      ].includes(edit.kind)
    ) {
      const entityEdit = edit as Extract<
        DocumentEdit,
        {
          kind:
            | 'create-element'
            | 'replace-element'
            | 'remove-element'
            | 'create-member'
            | 'replace-member'
            | 'remove-member'
            | 'create-relationship'
            | 'replace-relationship'
            | 'remove-relationship';
        }
      >;
      const kind = edit.kind.split('-')[1];
      const key = collection(kind);
      const expected =
        'expected' in entityEdit ? entityEdit.expected : undefined;
      const value = 'value' in entityEdit ? entityEdit.value : undefined;
      const basis = expected ?? value;
      if (!basis)
        return fail(
          'command.precondition',
          'Supply the entity payload for this operation.',
        );
      const id = basis.id;
      const matches = original.model[key].filter((e) => e.id === id);
      if (
        expected
          ? matches.length !== 1 || !equalData(matches[0], expected)
          : matches.length !== 0
      )
        return fail(
          'command.precondition',
          'Use the exact existing entity or an absent identity, as reviewed in the original snapshot.',
        );
      if (
        expected &&
        value &&
        (expected.id !== value.id ||
          expected.type !== value.type ||
          ('owner' in expected &&
            (!('owner' in value) || !equalData(expected.owner, value.owner))))
      )
        return fail(
          'command.conversion',
          'Keep identity, type and member owner; conversions require a separate contract.',
        );
      if (!touch(i, JSON.stringify([key, id]))) return;
      writeEntity(key, id, value);
      const inverseKind = !expected
        ? `remove-${kind}`
        : !value
          ? `create-${kind}`
          : `replace-${kind}`;
      inverse.push(
        copyData({
          kind: inverseKind,
          ...(value && { expected: value }),
          ...(expected && { value: expected }),
        }) as DocumentEdit,
      );
      return;
    }
    if (edit.kind === 'rename' || edit.kind === 'set-property') {
      const key = collection(edit.target.kind);
      const matches = original.model[key].filter(
        (e) => e.id === edit.target.id,
      );
      if (edit.target.modelId !== original.model.id || matches.length !== 1)
        return fail(
          'command.precondition',
          'Resolve one same-model subject in the original snapshot.',
        );
      const entity = matches[0];
      if (edit.kind === 'rename') {
        if (
          !('name' in entity) ||
          entity.name !== edit.expected ||
          !edit.value.trim()
        )
          return fail(
            'command.precondition',
            'Supply the exact prior name and a nonblank replacement.',
          );
        if (!touch(i, JSON.stringify([key, entity.id]), 'name')) return;
        const current = candidate.model[key].find((e) => e.id === entity.id);
        if (!current)
          return fail(
            'command.precondition',
            'The staged subject must remain present.',
          );
        writeEntity(key, entity.id, { ...current, name: edit.value } as Entity);
        inverse.push({ ...edit, expected: edit.value, value: edit.expected });
      } else {
        const before: PropertyState = Object.hasOwn(
          entity.properties,
          edit.property,
        )
          ? { present: true, value: entity.properties[edit.property] }
          : { present: false };
        if (!equalData(before, edit.expected))
          return fail(
            'command.precondition',
            'Guard the exact prior property presence/value.',
          );
        if (
          !touch(
            i,
            JSON.stringify([key, entity.id]),
            JSON.stringify(['property', edit.property]),
          )
        )
          return;
        const current = candidate.model[key].find((e) => e.id === entity.id);
        if (!current)
          return fail(
            'command.precondition',
            'The staged subject must remain present.',
          );
        const properties = copyData(current.properties) as Record<
          string,
          ModelValue
        >;
        if (edit.value.present)
          Object.defineProperty(properties, edit.property, {
            value: copyData(edit.value.value),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        else delete properties[edit.property];
        writeEntity(key, entity.id, { ...current, properties });
        inverse.push(
          copyData({ ...edit, expected: edit.value, value: before }),
        );
      }
      return;
    }
    if (
      edit.kind === 'add-constraint' ||
      edit.kind === 'replace-constraint' ||
      edit.kind === 'remove-constraint'
    ) {
      const expected = 'expected' in edit ? edit.expected : undefined;
      const value = 'value' in edit ? edit.value : undefined;
      const matches = original.constraints
        .map((c, index) => ({ c, index }))
        .filter(({ c }) => equalData(c, expected ?? value));
      if (expected ? matches.length !== 1 : matches.length !== 0)
        return fail(
          'command.precondition',
          'Identify exactly one existing constraint binding or add an absent binding.',
        );
      if (!expected && !value)
        return fail('command.precondition', 'Supply the constraint binding.');
      const target = expected
        ? `constraint:${matches[0].index}`
        : `new-constraint:${JSON.stringify(value)}`;
      if (!touch(i, target)) return;
      if (expected)
        constraintSlots[matches[0].index] = value ? copyData(value) : undefined;
      else if (value) addedConstraints.push(copyData(value));
      candidate = {
        ...candidate,
        constraints: [
          ...constraintSlots.filter((c) => c !== undefined),
          ...addedConstraints,
        ],
      };
      inverse.push(
        copyData(
          !expected && value
            ? { kind: 'remove-constraint', expected: value }
            : !value
              ? ({ kind: 'add-constraint', value: expected } as DocumentEdit)
              : ({
                  kind: 'replace-constraint',
                  expected: value,
                  value: expected,
                } as DocumentEdit),
        ),
      );
      return;
    }
    if (edit.kind === 'remove-view') {
      const view = original.views.filter(
        (v) => v.id === edit.expected.id && v.modelId === edit.expected.modelId,
      );
      const bindings = original.notationBindings.filter(
        (b) =>
          b.view.id === edit.expected.id &&
          b.view.modelId === edit.expected.modelId,
      );
      if (
        view.length !== 1 ||
        !equalData(view[0], edit.expected) ||
        !equalData(bindings, edit.expectedNotations)
      )
        return fail(
          'command.precondition',
          'Review the exact view and its complete notation bindings before removing it.',
        );
      if (!touch(i, JSON.stringify(['view', view[0].id]))) return;
      candidate = {
        ...candidate,
        views: candidate.views.filter((v) => v.id !== view[0].id),
        notationBindings: candidate.notationBindings.filter(
          (b) => b.view.id !== view[0].id,
        ),
      };
      inverse.push(
        copyData({
          kind: 'create-view',
          value: view[0],
          notationBindings: bindings,
        }),
      );
      return;
    }
    if (edit.kind === 'remove-occurrence') {
      const views = original.views.filter(
        (v) => v.id === edit.view.id && v.modelId === edit.view.modelId,
      );
      const view = views[0];
      const occurrences = view
        ? [...view.elements, ...view.connectors].filter(
            (o) => o.kind === edit.expected.kind && o.id === edit.expected.id,
          )
        : [];
      const bindings = original.notationBindings.filter(
        (b) =>
          equalData(b.view, edit.view) &&
          b.occurrence.kind === edit.expected.kind &&
          b.occurrence.id === edit.expected.id,
      );
      if (
        views.length !== 1 ||
        occurrences.length !== 1 ||
        !equalData(occurrences[0], edit.expected) ||
        bindings.length !== 1 ||
        !equalData(bindings[0].notation, edit.expectedNotation)
      )
        return fail(
          'command.precondition',
          'Review one exact occurrence and its notation binding.',
        );
      if (
        !touch(
          i,
          JSON.stringify(['view', view.id]),
          JSON.stringify([edit.expected.kind, edit.expected.id]),
        )
      )
        return;
      candidate = {
        ...candidate,
        views: candidate.views.map((v) =>
          v.id !== view.id
            ? v
            : {
                ...v,
                elements:
                  edit.expected.kind === 'element-occurrence'
                    ? v.elements.filter((o) => o.id !== edit.expected.id)
                    : v.elements,
                connectors:
                  edit.expected.kind === 'connector-occurrence'
                    ? v.connectors.filter((o) => o.id !== edit.expected.id)
                    : v.connectors,
              },
        ),
        notationBindings: candidate.notationBindings.filter(
          (b) =>
            !(
              equalData(b.view, edit.view) &&
              b.occurrence.kind === edit.expected.kind &&
              b.occurrence.id === edit.expected.id
            ),
        ),
      };
      inverse.push(
        copyData({
          kind: 'add-occurrence',
          view: edit.view,
          value: edit.expected,
          notation: edit.expectedNotation,
        }),
      );
      return;
    }
    fail(
      'command.unsupported-operation',
      'This semantic executor supports authored semantic/constraint edits and explicit view removals only; use the later view/default/undo executors for other intent.',
    );
  });
  return { candidate, diagnostics, inverse: inverse.reverse() };
}
