import { isExactVersion } from './definition-checks.js';
import { fail } from './codec-json.js';
import type { Json, Path } from './codec-json.js';
import type { DocumentCheckpoint } from './document-session-contracts.js';

type Check = (v: Json, p: Path) => void;
const string: Check = (v, p) => {
  if (typeof v !== 'string') fail('codec.shape', p, 'Expected a string.');
};
const text: Check = (v, p) => {
  string(v, p);
  if (!(v as string).trim())
    fail('codec.shape', p, 'Expected a nonblank identity.');
};
const number: Check = (v, p) => {
  if (typeof v !== 'number') fail('codec.shape', p, 'Expected a number.');
};
const index: Check = (v, p) => {
  number(v, p);
  if (!Number.isSafeInteger(v) || (v as number) < 0)
    fail('codec.shape', p, 'Expected a nonnegative safe integer.');
};
const bool: Check = (v, p) => {
  if (typeof v !== 'boolean') fail('codec.shape', p, 'Expected a boolean.');
};
const version: Check = (v, p) => {
  string(v, p);
  if (!isExactVersion(v as string))
    fail(
      'codec.version-pin',
      p,
      'Persist exact versions, never ranges, tags or wildcards.',
    );
};
const literal =
  (...values: readonly (string | number | boolean | null)[]): Check =>
  (v, p) => {
    if (!values.includes(v as string))
      fail('codec.shape', p, 'Unexpected discriminator or literal value.');
  };
export function record(v: Json, p: Path): Record<string, Json> {
  if (v === null || typeof v !== 'object' || Array.isArray(v))
    return fail('codec.shape', p, 'Expected an object.');
  return v;
}
function object(
  required: Record<string, Check>,
  optional: Record<string, Check> = {},
): Check {
  return (v, p) => {
    const r = record(v, p);
    for (const k of Object.keys(r))
      if (!Object.hasOwn(required, k) && !Object.hasOwn(optional, k))
        fail(
          'codec.unknown-field',
          [...p, k],
          'Unexpected field in the supported envelope schema; no data is silently discarded.',
        );
    for (const [k, check] of Object.entries(required)) {
      if (!Object.hasOwn(r, k))
        fail('codec.shape', [...p, k], 'Required field is missing.');
      check(r[k], [...p, k]);
    }
    for (const [k, check] of Object.entries(optional))
      if (Object.hasOwn(r, k)) check(r[k], [...p, k]);
  };
}
const array =
  (check: Check): Check =>
  (v, p) => {
    if (!Array.isArray(v)) fail('codec.shape', p, 'Expected an array.');
    (v as Json[]).forEach((item, i) => check(item, [...p, i]));
  };
const dictionary =
  (check: Check): Check =>
  (v, p) => {
    for (const [k, value] of Object.entries(record(v, p)))
      check(value, [...p, k]);
  };
const tagged =
  (key: string, variants: Record<string, Check>): Check =>
  (v, p) => {
    const r = record(v, p);
    const tag = r[key];
    if (typeof tag !== 'string' || !Object.hasOwn(variants, tag))
      fail('codec.shape', [...p, key], 'Unknown or missing discriminator.');
    variants[tag as string](v, p);
  };
const scalar: Check = (v, p) => {
  if (v !== null && !['string', 'number', 'boolean'].includes(typeof v))
    fail('codec.shape', p, 'Expected a JSON scalar.');
};

/** Every path consumed by typed validators is checked, including historical request/effect payloads. */
export function checkpointShape(value: Json, path: Path): DocumentCheckpoint {
  const root = record(value, path);
  const snapshot = record(root.snapshot, [...path, 'snapshot']);
  const model = record(snapshot.model, [...path, 'snapshot', 'model']);
  text(model.id, [...path, 'snapshot', 'model', 'id']);
  const modelId = literal(model.id as string);
  const pack = object({ id: text, version, contractVersion: version });
  const typeRef = (kind: string) =>
    object({ kind: literal(kind), pack, id: text });
  const ref = (kind: string) =>
    kind === 'model'
      ? object({ kind: literal(kind), id: modelId })
      : object({ kind: literal(kind), modelId, id: text });
  const elementRef = ref('element');
  const memberRef = ref('member');
  const relationRef = ref('relationship');
  const entityRef = tagged('kind', {
    model: ref('model'),
    element: elementRef,
    member: memberRef,
    relationship: relationRef,
  });
  const subject = tagged('kind', {
    element: elementRef,
    member: memberRef,
    relationship: relationRef,
  });
  const propertySubject = tagged('kind', {
    element: elementRef,
    member: memberRef,
  });
  const modelValue: Check = (v, p) =>
    tagged('kind', {
      scalar: object({ kind: literal('scalar'), value: scalar }),
      reference: object({ kind: literal('reference'), value: entityRef }),
      list: object({ kind: literal('list'), items: array(modelValue) }),
      record: object({
        kind: literal('record'),
        fields: dictionary(modelValue),
      }),
    })(v, p);
  const properties = dictionary(modelValue);
  const element = object({
    id: text,
    type: text,
    name: string,
    container: tagged('kind', { model: ref('model'), element: elementRef }),
    properties,
  });
  const member = object({
    id: text,
    type: text,
    name: string,
    owner: elementRef,
    properties,
  });
  const relation = object({
    id: text,
    type: text,
    source: elementRef,
    target: elementRef,
    properties,
  });
  const profileRef = object({ id: text, version });
  const profile = object({
    id: text,
    version,
    selections: array(
      object({
        dimension: literal(
          'abstraction',
          'method',
          'processing-architecture',
          'provenance',
          'target',
        ),
        pack,
      }),
    ),
  });
  const viewRef = object({ modelId, id: text });
  const occurrenceId = object({
    kind: literal('element-occurrence', 'connector-occurrence'),
    id: text,
  });
  const endpoint = object({
    kind: literal('element-occurrence'),
    view: viewRef,
    id: text,
  });
  const point = object({ x: number, y: number });
  const bounds = object({
    x: number,
    y: number,
    width: number,
    height: number,
  });
  const overrides = object(
    {},
    Object.fromEntries(
      [
        'shape',
        'icon',
        'fillToken',
        'strokeToken',
        'textToken',
        'lineStyle',
        'sourceMarker',
        'targetMarker',
      ].map((k) => [k, string]),
    ),
  );
  const accessibility = object({ label: string }, { description: string });
  const elementOccurrence = object({
    kind: literal('element-occurrence'),
    id: text,
    target: elementRef,
    bounds,
    overrides,
    accessibility,
  });
  const connectorOccurrence = object({
    kind: literal('connector-occurrence'),
    id: text,
    target: relationRef,
    source: endpoint,
    destination: endpoint,
    waypoints: array(point),
    overrides,
    accessibility,
  });
  const occurrence = tagged('kind', {
    'element-occurrence': elementOccurrence,
    'connector-occurrence': connectorOccurrence,
  });
  const view = object({
    modelId,
    id: text,
    name: string,
    elements: array(elementOccurrence),
    connectors: array(connectorOccurrence),
  });
  const notation = object({ pack, id: text, version });
  const binding = object({ view: viewRef, occurrence: occurrenceId, notation });
  const constraint = object({
    subject,
    instance: object({
      definition: object({ pack, id: text }),
      roles: array(
        object({ role: text, group: object({ members: array(memberRef) }) }),
      ),
      parameters: properties,
    }),
  });
  const source = object({ id: text, revision: text });
  const ruleRef = object({
    id: text,
    version,
    operator: object({ id: text, version }),
  });
  const generated = object({ kind: literal('generated'), pack, rule: ruleRef });
  const origin = tagged('kind', {
    generated,
    authored: object({ kind: literal('authored'), actor: text }),
  });
  const target = tagged('kind', {
    member: object({ kind: literal('member'), id: text }),
    property: object({
      kind: literal('property'),
      subject: propertySubject,
      property: text,
    }),
  });
  const state =
    (presentValue: Check): Check =>
    (v, p) => {
      const r = record(v, p);
      (r.present === true
        ? object({ present: literal(true), value: presentValue })
        : object({ present: literal(false) }))(v, p);
    };
  const propertyState = state(modelValue);
  const baseline: Check = (v, p) => {
    object({
      target,
      snapshot: state((sv, sp) => {
        const t = record(record(v, p).target, [...p, 'target']);
        (t.kind === 'member' ? member : modelValue)(sv, sp);
      }),
      origin: generated,
      source,
    })(v, p);
    const b = record(v, p);
    const t = record(b.target, [...p, 'target']);
    const s = record(b.snapshot, [...p, 'snapshot']);
    if (
      t.kind === 'member' &&
      s.present === true &&
      record(s.value, [...p, 'snapshot', 'value']).id !== t.id
    )
      fail(
        'codec.metadata',
        p,
        'A member baseline snapshot must retain its target identity.',
      );
  };
  const defaultRule = object({
    pack,
    rule: ruleRef,
    subjectType: typeRef('element'),
    dependsOn: array(text),
    conflicts: array(text),
    propertyDefaults: bool,
    members: array(
      object({ key: text, type: typeRef('member'), name: string, properties }),
    ),
  });
  const change = tagged('kind', {
    'add-member': object({ kind: literal('add-member'), member }),
    'update-member': object({
      kind: literal('update-member'),
      expected: member,
      member,
    }),
    'set-property': object({
      kind: literal('set-property'),
      subject: propertySubject,
      property: text,
      expected: propertyState,
      value: modelValue,
    }),
  });
  const plan = object({
    id: text,
    modelId,
    expectedRevision: text,
    nextRevision: text,
    source,
    rules: array(defaultRule),
    operations: array(object({ change, origin })),
    baselineUpdates: array(object({ next: baseline }, { expected: baseline })),
  });
  const inverse = tagged('kind', {
    'remove-added-member': object({
      kind: literal('remove-added-member'),
      id: text,
      expected: member,
    }),
    'restore-member': object({
      kind: literal('restore-member'),
      expected: member,
      value: member,
    }),
    'restore-property': object({
      kind: literal('restore-property'),
      subject: propertySubject,
      property: text,
      expected: modelValue,
      value: propertyState,
    }),
  });
  const edits: Record<string, Check> = {};
  for (const [kind, schema] of [
    ['element', element],
    ['member', member],
    ['relationship', relation],
    ['constraint', constraint],
  ] as const) {
    const create = kind === 'constraint' ? 'add-constraint' : `create-${kind}`;
    edits[create] = object({ kind: literal(create), value: schema });
    edits[`replace-${kind}`] = object({
      kind: literal(`replace-${kind}`),
      expected: schema,
      value: schema,
    });
    edits[`remove-${kind}`] = object({
      kind: literal(`remove-${kind}`),
      expected: schema,
    });
  }
  Object.assign(edits, {
    rename: object({
      kind: literal('rename'),
      target: propertySubject,
      expected: string,
      value: string,
    }),
    'set-property': object({
      kind: literal('set-property'),
      target: subject,
      property: text,
      expected: propertyState,
      value: propertyState,
    }),
    'create-view': object({
      kind: literal('create-view'),
      value: view,
      notationBindings: array(binding),
    }),
    'rename-view': object({
      kind: literal('rename-view'),
      view: viewRef,
      expected: string,
      value: string,
    }),
    'remove-view': object({
      kind: literal('remove-view'),
      expected: view,
      expectedNotations: array(binding),
    }),
    'add-occurrence': object({
      kind: literal('add-occurrence'),
      view: viewRef,
      value: occurrence,
      notation,
    }),
    'replace-occurrence': object({
      kind: literal('replace-occurrence'),
      view: viewRef,
      expected: occurrence,
      value: occurrence,
    }),
    'remove-occurrence': object({
      kind: literal('remove-occurrence'),
      view: viewRef,
      expected: occurrence,
      expectedNotation: notation,
    }),
  });
  const edit = tagged('kind', edits);
  const pathPart: Check = (v, p) =>
    typeof v === 'string' ? string(v, p) : index(v, p);
  const location = object(
    {
      modelId,
      section: literal(
        'model',
        'profile',
        'views',
        'constraints',
        'extensions',
        'notationBindings',
        'applied',
        'baselines',
        'command',
      ),
      path: array(pathPart),
    },
    { view: viewRef, occurrence: occurrenceId },
  );
  const review = object({
    operationIndex: index,
    dependents: array(object({ location, resolvedBy: array(index) })),
  });
  const identity = {
    id: text,
    modelId,
    expectedRevision: text,
    nextRevision: text,
    actor: text,
    source,
  };
  const command = tagged('kind', {
    edit: object({
      ...identity,
      kind: literal('edit'),
      edits: array(edit),
      deletionReviews: array(review),
    }),
    'apply-defaults': object({
      ...identity,
      kind: literal('apply-defaults'),
      plan,
    }),
    undo: object(
      { ...identity, kind: literal('undo'), transactionId: text },
      { deletionReviews: array(review) },
    ),
    redo: object(
      { ...identity, kind: literal('redo'), transactionId: text },
      { deletionReviews: array(review) },
    ),
  });
  object({
    snapshot: object({
      model: object({
        formatVersion: literal(2),
        id: modelId,
        revision: text,
        name: string,
        profile: profileRef,
        elements: array(element),
        members: array(member),
        relationships: array(relation),
      }),
      profile,
      views: array(view),
      constraints: array(constraint),
      extensions: array(
        object({
          pack,
          extension: object({ id: text, version }),
          payload: () => {
            /* Already bounded JSON; semantics intentionally opaque. */
          },
        }),
      ),
      notationBindings: array(binding),
      baselines: array(baseline),
      applied: array(
        object({
          plan,
          inverse: array(inverse),
          beforeRevision: text,
          afterRevision: text,
        }),
      ),
    }),
    commands: array(
      object(
        { command, beforeRevision: text, afterRevision: text },
        {
          inverse: array(edit),
          execution: object({
            edits: array(edit),
            baselines: array(
              object({ target }, { before: baseline, after: baseline }),
            ),
          }),
        },
      ),
    ),
  })(value, path);
  // The only cast follows exhaustive outer/nested structural checks; branded IDs remain runtime strings.
  return value as unknown as DocumentCheckpoint;
}
