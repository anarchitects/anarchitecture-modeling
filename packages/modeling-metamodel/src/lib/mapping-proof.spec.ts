import {
  createElementId,
  createMemberId,
  createModel,
  createModelRevision,
  type ElementReference,
  type MemberReference,
  type ModelDocument,
  type ModelEntityReference,
  type ModelProperties,
  type ModelValue,
} from '@anarchitects/modeling-core';
import {
  validateModel,
  type ModelValidationInput,
  type ModelingPackDefinition,
  type PropertyDefinition,
  type ValueDefinition,
  type ValidationDiagnostic,
} from '../index.js';

// This entire vocabulary and inspector are test-owned. No runtime method API is exported.
const pin = { id: 'mapping-proof', version: '1', contractVersion: '1' };
const sourceType = {
  pack: pin,
  kind: 'element' as const,
  id: 'map:source' as const,
};
const conceptType = { ...sourceType, id: 'map:concept' as const };
const sourceFieldType = {
  pack: pin,
  kind: 'member' as const,
  id: 'map:source-field' as const,
};
const businessFieldType = {
  ...sourceFieldType,
  id: 'map:business-field' as const,
};
const transformationId = createElementId('customer-resolution');
const rule = {
  id: 'map:review-two-source-intent' as const,
  version: '1',
  operator: { id: 'map:fixture-inspector' as const, version: '1' },
};

interface Operand {
  role: string;
  field: MemberReference;
}
interface Mapping {
  id: string;
  target: MemberReference;
  operator: string;
  operands: readonly Operand[];
  nullPolicy: string;
}
interface MappingProof {
  readonly snapshot: ModelDocument;
  readonly inputs: readonly {
    role: string;
    structure: ElementReference;
    sourceId: string;
    revision: string;
    precedence: number;
  }[];
  readonly output: { role: string; structure: ElementReference };
  readonly join: {
    operator: string;
    operands: readonly Operand[];
    nullPolicy: string;
  };
  readonly mappings: readonly Mapping[];
  readonly unmapped: readonly { field: MemberReference; reason: string }[];
  readonly ambiguity: readonly {
    target: MemberReference;
    reason: string;
    policy: string;
  }[];
  readonly assumptions: readonly string[];
  readonly provenance: {
    author: string;
    decision: string;
    revision: string;
    ruleVersion: string;
  };
}
const scalar = (value: string | number): ModelValue => ({
  kind: 'scalar',
  value,
});
const ref = (value: ModelEntityReference): ModelValue => ({
  kind: 'reference',
  value,
});
const record = (fields: ModelProperties): ModelValue => ({
  kind: 'record',
  fields,
});
const list = (items: readonly ModelValue[]): ModelValue => ({
  kind: 'list',
  items,
});
const property = (
  id: `map:${string}`,
  value: ValueDefinition,
): PropertyDefinition => ({ id, required: true, value });
const string = (permittedValues?: string[]): ValueDefinition => ({
  kind: 'scalar',
  valueType: 'string',
  ...(permittedValues && { permittedValues }),
});
const fields = (...fields: PropertyDefinition[]): ValueDefinition => ({
  kind: 'record',
  fields,
});
const items = (
  items: ValueDefinition,
  min: number,
  max: number,
): ValueDefinition => ({ kind: 'list', items, cardinality: { min, max } });
const sourceRef: ValueDefinition = {
  kind: 'reference',
  target: { kind: 'element', types: [sourceType] },
};
const conceptRef: ValueDefinition = {
  kind: 'reference',
  target: { kind: 'element', types: [conceptType] },
};
const sourceFieldRef: ValueDefinition = {
  kind: 'reference',
  target: { kind: 'member', types: [sourceFieldType] },
};
const businessFieldRef: ValueDefinition = {
  kind: 'reference',
  target: { kind: 'member', types: [businessFieldType] },
};
const operandSchema = fields(
  property('map:role', string(['primary', 'secondary'])),
  property('map:field', sourceFieldRef),
);
const pack: ModelingPackDefinition = {
  ...pin,
  displayName: 'Synthetic joint mapping',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    {
      kind: 'element',
      id: sourceType.id,
      constraints: [],
      properties: [
        property('map:source-id', string()),
        property('map:revision', string()),
      ],
    },
    { kind: 'element', id: conceptType.id, constraints: [], properties: [] },
    {
      kind: 'member',
      id: sourceFieldType.id,
      owners: [sourceType],
      constraints: [],
      properties: [property('map:source-field-id', string())],
    },
    {
      kind: 'member',
      id: businessFieldType.id,
      owners: [conceptType],
      constraints: [],
      properties: [],
    },
    {
      kind: 'element',
      id: 'map:transformation',
      constraints: [],
      properties: [
        property(
          'map:intent',
          fields(
            property(
              'map:inputs',
              items(
                fields(
                  property('map:role', string(['primary', 'secondary'])),
                  property('map:structure', sourceRef),
                  property('map:source-id', string()),
                  property('map:revision', string()),
                  property('map:precedence', {
                    kind: 'scalar',
                    valueType: 'number',
                  }),
                ),
                2,
                2,
              ),
            ),
            property(
              'map:output',
              fields(
                property('map:role', string(['business-concept'])),
                property('map:structure', conceptRef),
              ),
            ),
            property(
              'map:join',
              fields(
                property('map:operator', string(['equal'])),
                property('map:operands', items(operandSchema, 2, 2)),
                property('map:null-policy', string(['null-does-not-match'])),
              ),
            ),
            property(
              'map:mappings',
              items(
                fields(
                  property('map:trace-id', string()),
                  property('map:target', businessFieldRef),
                  property('map:operator', string(['first-non-null'])),
                  property('map:operands', items(operandSchema, 2, 2)),
                  property('map:null-policy', string(['all-null-is-error'])),
                ),
                2,
                2,
              ),
            ),
            property(
              'map:unmapped',
              items(
                fields(
                  property('map:field', sourceFieldRef),
                  property('map:reason', string()),
                ),
                0,
                20,
              ),
            ),
            property(
              'map:ambiguity',
              items(
                fields(
                  property('map:target', businessFieldRef),
                  property('map:reason', string()),
                  property(
                    'map:policy',
                    string(['precedence-wins-record-disagreement']),
                  ),
                ),
                1,
                2,
              ),
            ),
            property('map:assumptions', items(string(), 1, 10)),
            property(
              'map:provenance',
              fields(
                property('map:author', string()),
                property('map:decision', string()),
                property('map:revision', string()),
                property('map:rule-version', string(['1'])),
              ),
            ),
          ),
        ),
      ],
    },
  ],
};

function mappingFixture(): MappingProof {
  const empty = createModel('joint-mapping', 'Synthetic customer resolution', {
    id: 'mapping-proof',
    version: '1',
  });
  const element = (id: string): ElementReference => ({
    kind: 'element',
    modelId: empty.id,
    id: createElementId(id),
  });
  const member = (id: string): MemberReference => ({
    kind: 'member',
    modelId: empty.id,
    id: createMemberId(id),
  });
  const crm = element('crm-customer'),
    support = element('support-customer'),
    customer = element('business-customer');
  const crmId = member('crm-id'),
    crmName = member('crm-name'),
    supportId = member('support-id'),
    supportName = member('support-name'),
    supportEmail = member('support-email');
  const businessId = member('business-id'),
    businessName = member('business-name');
  const operand = (role: string, field: MemberReference): Operand => ({
    role,
    field,
  });
  return {
    snapshot: {
      ...empty,
      elements: [
        {
          id: crm.id,
          type: sourceType.id,
          name: 'CRM customer',
          container: { kind: 'model', id: empty.id },
          properties: {
            'map:source-id': scalar('synthetic:crm/customer'),
            'map:revision': scalar('crm-7'),
          },
        },
        {
          id: support.id,
          type: sourceType.id,
          name: 'Support account',
          container: { kind: 'model', id: empty.id },
          properties: {
            'map:source-id': scalar('synthetic:support/account'),
            'map:revision': scalar('support-12'),
          },
        },
        {
          id: customer.id,
          type: conceptType.id,
          name: 'Customer',
          container: { kind: 'model', id: empty.id },
          properties: {},
        },
      ],
      members: [
        ...[crmId, crmName, supportId, supportName, supportEmail].map(
          (field, i) => ({
            id: field.id,
            type: sourceFieldType.id,
            name: field.id,
            owner: i < 2 ? crm : support,
            properties: {
              'map:source-field-id': scalar(`synthetic-field:${field.id}`),
            },
          }),
        ),
        ...[businessId, businessName].map((field) => ({
          id: field.id,
          type: businessFieldType.id,
          name: field.id,
          owner: customer,
          properties: {},
        })),
      ],
    },
    inputs: [
      {
        role: 'primary',
        structure: crm,
        sourceId: 'synthetic:crm/customer',
        revision: 'crm-7',
        precedence: 1,
      },
      {
        role: 'secondary',
        structure: support,
        sourceId: 'synthetic:support/account',
        revision: 'support-12',
        precedence: 2,
      },
    ],
    output: { role: 'business-concept', structure: customer },
    join: {
      operator: 'equal',
      operands: [operand('primary', crmId), operand('secondary', supportId)],
      nullPolicy: 'null-does-not-match',
    },
    mappings: [
      {
        id: 'trace:customer-id',
        target: businessId,
        operator: 'first-non-null',
        operands: [operand('primary', crmId), operand('secondary', supportId)],
        nullPolicy: 'all-null-is-error',
      },
      {
        id: 'trace:customer-name',
        target: businessName,
        operator: 'first-non-null',
        operands: [
          operand('primary', crmName),
          operand('secondary', supportName),
        ],
        nullPolicy: 'all-null-is-error',
      },
    ],
    unmapped: [
      {
        field: supportEmail,
        reason:
          'Support contact address is not approved as a customer address; deliberately omitted.',
      },
    ],
    ambiguity: [
      {
        target: businessName,
        reason:
          'Different non-null names may identify the same customer; CRM wins and disagreement must be retained by a future executor.',
        policy: 'precedence-wins-record-disagreement',
      },
    ],
    assumptions: [
      'Customer identifiers share a namespace across the two synthetic sources.',
      'The joined identifiers are unique in each source; no row evidence is supplied.',
    ],
    provenance: {
      author: 'synthetic-reviewer',
      decision: 'fixture:customer-resolution',
      revision: 'decision-3',
      ruleVersion: '1',
    },
  };
}

function inputFor(proof: MappingProof): ModelValidationInput {
  const operands = (values: readonly Operand[]) =>
    list(
      values.map((o) =>
        record({ 'map:role': scalar(o.role), 'map:field': ref(o.field) }),
      ),
    );
  const intent = record({
    'map:inputs': list(
      proof.inputs.map((input) =>
        record({
          'map:role': scalar(input.role),
          'map:structure': ref(input.structure),
          'map:source-id': scalar(input.sourceId),
          'map:revision': scalar(input.revision),
          'map:precedence': scalar(input.precedence),
        }),
      ),
    ),
    'map:output': record({
      'map:role': scalar(proof.output.role),
      'map:structure': ref(proof.output.structure),
    }),
    'map:join': record({
      'map:operator': scalar(proof.join.operator),
      'map:operands': operands(proof.join.operands),
      'map:null-policy': scalar(proof.join.nullPolicy),
    }),
    'map:mappings': list(
      proof.mappings.map((mapping) =>
        record({
          'map:trace-id': scalar(mapping.id),
          'map:target': ref(mapping.target),
          'map:operator': scalar(mapping.operator),
          'map:operands': operands(mapping.operands),
          'map:null-policy': scalar(mapping.nullPolicy),
        }),
      ),
    ),
    'map:unmapped': list(
      proof.unmapped.map((entry) =>
        record({
          'map:field': ref(entry.field),
          'map:reason': scalar(entry.reason),
        }),
      ),
    ),
    'map:ambiguity': list(
      proof.ambiguity.map((entry) =>
        record({
          'map:target': ref(entry.target),
          'map:reason': scalar(entry.reason),
          'map:policy': scalar(entry.policy),
        }),
      ),
    ),
    'map:assumptions': list(proof.assumptions.map(scalar)),
    'map:provenance': record({
      'map:author': scalar(proof.provenance.author),
      'map:decision': scalar(proof.provenance.decision),
      'map:revision': scalar(proof.provenance.revision),
      'map:rule-version': scalar(proof.provenance.ruleVersion),
    }),
  });
  const model: ModelDocument = {
    ...proof.snapshot,
    elements: [
      ...proof.snapshot.elements,
      {
        id: transformationId,
        type: 'map:transformation',
        name: 'Resolve one customer from two sources',
        container: { kind: 'model', id: proof.snapshot.id },
        properties: { 'map:intent': intent },
      },
    ],
  };
  return {
    model,
    registry: [pack],
    profile: {
      ...model.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
  };
}

/** Fixture-only cross-field review. Neither this nor Foundation evaluates rows/expressions. */
function inspectMapping(proof: MappingProof) {
  const input = inputFor(proof);
  const foundation = validateModel(input);
  const diagnostics: ValidationDiagnostic[] = [...foundation.diagnostics];
  const report = (
    code: string,
    path: (string | number)[],
    message: string,
    severity: 'error' | 'warning' = 'error',
  ) =>
    diagnostics.push({
      code: `fixture.${code}`,
      severity,
      message,
      location: {
        modelId: input.model.id,
        entity: {
          kind: 'element',
          modelId: input.model.id,
          id: transformationId,
        },
        path: ['map:intent', ...path],
      },
      provenance: { pack: pin, rule },
    });
  if (foundation.status !== 'valid') return { foundation, diagnostics };
  const memberFor = (reference: MemberReference) =>
    proof.snapshot.members.find((m) => m.id === reference.id);
  const snapshotScalar = (values: ModelProperties, key: string) => {
    const value = values[key];
    return value?.kind === 'scalar' ? value.value : undefined;
  };
  for (const [index, source] of proof.inputs.entries()) {
    const observed = proof.snapshot.elements.find(
      (e) => e.id === source.structure.id,
    );
    if (
      !observed ||
      snapshotScalar(observed.properties, 'map:source-id') !==
        source.sourceId ||
      snapshotScalar(observed.properties, 'map:revision') !== source.revision
    )
      report(
        'stale-source',
        ['map:inputs', index],
        'Review against the exact source identity and snapshot revision.',
      );
  }
  if (
    new Set(proof.inputs.map((i) => i.role)).size !== 2 ||
    new Set(proof.inputs.map((i) => i.structure.id)).size !== 2 ||
    new Set(proof.inputs.map((i) => i.sourceId)).size !== 2
  )
    report(
      'input-identity',
      ['map:inputs'],
      'Two distinct structures/source identities must occupy distinct roles.',
    );
  const ordered = [...proof.inputs].sort((a, b) => a.precedence - b.precedence);
  if (ordered[0].precedence !== 1 || ordered[1].precedence !== 2)
    report(
      'precedence',
      ['map:inputs'],
      'Assign a unique explicit precedence of 1 and 2.',
    );
  const used = new Set<string>();
  const inspectOperands = (
    operands: readonly Operand[],
    path: (string | number)[],
    orderedMeaning: boolean,
  ) => {
    for (const [index, operand] of operands.entries()) {
      const source = proof.inputs.find((i) => i.role === operand.role);
      if (!source || memberFor(operand.field)?.owner.id !== source.structure.id)
        report(
          'operand-owner',
          [...path, index],
          'The field must belong to its named source role.',
        );
      used.add(operand.field.id);
    }
    if (new Set(operands.map((o) => o.role)).size !== 2)
      report(
        'joint-inputs',
        path,
        'The joint expression must retain both source roles.',
      );
    if (orderedMeaning && operands.some((o, i) => o.role !== ordered[i]?.role))
      report(
        'operand-precedence',
        path,
        'Operand order must agree with reviewed source precedence.',
      );
  };
  inspectOperands(proof.join.operands, ['map:join', 'map:operands'], false);
  const targets = new Set<string>(),
    traceIds = new Set<string>();
  proof.mappings.forEach((mapping, index) => {
    const path = ['map:mappings', index];
    if (
      !mapping.id.trim() ||
      traceIds.has(mapping.id) ||
      targets.has(mapping.target.id)
    )
      report(
        'trace-conflict',
        path,
        'Keep trace identities unique and each target mapped exactly once.',
      );
    traceIds.add(mapping.id);
    targets.add(mapping.target.id);
    if (memberFor(mapping.target)?.owner.id !== proof.output.structure.id)
      report(
        'output-owner',
        path,
        'Map to a field owned by the output concept.',
      );
    inspectOperands(mapping.operands, [...path, 'map:operands'], true);
  });
  for (const field of proof.snapshot.members.filter(
    (m) => m.owner.id === proof.output.structure.id,
  ))
    if (!targets.has(field.id))
      report(
        'unmapped-output',
        ['map:mappings', field.id],
        'Account explicitly for every output field in this fixture.',
      );
  const omitted = new Set<string>();
  proof.unmapped.forEach((entry, index) => {
    const owned = proof.inputs.some(
      (i) => i.structure.id === memberFor(entry.field)?.owner.id,
    );
    if (
      !owned ||
      used.has(entry.field.id) ||
      omitted.has(entry.field.id) ||
      !entry.reason.trim()
    )
      report(
        'unmapped-conflict',
        ['map:unmapped', index],
        'An omitted source field needs one reason and must not also be used.',
      );
    omitted.add(entry.field.id);
    report(
      'information-loss',
      ['map:unmapped', index],
      entry.reason,
      'warning',
    );
  });
  for (const field of proof.snapshot.members.filter((m) =>
    proof.inputs.some((i) => i.structure.id === m.owner.id),
  ))
    if (!used.has(field.id) && !omitted.has(field.id))
      report(
        'unaccounted-source',
        ['map:unmapped', field.id],
        'Preserve an explicit disposition for every source field.',
      );
  proof.ambiguity.forEach((entry, index) => {
    if (!targets.has(entry.target.id) || !entry.reason.trim())
      report(
        'ambiguity-target',
        ['map:ambiguity', index],
        'Tie the ambiguity to a mapped output and explain the unresolved meaning.',
      );
    report('ambiguity', ['map:ambiguity', index], entry.reason, 'warning');
  });
  if (
    proof.assumptions.some((a) => !a.trim()) ||
    Object.values(proof.provenance).some((v) => !v.trim())
  )
    report(
      'review-context',
      ['map:provenance'],
      'Keep nonblank assumptions and decision provenance.',
    );
  return { foundation, diagnostics };
}
const errors = (proof: MappingProof) =>
  inspectMapping(proof).diagnostics.filter((d) => d.severity === 'error');

// These assertions are proof obligations for this fixture, not a general mapping conformance suite.
describe('ADR 0002 proof 3: one joint multi-source transformation', () => {
  it('retains joint roles, bounded expressions, trace identities, assumptions and provenance as schema-checked data', () => {
    const proof = mappingFixture();
    const before = structuredClone(proof);
    const input = inputFor(proof);
    const result = inspectMapping(proof);
    expect(result.foundation.status).toBe('valid');
    expect(errors(proof)).toEqual([]);
    expect(input.model.relationships).toEqual([]);
    expect(
      input.model.elements.filter((e) => e.type === 'map:transformation'),
    ).toHaveLength(1);
    expect(
      proof.inputs.map((i) => [i.role, i.sourceId, i.revision, i.precedence]),
    ).toEqual([
      ['primary', 'synthetic:crm/customer', 'crm-7', 1],
      ['secondary', 'synthetic:support/account', 'support-12', 2],
    ]);
    expect(proof.mappings.map((m) => m.id)).toEqual([
      'trace:customer-id',
      'trace:customer-name',
    ]);
    const intent = input.model.elements.at(-1)?.properties['map:intent'];
    if (intent?.kind !== 'record') throw new Error('Missing joint intent');
    expect(intent.fields['map:inputs']).toMatchObject({
      kind: 'list',
      items: [
        {
          kind: 'record',
          fields: {
            'map:revision': { kind: 'scalar', value: 'crm-7' },
            'map:structure': {
              kind: 'reference',
              value: proof.inputs[0].structure,
            },
          },
        },
        {
          kind: 'record',
          fields: {
            'map:revision': { kind: 'scalar', value: 'support-12' },
            'map:structure': {
              kind: 'reference',
              value: proof.inputs[1].structure,
            },
          },
        },
      ],
    });
    expect(intent.fields['map:provenance']).toMatchObject({
      kind: 'record',
      fields: {
        'map:decision': {
          kind: 'scalar',
          value: 'fixture:customer-resolution',
        },
        'map:revision': { kind: 'scalar', value: 'decision-3' },
        'map:rule-version': { kind: 'scalar', value: '1' },
      },
    });
    // The encoded intent retains every reference and reviewed datum after a data-only round trip.
    expect(JSON.parse(JSON.stringify(input.model))).toEqual(input.model);
    expect(proof).toEqual(before);
  });

  it('reports the deliberately unmapped field and unresolved name ambiguity separately from schema validity', () => {
    const proof = mappingFixture();
    const result = inspectMapping(proof);
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      'fixture.information-loss',
      'fixture.ambiguity',
    ]);
    expect(proof.unmapped[0].field.id).toBe('support-email');
    expect(
      result.diagnostics.every(
        (d) => d.severity === 'warning' && d.provenance?.rule === rule,
      ),
    ).toBe(true);
    expect(result.diagnostics[0].location.path).toEqual([
      'map:intent',
      'map:unmapped',
      0,
    ]);
    expect(
      proof.snapshot.members.some((m) => m.id === proof.unmapped[0].field.id),
    ).toBe(true);
  });

  it('preserves source and trace identities across source/member renames and collection reorder', () => {
    const proof = mappingFixture();
    const renamed = {
      ...proof,
      snapshot: {
        ...proof.snapshot,
        revision: createModelRevision('renamed'),
        elements: proof.snapshot.elements
          .map((e) => ({ ...e, name: `Renamed ${e.name}` }))
          .reverse(),
        members: proof.snapshot.members
          .map((m) => ({ ...m, name: `Renamed ${m.name}` }))
          .reverse(),
      },
    };
    expect(errors(renamed)).toEqual([]);
    expect(inputFor(renamed).model.elements.at(-1)?.properties).toEqual(
      inputFor(proof).model.elements.at(-1)?.properties,
    );
  });

  it('uses explicit precedence even if the input collection is reordered', () => {
    const proof = mappingFixture();
    expect(errors({ ...proof, inputs: [...proof.inputs].reverse() })).toEqual(
      [],
    );
  });

  it('rejects an output field belonging to a different concept of the same type', () => {
    const proof = mappingFixture();
    const other: ElementReference = {
      ...proof.output.structure,
      id: createElementId('other-concept'),
    };
    const changed = {
      ...proof,
      snapshot: {
        ...proof.snapshot,
        elements: [
          ...proof.snapshot.elements,
          {
            id: other.id,
            type: conceptType.id,
            name: 'Other concept',
            container: { kind: 'model' as const, id: proof.snapshot.id },
            properties: {},
          },
        ],
        members: proof.snapshot.members.map((m) =>
          m.id === proof.mappings[0].target.id ? { ...m, owner: other } : m,
        ),
      },
    };
    expect(inspectMapping(changed).foundation.status).toBe('valid');
    expect(errors(changed)).toContainEqual(
      expect.objectContaining({ code: 'fixture.output-owner' }),
    );
  });

  it('requires nonblank review context and reasons for unresolved meaning', () => {
    const proof = mappingFixture();
    expect(
      errors({
        ...proof,
        assumptions: [''],
        provenance: { ...proof.provenance, author: '' },
        unmapped: proof.unmapped.map((u) => ({ ...u, reason: '' })),
        ambiguity: proof.ambiguity.map((a) => ({ ...a, reason: '' })),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'fixture.review-context' }),
        expect.objectContaining({ code: 'fixture.unmapped-conflict' }),
        expect.objectContaining({ code: 'fixture.ambiguity-target' }),
      ]),
    );
  });

  it('exposes every nested trace/join reference when an input field is deleted', () => {
    const proof = mappingFixture();
    const removedId = proof.join.operands[0].field.id;
    const removed = {
      ...proof,
      snapshot: {
        ...proof.snapshot,
        members: proof.snapshot.members.filter((m) => m.id !== removedId),
      },
    };
    const result = inspectMapping(removed);
    expect(result.foundation.status).toBe('invalid');
    expect(result.diagnostics).toHaveLength(2);
    expect(
      result.diagnostics.some((d) => d.location.path.includes('map:join')),
    ).toBe(true);
    expect(
      result.diagnostics.some((d) => d.location.path.includes('map:mappings')),
    ).toBe(true);
    expect(removed.mappings).toBe(proof.mappings);
  });

  it.each(['revision', 'source-id'] as const)(
    'rejects stale %s metadata even when Foundation schema checks pass',
    (failure) => {
      const proof = mappingFixture();
      const changed = {
        ...proof,
        inputs: proof.inputs.map((i, index) =>
          index
            ? i
            : {
                ...i,
                ...(failure === 'revision'
                  ? { revision: 'crm-8' }
                  : { sourceId: 'another-source' }),
              },
        ),
      };
      expect(inspectMapping(changed).foundation.status).toBe('valid');
      expect(errors(changed)).toContainEqual(
        expect.objectContaining({ code: 'fixture.stale-source' }),
      );
    },
  );

  it('rejects tied precedence, reversed operands and duplicate input roles', () => {
    const proof = mappingFixture();
    expect(
      errors({
        ...proof,
        inputs: proof.inputs.map((i) => ({ ...i, precedence: 1 })),
      }),
    ).toContainEqual(expect.objectContaining({ code: 'fixture.precedence' }));
    expect(
      errors({
        ...proof,
        mappings: proof.mappings.map((m) => ({
          ...m,
          operands: [...m.operands].reverse(),
        })),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'fixture.operand-precedence' }),
    );
    expect(
      errors({
        ...proof,
        inputs: proof.inputs.map((i) => ({ ...i, role: 'primary' })),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'fixture.input-identity' }),
    );
  });

  it('rejects losing joint meaning by binding both expression operands to the same role', () => {
    const proof = mappingFixture();
    expect(
      errors({
        ...proof,
        mappings: proof.mappings.map((m) => ({
          ...m,
          operands: m.operands.map((o) => ({ ...o, role: 'primary' })),
        })),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'fixture.operand-owner' }),
        expect.objectContaining({ code: 'fixture.joint-inputs' }),
      ]),
    );
  });

  it('rejects a missing unmapped disposition or marking a used field as omitted', () => {
    const proof = mappingFixture();
    expect(errors({ ...proof, unmapped: [] })).toContainEqual(
      expect.objectContaining({ code: 'fixture.unaccounted-source' }),
    );
    expect(
      errors({
        ...proof,
        unmapped: [
          ...proof.unmapped,
          { field: proof.join.operands[0].field, reason: 'Contradiction' },
        ],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'fixture.unmapped-conflict' }),
    );
  });

  it('rejects conflicting traces and a target from the wrong source/member type', () => {
    const proof = mappingFixture();
    expect(
      errors({ ...proof, mappings: [proof.mappings[0], proof.mappings[0]] }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'fixture.trace-conflict' }),
        expect.objectContaining({ code: 'fixture.unmapped-output' }),
      ]),
    );
    expect(
      errors({
        ...proof,
        mappings: proof.mappings.map((m) => ({
          ...m,
          target: m.operands[0].field,
        })),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'validation.reference-target' }),
    );
  });

  it.each(['operator', 'null-policy'] as const)(
    'rejects unsupported expression %s as data, without evaluation',
    (failure) => {
      const proof = mappingFixture();
      const invalid = {
        ...proof,
        mappings: proof.mappings.map((m) => ({
          ...m,
          ...(failure === 'operator'
            ? { operator: 'script:arbitrary-code' }
            : { nullPolicy: 'guess' }),
        })),
      };
      expect(inspectMapping(invalid).foundation.status).toBe('invalid');
      expect(errors(invalid)).toContainEqual(
        expect.objectContaining({ code: 'validation.scalar-value' }),
      );
    },
  );

  it('does not encode joint intent as unrelated binary edges or allow a one-source substitute', () => {
    const proof = mappingFixture();
    const single = {
      ...proof,
      inputs: [proof.inputs[0]],
      mappings: proof.mappings.map((m) => ({
        ...m,
        operands: [m.operands[0]],
      })),
    };
    expect(errors(single)).toContainEqual(
      expect.objectContaining({ code: 'validation.cardinality' }),
    );
    const input = inputFor(proof);
    expect(input.model.elements.at(-1)?.properties['map:intent'].kind).toBe(
      'record',
    );
    expect(input.model.relationships).toHaveLength(0);
  });
});
