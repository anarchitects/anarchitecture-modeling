import type {
  ModelEntityReference,
  ModelProperties,
  ModelValue,
} from '@anarchitects/modeling-core';
import { equalData } from './change-data.js';
import type {
  DeletionReview,
  DocumentEdit,
  DocumentLocation,
  DocumentSnapshot,
} from './document-session-contracts.js';

type Owner =
  | {
      kind: 'entity';
      collection: 'elements' | 'members' | 'relationships';
      id: string;
      property?: string;
    }
  | { kind: 'constraint'; index: number }
  | {
      kind: 'occurrence';
      viewId: string;
      occurrenceKind: string;
      occurrenceId: string;
    }
  | {
      kind: 'binding';
      viewId: string;
      occurrenceKind: string;
      occurrenceId: string;
    }
  | { kind: 'baseline'; index: number };
interface Use {
  target: string;
  location: DocumentLocation;
  owner: Owner;
}
const entityKey = (kind: string, id: string) =>
  JSON.stringify(['entity', kind, id]);
const viewKey = (id: string) => JSON.stringify(['view', id]);
const occurrenceKey = (viewId: string, kind: string, id: string) =>
  JSON.stringify(['occurrence', viewId, kind, id]);

/** Active references only; historical receipts are not reinterpreted as current model references. */
function references(s: DocumentSnapshot): Use[] {
  const uses: Use[] = [];
  const location = (
    section: DocumentLocation['section'],
    path: readonly (string | number)[],
  ): DocumentLocation => ({ modelId: s.model.id, section, path });
  const add = (target: string, where: DocumentLocation, owner: Owner) =>
    uses.push({ target, location: where, owner });
  const ref = (
    value: ModelEntityReference,
    where: DocumentLocation,
    owner: Owner,
  ) => {
    if (value.kind !== 'model' && value.modelId === s.model.id)
      add(entityKey(value.kind, value.id), where, owner);
  };
  function value(
    v: ModelValue,
    where: DocumentLocation,
    owner: Owner,
    seen = new Set<object>(),
  ) {
    if (seen.has(v)) return;
    const next = new Set(seen).add(v);
    if (v.kind === 'reference')
      ref(v.value, { ...where, path: [...where.path, 'value'] }, owner);
    else if (v.kind === 'list')
      v.items.forEach((item, i) =>
        value(
          item,
          { ...where, path: [...where.path, 'items', i] },
          owner,
          next,
        ),
      );
    else if (v.kind === 'record')
      Object.entries(v.fields).forEach(([key, item]) =>
        value(
          item,
          { ...where, path: [...where.path, 'fields', key] },
          owner,
          next,
        ),
      );
  }
  function properties(
    p: ModelProperties,
    where: DocumentLocation,
    owner: Owner,
  ) {
    Object.entries(p).forEach(([key, v]) =>
      value(
        v,
        { ...where, path: [...where.path, key] },
        owner.kind === 'entity' ? { ...owner, property: key } : owner,
      ),
    );
  }
  s.model.elements.forEach((e, i) => {
    const owner: Owner = { kind: 'entity', collection: 'elements', id: e.id };
    ref(e.container, location('model', ['elements', i, 'container']), owner);
    properties(
      e.properties,
      location('model', ['elements', i, 'properties']),
      owner,
    );
  });
  s.model.members.forEach((e, i) => {
    const owner: Owner = { kind: 'entity', collection: 'members', id: e.id };
    ref(e.owner, location('model', ['members', i, 'owner']), owner);
    properties(
      e.properties,
      location('model', ['members', i, 'properties']),
      owner,
    );
  });
  s.model.relationships.forEach((e, i) => {
    const owner: Owner = {
      kind: 'entity',
      collection: 'relationships',
      id: e.id,
    };
    ref(e.source, location('model', ['relationships', i, 'source']), owner);
    ref(e.target, location('model', ['relationships', i, 'target']), owner);
    properties(
      e.properties,
      location('model', ['relationships', i, 'properties']),
      owner,
    );
  });
  s.constraints.forEach((c, i) => {
    const owner: Owner = { kind: 'constraint', index: i };
    ref(c.subject, location('constraints', [i, 'subject']), owner);
    c.instance.roles.forEach((role, ri) =>
      role.group.members.forEach((member, mi) =>
        ref(
          member,
          location('constraints', [
            i,
            'instance',
            'roles',
            ri,
            'group',
            'members',
            mi,
          ]),
          owner,
        ),
      ),
    );
    properties(
      c.instance.parameters,
      location('constraints', [i, 'instance', 'parameters']),
      owner,
    );
  });
  s.views.forEach((view, vi) => {
    for (const [collection, occurrences] of [
      ['elements', view.elements],
      ['connectors', view.connectors],
    ] as const)
      occurrences.forEach((o, oi) => {
        const owner: Owner = {
          kind: 'occurrence',
          viewId: view.id,
          occurrenceKind: o.kind,
          occurrenceId: o.id,
        };
        const where = {
          ...location('views', [vi, collection, oi]),
          view: { modelId: view.modelId, id: view.id },
          occurrence: { kind: o.kind, id: o.id },
        } as DocumentLocation;
        add(viewKey(view.id), where, owner);
        ref(o.target, { ...where, path: [...where.path, 'target'] }, owner);
        if (o.kind === 'connector-occurrence')
          for (const end of ['source', 'destination'] as const) {
            const endpoint = o[end];
            add(
              occurrenceKey(endpoint.view.id, endpoint.kind, endpoint.id),
              { ...where, path: [...where.path, end] },
              owner,
            );
          }
      });
  });
  s.notationBindings.forEach((b, i) => {
    const owner: Owner = {
      kind: 'binding',
      viewId: b.view.id,
      occurrenceKind: b.occurrence.kind,
      occurrenceId: b.occurrence.id,
    };
    const where = {
      ...location('notationBindings', [i]),
      view: b.view,
      occurrence: b.occurrence,
    };
    add(viewKey(b.view.id), where, owner);
    add(
      occurrenceKey(b.view.id, b.occurrence.kind, b.occurrence.id),
      where,
      owner,
    );
  });
  s.baselines.forEach((baseline, i) => {
    const owner: Owner = { kind: 'baseline', index: i };
    if (baseline.target.kind === 'member')
      add(
        entityKey('member', baseline.target.id),
        location('baselines', [i, 'target']),
        owner,
      );
    else
      ref(
        baseline.target.subject,
        location('baselines', [i, 'target', 'subject']),
        owner,
      );
    if (baseline.snapshot.present) {
      const v = baseline.snapshot.value;
      if ('kind' in v)
        value(v, location('baselines', [i, 'snapshot', 'value']), owner);
      else {
        ref(
          v.owner,
          location('baselines', [i, 'snapshot', 'value', 'owner']),
          owner,
        );
        properties(
          v.properties,
          location('baselines', [i, 'snapshot', 'value', 'properties']),
          owner,
        );
      }
    }
  });
  return uses;
}
function removedKey(edit: DocumentEdit): string | undefined {
  switch (edit.kind) {
    case 'remove-element':
      return entityKey('element', edit.expected.id);
    case 'remove-member':
      return entityKey('member', edit.expected.id);
    case 'remove-relationship':
      return entityKey('relationship', edit.expected.id);
    case 'remove-view':
      return viewKey(edit.expected.id);
    case 'remove-occurrence':
      return occurrenceKey(edit.view.id, edit.expected.kind, edit.expected.id);
    default:
      return undefined;
  }
}
export interface DocumentDeletionImpact {
  readonly coverage: 'complete' | 'partial' | 'not-applicable';
  readonly dependents: readonly DocumentLocation[];
}
/** Typed inspection; opaque extensions remain unread and make the impact explicitly partial. */
export function inspectDocumentDeletion(
  snapshot: DocumentSnapshot,
  edit: DocumentEdit,
): DocumentDeletionImpact {
  if (
    ![
      'remove-element',
      'remove-member',
      'remove-relationship',
      'remove-view',
      'remove-occurrence',
      'remove-constraint',
    ].includes(edit.kind)
  )
    return { coverage: 'not-applicable', dependents: [] };
  const key = removedKey(edit);
  return {
    coverage: snapshot.extensions.length ? 'partial' : 'complete',
    dependents: key
      ? references(snapshot)
          .filter((u) => u.target === key)
          .map((u) => u.location)
      : [],
  };
}

function covers(
  edit: DocumentEdit,
  owner: Owner,
  s: DocumentSnapshot,
): boolean {
  if (owner.kind === 'baseline') return false; // No authored baseline retirement is silently inferred.
  if (owner.kind === 'constraint')
    return (
      (edit.kind === 'remove-constraint' ||
        edit.kind === 'replace-constraint') &&
      equalData(edit.expected, s.constraints[owner.index])
    );
  if (owner.kind === 'binding' || owner.kind === 'occurrence')
    return (
      (edit.kind === 'remove-view' && edit.expected.id === owner.viewId) ||
      (edit.kind === 'remove-occurrence' &&
        edit.view.id === owner.viewId &&
        edit.expected.kind === owner.occurrenceKind &&
        edit.expected.id === owner.occurrenceId) ||
      (owner.kind === 'occurrence' &&
        edit.kind === 'replace-occurrence' &&
        edit.view.id === owner.viewId &&
        edit.expected.kind === owner.occurrenceKind &&
        edit.expected.id === owner.occurrenceId)
    );
  const kind =
    owner.collection === 'elements'
      ? 'element'
      : owner.collection === 'members'
        ? 'member'
        : 'relationship';
  if (edit.kind === `remove-${kind}` || edit.kind === `replace-${kind}`)
    return (
      'expected' in edit &&
      typeof edit.expected === 'object' &&
      'id' in edit.expected &&
      edit.expected.id === owner.id
    );
  return (
    edit.kind === 'set-property' &&
    owner.property !== undefined &&
    edit.target.kind === kind &&
    edit.target.id === owner.id &&
    edit.property === owner.property
  );
}

/** Verify exact reviewed locations and real resolver operations; candidate validation proves resolution. */
export function reviewDeletion(
  snapshot: DocumentSnapshot,
  edits: readonly DocumentEdit[],
  reviews: readonly DeletionReview[],
) {
  const issues: {
    index: number;
    message: string;
    location?: DocumentLocation;
  }[] = [];
  const uses = references(snapshot);
  const removals = edits
    .map((edit, index) => ({ edit, index }))
    .filter(({ edit }) => edit.kind.startsWith('remove-'));
  for (const review of reviews)
    if (
      !Number.isInteger(review.operationIndex) ||
      !removals.some((r) => r.index === review.operationIndex)
    )
      issues.push({
        index: review.operationIndex,
        message:
          'Attach a deletion review only to an actual removal operation.',
      });
  for (const { edit, index } of removals) {
    const matches = reviews.filter((r) => r.operationIndex === index);
    if (matches.length !== 1) {
      issues.push({
        index,
        message:
          'Supply exactly one complete deletion-impact review, including an empty review when there are no dependents.',
      });
      continue;
    }
    const expected = uses.filter((u) => u.target === removedKey(edit));
    const review = matches[0];
    if (review.dependents.length !== expected.length) {
      issues.push({
        index,
        message:
          'Recompute every dependent location against the reviewed revision; impact is missing or duplicated.',
      });
      continue;
    }
    for (const use of expected) {
      const declared = review.dependents.filter((d) =>
        equalData(d.location, use.location),
      );
      if (declared.length !== 1) {
        issues.push({
          index,
          location: use.location,
          message:
            'Include this exact dependent reference once in the deletion review.',
        });
        continue;
      }
      const resolvers = declared[0].resolvedBy;
      if (
        !resolvers.length ||
        new Set(resolvers).size !== resolvers.length ||
        resolvers.some(
          (ri) =>
            !Number.isInteger(ri) ||
            !edits[ri] ||
            !covers(edits[ri], use.owner, snapshot),
        )
      )
        issues.push({
          index,
          location: use.location,
          message:
            'List explicit same-batch operations that edit or remove this dependent; no cascade or guessed resolution is allowed.',
        });
    }
  }
  return issues;
}
