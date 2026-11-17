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
  prepareViewCommand,
  validateOccurrenceNotation,
  resolveOccurrenceNotation,
  composeModelingProfile,
  inspectDocumentDeletion,
  MEMBER_GROUP_OPERATOR,
  type DocumentCheckpoint,
  type DocumentContext,
  type DocumentCommand,
  type DocumentEdit,
  type DeletionReview,
  type PrepareDocumentResult,
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
function command(
  checkpoint: DocumentCheckpoint,
  edits: readonly DocumentEdit[],
  deletionReviews: readonly DeletionReview[] = [],
): DocumentCommand {
  return {
    kind: 'edit',
    id: `command-${checkpoint.commands.length}`,
    actor: 'author',
    source: { id: 'review', revision: '1' },
    modelId: checkpoint.snapshot.model.id,
    expectedRevision: checkpoint.snapshot.model.revision,
    nextRevision: createModelRevision(
      `revision-${checkpoint.commands.length + 1}`,
    ),
    edits,
    deletionReviews,
  };
}
function prepared(result: PrepareDocumentResult) {
  if (result.status !== 'prepared') throw new Error(JSON.stringify(result));
  return result;
}
function rejected(result: PrepareDocumentResult, code?: string) {
  expect(result.status).toBe('rejected');
  expect(result).not.toHaveProperty('candidate');
  if (result.status !== 'rejected') throw new Error('Expected rejection');
  if (code) expect(result.diagnostics.map((d) => d.code)).toContain(code);
  return result;
}

const viewRef = (view: DocumentCheckpoint['snapshot']['views'][number]) => ({
  modelId: view.modelId,
  id: view.id,
});
function replaceFirst(
  f: ReturnType<typeof fixture>,
): Extract<DocumentEdit, { kind: 'replace-occurrence' }> {
  const view = f.checkpoint.snapshot.views[0];
  return {
    kind: 'replace-occurrence',
    view: viewRef(view),
    expected: view.elements[0],
    value: {
      ...view.elements[0],
      bounds: { x: 45, y: 70, width: 150, height: 80 },
      overrides: { fillToken: 'accent' },
      accessibility: {
        label: 'Updated label',
        description: 'Plain text detail',
      },
    },
  };
}
function removeFirst(
  f: ReturnType<typeof fixture>,
): Extract<DocumentEdit, { kind: 'remove-occurrence' }> {
  const view = f.checkpoint.snapshot.views[0];
  return {
    kind: 'remove-occurrence',
    view: viewRef(view),
    expected: view.elements[0],
    expectedNotation: f.context.notations[0].reference,
  };
}
function review(
  cp: DocumentCheckpoint,
  edit: DocumentEdit,
  operationIndex: number,
  resolve: (
    location: DeletionReview['dependents'][number]['location'],
  ) => number,
): DeletionReview {
  return {
    operationIndex,
    dependents: inspectDocumentDeletion(cp.snapshot, edit).dependents.map(
      (location) => ({ location, resolvedBy: [resolve(location)] }),
    ),
  };
}

describe('coordinated view commands', () => {
  it('moves, styles, labels and routes one view without changing targets, semantics or another view', () => {
    const f = fixture();
    const before = JSON.stringify(f.checkpoint);
    const view = f.checkpoint.snapshot.views[0];
    const connector = view.connectors[0];
    const edits: DocumentEdit[] = [
      replaceFirst(f),
      {
        kind: 'rename-view',
        view: viewRef(view),
        expected: view.name,
        value: 'Revised overview',
      },
      {
        kind: 'replace-occurrence',
        view: viewRef(view),
        expected: connector,
        value: {
          ...connector,
          waypoints: [{ x: 20, y: 30 }],
          overrides: { lineStyle: 'dash' },
          accessibility: { label: 'Routed link' },
        },
      },
    ];
    const request = command(f.checkpoint, edits);
    const result = prepared(
      prepareViewCommand(f.checkpoint, request, f.context),
    );
    const s = result.candidate.snapshot;
    expect(s.views[0].name).toBe('Revised overview');
    expect(s.views[0].elements[0]).toEqual(replaceFirst(f).value);
    expect(s.views[0].connectors[0].waypoints).toEqual([{ x: 20, y: 30 }]);
    expect(s.views[1]).toEqual(f.checkpoint.snapshot.views[1]);
    expect(s.model).toEqual({
      ...f.checkpoint.snapshot.model,
      revision: request.nextRevision,
    });
    expect(s.notationBindings).toEqual(f.checkpoint.snapshot.notationBindings);
    expect(s.constraints).toEqual(f.checkpoint.snapshot.constraints);
    expect(s.applied).toEqual([]);
    expect(s.baselines).toEqual([]);
    expect(result.candidate.commands[0].command.source).toEqual(request.source);
    expect(result.candidate.commands[0].inverse).toEqual([
      {
        ...edits[2],
        expected: 'value' in edits[2] ? edits[2].value : undefined,
        value: connector,
      },
      {
        kind: 'rename-view',
        view: viewRef(view),
        expected: 'Revised overview',
        value: view.name,
      },
      {
        ...replaceFirst(f),
        expected: replaceFirst(f).value,
        value: view.elements[0],
      },
    ]);
    for (const notation of result.assessment.notation) {
      expect(notation.result.ok).toBe(true);
      if (notation.result.ok)
        expect(notation.result.value.accessibilityAssessment).toBe(
          'pending-host-verification',
        );
    }
    expect(JSON.stringify(f.checkpoint)).toBe(before);
  });
  it('creates a complete independently bound view and preserves supplied occurrence order', () => {
    const f = fixture();
    const source = f.checkpoint.snapshot.views[0];
    const ref = { modelId: source.modelId, id: createViewId('third') };
    const value = {
      ...source,
      ...ref,
      name: 'Third',
      elements: [...source.elements].reverse(),
      connectors: source.connectors.map((o) => ({
        ...o,
        source: { ...o.source, view: ref },
        destination: { ...o.destination, view: ref },
      })),
    };
    const bindings = f.checkpoint.snapshot.notationBindings
      .filter((b) => b.view.id === source.id)
      .map((b) => ({ ...b, view: ref }));
    const result = prepared(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { kind: 'create-view', value, notationBindings: bindings },
        ]),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.views[2]).toEqual(value);
    expect(result.candidate.commands[0].inverse).toEqual([
      { kind: 'remove-view', expected: value, expectedNotations: bindings },
    ]);
    expect(result.candidate.snapshot.views.slice(0, 2)).toEqual(
      f.checkpoint.snapshot.views,
    );
  });
  it('adds a connector before its same-batch element occurrences and retains scoped identities', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const a = { ...view.elements[0], id: createElementOccurrenceId('new-a') };
    const b = { ...view.elements[1], id: createElementOccurrenceId('new-b') };
    const edge = {
      ...view.connectors[0],
      id: createConnectorOccurrenceId('new-edge'),
      source: { ...view.connectors[0].source, id: a.id },
      destination: { ...view.connectors[0].destination, id: b.id },
    };
    const edits: DocumentEdit[] = [
      {
        kind: 'add-occurrence',
        view: viewRef(view),
        value: edge,
        notation: f.context.notations[1].reference,
      },
      {
        kind: 'add-occurrence',
        view: viewRef(view),
        value: b,
        notation: f.context.notations[0].reference,
      },
      {
        kind: 'add-occurrence',
        view: viewRef(view),
        value: a,
        notation: f.context.notations[0].reference,
      },
    ];
    const result = prepared(
      prepareViewCommand(f.checkpoint, command(f.checkpoint, edits), f.context),
    );
    expect(result.candidate.snapshot.views[0].connectors[1]).toEqual(edge);
    expect(result.candidate.snapshot.views[0].elements.slice(2)).toEqual([
      b,
      a,
    ]);
    expect(result.candidate.commands[0].inverse?.map((e) => e.kind)).toEqual([
      'remove-occurrence',
      'remove-occurrence',
      'remove-occurrence',
    ]);
  });
  it('removes an occurrence only with explicit connector cleanup and keeps semantic entities', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const element = removeFirst(f);
    const connector: DocumentEdit = {
      kind: 'remove-occurrence',
      view: viewRef(view),
      expected: view.connectors[0],
      expectedNotation: f.context.notations[1].reference,
    };
    const impact = inspectDocumentDeletion(f.checkpoint.snapshot, element);
    expect(impact.dependents.map((l) => [l.section, l.path])).toEqual([
      ['views', [0, 'connectors', 0, 'source']],
      ['notationBindings', [0]],
    ]);
    const result = prepared(
      prepareViewCommand(
        f.checkpoint,
        command(
          f.checkpoint,
          [element, connector],
          [
            review(f.checkpoint, element, 0, (l) =>
              l.section === 'views' ? 1 : 0,
            ),
            review(f.checkpoint, connector, 1, () => 1),
          ],
        ),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.views[0].elements).toEqual([
      view.elements[1],
    ]);
    expect(result.candidate.snapshot.views[0].connectors).toEqual([]);
    expect(result.candidate.snapshot.model.elements).toEqual(
      f.checkpoint.snapshot.model.elements,
    );
    expect(result.candidate.snapshot.model.relationships).toEqual(
      f.checkpoint.snapshot.model.relationships,
    );
    expect(result.candidate.snapshot.views[1]).toEqual(
      f.checkpoint.snapshot.views[1],
    );
    expect(result.candidate.commands[0].inverse).toEqual([
      {
        kind: 'add-occurrence',
        view: viewRef(view),
        value: view.connectors[0],
        notation: f.context.notations[1].reference,
      },
      {
        kind: 'add-occurrence',
        view: viewRef(view),
        value: view.elements[0],
        notation: f.context.notations[0].reference,
      },
    ]);
  });
  it('rewires a dependent connector to a newly added occurrence of the same semantic endpoint', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const removal = removeFirst(f);
    const replacement = {
      ...view.elements[0],
      id: createElementOccurrenceId('alternate'),
    };
    const edge = view.connectors[0];
    const request = command(
      f.checkpoint,
      [
        removal,
        {
          kind: 'replace-occurrence',
          view: viewRef(view),
          expected: edge,
          value: { ...edge, source: { ...edge.source, id: replacement.id } },
        },
        {
          kind: 'add-occurrence',
          view: viewRef(view),
          value: replacement,
          notation: f.context.notations[0].reference,
        },
      ],
      [
        review(f.checkpoint, removal, 0, (l) =>
          l.section === 'views' ? 1 : 0,
        ),
      ],
    );
    const result = prepared(
      prepareViewCommand(f.checkpoint, request, f.context),
    );
    expect(result.candidate.snapshot.views[0].connectors[0].source.id).toBe(
      replacement.id,
    );
    expect(result.candidate.snapshot.model.relationships).toEqual(
      f.checkpoint.snapshot.model.relationships,
    );
    if (request.kind !== 'edit') throw new Error('Expected edit');
    const unresolved = {
      ...request,
      edits: request.edits.map((e, i) =>
        i === 1
          ? {
              kind: 'replace-occurrence' as const,
              view: viewRef(view),
              expected: edge,
              value: { ...edge, waypoints: [{ x: 1, y: 2 }] },
            }
          : e,
      ),
    };
    const bad = rejected(
      prepareViewCommand(f.checkpoint, unresolved, f.context),
      'command.invalid-candidate',
    );
    expect(bad.assessment?.views.map((d) => d.code)).toContain(
      'view.invalid-endpoint',
    );
  });
  it('removes an exactly reviewed whole view with its connectors and bindings without a semantic cascade', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const bindings = f.checkpoint.snapshot.notationBindings.filter(
      (b) => b.view.id === view.id,
    );
    const edit: DocumentEdit = {
      kind: 'remove-view',
      expected: view,
      expectedNotations: bindings,
    };
    const result = prepared(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit], [review(f.checkpoint, edit, 0, () => 0)]),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.views).toEqual([
      f.checkpoint.snapshot.views[1],
    ]);
    expect(result.candidate.snapshot.notationBindings).toEqual(
      f.checkpoint.snapshot.notationBindings.filter(
        (b) => b.view.id !== view.id,
      ),
    );
    expect(result.candidate.commands[0].inverse).toEqual([
      { kind: 'create-view', value: view, notationBindings: bindings },
    ]);
    expect(result.candidate.snapshot.model.elements).toEqual(
      f.checkpoint.snapshot.model.elements,
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [{ ...edit, expectedNotations: [] }]),
        f.context,
      ),
      'command.precondition',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit], [{ operationIndex: 0, dependents: [] }]),
        f.context,
      ),
      'command.deletion-review',
    );
  });
  it.each([
    [
      'NaN coordinate',
      { bounds: { x: NaN, y: 0, width: 1, height: 1 } },
      'view.invalid-geometry',
    ],
    [
      'infinite width',
      { bounds: { x: 0, y: 0, width: Infinity, height: 1 } },
      'view.invalid-geometry',
    ],
    [
      'negative size',
      { bounds: { x: 0, y: 0, width: 1, height: -1 } },
      'view.invalid-geometry',
    ],
    [
      'blank label',
      { accessibility: { label: ' ' } },
      'view.missing-accessible-label',
    ],
  ])(
    'rejects %s after an earlier valid rename without leaking partial state',
    (_, change, code) => {
      const f = fixture();
      const before = JSON.stringify(f.checkpoint);
      const view = f.checkpoint.snapshot.views[0];
      const edit = replaceFirst(f);
      const result = rejected(
        prepareViewCommand(
          f.checkpoint,
          command(f.checkpoint, [
            {
              kind: 'rename-view',
              view: viewRef(view),
              expected: view.name,
              value: 'Would change',
            },
            { ...edit, value: { ...view.elements[0], ...change } },
          ]),
          f.context,
        ),
        'command.invalid-candidate',
      );
      expect(
        result.assessment?.views.some(
          (d) =>
            d.code === code &&
            d.location.viewId === view.id &&
            d.location.occurrenceId === view.elements[0].id &&
            d.location.path.length > 0,
        ),
      ).toBe(true);
      expect(JSON.stringify(f.checkpoint)).toBe(before);
    },
  );
  it.each(['route', 'foreign-view', 'reversed-endpoint'] as const)(
    'rejects invalid connector %s',
    (mode) => {
      const f = fixture();
      const view = f.checkpoint.snapshot.views[0];
      const edge = view.connectors[0];
      const value =
        mode === 'route'
          ? { ...edge, waypoints: [{ x: 1, y: Infinity }] }
          : {
              ...edge,
              source: {
                ...edge.source,
                ...(mode === 'foreign-view'
                  ? { view: viewRef(f.checkpoint.snapshot.views[1]) }
                  : { id: view.elements[1].id }),
              },
            };
      const result = rejected(
        prepareViewCommand(
          f.checkpoint,
          command(f.checkpoint, [
            {
              kind: 'replace-occurrence',
              view: viewRef(view),
              expected: edge,
              value,
            },
          ]),
          f.context,
        ),
        'command.invalid-candidate',
      );
      expect(result.assessment?.views[0].code).toBe(
        mode === 'route'
          ? 'view.invalid-geometry'
          : mode === 'foreign-view'
            ? 'view.invalid-endpoint'
            : 'view.endpoint-mismatch',
      );
    },
  );
  it('rejects semantic retargeting, occurrence identity/kind conversion and foreign model selection', () => {
    const f = fixture();
    const edit = replaceFirst(f);
    const view = f.checkpoint.snapshot.views[0];
    for (const value of [
      { ...view.elements[0], target: f.b },
      { ...view.elements[0], id: createElementOccurrenceId('changed') },
      view.connectors[0],
    ]) {
      const result = rejected(
        prepareViewCommand(
          f.checkpoint,
          command(f.checkpoint, [{ ...edit, value }]),
          f.context,
        ),
        'command.conversion',
      );
      expect(result.diagnostics[0].location.view).toEqual(viewRef(view));
      expect(result.diagnostics[0].location.occurrence?.id).toBe(
        view.elements[0].id,
      );
    }
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            ...edit,
            view: {
              ...edit.view,
              modelId: createModel('foreign', 'Foreign', {
                id: 'proof',
                version: '1',
              }).id,
            },
          },
        ]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('rejects additions with absent semantic targets or missing/wrong notation pins', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const value = { ...view.elements[0], id: createElementOccurrenceId('new') };
    const edit: DocumentEdit = {
      kind: 'add-occurrence',
      view: viewRef(view),
      value,
      notation: f.context.notations[0].reference,
    };
    const missing = rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            ...edit,
            value: {
              ...value,
              target: { ...f.a, id: createElementId('missing') },
            },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(missing.assessment?.views[0].code).toBe(
      'view.missing-semantic-target',
    );
    for (const notation of [
      { ...edit.notation, version: '99' },
      f.context.notations[1].reference,
    ]) {
      const result = rejected(
        prepareViewCommand(
          f.checkpoint,
          command(f.checkpoint, [{ ...edit, notation }]),
          f.context,
        ),
        'command.invalid-candidate',
      );
      expect(result.assessment?.notation.some((n) => !n.result.ok)).toBe(true);
    }
  });
  it('separates pack notation permissions from host theme resolution and pending rendered accessibility', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const edited = {
      ...view,
      elements: [replaceFirst(f).value, view.elements[1]],
    };
    // Preserve the element discriminant for the typed view API.
    if (edited.elements[0].kind !== 'element-occurrence')
      throw new Error('Expected element');
    const composition = composeModelingProfile(
      f.checkpoint.snapshot.profile,
      f.context.packs,
    );
    if (!composition.ok) throw new Error('Expected composition');
    const input = {
      model: f.checkpoint.snapshot.model,
      view: { ...view, elements: [edited.elements[0], view.elements[1]] },
      occurrence: view.elements[0],
      notation: f.context.notations[0].reference,
      registry: f.context.notations,
      composition: composition.value,
    };
    const notation = validateOccurrenceNotation(input);
    expect(notation.ok).toBe(true);
    if (notation.ok) {
      expect(notation.value).not.toHaveProperty('themeId');
      expect(notation.value.appearance.fillToken).toBe('accent');
      expect(notation.value.accessibilityAssessment).toBe(
        'pending-host-verification',
      );
    }
    const themed = resolveOccurrenceNotation({
      ...input,
      theme: { id: 'missing', tokens: {} },
    });
    expect(themed.ok).toBe(false);
    if (!themed.ok)
      expect(
        themed.diagnostics.every(
          (d) => d.code === 'notation.missing-theme-token',
        ),
      ).toBe(true);
    const bad = rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            ...replaceFirst(f),
            value: { ...view.elements[0], overrides: { shape: 'unapproved' } },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(
      bad.assessment?.notation.some(
        (n) =>
          !n.result.ok &&
          n.result.diagnostics.some(
            (d) => d.code === 'notation.forbidden-override',
          ),
      ),
    ).toBe(true);
  });
  it('rejects missing theme tokens for a proposed style and leaves the original checkpoint unchanged', () => {
    const f = fixture();
    const context = {
      ...f.context,
      theme: { id: 'limited', tokens: { paper: '#fff', ink: '#111' } },
    };
    expect(assessDocument(f.checkpoint, context).status).toBe('valid');
    const result = rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [replaceFirst(f)]),
        context,
      ),
      'command.invalid-candidate',
    );
    expect(
      result.assessment?.notation.some(
        (n) =>
          !n.result.ok &&
          n.result.diagnostics.some(
            (d) => d.code === 'notation.missing-theme-token',
          ),
      ),
    ).toBe(true);
    expect(f.checkpoint.snapshot.views[0].elements[0].overrides).toEqual({});
  });
  it('requires current revision and exact original values even for view-only edits', () => {
    const f = fixture();
    const request = command(f.checkpoint, [replaceFirst(f)]);
    rejected(
      prepareViewCommand(
        f.checkpoint,
        { ...request, expectedRevision: createModelRevision('old') },
        f.context,
      ),
      'command.stale-revision',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        { ...request, nextRevision: request.expectedRevision },
        f.context,
      ),
      'command.reused-revision',
    );
    const edit = replaceFirst(f);
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [{ ...edit, expected: edit.value }]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('rejects repeated occurrence writes, duplicate creates and whole-view overlaps in either order', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const add: DocumentEdit = {
      kind: 'add-occurrence',
      view: viewRef(view),
      value: { ...view.elements[0], id: createElementOccurrenceId('new') },
      notation: f.context.notations[0].reference,
    };
    const remove: DocumentEdit = {
      kind: 'remove-view',
      expected: view,
      expectedNotations: f.checkpoint.snapshot.notationBindings.filter(
        (b) => b.view.id === view.id,
      ),
    };
    for (const edits of [
      [replaceFirst(f), replaceFirst(f)],
      [add, add],
      [remove, replaceFirst(f)],
      [replaceFirst(f), remove],
    ]) {
      rejected(
        prepareViewCommand(
          f.checkpoint,
          command(f.checkpoint, edits),
          f.context,
        ),
        'command.overlap',
      );
    }
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [{ ...add, value: view.elements[0] }]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('rejects incomplete or foreign view binding coverage and duplicate view identities', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const value = { ...view, id: createViewId('new'), connectors: [] };
    const edit: DocumentEdit = {
      kind: 'create-view',
      value,
      notationBindings: [],
    };
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [{ ...edit, value: view }]),
        f.context,
      ),
      'command.precondition',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { ...edit, notationBindings: f.checkpoint.snapshot.notationBindings },
        ]),
        f.context,
      ),
      'command.precondition',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [{ ...edit, value: { ...value, name: ' ' } }]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('requires complete review and actual connector resolution instead of removing layout implicitly', () => {
    const f = fixture();
    const edit = removeFirst(f);
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit]),
        f.context,
      ),
      'command.deletion-review',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit], [review(f.checkpoint, edit, 0, () => 0)]),
        f.context,
      ),
      'command.deletion-review',
    );
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            ...edit,
            expectedNotation: { ...edit.expectedNotation, version: '99' },
          },
        ]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('replays exact view commands after later semantic edits without returning a stale candidate', () => {
    const f = fixture();
    const request = command(f.checkpoint, [replaceFirst(f)]);
    const first = prepared(
      prepareViewCommand(f.checkpoint, request, f.context),
    );
    const second = prepared(
      prepareSemanticCommand(
        first.candidate,
        command(first.candidate, [
          { kind: 'rename', target: f.a, expected: 'A', value: 'Later name' },
        ]),
        f.context,
      ),
    );
    const replay = prepareViewCommand(second.candidate, request, f.context);
    expect(replay.status).toBe('replayed');
    expect(replay).not.toHaveProperty('candidate');
    expect(second.candidate.snapshot.model.elements[0].name).toBe('Later name');
    rejected(
      prepareViewCommand(
        second.candidate,
        { ...request, actor: 'different' },
        f.context,
      ),
      'command.identity-conflict',
    );
  });
  it('keeps authored semantic mutation and other lifecycle operations outside the view executor', () => {
    const f = fixture();
    rejected(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { kind: 'rename', target: f.a, expected: 'A', value: 'No' },
        ]),
        f.context,
      ),
      'command.unsupported-operation',
    );
    const emptyView: DocumentEdit = {
      kind: 'create-view',
      value: {
        id: createViewId('empty'),
        modelId: f.a.modelId,
        name: 'Empty',
        elements: [],
        connectors: [],
      },
      notationBindings: [],
    };
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [emptyView]),
        f.context,
      ),
      'command.unsupported-operation',
    );
    const request = command(f.checkpoint, []);
    rejected(
      prepareViewCommand(
        f.checkpoint,
        { ...request, kind: 'undo', transactionId: 'prior' },
        f.context,
      ),
      'command.unsupported-kind',
    );
  });
  it('detaches submitted view data and inverse intent and does not read unsupported extension payloads', () => {
    const f = fixture();
    const value = {
      ...f.checkpoint.snapshot.views[0].elements[0],
      bounds: { x: 1, y: 2, width: 3, height: 4 },
    };
    const edit = { ...replaceFirst(f), value };
    const result = prepared(
      prepareViewCommand(
        f.checkpoint,
        command(f.checkpoint, [edit]),
        f.context,
      ),
    );
    value.bounds.x = 999;
    expect(result.candidate.snapshot.views[0].elements[0].bounds.x).toBe(1);
    const inverse = result.candidate.commands[0].inverse?.[0];
    expect(inverse?.kind).toBe('replace-occurrence');
    if (
      inverse?.kind === 'replace-occurrence' &&
      inverse.expected.kind === 'element-occurrence'
    )
      expect(inverse.expected.bounds.x).toBe(1);
    let reads = 0;
    const opaque = {
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
    };
    rejected(
      prepareViewCommand(opaque, command(opaque, [replaceFirst(f)]), f.context),
      'command.not-editable',
    );
    expect(reads).toBe(0);
  });
});
