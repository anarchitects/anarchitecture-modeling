import {
  createModel,
  createModelRevision,
  createElementId,
  createMemberId,
  createRelationshipId,
  createViewId,
  createElementOccurrenceId,
  createConnectorOccurrenceId,
  type ElementReference,
  type MemberReference,
  type ModelProperties,
} from '@anarchitects/modeling-core';
import {
  assessDocument,
  prepareSemanticCommand,
  prepareSessionCommand,
  openDocumentSession,
  pruneDocumentHistory,
  inspectDocumentReversal,
  proposeDefaultPlan,
  DEFAULTS_OPERATOR,
  type DefaultRule,
  type DocumentSession,
  type PrepareSessionResult,
  inspectDocumentDeletion,
  MEMBER_GROUP_OPERATOR,
  type DocumentCheckpoint,
  type DocumentContext,
  type DocumentCommand,
  type DocumentEdit,
  type DeletionReview,
  type PropertyDefinition,
} from '../index.js';

function fixture() {
  const empty = createModel('commands', 'Command proof', {
    id: 'proof',
    version: '1',
  });
  const pin = { id: 'proof', version: '1', contractVersion: '1' };
  const node = {
    pack: pin,
    kind: 'element' as const,
    id: 'proof:node' as const,
  };
  const field = {
    pack: pin,
    kind: 'member' as const,
    id: 'proof:field' as const,
  };
  const a: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('a'),
  };
  const b: ElementReference = { ...a, id: createElementId('b') };
  const m: MemberReference = {
    kind: 'member',
    modelId: empty.id,
    id: createMemberId('m'),
  };
  const n: MemberReference = { ...m, id: createMemberId('n') };
  const required = {
    'proof:required': { kind: 'scalar' as const, value: 'kept' },
  };
  const links: ModelProperties = {
    'proof:links': {
      kind: 'list',
      items: [
        {
          kind: 'record',
          fields: { 'proof:target': { kind: 'reference', value: m } },
        },
      ],
    },
  };
  const group = { pack: pin, id: 'proof:group' as const };
  const rule = {
    id: 'proof:group-check' as const,
    version: '1',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const model = {
    ...empty,
    elements: [
      {
        id: a.id,
        type: node.id,
        name: 'A',
        container: { kind: 'model' as const, id: empty.id },
        properties: required,
      },
      {
        id: b.id,
        type: node.id,
        name: 'B',
        container: a,
        properties: { ...required, ...links },
      },
    ],
    members: [
      { id: m.id, type: field.id, name: 'M', owner: a, properties: {} },
      { id: n.id, type: field.id, name: 'N', owner: b, properties: links },
    ],
    relationships: [
      {
        id: createRelationshipId('r'),
        type: 'proof:link',
        source: a,
        target: b,
        properties: {
          'proof:note': { kind: 'scalar' as const, value: 'edge' },
          ...links,
        },
      },
    ],
  };
  const common: PropertyDefinition[] = [
    {
      id: 'proof:note',
      required: false,
      value: { kind: 'scalar', valueType: 'string' },
    },
    {
      id: 'proof:links',
      required: false,
      value: {
        kind: 'list',
        cardinality: { min: 0, max: null },
        items: {
          kind: 'record',
          fields: [
            {
              id: 'proof:target',
              required: true,
              value: {
                kind: 'reference',
                target: { kind: 'member', types: [field] },
              },
            },
          ],
        },
      },
    },
  ];
  const context: DocumentContext = {
    packs: [
      {
        ...pin,
        displayName: 'Synthetic command schema',
        implementation: 'scaffold',
        dimensions: ['method'],
        requires: [],
        conflicts: [],
        extensions: [],
        constraints: [
          {
            id: group.id,
            mandatory: false,
            rule,
            roles: [
              {
                id: 'proof:fields',
                ordered: true,
                distinct: true,
                cardinality: { min: 1, max: 2 },
                memberTypes: [field],
              },
            ],
          },
        ],
        types: [
          {
            kind: 'element',
            id: node.id,
            properties: [
              ...common,
              {
                id: 'proof:required',
                required: true,
                value: { kind: 'scalar', valueType: 'string' },
              },
            ],
            constraints: [group],
          },
          {
            kind: 'member',
            id: field.id,
            owners: [node],
            properties: common,
            constraints: [],
          },
          {
            kind: 'relationship',
            id: 'proof:link',
            properties: common,
            constraints: [],
            endpointPairs: [
              {
                source: { role: 'proof:source', types: [node] },
                target: { role: 'proof:target', types: [node] },
              },
            ],
          },
          {
            kind: 'element',
            id: 'proof:other',
            properties: [],
            constraints: [],
          },
        ],
      },
    ],
    validationRules: [{ pack: pin, rule }],
    defaultRules: [],
    notations: [],
    theme: {
      id: 'host',
      tokens: { paper: '#fff', ink: '#111', accent: '#aae' },
    },
  };
  const notation = (
    kind: 'element' | 'relationship',
    id: 'proof:node' | 'proof:link',
  ) => ({
    reference: { pack: pin, id: `${id}-notation` as const, version: '1' },
    type: { pack: pin, kind, id },
    defaults:
      kind === 'element'
        ? {
            shape: 'box',
            fillToken: 'paper',
            strokeToken: 'ink',
            textToken: 'ink',
          }
        : {
            lineStyle: 'line',
            targetMarker: 'arrow',
            strokeToken: 'ink',
            textToken: 'ink',
          },
    allowedOverrides:
      kind === 'element' ? { fillToken: ['accent'] } : { lineStyle: ['dash'] },
    accessibility: {
      labelRequired: true as const,
      nonColorCueRequired: true as const,
      minimumTextContrast: 4.5,
      minimumGraphicContrast: 3,
    },
  });
  const notations = [
    notation('element', 'proof:node'),
    notation('relationship', 'proof:link'),
  ];
  const views = ['overview', 'detail'].map((id) => {
    const view = { modelId: model.id, id: createViewId(id) };
    const elements = [a, b].map((target, i) => ({
      kind: 'element-occurrence' as const,
      id: createElementOccurrenceId(`o${i}`),
      target,
      bounds: { x: i * 200, y: 0, width: 100, height: 50 },
      overrides: {},
      accessibility: { label: target.id },
    }));
    return {
      ...view,
      name: id,
      elements,
      connectors: [
        {
          kind: 'connector-occurrence' as const,
          id: createConnectorOccurrenceId('edge'),
          target: {
            kind: 'relationship' as const,
            modelId: model.id,
            id: model.relationships[0].id,
          },
          source: {
            kind: 'element-occurrence' as const,
            view,
            id: elements[0].id,
          },
          destination: {
            kind: 'element-occurrence' as const,
            view,
            id: elements[1].id,
          },
          waypoints: [],
          overrides: {},
          accessibility: { label: 'Link' },
        },
      ],
    };
  });
  const checkpoint: DocumentCheckpoint = {
    snapshot: {
      model,
      profile: {
        ...model.profile,
        selections: [{ dimension: 'method', pack: pin }],
      },
      views,
      constraints: [
        {
          subject: a,
          instance: {
            definition: group,
            parameters: {},
            roles: [{ role: 'proof:fields', group: { members: [m] } }],
          },
        },
      ],
      extensions: [],
      baselines: [],
      applied: [],
      notationBindings: views.flatMap((view) =>
        [...view.elements, ...view.connectors].map((o) => ({
          view: { modelId: model.id, id: view.id },
          occurrence:
            o.kind === 'element-occurrence'
              ? { kind: o.kind, id: o.id }
              : { kind: o.kind, id: o.id },
          notation:
            notations[o.kind === 'element-occurrence' ? 0 : 1].reference,
        })),
      ),
    },
    commands: [],
  };
  return {
    checkpoint,
    context: { ...context, notations },
    a,
    b,
    m,
    n,
    required,
  };
}

function request(
  session: DocumentSession,
  edits: readonly DocumentEdit[] = [],
  deletionReviews: readonly DeletionReview[] = [],
): DocumentCommand {
  const cp = session.checkpoint;
  return {
    kind: 'edit',
    id: `command-${cp.commands.length}`,
    actor: 'author',
    source: { id: 'review', revision: '1' },
    modelId: cp.snapshot.model.id,
    expectedRevision: cp.snapshot.model.revision,
    nextRevision: createModelRevision(`r${cp.commands.length + 1}`),
    edits,
    deletionReviews,
  };
}
function prepared(result: PrepareSessionResult) {
  if (result.status !== 'prepared') throw new Error(JSON.stringify(result));
  return result.candidate;
}
function rejected(result: PrepareSessionResult, code: string) {
  expect(result.status).toBe('rejected');
  expect(result).not.toHaveProperty('candidate');
  if (result.status !== 'rejected') throw new Error('Expected rejection');
  expect(result.diagnostics.map((d) => d.code)).toContain(code);
  return result;
}
function rename(
  f: ReturnType<typeof fixture>,
  expected = 'A',
  value = 'Authored',
): DocumentEdit {
  return { kind: 'rename', target: f.a, expected, value };
}
function defaults(f: ReturnType<typeof fixture>) {
  const pin = f.context.packs[0];
  const rule: DefaultRule = {
    pack: {
      id: pin.id,
      version: pin.version,
      contractVersion: pin.contractVersion,
    },
    rule: { id: 'proof:defaults', version: '1', operator: DEFAULTS_OPERATOR },
    subjectType: { kind: 'element', id: 'proof:node', pack: pin },
    dependsOn: [],
    conflicts: [],
    propertyDefaults: false,
    members: [
      {
        key: 'proof:generated',
        type: { kind: 'member', id: 'proof:field', pack: pin },
        name: 'Generated',
        properties: {},
      },
    ],
  };
  return { ...f.context, defaultRules: [rule] };
}
function proposal(
  session: DocumentSession,
  f: ReturnType<typeof fixture>,
  context: DocumentContext,
  planId = `plan-${session.checkpoint.commands.length}`,
) {
  const s = session.checkpoint.snapshot;
  const c = request(session);
  return proposeDefaultPlan({
    state: s,
    context: {
      validation: {
        profile: s.profile,
        registry: context.packs,
        constraints: s.constraints,
        rules: context.validationRules,
      },
      defaultRules: context.defaultRules,
    },
    subject: f.a,
    planId,
    nextRevision: c.nextRevision,
    source: c.source,
    rules: context.defaultRules,
  });
}
function defaultRequest(
  session: DocumentSession,
  f: ReturnType<typeof fixture>,
  context: DocumentContext,
  planId?: string,
): DocumentCommand {
  const p = proposal(session, f, context, planId);
  if (!p.ok) throw new Error(JSON.stringify(p));
  return { ...request(session), kind: 'apply-defaults', plan: p.plan };
}

/** Test-owned explicit review UI for chosen removals; never synthesizes cleanup operations. */
function removalReviews(
  cp: DocumentCheckpoint,
  edits: readonly DocumentEdit[],
): DeletionReview[] {
  return edits.flatMap((edit, operationIndex) =>
    !edit.kind.startsWith('remove-')
      ? []
      : [
          {
            operationIndex,
            dependents: inspectDocumentDeletion(
              cp.snapshot,
              edit,
            ).dependents.map((location) => {
              const resolver = edits.findIndex((other) => {
                if (location.section === 'views') {
                  const view = cp.snapshot.views[Number(location.path[0])];
                  if (other.kind === 'remove-view')
                    return other.expected.id === view.id;
                  if (other.kind === 'remove-occurrence')
                    return (
                      other.view.id === view.id &&
                      other.expected.id === location.occurrence?.id
                    );
                }
                if (location.section === 'notationBindings') {
                  const binding =
                    cp.snapshot.notationBindings[Number(location.path[0])];
                  return (
                    (other.kind === 'remove-view' &&
                      other.expected.id === binding.view.id) ||
                    (other.kind === 'remove-occurrence' &&
                      other.view.id === binding.view.id &&
                      other.expected.kind === binding.occurrence.kind &&
                      other.expected.id === binding.occurrence.id)
                  );
                }
                if (location.section === 'constraints')
                  return (
                    other.kind === 'remove-constraint' &&
                    JSON.stringify(other.expected) ===
                      JSON.stringify(
                        cp.snapshot.constraints[Number(location.path[0])],
                      )
                  );
                if (location.section === 'model') {
                  const key = location.path[0] as
                    | 'elements'
                    | 'members'
                    | 'relationships';
                  const entity =
                    cp.snapshot.model[key][Number(location.path[1])];
                  return (
                    other.kind ===
                      `remove-${key === 'elements' ? 'element' : key === 'members' ? 'member' : 'relationship'}` &&
                    'expected' in other &&
                    typeof other.expected === 'object' &&
                    'id' in other.expected &&
                    other.expected.id === entity.id
                  );
                }
                return false;
              });
              if (resolver < 0)
                throw new Error(
                  `Missing explicit removal for ${JSON.stringify(location)}`,
                );
              return { location, resolvedBy: [resolver] };
            }),
          },
        ],
  );
}
function reversal(
  session: DocumentSession,
  kind: 'undo' | 'redo',
): DocumentCommand {
  const transactionId = session.history[kind].at(-1) ?? 'missing';
  const preview = inspectDocumentReversal(session, kind, transactionId);
  if (preview.status !== 'ready') throw new Error(JSON.stringify(preview));
  // Baseline removals are already explicitly included in preview intent; tests below also reject missing reviews.
  const baselineKeys = preview.execution.baselines
    .filter((b) => !b.after)
    .map((b) => JSON.stringify(b.target));
  const cp = {
    ...session.checkpoint,
    snapshot: {
      ...session.checkpoint.snapshot,
      baselines: session.checkpoint.snapshot.baselines.filter(
        (b) => !baselineKeys.includes(JSON.stringify(b.target)),
      ),
    },
  };
  return {
    ...request(session),
    kind,
    transactionId,
    deletionReviews: removalReviews(cp, preview.execution.edits),
  };
}

describe('session transactions, guarded undo/redo and reviewed defaults', () => {
  it('groups semantic and view edits under one history entry and reverses/redoes touched values', () => {
    const f = fixture();
    const initial = openDocumentSession(f.checkpoint);
    const v = f.checkpoint.snapshot.views[0];
    const edit: DocumentEdit = {
      kind: 'replace-occurrence',
      view: { modelId: v.modelId, id: v.id },
      expected: v.elements[0],
      value: { ...v.elements[0], bounds: { ...v.elements[0].bounds, x: 123 } },
    };
    const c = request(initial, [rename(f), edit]);
    const changed = prepared(prepareSessionCommand(initial, c, f.context));
    expect(changed.history).toEqual({ undo: [c.id], redo: [] });
    const undone = prepared(
      prepareSessionCommand(changed, reversal(changed, 'undo'), f.context),
    );
    expect(undone.checkpoint.snapshot.model.elements).toEqual(
      f.checkpoint.snapshot.model.elements,
    );
    expect(undone.checkpoint.snapshot.views).toEqual(
      f.checkpoint.snapshot.views,
    );
    expect(undone.history).toEqual({ undo: [], redo: [c.id] });
    const redone = prepared(
      prepareSessionCommand(undone, reversal(undone, 'redo'), f.context),
    );
    expect(redone.checkpoint.snapshot.model.elements[0].name).toBe('Authored');
    expect(redone.checkpoint.snapshot.views[0].elements[0].bounds.x).toBe(123);
    expect(redone.checkpoint.snapshot.views[1]).toEqual(
      f.checkpoint.snapshot.views[1],
    );
    expect(redone.checkpoint.snapshot.model.revision).toBe('r3');
    expect(redone.checkpoint.commands).toHaveLength(3);
    expect(assessDocument(redone.checkpoint, f.context).lifecycle).toBe(
      'valid',
    );
  });
  it('preserves unrelated later edits and refuses a changed touched value without restoring a whole snapshot', () => {
    const f = fixture();
    const changed = prepared(
      prepareSessionCommand(
        openDocumentSession(f.checkpoint),
        request(openDocumentSession(f.checkpoint), [rename(f)]),
        f.context,
      ),
    );
    const later = prepareSemanticCommand(
      changed.checkpoint,
      request(changed, [
        {
          kind: 'set-property',
          target: f.b,
          property: 'proof:note',
          expected: { present: false },
          value: { present: true, value: { kind: 'scalar', value: 'later' } },
        },
      ]),
      f.context,
    );
    if (later.status !== 'prepared') throw new Error('Expected later edit');
    const session = { ...changed, checkpoint: later.candidate };
    const undone = prepared(
      prepareSessionCommand(session, reversal(session, 'undo'), f.context),
    );
    expect(
      undone.checkpoint.snapshot.model.elements[1].properties['proof:note'],
    ).toEqual({ kind: 'scalar', value: 'later' });
    expect(undone.checkpoint.snapshot.model.elements[0].name).toBe('A');
    const conflict = prepareSemanticCommand(
      changed.checkpoint,
      request(changed, [rename(f, 'Authored', 'Later name')]),
      f.context,
    );
    if (conflict.status !== 'prepared')
      throw new Error('Expected conflicting human edit');
    const conflicting = { ...changed, checkpoint: conflict.candidate };
    const before = JSON.stringify(conflicting);
    rejected(
      prepareSessionCommand(
        conflicting,
        reversal(conflicting, 'undo'),
        f.context,
      ),
      'command.precondition',
    );
    expect(JSON.stringify(conflicting)).toBe(before);
  });
  it('undoes and redoes full semantic deletion with explicit constraint/view cleanup and stable IDs', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const edits: DocumentEdit[] = [
      ...s.model.elements.map((expected) => ({
        kind: 'remove-element' as const,
        expected,
      })),
      ...s.model.members.map((expected) => ({
        kind: 'remove-member' as const,
        expected,
      })),
      ...s.model.relationships.map((expected) => ({
        kind: 'remove-relationship' as const,
        expected,
      })),
      ...s.constraints.map((expected) => ({
        kind: 'remove-constraint' as const,
        expected,
      })),
      ...s.views.map((expected) => ({
        kind: 'remove-view' as const,
        expected,
        expectedNotations: s.notationBindings.filter(
          (b) => b.view.id === expected.id,
        ),
      })),
    ];
    const initial = openDocumentSession(f.checkpoint);
    const removed = prepared(
      prepareSessionCommand(
        initial,
        request(initial, edits, removalReviews(f.checkpoint, edits)),
        f.context,
      ),
    );
    expect(removed.checkpoint.snapshot.model.elements).toEqual([]);
    const restored = prepared(
      prepareSessionCommand(removed, reversal(removed, 'undo'), f.context),
    );
    expect(
      [...restored.checkpoint.snapshot.model.elements].sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
    ).toEqual(s.model.elements);
    expect(restored.checkpoint.snapshot.constraints).toEqual(s.constraints);
    expect(restored.checkpoint.snapshot.views.map((v) => v.id).sort()).toEqual(
      s.views.map((v) => v.id).sort(),
    );
    const requestRedo = reversal(restored, 'redo');
    rejected(
      prepareSessionCommand(
        restored,
        {
          ...requestRedo,
          kind: 'redo',
          transactionId: restored.history.redo[0],
          deletionReviews: [],
        },
        f.context,
      ),
      'command.deletion-review',
    );
    const again = prepared(
      prepareSessionCommand(restored, requestRedo, f.context),
    );
    expect(again.checkpoint.snapshot.views).toEqual([]);
    expect(again.checkpoint.snapshot.model.members).toEqual([]);
  });
  it('requires reviewed deletion impacts for undo of creation and never silently removes new dependents', () => {
    const f = fixture();
    const initial = openDocumentSession(f.checkpoint);
    const member = {
      ...f.checkpoint.snapshot.model.members[0],
      id: createMemberId('created'),
    };
    const created = prepared(
      prepareSessionCommand(
        initial,
        request(initial, [{ kind: 'create-member', value: member }]),
        f.context,
      ),
    );
    const c = reversal(created, 'undo');
    rejected(
      prepareSessionCommand(
        created,
        {
          ...c,
          kind: 'undo',
          transactionId: created.history.undo[0],
          deletionReviews: [],
        },
        f.context,
      ),
      'command.deletion-review',
    );
    const later = prepareSemanticCommand(
      created.checkpoint,
      request(created, [
        {
          kind: 'set-property',
          target: f.a,
          property: 'proof:links',
          expected: { present: false },
          value: {
            present: true,
            value: {
              kind: 'list',
              items: [
                {
                  kind: 'record',
                  fields: {
                    'proof:target': {
                      kind: 'reference',
                      value: { ...f.m, id: member.id },
                    },
                  },
                },
              ],
            },
          },
        },
      ]),
      f.context,
    );
    if (later.status !== 'prepared')
      throw new Error('Expected later reference');
    const withReference = { ...created, checkpoint: later.candidate };
    const preview = inspectDocumentReversal(
      withReference,
      'undo',
      created.history.undo[0],
    );
    expect(preview.status).toBe('ready');
    if (preview.status === 'ready')
      expect(preview.deletions[0].dependents).toHaveLength(1);
    rejected(
      prepareSessionCommand(
        withReference,
        {
          ...request(withReference),
          kind: 'undo',
          transactionId: created.history.undo[0],
          deletionReviews: [{ operationIndex: 0, dependents: [] }],
        },
        f.context,
      ),
      'command.deletion-review',
    );
  });
  it('clears redo on a new grouped edit and enforces empty-stack and LIFO rules', () => {
    const f = fixture();
    const initial = openDocumentSession(f.checkpoint);
    rejected(
      prepareSessionCommand(
        initial,
        { ...request(initial), kind: 'undo', transactionId: 'missing' },
        f.context,
      ),
      'history.empty',
    );
    const one = prepared(
      prepareSessionCommand(initial, request(initial, [rename(f)]), f.context),
    );
    const two = prepared(
      prepareSessionCommand(
        one,
        request(one, [rename(f, 'Authored', 'Second')]),
        f.context,
      ),
    );
    rejected(
      prepareSessionCommand(
        two,
        { ...request(two), kind: 'undo', transactionId: one.history.undo[0] },
        f.context,
      ),
      'history.order',
    );
    const undone = prepared(
      prepareSessionCommand(two, reversal(two, 'undo'), f.context),
    );
    const branched = prepared(
      prepareSessionCommand(
        undone,
        request(undone, [rename(f, 'Authored', 'Branch')]),
        f.context,
      ),
    );
    expect(branched.history.redo).toEqual([]);
    rejected(
      prepareSessionCommand(
        branched,
        {
          ...request(branched),
          kind: 'redo',
          transactionId: two.history.undo[1],
        },
        f.context,
      ),
      'history.empty',
    );
  });
  it('bounds and explicitly prunes live history while retaining retry evidence and refusing receipt-capacity overflow', () => {
    const f = fixture();
    const policy = { maxTransactions: 1, maxReceipts: 3 };
    const initial = openDocumentSession(f.checkpoint);
    const original = request(initial, [rename(f)]);
    const one = prepared(
      prepareSessionCommand(initial, original, f.context, policy),
    );
    const disabled = prepared(
      prepareSessionCommand(initial, original, f.context, {
        ...policy,
        maxTransactions: 0,
      }),
    );
    expect(disabled.history).toEqual({ undo: [], redo: [] });
    expect(disabled.checkpoint.commands).toHaveLength(1);
    const two = prepared(
      prepareSessionCommand(
        one,
        request(one, [rename(f, 'Authored', 'Second')]),
        f.context,
        policy,
      ),
    );
    expect(two.history.undo).toEqual(['command-1']);
    const undone = prepared(
      prepareSessionCommand(two, reversal(two, 'undo'), f.context, policy),
    );
    const pruned = pruneDocumentHistory(undone);
    expect(pruned.history).toEqual({ undo: [], redo: [] });
    expect(pruned.checkpoint).toBe(undone.checkpoint);
    expect(
      prepareSessionCommand(pruned, original, f.context, policy).status,
    ).toBe('replayed');
    rejected(
      prepareSessionCommand(pruned, request(pruned, []), f.context, policy),
      'history.receipt-capacity',
    );
    expect(pruned.checkpoint.snapshot.model.elements[0].name).toBe('Authored');
    expect(() => pruneDocumentHistory(pruned, -1)).toThrow(RangeError);
    rejected(
      prepareSessionCommand(initial, original, f.context, {
        maxTransactions: Infinity,
        maxReceipts: 1,
      }),
      'history.invalid-policy',
    );
  });
  it('advances revisions for empty grouped transactions and their undo/redo without changing semantic content', () => {
    const f = fixture();
    let session = openDocumentSession(f.checkpoint);
    session = prepared(
      prepareSessionCommand(session, request(session), f.context),
    );
    session = prepared(
      prepareSessionCommand(session, reversal(session, 'undo'), f.context),
    );
    session = prepared(
      prepareSessionCommand(session, reversal(session, 'redo'), f.context),
    );
    expect(session.checkpoint.snapshot.model).toEqual({
      ...f.checkpoint.snapshot.model,
      revision: 'r3',
    });
    expect(session.checkpoint.commands).toHaveLength(3);
  });
  it('keeps proposal separate and applies a reviewed default batch as one coordinated transaction', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const before = JSON.stringify(initial);
    const c = defaultRequest(initial, f, context);
    expect(JSON.stringify(initial)).toBe(before);
    const changed = prepared(prepareSessionCommand(initial, c, context));
    expect(changed.checkpoint.snapshot.model.members).toHaveLength(3);
    expect(changed.checkpoint.snapshot.baselines).toHaveLength(1);
    expect(changed.checkpoint.snapshot.applied).toHaveLength(1);
    expect(changed.history.undo).toEqual([c.id]);
    expect(changed.checkpoint.commands[0].command.source).toEqual(c.source);
    expect(assessDocument(changed.checkpoint, context).lifecycle).toBe('valid');
    expect(JSON.stringify(initial)).toBe(before);
  });
  it('undoes/redoes generated writes and baselines but retains exact command and plan retries without resurrection', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const c = defaultRequest(initial, f, context);
    const generated = prepared(prepareSessionCommand(initial, c, context));
    const generatedId = generated.checkpoint.snapshot.model.members[2].id;
    const undoRequest = reversal(generated, 'undo');
    const undone = prepared(
      prepareSessionCommand(generated, undoRequest, context),
    );
    expect(undone.checkpoint.snapshot.baselines).toEqual([]);
    expect(undone.checkpoint.snapshot.model.members).toEqual(
      f.checkpoint.snapshot.model.members,
    );
    expect(undone.checkpoint.snapshot.applied).toHaveLength(1);
    for (const prior of [
      c,
      undoRequest,
      { ...c, id: 'alias-for-exact-plan' },
    ]) {
      const replay = prepareSessionCommand(undone, prior, context);
      expect(replay.status).toBe('replayed');
      expect(replay).not.toHaveProperty('candidate');
    }
    const redone = prepared(
      prepareSessionCommand(undone, reversal(undone, 'redo'), context),
    );
    expect(redone.checkpoint.snapshot.model.members[2].id).toBe(generatedId);
    expect(redone.checkpoint.snapshot.baselines).toEqual(
      generated.checkpoint.snapshot.baselines,
    );
    expect(redone.checkpoint.snapshot.applied).toHaveLength(1);
    expect(prepareSessionCommand(redone, c, context).status).toBe('replayed');
    const undoneAgain = prepared(
      prepareSessionCommand(redone, reversal(redone, 'undo'), context),
    );
    expect(
      prepareSessionCommand(pruneDocumentHistory(undoneAgain), c, context)
        .status,
    ).toBe('replayed');
    expect(undoneAgain.checkpoint.snapshot.model.members).toHaveLength(2);
    const explicitlyReviewed = prepared(
      prepareSessionCommand(
        pruneDocumentHistory(undoneAgain),
        defaultRequest(undoneAgain, f, context),
        context,
      ),
    );
    expect(explicitlyReviewed.checkpoint.snapshot.model.members[2].id).toBe(
      generatedId,
    );
    expect(explicitlyReviewed.checkpoint.snapshot.applied).toHaveLength(2);
  });
  it('supports serializable trusted receipt examples and reopening clears stacks without forgetting retries', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const c = defaultRequest(initial, f, context);
    const generated = prepared(prepareSessionCommand(initial, c, context));
    const undone = prepared(
      prepareSessionCommand(generated, reversal(generated, 'undo'), context),
    );
    // Produced typed fixture data only; this is not an imported-file decoder.
    const decodedExample = JSON.parse(
      JSON.stringify(undone.checkpoint),
    ) as DocumentCheckpoint;
    const reopened = openDocumentSession(decodedExample);
    expect(reopened.history).toEqual({ undo: [], redo: [] });
    expect(assessDocument(reopened.checkpoint, context).lifecycle).toBe(
      'valid',
    );
    expect(prepareSessionCommand(reopened, c, context).status).toBe('replayed');
    rejected(
      prepareSessionCommand(
        reopened,
        { ...request(reopened), kind: 'redo', transactionId: c.id },
        context,
      ),
      'history.empty',
    );
    expect(reopened.checkpoint.snapshot.model.members).toHaveLength(2);
  });
  it('rejects reused command/plan identities with changed content and stale plan coordination', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const c = defaultRequest(initial, f, context);
    if (c.kind !== 'apply-defaults') throw new Error('Expected defaults');
    const changed = prepared(prepareSessionCommand(initial, c, context));
    rejected(
      prepareSessionCommand(changed, { ...c, actor: 'different' }, context),
      'command.identity-conflict',
    );
    rejected(
      prepareSessionCommand(
        changed,
        {
          ...c,
          id: 'new',
          plan: { ...c.plan, source: { id: 'changed', revision: '1' } },
        },
        context,
      ),
      'plan.identity-conflict',
    );
    rejected(
      prepareSessionCommand(
        initial,
        {
          ...c,
          plan: { ...c.plan, nextRevision: createModelRevision('other') },
        },
        context,
      ),
      'plan.coordination',
    );
    rejected(
      prepareSessionCommand(
        initial,
        { ...c, expectedRevision: createModelRevision('old') },
        context,
      ),
      'command.stale-revision',
    );
  });
  it('preserves human overrides in proposals and rejects a forged reviewed generated overwrite and conflicting undo', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const generated = prepared(
      prepareSessionCommand(
        initial,
        defaultRequest(initial, f, context),
        context,
      ),
    );
    const member = generated.checkpoint.snapshot.model.members[2];
    const later = prepareSemanticCommand(
      generated.checkpoint,
      request(generated, [
        {
          kind: 'rename',
          target: { kind: 'member', modelId: f.a.modelId, id: member.id },
          expected: member.name,
          value: 'Human',
        },
      ]),
      context,
    );
    if (later.status !== 'prepared') throw new Error(JSON.stringify(later));
    const human = { ...generated, checkpoint: later.candidate };
    const p = proposal(human, f, context);
    expect(p.ok).toBe(true);
    expect(p.comparisons.map((c) => c.decision)).toContain('preserve-override');
    if (!p.ok) throw new Error('Expected preservation');
    expect(p.plan.operations).toEqual([]);
    const baseline = human.checkpoint.snapshot.baselines[0];
    const actual = human.checkpoint.snapshot.model.members[2];
    const forged = {
      ...p.plan,
      operations: [
        {
          change: { kind: 'update-member' as const, expected: actual, member },
          origin: baseline.origin,
        },
      ],
      baselineUpdates: [
        { expected: baseline, next: { ...baseline, source: p.plan.source } },
      ],
    };
    rejected(
      prepareSessionCommand(
        human,
        { ...request(human), kind: 'apply-defaults', plan: forged },
        context,
      ),
      'plan.manual-conflict',
    );
    rejected(
      prepareSessionCommand(human, reversal(human, 'undo'), context),
      'command.precondition',
    );
    const changedRule = {
      ...context.defaultRules[0],
      rule: { ...context.defaultRules[0].rule, version: '2' },
      members: [
        { ...context.defaultRules[0].members[0], name: 'New generated name' },
      ],
    };
    const conflict = proposal(human, f, {
      ...context,
      defaultRules: [changedRule],
    });
    expect(conflict.ok).toBe(false);
    expect(conflict.comparisons.map((c) => c.decision)).toContain('conflict');
    expect(human.checkpoint.snapshot.model.members[2].name).toBe('Human');
  });
  it('validates the full reversed candidate including constraints added after the original transaction', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const generated = prepared(
      prepareSessionCommand(
        initial,
        defaultRequest(initial, f, context),
        context,
      ),
    );
    const member = generated.checkpoint.snapshot.model.members[2];
    const constraint = {
      ...f.checkpoint.snapshot.constraints[0],
      instance: {
        ...f.checkpoint.snapshot.constraints[0].instance,
        roles: [
          {
            role: 'proof:fields' as const,
            group: { members: [{ ...f.m, id: member.id }] },
          },
        ],
      },
    };
    const later = prepareSemanticCommand(
      generated.checkpoint,
      request(generated, [{ kind: 'add-constraint', value: constraint }]),
      context,
    );
    if (later.status !== 'prepared') throw new Error(JSON.stringify(later));
    const session = { ...generated, checkpoint: later.candidate };
    const preview = inspectDocumentReversal(
      session,
      'undo',
      generated.history.undo[0],
    );
    if (preview.status !== 'ready') throw new Error(JSON.stringify(preview));
    expect(
      preview.deletions[0].dependents.some((d) => d.section === 'constraints'),
    ).toBe(true);
    rejected(
      prepareSessionCommand(
        session,
        {
          ...request(session),
          kind: 'undo',
          transactionId: generated.history.undo[0],
          deletionReviews: [
            {
              operationIndex: 0,
              dependents: preview.deletions[0].dependents.map((location) => ({
                location,
                resolvedBy: [0],
              })),
            },
          ],
        },
        context,
      ),
      'command.deletion-review',
    );
  });
  it.each(['baseline', 'applied', 'inverse', 'execution'] as const)(
    'rejects corrupted %s evidence before mutation or receipt replay',
    (field) => {
      const f = fixture();
      const context = defaults(f);
      const initial = openDocumentSession(f.checkpoint);
      const c = defaultRequest(initial, f, context);
      const changed = prepared(prepareSessionCommand(initial, c, context));
      const cp = changed.checkpoint;
      const broken =
        field === 'baseline'
          ? { ...cp, snapshot: { ...cp.snapshot, baselines: [] } }
          : field === 'applied'
            ? { ...cp, snapshot: { ...cp.snapshot, applied: [] } }
            : {
                ...cp,
                commands: cp.commands.map((r) => ({
                  ...r,
                  ...(field === 'inverse'
                    ? { inverse: [] }
                    : { execution: { edits: [], baselines: [] } }),
                })),
              };
      expect(assessDocument(broken, context).lifecycle).toBe('invalid');
      rejected(
        prepareSessionCommand({ ...changed, checkpoint: broken }, c, context),
        'document.lifecycle',
      );
    },
  );
  it('refuses missing inverse evidence, duplicate stack entries and unsupported registry coverage', () => {
    const f = fixture();
    const old = prepareSemanticCommand(
      f.checkpoint,
      request(openDocumentSession(f.checkpoint), [rename(f)]),
      f.context,
    );
    if (old.status !== 'prepared') throw new Error('Expected old command');
    const cp = {
      ...old.candidate,
      commands: old.candidate.commands.map((r) => ({
        command: r.command,
        beforeRevision: r.beforeRevision,
        afterRevision: r.afterRevision,
      })),
    };
    const session = {
      checkpoint: cp,
      history: { undo: [old.command.id], redo: [] },
    };
    rejected(
      prepareSessionCommand(
        session,
        { ...request(session), kind: 'undo', transactionId: old.command.id },
        f.context,
      ),
      'history.missing-inverse',
    );
    rejected(
      prepareSessionCommand(
        {
          ...session,
          history: { undo: [old.command.id, old.command.id], redo: [] },
        },
        request(session),
        f.context,
      ),
      'history.invalid-stack',
    );
    rejected(
      prepareSessionCommand(
        openDocumentSession(f.checkpoint),
        request(openDocumentSession(f.checkpoint), [rename(f)]),
        { ...f.context, packs: [] },
      ),
      'command.not-editable',
    );
  });
  it.each([false, true])(
    'restores optional generated property presence but refuses invalid required-property undo (required=%s)',
    (required) => {
      const f = fixture();
      const original = defaults(f);
      const context: DocumentContext = {
        ...original,
        packs: original.packs.map((pack) => ({
          ...pack,
          types: pack.types.map((type) =>
            type.kind !== 'element' || type.id !== 'proof:node'
              ? type
              : {
                  ...type,
                  properties: type.properties.map((p) =>
                    p.id !== 'proof:note'
                      ? p
                      : {
                          ...p,
                          required,
                          defaultValue: {
                            kind: 'scalar' as const,
                            value: 'default',
                          },
                        },
                  ),
                },
          ),
        })),
        defaultRules: [
          { ...original.defaultRules[0], propertyDefaults: true, members: [] },
        ],
      };
      const cp = {
        ...f.checkpoint,
        snapshot: {
          ...f.checkpoint.snapshot,
          model: {
            ...f.checkpoint.snapshot.model,
            elements: f.checkpoint.snapshot.model.elements.map((e) =>
              e.id !== f.b.id
                ? e
                : {
                    ...e,
                    properties: {
                      ...e.properties,
                      'proof:note': {
                        kind: 'scalar' as const,
                        value: 'human B',
                      },
                    },
                  },
            ),
          },
        },
      };
      const initial = openDocumentSession(cp);
      const generated = prepared(
        prepareSessionCommand(
          initial,
          defaultRequest(initial, f, context),
          context,
        ),
      );
      expect(
        generated.checkpoint.snapshot.model.elements[0].properties[
          'proof:note'
        ],
      ).toEqual({ kind: 'scalar', value: 'default' });
      const result = prepareSessionCommand(
        generated,
        reversal(generated, 'undo'),
        context,
      );
      if (required) {
        const bad = rejected(result, 'command.invalid-candidate');
        expect(bad.assessment?.semantics.status).toBe('invalid');
        expect(generated.checkpoint.snapshot.baselines).toHaveLength(1);
      } else {
        const undone = prepared(result);
        expect(
          undone.checkpoint.snapshot.model.elements[0].properties,
        ).not.toHaveProperty('proof:note');
        const redone = prepared(
          prepareSessionCommand(undone, reversal(undone, 'redo'), context),
        );
        expect(
          redone.checkpoint.snapshot.model.elements[0].properties['proof:note'],
        ).toEqual({ kind: 'scalar', value: 'default' });
        expect(
          redone.checkpoint.snapshot.model.elements[1].properties['proof:note'],
        ).toEqual({ kind: 'scalar', value: 'human B' });
      }
    },
  );
  it('regenerates stable member IDs and reverses both value and baseline version without erasing earlier receipts', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const first = prepared(
      prepareSessionCommand(
        initial,
        defaultRequest(initial, f, context),
        context,
      ),
    );
    const rule = {
      ...context.defaultRules[0],
      rule: { ...context.defaultRules[0].rule, version: '2' },
      members: [
        { ...context.defaultRules[0].members[0], name: 'Generated v2' },
      ],
    };
    const upgraded = { ...context, defaultRules: [rule] };
    const second = prepared(
      prepareSessionCommand(
        first,
        defaultRequest(first, f, upgraded),
        upgraded,
      ),
    );
    expect(second.checkpoint.snapshot.model.members[2].id).toBe(
      first.checkpoint.snapshot.model.members[2].id,
    );
    expect(second.checkpoint.snapshot.model.members[2].name).toBe(
      'Generated v2',
    );
    expect(second.checkpoint.snapshot.baselines[0].origin.rule.version).toBe(
      '2',
    );
    const undone = prepared(
      prepareSessionCommand(second, reversal(second, 'undo'), upgraded),
    );
    expect(undone.checkpoint.snapshot.model.members[2]).toEqual(
      first.checkpoint.snapshot.model.members[2],
    );
    expect(undone.checkpoint.snapshot.baselines).toEqual(
      first.checkpoint.snapshot.baselines,
    );
    const redone = prepared(
      prepareSessionCommand(undone, reversal(undone, 'redo'), upgraded),
    );
    expect(redone.checkpoint.snapshot.model.members[2].name).toBe(
      'Generated v2',
    );
    expect(redone.checkpoint.snapshot.applied).toHaveLength(2);
  });
  it('reverses metadata-only regeneration under fresh revisions and preserves human overrides with zero generated writes', () => {
    const f = fixture();
    const context = defaults(f);
    const initial = openDocumentSession(f.checkpoint);
    const first = prepared(
      prepareSessionCommand(
        initial,
        defaultRequest(initial, f, context),
        context,
      ),
    );
    const rule = {
      ...context.defaultRules[0],
      rule: { ...context.defaultRules[0].rule, version: '2' },
    };
    const upgraded = { ...context, defaultRules: [rule] };
    const c = defaultRequest(first, f, upgraded);
    if (c.kind !== 'apply-defaults') throw new Error('Expected defaults');
    expect(c.plan.operations).toEqual([]);
    const second = prepared(prepareSessionCommand(first, c, upgraded));
    expect(second.checkpoint.snapshot.model.members).toEqual(
      first.checkpoint.snapshot.model.members,
    );
    expect(second.checkpoint.snapshot.baselines[0].origin.rule.version).toBe(
      '2',
    );
    const undone = prepared(
      prepareSessionCommand(second, reversal(second, 'undo'), upgraded),
    );
    expect(undone.checkpoint.snapshot.baselines[0].origin.rule.version).toBe(
      '1',
    );
    const m = undone.checkpoint.snapshot.model.members[2];
    const human = prepared(
      prepareSessionCommand(
        undone,
        request(undone, [
          {
            kind: 'rename',
            target: { ...f.m, id: m.id },
            expected: m.name,
            value: 'Human',
          },
        ]),
        upgraded,
      ),
    );
    const preserved = prepared(
      prepareSessionCommand(
        human,
        defaultRequest(human, f, upgraded),
        upgraded,
      ),
    );
    expect(preserved.checkpoint.snapshot.model.members[2].name).toBe('Human');
    expect(preserved.checkpoint.snapshot.baselines).toEqual(
      human.checkpoint.snapshot.baselines,
    );
    const undoPreservation = prepared(
      prepareSessionCommand(preserved, reversal(preserved, 'undo'), upgraded),
    );
    expect(undoPreservation.checkpoint.snapshot.model.members[2].name).toBe(
      'Human',
    );
  });
  it('rejects partial late batches and unknown extension coverage without reading opaque payloads', () => {
    const f = fixture();
    const initial = openDocumentSession(f.checkpoint);
    const before = JSON.stringify(initial);
    rejected(
      prepareSessionCommand(
        initial,
        request(initial, [
          rename(f),
          {
            kind: 'remove-member',
            expected: {
              ...f.checkpoint.snapshot.model.members[0],
              name: 'stale',
            },
          },
        ]),
        f.context,
      ),
      'command.precondition',
    );
    expect(JSON.stringify(initial)).toBe(before);
    let reads = 0;
    const unknown = {
      ...initial,
      checkpoint: {
        ...f.checkpoint,
        snapshot: {
          ...f.checkpoint.snapshot,
          extensions: [
            {
              pack: { id: 'unknown', version: '1', contractVersion: '1' },
              extension: { id: 'unknown:data' as const, version: '1' },
              get payload() {
                reads++;
                throw new Error('opaque');
              },
            },
          ],
        },
      },
    };
    rejected(
      prepareSessionCommand(unknown, request(unknown, [rename(f)]), f.context),
      'command.not-editable',
    );
    expect(reads).toBe(0);
  });
  it('revalidates views on undo when a later connector depends on a changed semantic endpoint', () => {
    const f = fixture();
    const initial = openDocumentSession(f.checkpoint);
    const relation = f.checkpoint.snapshot.model.relationships[0];
    const edits: DocumentEdit[] = [
      {
        kind: 'replace-relationship',
        expected: relation,
        value: { ...relation, source: f.b },
      },
      ...f.checkpoint.snapshot.views.map((view) => ({
        kind: 'replace-occurrence' as const,
        view: { modelId: view.modelId, id: view.id },
        expected: view.connectors[0],
        value: {
          ...view.connectors[0],
          source: { ...view.connectors[0].source, id: view.elements[1].id },
        },
      })),
    ];
    const changed = prepared(
      prepareSessionCommand(initial, request(initial, edits), f.context),
    );
    const view = changed.checkpoint.snapshot.views[0];
    // A later approved non-history view addition must survive; it makes the earlier inverse invalid.
    const additional = {
      ...view.connectors[0],
      id: createConnectorOccurrenceId('later'),
    };
    const later = prepared(
      prepareSessionCommand(
        changed,
        request(changed, [
          {
            kind: 'add-occurrence',
            view: { modelId: view.modelId, id: view.id },
            value: additional,
            notation: f.context.notations[1].reference,
          },
        ]),
        f.context,
      ),
    );
    const session = { ...later, history: changed.history };
    const before = JSON.stringify(session);
    const bad = rejected(
      prepareSessionCommand(session, reversal(session, 'undo'), f.context),
      'command.invalid-candidate',
    );
    expect(
      bad.assessment?.views.some(
        (d) =>
          d.code === 'view.endpoint-mismatch' &&
          d.location.occurrenceId === additional.id,
      ),
    ).toBe(true);
    expect(JSON.stringify(session)).toBe(before);
  });
});
