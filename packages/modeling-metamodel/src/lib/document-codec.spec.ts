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
  decodeDocument,
  encodeDocument,
  DOCUMENT_CODEC_LIMITS,
  DOCUMENT_ENVELOPE_FORMAT,
  DOCUMENT_ENVELOPE_VERSION,
  openDocumentSession,
  prepareSessionCommand,
  proposeDefaultPlan,
  inspectDocumentDeletion,
  DEFAULTS_OPERATOR,
  MEMBER_GROUP_OPERATOR,
  type DocumentCheckpoint,
  type DocumentContext,
  type PropertyDefinition,
  type DocumentCommand,
  type DocumentCommandIdentity,
  type DocumentSession,
  type DocumentCodecLimits,
  type DefaultRule,
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

const bytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));
const envelope = (checkpoint: unknown) => ({
  format: DOCUMENT_ENVELOPE_FORMAT,
  envelopeVersion: DOCUMENT_ENVELOPE_VERSION,
  checkpoint,
});
const wire = (checkpoint: unknown) =>
  bytes(JSON.stringify(envelope(checkpoint)));
function roundTrip(cp: DocumentCheckpoint, context: DocumentContext) {
  const encoded = encodeDocument(cp, context);
  if (encoded.status !== 'encoded') throw new Error(JSON.stringify(encoded));
  const decoded = decodeDocument(encoded.bytes, context);
  if (decoded.status !== 'decoded') throw new Error(JSON.stringify(decoded));
  expect(decoded.checkpoint).toEqual(cp);
  expect(decoded.checkpoint).not.toBe(cp);
  expect(decoded.source).toBe(encoded.bytes);
  expect(decoded.classification).toBe(encoded.classification);
  return decoded;
}
function rejected(
  source: Uint8Array,
  context: DocumentContext,
  reason = 'corrupt',
  limits: Partial<DocumentCodecLimits> = {},
) {
  const original = source.slice();
  const result = decodeDocument(source, context, limits);
  expect(result.status).toBe('not-decoded');
  expect(result).toMatchObject({ reason });
  expect(result.source).toBe(source);
  expect(Buffer.compare(source, original)).toBe(0);
  expect(result).not.toHaveProperty('checkpoint');
  if (result.status !== 'not-decoded') throw new Error('Expected rejection');
  expect(result.diagnostics).toHaveLength(1);
  return result;
}
function replace(
  root: unknown,
  path: readonly (string | number)[],
  value: unknown,
) {
  let parent = root as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) parent = parent[key] as typeof parent;
  parent[path[path.length - 1]] = value;
}
function withPayload(
  f: ReturnType<typeof fixture>,
  payload: unknown,
): DocumentCheckpoint {
  return {
    ...f.checkpoint,
    snapshot: {
      ...f.checkpoint.snapshot,
      extensions: [
        {
          pack: { id: 'absent', version: '9', contractVersion: '1' },
          extension: { id: 'absent:data', version: '1' },
          payload,
        },
      ],
    },
  };
}
function identity(session: DocumentSession): DocumentCommandIdentity {
  return {
    id: `command-${session.checkpoint.commands.length}`,
    actor: 'author',
    source: { id: 'review', revision: '1' },
    modelId: session.checkpoint.snapshot.model.id,
    expectedRevision: session.checkpoint.snapshot.model.revision,
    nextRevision: createModelRevision(
      `revision-${session.checkpoint.commands.length + 1}`,
    ),
  };
}
function apply(
  session: DocumentSession,
  command: DocumentCommand,
  context: DocumentContext,
) {
  const result = prepareSessionCommand(session, command, context);
  if (result.status !== 'prepared') throw new Error(JSON.stringify(result));
  return result.candidate;
}
function historyFixture() {
  const f = fixture();
  const pin = { id: 'proof', version: '1', contractVersion: '1' };
  const rule: DefaultRule = {
    pack: pin,
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
  const context = { ...f.context, defaultRules: [rule] };
  const initial = openDocumentSession(f.checkpoint);
  const proposal = proposeDefaultPlan({
    state: initial.checkpoint.snapshot,
    context: {
      validation: {
        profile: f.checkpoint.snapshot.profile,
        registry: context.packs,
        constraints: f.checkpoint.snapshot.constraints,
        rules: context.validationRules,
      },
      defaultRules: context.defaultRules,
    },
    subject: f.a,
    planId: 'generated-plan',
    nextRevision: identity(initial).nextRevision,
    source: identity(initial).source,
    rules: context.defaultRules,
  });
  if (!proposal.ok) throw new Error(JSON.stringify(proposal));
  const command: DocumentCommand = {
    ...identity(initial),
    kind: 'apply-defaults',
    plan: proposal.plan,
  };
  const generated = apply(initial, command, context);
  const authored: DocumentCommand = {
    ...identity(generated),
    kind: 'edit',
    deletionReviews: [],
    edits: [
      { kind: 'rename', target: f.a, expected: 'A', value: 'Authored' },
      {
        kind: 'rename-view',
        view: { modelId: f.a.modelId, id: f.checkpoint.snapshot.views[1].id },
        expected: 'detail',
        value: 'Detail renamed',
      },
    ],
  };
  const changed = apply(generated, authored, context);
  const undone = apply(
    changed,
    { ...identity(changed), kind: 'undo', transactionId: authored.id },
    context,
  );
  const redone = apply(
    undone,
    { ...identity(undone), kind: 'redo', transactionId: authored.id },
    context,
  );
  return {
    ...f,
    context,
    command,
    authored,
    generated,
    changed,
    undone,
    redone,
  };
}

describe('versioned document codec through public exports', () => {
  it('round-trips semantic values, references, grouped members, two independent views and exact pins', () => {
    const f = fixture();
    const cp = structuredClone(f.checkpoint);
    replace(cp, ['snapshot', 'views', 0, 'elements', 0, 'bounds', 'x'], 12.5);
    replace(cp, ['snapshot', 'views', 0, 'elements', 0, 'overrides'], {
      fillToken: 'accent',
    });
    replace(
      cp,
      ['snapshot', 'views', 1, 'connectors', 0, 'waypoints'],
      [
        { x: 10, y: -2 },
        { x: 40, y: 18 },
      ],
    );
    replace(cp, ['snapshot', 'views', 1, 'connectors', 0, 'overrides'], {
      lineStyle: 'dash',
    });
    replace(cp, ['snapshot', 'model', 'name'], 'é 中文 🎨 \\ "\n');
    const result = roundTrip(cp, f.context);
    expect(result.classification).toBe('valid');
    expect(result.assessment.lifecycle).toBe('valid');
    expect(result.checkpoint.snapshot.views[0].elements[0].bounds.x).toBe(12.5);
    expect(result.checkpoint.snapshot.views[1].elements[0].bounds.x).toBe(0);
    expect(openDocumentSession(result.checkpoint).history).toEqual({
      undo: [],
      redo: [],
    });
  });

  it('retains generated baselines, original requests, inverse/execution receipts and retry identity after undo and reopen', () => {
    const f = historyFixture();
    for (const session of [f.generated, f.changed, f.undone, f.redone]) {
      const result = roundTrip(session.checkpoint, f.context);
      expect(result.classification).toBe('valid');
      expect(result.checkpoint.snapshot.baselines).toHaveLength(1);
      const reopened = openDocumentSession(result.checkpoint);
      expect(reopened.history).toEqual({ undo: [], redo: [] });
      expect(prepareSessionCommand(reopened, f.command, f.context).status).toBe(
        'replayed',
      );
    }
    const reopened = openDocumentSession(
      roundTrip(f.undone.checkpoint, f.context).checkpoint,
    );
    expect(prepareSessionCommand(reopened, f.authored, f.context).status).toBe(
      'replayed',
    );
    expect(reopened.checkpoint.snapshot.model.elements[0].name).toBe('A');
    expect(reopened.checkpoint.snapshot.views[1].name).toBe('detail');
  });

  it('preserves historical references to removed views and rejects invalid review indexes', () => {
    const f = fixture();
    const view = f.checkpoint.snapshot.views[0];
    const edit = {
      kind: 'remove-view' as const,
      expected: view,
      expectedNotations: f.checkpoint.snapshot.notationBindings.filter(
        (b) => b.view.id === view.id,
      ),
    };
    const initial = openDocumentSession(f.checkpoint);
    const command: DocumentCommand = {
      ...identity(initial),
      kind: 'edit',
      edits: [edit],
      deletionReviews: [
        {
          operationIndex: 0,
          dependents: inspectDocumentDeletion(
            f.checkpoint.snapshot,
            edit,
          ).dependents.map((location) => ({ location, resolvedBy: [0] })),
        },
      ],
    };
    const removed = apply(initial, command, f.context);
    expect(roundTrip(removed.checkpoint, f.context).classification).toBe(
      'valid',
    );
    for (const reviews of [
      [],
      [{ operationIndex: 1, dependents: [] }],
      [
        {
          operationIndex: 0,
          dependents: [
            {
              location: { modelId: view.modelId, section: 'views', path: [0] },
              resolvedBy: [1],
            },
          ],
        },
      ],
      [
        {
          operationIndex: 0,
          dependents: [
            {
              location: { modelId: view.modelId, section: 'views', path: [0] },
              resolvedBy: [],
            },
          ],
        },
      ],
    ]) {
      const cp = structuredClone(removed.checkpoint);
      replace(cp, ['commands', 0, 'command', 'deletionReviews'], reviews);
      rejected(wire(cp), f.context);
    }
  });

  it('preserves an undone generated member and its receipts without resurrecting output on retry', () => {
    const f = historyFixture();
    const undone = apply(
      f.generated,
      {
        ...identity(f.generated),
        kind: 'undo',
        transactionId: f.command.id,
        deletionReviews: [{ operationIndex: 0, dependents: [] }],
      },
      f.context,
    );
    const result = roundTrip(undone.checkpoint, f.context);
    expect(result.classification).toBe('valid');
    expect(result.checkpoint.snapshot.baselines).toEqual([]);
    expect(result.checkpoint.snapshot.model.members).toEqual(
      f.checkpoint.snapshot.model.members,
    );
    const reopened = openDocumentSession(result.checkpoint);
    expect(prepareSessionCommand(reopened, f.command, f.context).status).toBe(
      'replayed',
    );
    expect(reopened.checkpoint.snapshot.model.members).toHaveLength(2);
  });

  it('preserves uncoordinated metadata as unsupported but rejects its intrinsic contradictions', () => {
    const f = historyFixture();
    const cp: DocumentCheckpoint = {
      snapshot: f.generated.checkpoint.snapshot,
      commands: [],
    };
    expect(roundTrip(cp, f.context).classification).toBe('unsupported');
    for (const [path, value] of [
      [['snapshot', 'applied', 0, 'inverse'], []],
      [['snapshot', 'applied', 0, 'beforeRevision'], 'wrong'],
      [
        ['snapshot', 'baselines'],
        [...cp.snapshot.baselines, ...cp.snapshot.baselines],
      ],
      [['snapshot', 'baselines', 0, 'snapshot', 'value', 'id'], 'wrong'],
    ] as const) {
      const copy = structuredClone(cp);
      replace(copy, path, value);
      rejected(wire(copy), f.context);
    }
  });

  it('preserves unknown JSON payloads exactly as data and never upgrades coverage', () => {
    const f = fixture();
    const payload = {
      nested: [
        null,
        true,
        false,
        0,
        0.1,
        'é 😀',
        { script: 'throw new Error("do not execute")', toJSON: 'data only' },
      ],
    };
    const cp = withPayload(f, payload);
    const first = roundTrip(cp, f.context);
    expect(first.classification).toBe('unsupported');
    expect(first.checkpoint.snapshot.extensions[0].payload).toEqual(payload);
    const known = {
      ...f.context,
      packs: [
        ...f.context.packs,
        {
          ...f.context.packs[0],
          id: 'absent',
          version: '9',
          types: [],
          constraints: [],
          extensions: [{ id: 'absent:data' as const, version: '1' }],
        },
      ],
    };
    expect(roundTrip(first.checkpoint, known).classification).toBe(
      'unsupported',
    );
  });

  it('separates invalid meaning from unavailable profile, rule, notation and theme coverage', () => {
    const f = fixture();
    const cp = structuredClone(f.checkpoint);
    replace(
      cp,
      ['snapshot', 'model', 'elements', 0, 'properties', 'proof:required'],
      { kind: 'scalar', value: 42 },
    );
    expect(roundTrip(cp, f.context).classification).toBe('invalid');
    const geometry = structuredClone(f.checkpoint);
    replace(
      geometry,
      ['snapshot', 'views', 0, 'elements', 0, 'bounds', 'width'],
      -1,
    );
    expect(roundTrip(geometry, f.context).classification).toBe('invalid');
    for (const context of [
      { ...f.context, packs: [] },
      { ...f.context, validationRules: [] },
      { ...f.context, notations: [] },
      { ...f.context, theme: { id: 'empty', tokens: {} } },
    ])
      expect(roundTrip(f.checkpoint, context).classification).toBe(
        'unsupported',
      );
  });

  it.each([1, 2, 99])(
    'leaves bare scaffold model version %s unsupported with original bytes',
    (formatVersion) => {
      const f = fixture();
      rejected(
        bytes(
          JSON.stringify({ ...f.checkpoint.snapshot.model, formatVersion }),
        ),
        f.context,
        'unsupported-format',
      );
    },
  );
  it('distinguishes future formats from malformed version fields without migration or coercion', () => {
    const f = fixture();
    for (const extra of [{ envelopeVersion: 2 }, { format: 'future-document' }])
      rejected(
        bytes(JSON.stringify({ ...envelope(f.checkpoint), ...extra })),
        f.context,
        'unsupported-format',
      );
    const cp = structuredClone(f.checkpoint);
    replace(cp, ['snapshot', 'model', 'formatVersion'], 3);
    rejected(wire(cp), f.context, 'unsupported-format');
    for (const envelopeVersion of ['1', null, 0, -1, 1.5])
      rejected(
        bytes(JSON.stringify({ ...envelope(f.checkpoint), envelopeVersion })),
        f.context,
      );
  });

  describe('rejects wrongly typed persisted fields before hydration', () => {
    const f = historyFixture();
    const original = envelope(f.redone.checkpoint);
    const paths: { path: (string | number)[]; object: boolean }[] = [];
    function visit(value: unknown, path: (string | number)[]) {
      paths.push({ path, object: value !== null && typeof value === 'object' });
      if (value !== null && typeof value === 'object')
        for (const [key, item] of Object.entries(value))
          visit(item, [...path, Array.isArray(value) ? Number(key) : key]);
    }
    visit(original, []);
    // Each mutation gets its own timeout and a precise failure path. The complete
    // corpus otherwise shares a single five-second budget on slower CI runners.
    it.each(
      paths
        .filter((p) => p.path.length)
        .map((entry) => ({ ...entry, label: JSON.stringify(entry.path) })),
    )('rejects $label', ({ path, object }) => {
      const copy = structuredClone(original);
      replace(copy, path, object ? null : {});
      rejected(bytes(JSON.stringify(copy)), f.context);
    });
  });

  it.each([
    ['snapshot', 'model', 'members', 0, 'owner', 'id'],
    [
      'snapshot',
      'model',
      'elements',
      1,
      'properties',
      'proof:links',
      'items',
      0,
      'fields',
      'proof:target',
      'value',
      'id',
    ],
    ['snapshot', 'model', 'relationships', 0, 'source', 'id'],
    ['snapshot', 'constraints', 0, 'subject', 'id'],
    [
      'snapshot',
      'constraints',
      0,
      'instance',
      'roles',
      0,
      'group',
      'members',
      0,
      'id',
    ],
    ['snapshot', 'views', 0, 'elements', 0, 'target', 'id'],
    ['snapshot', 'views', 0, 'connectors', 0, 'source', 'id'],
    ['snapshot', 'notationBindings', 0, 'occurrence', 'id'],
  ])(
    'rejects broken current references even without pack coverage: %j',
    (...path) => {
      const f = fixture();
      const cp = structuredClone(f.checkpoint);
      replace(cp, path, 'missing');
      rejected(wire(cp), { ...f.context, packs: [] });
    },
  );

  it('rejects altered receipt chains, inverse evidence, baseline targets and unexpected metadata', () => {
    const f = historyFixture();
    const mutations: [readonly (string | number)[], unknown][] = [
      [['commands', 0, 'afterRevision'], 'wrong'],
      [['commands', 1, 'inverse'], []],
      [['commands', 1, 'execution', 'edits'], []],
      [['snapshot', 'baselines', 0, 'target', 'id'], 'wrong'],
      [['snapshot', 'applied', 0, 'inverse'], []],
      [['snapshot', 'profile', 'version'], '2'],
      [['snapshot', 'notationBindings'], []],
      [['snapshot', 'profile', 'selections', 0, 'pack', 'version'], '^1'],
      [['commands', 2, 'command', 'edits'], []],
    ];
    for (const [path, value] of mutations) {
      const cp = structuredClone(f.redone.checkpoint);
      replace(cp, path, value);
      rejected(wire(cp), f.context);
    }
    const cp = structuredClone(f.checkpoint);
    replace(cp, ['snapshot', 'registry'], []);
    rejected(wire(cp), f.context);
  });

  it.each([
    '',
    '{',
    'null',
    '[]',
    '{}',
    '{"x":1,}',
    '[1,]',
    '/*comment*/{}',
    '{} true',
    '\ufeff{}',
    '{"x":1,"x":2}',
    '{"x":1,"\\u0078":2}',
    '{"nested":{"__proto__":{}}}',
    '{"nested":{"constr\\u0075ctor":{}}}',
    '{"nested":{"prototype":null}}',
    '{"x":NaN}',
    '{"x":Infinity}',
    '{"x":1e999}',
    '{"x":9007199254740993}',
    '{"x":-0}',
    '{"x":-0.0}',
    '{"x":1.0000000000000001}',
    '{"x":1e-999}',
    '{"x":"\\ud800"}',
    '{"x":"\\udc00"}',
    '{"x":"\\q"}',
    '{"x":"\u0000"}',
  ])('rejects malformed, duplicate, unsafe or lossy JSON: %s', (raw) => {
    rejected(bytes(raw), fixture().context);
  });
  it.each([
    [0x80],
    [0xc0, 0xaf],
    [0xe0, 0x80, 0x80],
    [0xed, 0xa0, 0x80],
    [0xf4, 0x90, 0x80, 0x80],
    [0xf5],
    [0xc2],
    [0xc2, 0x20],
  ])('rejects invalid UTF-8 %j', (...octets) => {
    const result = rejected(new Uint8Array(octets), fixture().context);
    expect(result.diagnostics[0].code).toBe('codec.utf8');
  });
  it('accepts equivalent numeric spellings while retaining semantic JSON data', () => {
    const f = fixture();
    const source = wire(withPayload(f, { n: 1, fraction: 0.1, zero: 0 }));
    const raw = Buffer.from(source)
      .toString('utf8')
      .replace('"n":1,', '"n":1.000e0,')
      .replace('"fraction":0.1,', '"fraction":0.100,')
      .replace('"zero":0', '"zero":0e9');
    const result = decodeDocument(bytes(raw), f.context);
    expect(result.status).toBe('decoded');
    if (result.status === 'decoded') roundTrip(result.checkpoint, f.context);
  });

  it('rejects sampled truncated prefixes and a deterministic byte mutation corpus without throwing or partial hydration', () => {
    const f = fixture();
    const source = wire(f.checkpoint);
    for (let size = 0; size < source.length; size += 23)
      rejected(source.slice(0, size), f.context);
    for (let i = 0; i < source.length; i += 31) {
      const modified = source.slice();
      modified[i] = 0xff;
      rejected(modified, f.context);
    }
  });

  it.each(Object.keys(DOCUMENT_CODEC_LIMITS) as (keyof DocumentCodecLimits)[])(
    'enforces the %s budget in both directions',
    (key) => {
      const f = historyFixture();
      const limits = { [key]: 1 };
      rejected(wire(f.redone.checkpoint), f.context, 'resource-limit', limits);
      expect(
        encodeDocument(f.redone.checkpoint, f.context, limits),
      ).toMatchObject({ status: 'not-encoded', reason: 'resource-limit' });
    },
  );
  it('rejects raising hard caps, noninteger limits, and oversized bytes before parsing', () => {
    const f = fixture();
    for (const maxBytes of [
      0,
      -1,
      1.5,
      Infinity,
      NaN,
      DOCUMENT_CODEC_LIMITS.maxBytes + 1,
    ])
      rejected(wire(f.checkpoint), f.context, 'resource-limit', { maxBytes });
    rejected(
      new Uint8Array(DOCUMENT_CODEC_LIMITS.maxBytes + 1),
      f.context,
      'resource-limit',
    );
    rejected(bytes('['.repeat(66)), f.context, 'resource-limit');
    const giant = withPayload(
      f,
      'x'.repeat(DOCUMENT_CODEC_LIMITS.maxStringLength + 1),
    );
    rejected(wire(giant), f.context, 'resource-limit');
  });

  it.each(
    [
      undefined,
      () => 1,
      Symbol('data'),
      1n,
      new Date(),
      new Map(),
      NaN,
      Infinity,
      -Infinity,
      -0,
      '\ud800',
      new Array(2),
    ].map((v) => [v]),
  )('refuses nonrepresentable opaque value %#', (payload) => {
    const f = fixture();
    expect(encodeDocument(withPayload(f, payload), f.context)).toMatchObject({
      status: 'not-encoded',
      reason: 'corrupt',
    });
  });
  it('never invokes accessors or toJSON and refuses cycles, symbol keys and silent field loss', () => {
    const f = fixture();
    let calls = 0;
    const getter = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get() {
        calls++;
        return 1;
      },
    });
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const hidden = Object.defineProperty({}, 'secret', { value: 1 });
    const extra = Object.assign([1], { extra: 2 });
    const toJSON = {
      toJSON() {
        calls++;
        return {};
      },
    };
    for (const payload of [
      getter,
      cyclic,
      hidden,
      extra,
      toJSON,
      { [Symbol('key')]: 1 },
      JSON.parse('{"__proto__":{}}'),
    ])
      expect(encodeDocument(withPayload(f, payload), f.context)).toMatchObject({
        status: 'not-encoded',
        reason: 'corrupt',
      });
    expect(calls).toBe(0);
    expect(Object.hasOwn(getter, 'secret')).toBe(true);
    expect(cyclic.self).toBe(cyclic);
  });
});
