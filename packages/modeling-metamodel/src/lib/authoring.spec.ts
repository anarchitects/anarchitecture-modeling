import {
  createModel,
  createElementId,
  createMemberId,
  createRelationshipId,
  createViewId,
  createElementOccurrenceId,
  createModelRevision,
  type ElementReference,
} from '@anarchitects/modeling-core';
import {
  prepareAuthoringImport,
  prepareAuthoringCommand,
  assessAuthoringCheckpoint,
  encodeAuthoringDocument,
  decodeAuthoringDocument,
  decodeDocument,
  prepareSessionCommand,
  prepareSemanticCommand,
  openDocumentSession,
  compareDocumentSnapshots,
  proposeDefaultPlan,
  DEFAULTS_OPERATOR,
  MEMBER_GROUP_OPERATOR,
  type AuthoringContext,
  type AuthoringSession,
  type PrepareAuthoringResult,
  type DocumentCheckpoint,
  type DocumentCommand,
  type DocumentCommandIdentity,
  type DocumentEdit,
  type AuthoringPolicy,
  type DocumentCommitPort,
  type AuthoringCommitPort,
} from '../index.js';

function fixture() {
  const model = createModel('sales', 'Synthetic sales', {
    id: 'sales-profile',
    version: '1',
  });
  const pin = { id: 'sales', version: '1', contractVersion: '1' };
  const node = {
    pack: pin,
    kind: 'element' as const,
    id: 'sales:entity' as const,
  };
  const field = {
    pack: pin,
    kind: 'member' as const,
    id: 'sales:field' as const,
  };
  const edge = {
    pack: pin,
    kind: 'relationship' as const,
    id: 'sales:relation' as const,
  };
  const properties = ['sales:definition', 'sales:owner'].map((id) => ({
    id: id as 'sales:definition' | 'sales:owner',
    required: true,
    value: { kind: 'scalar' as const, valueType: 'string' as const },
    defaultValue: { kind: 'scalar' as const, value: 'Default proposal' },
  }));
  const policy: AuthoringPolicy = {
    id: 'draft',
    version: '1',
    contractVersion: '1',
    profile: model.profile,
    allowMissing: [node, field, edge].flatMap((type) =>
      properties.map((p) => ({ type, property: p.id })),
    ),
  };
  const context: AuthoringContext = {
    policy,
    document: {
      packs: [
        {
          ...pin,
          displayName: 'Synthetic sales',
          implementation: 'scaffold',
          dimensions: ['method'],
          requires: [],
          conflicts: [],
          extensions: [],
          constraints: [],
          types: [
            { id: node.id, properties, constraints: [], kind: 'element' },
            {
              id: field.id,
              kind: 'member',
              owners: [node],
              properties,
              constraints: [],
            },
            {
              id: edge.id,
              kind: 'relationship',
              endpointPairs: [
                {
                  source: { role: 'sales:from', types: [node] },
                  target: { role: 'sales:to', types: [node] },
                },
              ],
              properties,
              constraints: [],
            },
          ],
        },
      ],
      validationRules: [],
      defaultRules: [],
      notations: [],
      theme: { id: 'proof', tokens: {} },
    },
  };
  const checkpoint: DocumentCheckpoint = {
    snapshot: {
      model,
      profile: {
        ...model.profile,
        selections: [{ dimension: 'method', pack: pin }],
      },
      views: [],
      constraints: [],
      extensions: [],
      notationBindings: [],
      applied: [],
      baselines: [],
    },
    commands: [],
  };
  const customer = {
    id: createElementId('customer'),
    type: node.id,
    name: 'Customer',
    container: { kind: 'model' as const, id: model.id },
    properties: {},
  };
  const customerRef: ElementReference = {
    kind: 'element',
    modelId: model.id,
    id: customer.id,
  };
  return {
    checkpoint,
    context,
    policy,
    customer,
    customerRef,
    pin,
    node,
    field,
    edge,
  };
}
function identity(cp: DocumentCheckpoint, id: string): DocumentCommandIdentity {
  return {
    id,
    modelId: cp.snapshot.model.id,
    actor: 'author',
    source: { id: 'proof', revision: '1' },
    expectedRevision: cp.snapshot.model.revision,
    nextRevision: createModelRevision(id),
  };
}
function command(
  cp: DocumentCheckpoint,
  id: string,
  edits: readonly DocumentEdit[] = [],
): DocumentCommand & { kind: 'edit' } {
  return { ...identity(cp, id), kind: 'edit', edits, deletionReviews: [] };
}
function ready(r: PrepareAuthoringResult) {
  if (r.status !== 'authoring-prepared') throw new Error(JSON.stringify(r));
  expect(r.assessment.admission).not.toBe('blocked');
  return r;
}
function imported(f = fixture()) {
  return {
    ...f,
    session: ready(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        f.context,
      ),
    ).candidate,
  };
}
function edit(
  s: AuthoringSession,
  c: AuthoringContext,
  id: string,
  edits: readonly DocumentEdit[] = [],
) {
  return prepareAuthoringCommand(
    s,
    {
      command: command(s.checkpoint.document, id, edits),
      binding: s.checkpoint.binding,
    },
    c,
  );
}
function scalar(value: string) {
  return { kind: 'scalar' as const, value };
}
function fill(
  f: ReturnType<typeof fixture>,
  property: 'sales:definition' | 'sales:owner',
  value: string,
): DocumentEdit {
  return {
    kind: 'set-property',
    target: f.customerRef,
    property,
    expected: { present: false },
    value: { present: true, value: scalar(value) },
  };
}
function missing() {
  const f = imported();
  const created = ready(
    edit(f.session, f.context, 'create', [
      { kind: 'create-element', value: f.customer },
    ]),
  );
  return { ...f, session: created.candidate, created };
}

describe('bounded incremental authoring', () => {
  it('preserves strict defaults and admits truthful incomplete creation, repair, members and relationships', () => {
    const f = imported();
    const create = command(f.checkpoint, 'strict-create', [
      { kind: 'create-element', value: f.customer },
    ]);
    expect(
      prepareSemanticCommand(f.checkpoint, create, f.context.document).status,
    ).toBe('rejected');
    expect(
      prepareSessionCommand(
        openDocumentSession(f.checkpoint),
        create,
        f.context.document,
      ).status,
    ).toBe('rejected');
    const before = structuredClone(f.session);
    const first = ready(edit(f.session, f.context, 'create', create.edits));
    expect(f.session).toEqual(before);
    expect(first.assessment.admission).toBe('incomplete');
    expect(first.assessment.assessment.status).toBe('invalid');
    expect(first.assessment.deficiencies).toHaveLength(2);
    expect(
      first.assessment.assessment.semantics.diagnostics.every(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
    let s = first.candidate;
    expect(
      prepareSessionCommand(
        { checkpoint: s.checkpoint.document, history: s.history },
        command(s.checkpoint.document, 'strict-repair', [
          fill(f, 'sales:definition', 'Party ordering'),
        ]),
        f.context.document,
      ).status,
    ).toBe('rejected');
    s = ready(
      edit(s, f.context, 'define', [
        fill(f, 'sales:definition', 'Party ordering'),
      ]),
    ).candidate;
    const completed = ready(
      edit(s, f.context, 'owner', [fill(f, 'sales:owner', 'Sales team')]),
    );
    expect(completed.assessment.admission).toBe('complete');
    expect(completed.assessment.assessment.status).toBe('valid');
    s = completed.candidate;
    const order = {
      ...f.customer,
      id: createElementId('order'),
      name: 'Order',
    };
    s = ready(
      edit(s, f.context, 'order', [{ kind: 'create-element', value: order }]),
    ).candidate;
    const orderRef = { ...f.customerRef, id: order.id };
    s = ready(
      edit(
        s,
        f.context,
        'describe-order',
        ['sales:definition', 'sales:owner'].map((property) => ({
          kind: 'set-property',
          target: orderRef,
          property,
          expected: { present: false },
          value: { present: true, value: scalar('Order metadata') },
        })),
      ),
    ).candidate;
    s = ready(
      edit(s, f.context, 'member', [
        {
          kind: 'create-member',
          value: {
            id: createMemberId('name'),
            type: f.field.id,
            name: 'Name',
            owner: f.customerRef,
            properties: {},
          },
        },
      ]),
    ).candidate;
    s = ready(
      edit(s, f.context, 'relationship', [
        {
          kind: 'create-relationship',
          value: {
            id: createRelationshipId('places'),
            type: f.edge.id,
            source: f.customerRef,
            target: orderRef,
            properties: {},
          },
        },
      ]),
    ).candidate;
    const renamed = ready(
      edit(s, f.context, 'rename', [
        {
          kind: 'rename',
          target: f.customerRef,
          expected: 'Customer',
          value: 'Buyer',
        },
      ]),
    );
    expect(
      renamed.candidate.checkpoint.document.snapshot.model.elements[0].id,
    ).toBe(f.customer.id);
    expect(renamed.assessment.deficiencies).toHaveLength(4);
    const cp = first.candidate.checkpoint.document;
    const input = {
      snapshot: cp.snapshot,
      packs: f.context.document.packs,
      rules: [],
    };
    expect(
      compareDocumentSnapshots({
        contractVersion: '1',
        scope: 'semantic-model',
        before: input,
        after: input,
      }).status,
    ).toBe('incomplete');
    const completeEntity = {
      ...f.customer,
      properties: {
        'sales:definition': scalar('D'),
        'sales:owner': scalar('O'),
      },
    };
    expect(
      prepareSessionCommand(
        openDocumentSession(f.checkpoint),
        command(f.checkpoint, 'atomic', [
          { kind: 'create-element', value: completeEntity },
        ]),
        f.context.document,
      ).status,
    ).toBe('prepared');
  });
  it('imports an existing repairable incomplete checkpoint explicitly and advances revision', () => {
    const f = fixture();
    const cp = {
      ...f.checkpoint,
      snapshot: {
        ...f.checkpoint.snapshot,
        model: { ...f.checkpoint.snapshot.model, elements: [f.customer] },
      },
    };
    const result = ready(
      prepareAuthoringImport(cp, command(cp, 'import-existing'), f.context),
    );
    expect(result.assessment.admission).toBe('incomplete');
    expect(result.candidate.checkpoint.document.snapshot.model.revision).toBe(
      'import-existing',
    );
    expect(result.candidate.history.undo).toEqual([]);
    expect(
      prepareAuthoringImport(
        cp,
        command(cp, 'write', [{ kind: 'create-element', value: f.customer }]),
        f.context,
      ).status,
    ).toBe('rejected');
  });
  it('requires fresh revisions including zero writes; bounds receipts and history without mutation', () => {
    const f = missing();
    const old = structuredClone(f.session);
    const cmd = command(f.session.checkpoint.document, 'noop');
    const next = ready(edit(f.session, f.context, 'noop')).candidate;
    expect(
      prepareAuthoringCommand(
        next,
        { command: { ...cmd, id: 'stale' }, binding: next.checkpoint.binding },
        f.context,
      ).status,
    ).toBe('rejected');
    expect(
      prepareAuthoringCommand(
        f.session,
        { command: cmd, binding: f.session.checkpoint.binding },
        f.context,
        { maxTransactions: 1, maxReceipts: 2 },
      ).status,
    ).toBe('rejected');
    const bounded = ready(
      prepareAuthoringCommand(
        f.session,
        { command: cmd, binding: f.session.checkpoint.binding },
        f.context,
        { maxTransactions: 1, maxReceipts: 3 },
      ),
    );
    expect(bounded.candidate.history.undo).toEqual(['noop']);
    expect(f.session).toEqual(old);
  });
  it('undoes completion, redoes repair, retains historical replay after undo and reopen', () => {
    const f = missing();
    const completed = ready(
      edit(f.session, f.context, 'complete', [
        fill(f, 'sales:definition', 'D'),
        fill(f, 'sales:owner', 'O'),
      ]),
    );
    const reversal = (
      s: AuthoringSession,
      kind: 'undo' | 'redo',
      id: string,
    ): DocumentCommand => ({
      ...identity(s.checkpoint.document, id),
      kind,
      transactionId: 'complete',
    });
    const undone = ready(
      prepareAuthoringCommand(
        completed.candidate,
        {
          command: reversal(completed.candidate, 'undo', 'undo'),
          binding: completed.command.binding,
        },
        f.context,
      ),
    );
    expect(undone.assessment.admission).toBe('incomplete');
    const redo = ready(
      prepareAuthoringCommand(
        undone.candidate,
        {
          command: reversal(undone.candidate, 'redo', 'redo'),
          binding: completed.command.binding,
        },
        f.context,
      ),
    );
    expect(redo.assessment.admission).toBe('complete');
    const historical = prepareAuthoringCommand(
      undone.candidate,
      completed.command,
      { document: f.context.document },
    );
    expect(historical.status).toBe('authoring-replayed');
    const encoded = encodeAuthoringDocument(
      undone.candidate.checkpoint,
      f.context,
    );
    if (encoded.status !== 'encoded') throw new Error(JSON.stringify(encoded));
    const opened = decodeAuthoringDocument(encoded.bytes, f.context);
    if (opened.status !== 'decoded') throw new Error(JSON.stringify(opened));
    expect(opened.session.history).toEqual({ undo: [], redo: [] });
    expect(
      prepareAuthoringCommand(opened.session, completed.command, f.context)
        .status,
    ).toBe('authoring-replayed');
    expect(
      edit(opened.session, { document: f.context.document }, 'no-policy')
        .status,
    ).toBe('rejected');
    expect(
      prepareAuthoringCommand(
        opened.session,
        {
          ...completed.command,
          command: { ...completed.command.command, actor: 'changed' },
        },
        f.context,
      ).status,
    ).toBe('rejected');
    expect(
      prepareAuthoringCommand(
        opened.session,
        {
          ...completed.command,
          binding: { ...completed.command.binding, definitionKey: 'changed' },
        },
        f.context,
      ).status,
    ).toBe('rejected');
  });
  it('permits explicit removal of an allowed property and rejects unsafe writes atomically', () => {
    const f = missing();
    const s = ready(
      edit(f.session, f.context, 'fill', [fill(f, 'sales:definition', 'D')]),
    ).candidate;
    const removed = ready(
      edit(s, f.context, 'remove', [
        {
          kind: 'set-property',
          target: f.customerRef,
          property: 'sales:definition',
          expected: { present: true, value: scalar('D') },
          value: { present: false },
        },
      ]),
    );
    expect(removed.assessment.deficiencies).toHaveLength(2);
    const bad: DocumentEdit[][] = [
      [{ kind: 'create-element', value: f.customer }],
      [
        {
          kind: 'set-property',
          target: f.customerRef,
          property: 'sales:definition',
          expected: { present: false },
          value: { present: true, value: { kind: 'scalar', value: null } },
        },
      ],
      [
        {
          kind: 'set-property',
          target: f.customerRef,
          property: 'sales:unknown',
          expected: { present: false },
          value: { present: true, value: scalar('unknown') },
        },
      ],
      [fill(f, 'sales:definition', 'A'), fill(f, 'sales:definition', 'B')],
      [
        {
          kind: 'create-member',
          value: {
            id: createMemberId('foreign'),
            type: f.field.id,
            owner: { ...f.customerRef, id: createElementId('absent') },
            name: 'bad',
            properties: {},
          },
        },
      ],
      [
        {
          kind: 'create-relationship',
          value: {
            id: createRelationshipId('dangling'),
            type: f.edge.id,
            source: f.customerRef,
            target: { ...f.customerRef, id: createElementId('absent') },
            properties: {},
          },
        },
      ],
      [{ kind: 'remove-element', expected: f.customer }],
    ];
    for (const edits of bad)
      expect(edit(f.session, f.context, 'bad', edits).status).toBe('rejected');
    expect(f.session.checkpoint.document.snapshot.model.elements).toEqual([
      f.customer,
    ]);
  });
  it('coordinates view edits and reviewed deletion without relaxing notation or undo guards', () => {
    const f = missing();
    const view = {
      id: createViewId('sales-view'),
      modelId: f.customerRef.modelId,
      name: 'Sales',
      elements: [],
      connectors: [],
    };
    const withView = ready(
      edit(f.session, f.context, 'view', [
        { kind: 'create-view', value: view, notationBindings: [] },
      ]),
    );
    expect(withView.assessment.admission).toBe('incomplete');
    const invalidView = {
      ...view,
      id: createViewId('missing-notation'),
      elements: [
        {
          kind: 'element-occurrence' as const,
          id: createElementOccurrenceId('customer'),
          target: f.customerRef,
          bounds: { x: 0, y: 0, width: 100, height: 40 },
          overrides: {},
          accessibility: { label: 'Customer' },
        },
      ],
    };
    expect(
      edit(withView.candidate, f.context, 'bad-view', [
        { kind: 'create-view', value: invalidView, notationBindings: [] },
      ]).status,
    ).toBe('rejected');
    const removal = {
      ...command(withView.candidate.checkpoint.document, 'delete', [
        { kind: 'remove-element', expected: f.customer },
      ]),
      deletionReviews: [{ operationIndex: 0, dependents: [] }],
    };
    const removed = ready(
      prepareAuthoringCommand(
        withView.candidate,
        { command: removal, binding: f.session.checkpoint.binding },
        f.context,
      ),
    );
    expect(removed.assessment.admission).toBe('complete');
    const restore: DocumentCommand = {
      kind: 'undo',
      id: 'restore',
      modelId: f.customerRef.modelId,
      actor: 'author',
      source: { id: 'proof', revision: '1' },
      expectedRevision:
        removed.candidate.checkpoint.document.snapshot.model.revision,
      nextRevision: createModelRevision('restore'),
      transactionId: 'delete',
    };
    expect(
      ready(
        prepareAuthoringCommand(
          removed.candidate,
          { command: restore, binding: f.session.checkpoint.binding },
          f.context,
        ),
      ).assessment.admission,
    ).toBe('incomplete');
  });
  it('does not defer a missing supported mandatory constraint', () => {
    const f = fixture();
    const rule = {
      id: 'sales:group-rule' as const,
      version: '1',
      operator: MEMBER_GROUP_OPERATOR,
    };
    const constraint = { pack: f.pin, id: 'sales:required-group' as const };
    const context: AuthoringContext = {
      ...f.context,
      document: {
        ...f.context.document,
        validationRules: [{ pack: f.pin, rule }],
        packs: f.context.document.packs.map((p) => ({
          ...p,
          constraints: [
            { id: constraint.id, mandatory: true, roles: [], rule },
          ],
          types: p.types.map((t) =>
            t.kind !== 'element' ? t : { ...t, constraints: [constraint] },
          ),
        })),
      },
    };
    const s = ready(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        context,
      ),
    ).candidate;
    const rejected = edit(s, context, 'create', [
      { kind: 'create-element', value: f.customer },
    ]);
    expect(rejected.status).toBe('rejected');
    if (rejected.status === 'rejected')
      expect(
        rejected.assessment?.semantics.diagnostics.some(
          (d) => d.code === 'validation.missing-constraint',
        ),
      ).toBe(true);
  });
  it('rejects unavailable, duplicate, unresolved, non-scalar and unknown-field policies', () => {
    const f = fixture();
    const bad: unknown[] = [
      undefined,
      { ...f.policy, contractVersion: '2' },
      { ...f.policy, extra: true },
      { ...f.policy, version: '^1' },
      {
        ...f.policy,
        allowMissing: [...f.policy.allowMissing, f.policy.allowMissing[0]],
      },
      {
        ...f.policy,
        allowMissing: [
          { ...f.policy.allowMissing[0], property: 'sales:absent' },
        ],
      },
      {
        ...f.policy,
        allowMissing: [
          { ...f.policy.allowMissing[0], type: { ...f.node, extra: true } },
        ],
      },
    ];
    for (const policy of bad)
      expect(
        prepareAuthoringImport(f.checkpoint, command(f.checkpoint, 'import'), {
          ...f.context,
          policy: policy as AuthoringPolicy,
        }).status,
      ).toBe('rejected');
    const changed = {
      ...f.context,
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          types: p.types.map((t) => ({
            ...t,
            properties: t.properties.map((v) => ({ ...v, required: false })),
          })),
        })),
      },
    };
    expect(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        changed,
      ).status,
    ).toBe('rejected');
  });
  it('rejects nested missing fields and unlisted absences even though they share a diagnostic code', () => {
    const f = fixture();
    const context: AuthoringContext = {
      ...f.context,
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          types: p.types.map((t) =>
            t.kind !== 'element'
              ? t
              : {
                  ...t,
                  properties: [
                    ...t.properties,
                    {
                      id: 'sales:nested',
                      required: false,
                      value: {
                        kind: 'record',
                        fields: [
                          {
                            id: 'sales:definition',
                            required: true,
                            value: { kind: 'scalar', valueType: 'string' },
                          },
                        ],
                      },
                    },
                  ],
                },
          ),
        })),
      },
    };
    const s = ready(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        context,
      ),
    ).candidate;
    expect(
      edit(s, context, 'nested', [
        {
          kind: 'create-element',
          value: {
            ...f.customer,
            properties: { 'sales:nested': { kind: 'record', fields: {} } },
          },
        },
      ]).status,
    ).toBe('rejected');
    const narrowed = {
      ...f.context,
      policy: {
        ...f.policy,
        allowMissing: f.policy.allowMissing.filter(
          (p) => p.property !== 'sales:owner',
        ),
      },
    };
    const n = ready(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        narrowed,
      ),
    ).candidate;
    expect(
      edit(n, narrowed, 'missing', [
        { kind: 'create-element', value: f.customer },
      ]).status,
    ).toBe('rejected');
  });
  it('blocks corrupt originals, unsupported extensions, missing mandatory constraints and non-scalar allowances', () => {
    const f = fixture();
    const base = {
      ...f.checkpoint,
      snapshot: {
        ...f.checkpoint.snapshot,
        model: { ...f.checkpoint.snapshot.model, elements: [f.customer] },
      },
    };
    const duplicate = {
      ...base,
      snapshot: {
        ...base.snapshot,
        model: { ...base.snapshot.model, elements: [f.customer, f.customer] },
      },
    };
    expect(
      prepareAuthoringImport(duplicate, command(duplicate, 'import'), f.context)
        .status,
    ).toBe('rejected');
    const opaque = {
      ...base,
      snapshot: {
        ...base.snapshot,
        extensions: [
          {
            pack: f.pin,
            extension: { id: 'sales:opaque' as const, version: '1' },
            payload: { unknown: true },
          },
        ],
      },
    };
    expect(
      prepareAuthoringImport(opaque, command(opaque, 'import'), f.context)
        .status,
    ).toBe('rejected');
    const nonScalar: AuthoringContext = {
      ...f.context,
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          types: p.types.map((t) => ({
            ...t,
            properties: t.properties.map((v) => ({
              ...v,
              defaultValue: undefined,
              value: { kind: 'record' as const, fields: [] },
            })),
          })),
        })),
      },
    };
    expect(
      prepareAuthoringImport(base, command(base, 'import'), nonScalar).status,
    ).toBe('rejected');
    const missingConstraint: AuthoringContext = {
      ...f.context,
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          types: p.types.map((t) => ({
            ...t,
            constraints: [{ pack: f.pin, id: 'sales:missing' as const }],
          })),
        })),
      },
    };
    expect(
      prepareAuthoringImport(base, command(base, 'import'), missingConstraint)
        .status,
    ).toBe('rejected');
    const importedSession = imported().session;
    expect(
      edit(
        { ...importedSession, history: { undo: ['import'], redo: [] } },
        f.context,
        'invalid-history',
      ).status,
    ).toBe('rejected');
  });
  it('canonicalizes declared unordered selectors/definitions and blocks changed same-pin content', () => {
    const f = missing();
    const reordered: AuthoringContext = {
      ...f.context,
      policy: {
        ...f.policy,
        allowMissing: [...f.policy.allowMissing].reverse(),
      },
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          types: [...p.types]
            .reverse()
            .map((t) => ({ ...t, properties: [...t.properties].reverse() })),
        })),
      },
    };
    expect(
      assessAuthoringCheckpoint(f.session.checkpoint, reordered).deficiencies,
    ).toEqual(
      assessAuthoringCheckpoint(f.session.checkpoint, f.context).deficiencies,
    );
    expect(edit(f.session, reordered, 'permuted').status).toBe(
      'authoring-prepared',
    );
    const changed = {
      ...f.context,
      document: {
        ...f.context.document,
        packs: f.context.document.packs.map((p) => ({
          ...p,
          displayName: 'changed under same pin',
        })),
      },
    };
    expect(edit(f.session, changed, 'changed').status).toBe('rejected');
    expect(
      edit(
        f.session,
        { ...f.context, document: { ...f.context.document, packs: [] } },
        'missing-pack',
      ).status,
    ).toBe('rejected');
  });
  it('preserves recovery bytes, rejects old readers and unknown outer fields, and enforces resource limits', () => {
    const f = missing();
    const encoded = encodeAuthoringDocument(f.session.checkpoint, f.context);
    if (encoded.status !== 'encoded') throw new Error(JSON.stringify(encoded));
    const old = decodeDocument(encoded.bytes, f.context.document);
    expect(old.status).toBe('not-decoded');
    expect(old.source).toBe(encoded.bytes);
    if (old.status === 'not-decoded')
      expect(old.reason).toBe('unsupported-format');
    const noPolicy = decodeAuthoringDocument(encoded.bytes, {
      document: f.context.document,
    });
    expect(noPolicy.status).toBe('decoded');
    if (noPolicy.status === 'decoded')
      expect(noPolicy.assessment.admission).toBe('blocked');
    const raw = JSON.parse(new TextDecoder().decode(encoded.bytes));
    for (const data of [
      { ...raw, envelopeVersion: 2 },
      { ...raw, ignored: true },
      { ...raw, checkpoint: { ...raw.checkpoint, importCommandId: 'absent' } },
    ]) {
      const bytes = new TextEncoder().encode(JSON.stringify(data));
      const decoded = decodeAuthoringDocument(bytes, f.context);
      expect(decoded.status).toBe('not-decoded');
      expect(decoded.source).toBe(bytes);
    }
    const futurePolicy = {
      ...raw,
      checkpoint: {
        ...raw.checkpoint,
        binding: {
          ...raw.checkpoint.binding,
          policy: {
            ...raw.checkpoint.binding.policy,
            contractVersion: 'future',
          },
        },
      },
    };
    const future = decodeAuthoringDocument(
      new TextEncoder().encode(JSON.stringify(futurePolicy)),
      f.context,
    );
    expect(future.status).toBe('not-decoded');
    if (future.status === 'not-decoded')
      expect(future.reason).toBe('unsupported-format');
    expect(
      decodeAuthoringDocument(encoded.bytes, f.context, { maxBytes: 10 })
        .status,
    ).toBe('not-decoded');
    expect(
      encodeAuthoringDocument(f.session.checkpoint, f.context, {
        maxReceipts: 1,
      }).status,
    ).toBe('not-encoded');
  });
  it('keeps commit families distinct and simulates host conflict, failure and atomic adoption', async () => {
    const f = missing();
    const prepared = ready(
      edit(f.session, f.context, 'complete', [
        fill(f, 'sales:definition', 'D'),
        fill(f, 'sales:owner', 'O'),
      ]),
    );
    let current = f.session.checkpoint;
    let authorized = false;
    let fail = false;
    const port: AuthoringCommitPort = {
      async commit(p) {
        if (!authorized || fail)
          return { status: 'failed', message: 'Host denied or storage failed' };
        if (
          current.document.snapshot.model.revision !== p.expectedRevision ||
          JSON.stringify(current.binding) !== JSON.stringify(p.command.binding)
        )
          return {
            status: 'conflict',
            currentRevision: current.document.snapshot.model.revision,
          };
        current = p.candidate.checkpoint;
        return { status: 'committed', checkpoint: current };
      },
    };
    expect((await port.commit(prepared)).status).toBe('failed');
    expect(current).toBe(f.session.checkpoint);
    authorized = true;
    fail = true;
    expect((await port.commit(prepared)).status).toBe('failed');
    expect(current).toBe(f.session.checkpoint);
    fail = false;
    expect((await port.commit(prepared)).status).toBe('committed');
    expect((await port.commit(prepared)).status).toBe('conflict');
    expect(
      prepareAuthoringCommand(
        { checkpoint: current, history: { undo: [], redo: [] } },
        prepared.command,
        f.context,
      ).status,
    ).toBe('authoring-replayed');
    const checkTypes = (legacy: DocumentCommitPort) => {
      // @ts-expect-error authoring result must never satisfy the strict valid-only port
      void legacy.commit(prepared);
    };
    void checkTypes;
  });
  it('applies reviewed defaults incrementally while preserving existing plan and manual-value guards', () => {
    const f = fixture();
    const rule = {
      id: 'sales:defaults' as const,
      version: '1',
      operator: DEFAULTS_OPERATOR,
    };
    const context: AuthoringContext = {
      ...f.context,
      document: {
        ...f.context.document,
        defaultRules: [
          {
            pack: f.pin,
            rule,
            subjectType: f.node,
            dependsOn: [],
            conflicts: [],
            propertyDefaults: true,
            members: [],
          },
        ],
      },
    };
    let s = ready(
      prepareAuthoringImport(
        f.checkpoint,
        command(f.checkpoint, 'import'),
        context,
      ),
    ).candidate;
    s = ready(
      edit(s, context, 'create', [
        { kind: 'create-element', value: f.customer },
        {
          kind: 'create-element',
          value: { ...f.customer, id: createElementId('order'), name: 'Order' },
        },
      ]),
    ).candidate;
    const plan = proposeDefaultPlan({
      state: s.checkpoint.document.snapshot,
      subject: f.customerRef,
      planId: 'defaults',
      nextRevision: createModelRevision('defaults'),
      source: { id: 'proof', revision: '1' },
      rules: context.document.defaultRules,
      context: {
        defaultRules: context.document.defaultRules,
        validation: {
          profile: s.checkpoint.document.snapshot.profile,
          registry: context.document.packs,
          rules: [],
          constraints: [],
          extensions: [],
        },
      },
    });
    if (!plan.ok) throw new Error(JSON.stringify(plan));
    const request: DocumentCommand = {
      ...identity(s.checkpoint.document, 'defaults'),
      kind: 'apply-defaults',
      plan: plan.plan,
    };
    const result = ready(
      prepareAuthoringCommand(
        s,
        { command: request, binding: s.checkpoint.binding },
        context,
      ),
    );
    expect(result.assessment.admission).toBe('incomplete');
    expect(result.assessment.deficiencies).toHaveLength(2);
    expect(result.candidate.checkpoint.document.snapshot.baselines.length).toBe(
      2,
    );
    const saved = encodeAuthoringDocument(result.candidate.checkpoint, context);
    expect(saved.status).toBe('encoded');
  });
});
