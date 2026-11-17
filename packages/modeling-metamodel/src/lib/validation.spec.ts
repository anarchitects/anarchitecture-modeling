import {
  createModel,
  createElementId,
  createMemberId,
  createRelationshipId,
  validateModelStructure,
  validateModelValue,
  type ModelDocument,
  type ModelValue,
  type ElementReference,
  type MemberReference,
} from '@anarchitects/modeling-core';
import {
  MEMBER_GROUP_OPERATOR,
  validateModel,
  type ModelValidationInput,
  type ModelingPackDefinition,
  type ConstraintBinding,
  type PropertyDefinition,
  type ModelValidationResult,
  type ExtensionEnvelope,
} from '../index.js';

function fixture() {
  const modelBase = createModel('model', 'Validation example', {
    id: 'example-profile',
    version: '1',
  });
  const owner: ElementReference = {
    kind: 'element',
    modelId: modelBase.id,
    id: createElementId('table'),
  };
  const other: ElementReference = { ...owner, id: createElementId('other') };
  const first: MemberReference = {
    kind: 'member',
    modelId: modelBase.id,
    id: createMemberId('first'),
  };
  const second: MemberReference = { ...first, id: createMemberId('second') };
  const outsider: MemberReference = {
    ...first,
    id: createMemberId('outsider'),
  };
  const pin = { id: 'example', version: '2', contractVersion: '1' };
  const table = {
    pack: pin,
    kind: 'element' as const,
    id: 'example:table' as const,
  };
  const otherType = { ...table, id: 'example:other' as const };
  const memberType = {
    pack: pin,
    kind: 'member' as const,
    id: 'example:field' as const,
  };
  const rule = {
    id: 'example:key-members' as const,
    version: '3',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const properties: readonly PropertyDefinition[] = [
    {
      id: 'example:status',
      required: true,
      value: {
        kind: 'scalar',
        valueType: 'string',
        permittedValues: ['draft', 'reviewed'],
      },
      defaultValue: { kind: 'scalar', value: 'draft' },
    },
    {
      id: 'example:weights',
      required: false,
      value: {
        kind: 'list',
        items: { kind: 'scalar', valueType: 'number' },
        cardinality: { min: 1, max: 2 },
      },
    },
    {
      id: 'example:parent',
      required: false,
      value: { kind: 'reference', target: { kind: 'element', types: [table] } },
    },
    {
      id: 'example:details',
      required: false,
      value: {
        kind: 'record',
        fields: [
          {
            id: 'example:enabled',
            required: true,
            value: { kind: 'scalar', valueType: 'boolean' },
          },
        ],
      },
    },
  ];
  const constraint = { pack: pin, id: 'example:key' as const };
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Example',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    types: [
      { kind: 'element', id: table.id, properties, constraints: [constraint] },
      { kind: 'element', id: otherType.id, properties: [], constraints: [] },
      {
        kind: 'member',
        id: memberType.id,
        owners: [table, otherType],
        properties: [],
        constraints: [],
      },
      {
        kind: 'relationship',
        id: 'example:connects',
        properties: [],
        constraints: [],
        endpointPairs: [
          {
            source: { role: 'example:source', types: [table] },
            target: { role: 'example:target', types: [otherType] },
          },
        ],
      },
    ],
    constraints: [
      {
        id: constraint.id,
        mandatory: true,
        rule,
        roles: [
          {
            id: 'example:columns',
            memberTypes: [memberType],
            cardinality: { min: 2, max: 2 },
            ordered: true,
            distinct: true,
          },
        ],
      },
    ],
    extensions: [{ id: 'example:annotation', version: '1' }],
  };
  const model: ModelDocument = {
    ...modelBase,
    elements: [
      {
        id: owner.id,
        type: table.id,
        name: 'Table',
        container: { kind: 'model', id: modelBase.id },
        properties: { 'example:status': { kind: 'scalar', value: 'draft' } },
      },
      {
        id: other.id,
        type: otherType.id,
        name: 'Other',
        container: owner,
        properties: {},
      },
    ],
    members: [first, second, outsider].map((reference, index) => ({
      id: reference.id,
      type: memberType.id,
      name: reference.id,
      owner: index === 2 ? other : owner,
      properties: {},
    })),
    relationships: [
      {
        id: createRelationshipId('relation'),
        type: 'example:connects',
        source: owner,
        target: other,
        properties: {},
      },
    ],
  };
  const binding: ConstraintBinding = {
    subject: owner,
    instance: {
      definition: constraint,
      roles: [{ role: 'example:columns', group: { members: [second, first] } }],
      parameters: {},
    },
  };
  const input: ModelValidationInput = {
    model,
    profile: {
      ...model.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    registry: [pack],
    constraints: [binding],
    rules: [{ pack: pin, rule }],
  };
  return {
    input,
    model,
    pack,
    owner,
    other,
    first,
    second,
    outsider,
    binding,
    properties,
  };
}

function expectError(result: ModelValidationResult, code: string) {
  expect(result.status).toBe('invalid');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      severity: 'error',
      message: expect.any(String),
      location: expect.objectContaining({
        modelId: 'model',
        path: expect.any(Array),
      }),
    }),
  );
}

function withProperties(
  input: ModelValidationInput,
  properties: ModelDocument['elements'][number]['properties'],
): ModelValidationInput {
  return {
    ...input,
    model: {
      ...input.model,
      elements: [
        { ...input.model.elements[0], properties },
        ...input.model.elements.slice(1),
      ],
    },
  };
}

describe('structural and pinned semantic validation', () => {
  it('validates a constrained model deterministically without changing it or sorting ordered roles', () => {
    const { input } = fixture();
    const before = JSON.stringify(input);
    const result = validateModel(input);
    expect(result).toEqual({
      status: 'valid',
      structure: 'valid',
      semantics: 'complete',
      diagnostics: [],
      extensions: [],
    });
    expect(validateModel(input)).toEqual(result);
    expect(JSON.stringify(input)).toBe(before);
    expect(
      input.constraints?.[0].instance.roles[0].group.members.map((m) => m.id),
    ).toEqual(['second', 'first']);
  });

  it('preserves references across entity/member rename and collection reorder', () => {
    const { input, model } = fixture();
    const renamed = {
      ...model,
      elements: model.elements
        .map((e) => ({ ...e, name: 'Renamed' }))
        .reverse(),
      members: model.members.map((m) => ({ ...m, name: 'Renamed' })).reverse(),
    };
    expect(validateModel({ ...input, model: renamed }).status).toBe('valid');
  });

  it('locates a deleted member through the dependent composite constraint with rule provenance', () => {
    const { input, model } = fixture();
    const result = validateModel({
      ...input,
      model: {
        ...model,
        members: model.members.filter((m) => m.id !== 'second'),
      },
    });
    expectError(result, 'model.missing-reference');
    expect(result.structure).toBe('invalid');
    expect(result.semantics).toBe('not-run');
    expect(result.diagnostics[0]).toMatchObject({
      location: {
        entity: input.constraints?.[0].subject,
        path: ['constraints', 0, 'instance', 'roles', 0, 'group', 'members', 0],
      },
      provenance: {
        pack: input.registry[0] && {
          id: 'example',
          version: '2',
          contractVersion: '1',
        },
        rule: { id: 'example:key-members', version: '3' },
      },
    });
  });

  it('rejects duplicate identities and ambiguous relationship endpoints', () => {
    const { input, model } = fixture();
    const result = validateModel({
      ...input,
      model: { ...model, elements: [...model.elements, model.elements[0]] },
    });
    expectError(result, 'model.duplicate-id');
    expectError(result, 'model.ambiguous-reference');
  });

  it('rejects wrong-kind, missing and foreign ownership references', () => {
    const { input, model, first } = fixture();
    for (const owner of [
      first,
      undefined,
      {
        ...model.members[0].owner,
        modelId: createModel('foreign', 'Foreign', model.profile).id,
      },
    ]) {
      const invalid = {
        ...model,
        members: [{ ...model.members[0], owner }, ...model.members.slice(1)],
      } as ModelDocument;
      const result = validateModel({ ...input, model: invalid });
      expect(result.structure).toBe('invalid');
      expect(
        result.diagnostics.some((d) =>
          [
            'model.wrong-reference-kind',
            'model.invalid-reference',
            'model.foreign-reference',
          ].includes(d.code),
        ),
      ).toBe(true);
    }
  });

  it('detects containment cycles and dangling relationship endpoints', () => {
    const { input, model, other } = fixture();
    expectError(
      validateModel({
        ...input,
        model: {
          ...model,
          elements: [
            { ...model.elements[0], container: other },
            model.elements[1],
          ],
        },
      }),
      'model.containment-cycle',
    );
    expectError(
      validateModel({
        ...input,
        model: {
          ...model,
          relationships: [
            {
              ...model.relationships[0],
              target: { ...other, id: createElementId('missing') },
            },
          ],
        },
      }),
      'model.missing-reference',
    );
  });

  it.each([NaN, Infinity, undefined, { unexpected: true }])(
    'rejects invalid scalar shape %j before semantic checks',
    (value) => {
      const { input } = fixture();
      const result = validateModel(
        withProperties(input, {
          'example:status': { kind: 'scalar', value } as ModelValue,
        }),
      );
      expectError(result, 'model.invalid-value');
      expect(result.semantics).toBe('not-run');
    },
  );

  it('rejects cyclic, malformed and sparse structured values without recursion failure', () => {
    const { model } = fixture();
    const cycle: { kind: 'list'; items: unknown[] } = {
      kind: 'list',
      items: [],
    };
    cycle.items.push(cycle);
    const location = { modelId: model.id, path: ['value'] };
    expect(validateModelValue(model, cycle, location)[0].code).toBe(
      'model.cyclic-value',
    );
    for (const value of [
      { kind: 'list', items: new Array(1) },
      { kind: 'record', fields: null },
      { kind: 'scalar', value: true, hidden: 'not supported' },
      { kind: 'mystery' },
    ])
      expect(validateModelValue(model, value, location).length).toBeGreaterThan(
        0,
      );
  });

  it('requires properties even when a default exists and does not insert defaults', () => {
    const { input } = fixture();
    const missing = withProperties(input, {});
    expectError(validateModel(missing), 'validation.required-property');
    expect(missing.model.elements[0].properties).toEqual({});
    expectError(
      validateModel(
        withProperties(input, {
          'example:status': { kind: 'scalar', value: 'unknown' },
        }),
      ),
      'validation.scalar-value',
    );
  });

  it('checks nested records, list cardinality, allowed reference types and unsupported properties', () => {
    const { input, other } = fixture();
    const cases = [
      [
        { 'example:weights': { kind: 'list', items: [] } },
        'validation.cardinality',
      ],
      [
        { 'example:details': { kind: 'record', fields: {} } },
        'validation.required-property',
      ],
      [
        { 'example:parent': { kind: 'reference', value: other } },
        'validation.reference-target',
      ],
      [
        { 'example:unknown': { kind: 'scalar', value: 'x' } },
        'validation.unsupported-property',
      ],
      [
        { 'example:status': { kind: 'record', fields: {} } },
        'validation.value-type',
      ],
    ] as const;
    for (const [properties, code] of cases)
      expectError(
        validateModel(
          withProperties(input, {
            ...input.model.elements[0].properties,
            ...properties,
          }),
        ),
        code,
      );
  });

  it('checks default proposals against their schemas without applying them', () => {
    const { input, pack, properties } = fixture();
    const invalidPack = {
      ...pack,
      types: [
        {
          ...pack.types[0],
          properties: [
            {
              ...properties[0],
              defaultValue: { kind: 'scalar' as const, value: 42 },
            },
          ],
        },
        ...pack.types.slice(1),
      ],
    };
    const result = validateModel({ ...input, registry: [invalidPack] });
    expectError(result, 'validation.scalar-value');
    expect(result.diagnostics[0].location.path).toContain('defaultValue');
    expect(result.structure).toBe('valid');
  });

  it('rejects incompatible profiles and missing definitions without implicit fallback', () => {
    const { input, model } = fixture();
    expectError(
      validateModel({ ...input, registry: [] }),
      'profile.missing-pack',
    );
    expectError(
      validateModel({
        ...input,
        registry: [...input.registry, ...input.registry],
      }),
      'profile.duplicate-pack',
    );
    expectError(
      validateModel({ ...input, profile: { ...input.profile, version: '2' } }),
      'validation.profile-mismatch',
    );
    expectError(
      validateModel({
        ...input,
        model: {
          ...model,
          elements: [
            { ...model.elements[0], type: 'example:missing' },
            model.elements[1],
          ],
        },
      }),
      'validation.missing-type',
    );
  });

  it('enforces allowed member owner types and relationship pairs', () => {
    const { input, model, pack } = fixture();
    expectError(
      validateModel({
        ...input,
        model: {
          ...model,
          relationships: [
            {
              ...model.relationships[0],
              source: model.relationships[0].target,
              target: model.relationships[0].source,
            },
          ],
        },
      }),
      'validation.endpoint-pair',
    );
    const member = pack.types[2];
    if (member.kind !== 'member') throw new Error('Expected member');
    expectError(
      validateModel({
        ...input,
        registry: [
          {
            ...pack,
            types: pack.types.map((type) =>
              type === member
                ? { ...member, owners: [member.owners[0]] }
                : type,
            ),
          },
        ],
      }),
      'validation.owner-type',
    );
  });

  it('enforces mandatory constraints, role cardinality and distinct grouped references', () => {
    const { input, binding, first } = fixture();
    expectError(
      validateModel({ ...input, constraints: [] }),
      'validation.missing-constraint',
    );
    for (const members of [[first], [first, first]]) {
      const changed = {
        ...binding,
        instance: {
          ...binding.instance,
          roles: [{ ...binding.instance.roles[0], group: { members } }],
        },
      };
      expectError(
        validateModel({ ...input, constraints: [changed] }),
        members.length === 1
          ? 'validation.role-cardinality'
          : 'validation.duplicate-member',
      );
    }
    expectError(
      validateModel({
        ...input,
        constraints: [
          { ...binding, instance: { ...binding.instance, roles: [] } },
        ],
      }),
      'validation.missing-role',
    );
    expectError(
      validateModel({
        ...input,
        constraints: [
          {
            ...binding,
            instance: {
              ...binding.instance,
              roles: [...binding.instance.roles, ...binding.instance.roles],
            },
          },
        ],
      }),
      'validation.duplicate-role',
    );
  });

  it('executes the bounded owner check and reports exact pack/rule provenance', () => {
    const { input, binding, first, outsider } = fixture();
    const changed = {
      ...binding,
      instance: {
        ...binding.instance,
        roles: [
          {
            ...binding.instance.roles[0],
            group: { members: [first, outsider] },
          },
        ],
      },
    };
    const result = validateModel({ ...input, constraints: [changed] });
    expectError(result, 'validation.member-owner');
    expect(
      result.diagnostics.find((d) => d.code === 'validation.member-owner')
        ?.provenance?.rule?.operator,
    ).toEqual(MEMBER_GROUP_OPERATOR);
  });

  it('does not claim rule semantics when an exact registration/operator is unsupported', () => {
    const { input } = fixture();
    const registered = input.rules ?? [];
    const registration = registered[0];
    if (!registration) throw new Error('Expected rule registration');
    for (const rules of [
      [],
      [{ ...registration, rule: { ...registration.rule, version: '4' } }],
    ]) {
      const result = validateModel({ ...input, rules });
      expect(result).toMatchObject({
        status: 'unsupported',
        structure: 'valid',
        semantics: 'partial',
      });
      expect(result.diagnostics[0].code).toBe('validation.unsupported-rule');
    }
    expectError(
      validateModel({ ...input, rules: [...registered, ...registered] }),
      'validation.duplicate-rule',
    );
  });

  it('reports unsupported parameters instead of ignoring their meaning', () => {
    const { input, binding } = fixture();
    expect(
      validateModel({
        ...input,
        constraints: [
          {
            ...binding,
            instance: {
              ...binding.instance,
              parameters: {
                'example:unknown': { kind: 'scalar', value: true },
              },
            },
          },
        ],
      }),
    ).toMatchObject({ status: 'unsupported', semantics: 'partial' });
  });

  it('keeps a registered unknown operator unsupported', () => {
    const { input, pack } = fixture();
    const definition = pack.constraints[0];
    const rule = {
      ...definition.rule,
      operator: { id: 'example:unimplemented' as const, version: '1' },
    };
    const result = validateModel({
      ...input,
      registry: [{ ...pack, constraints: [{ ...definition, rule }] }],
      rules: [
        {
          pack: {
            id: pack.id,
            version: pack.version,
            contractVersion: pack.contractVersion,
          },
          rule,
        },
      ],
    });
    expect(result).toMatchObject({
      status: 'unsupported',
      semantics: 'partial',
    });
    expect(result.diagnostics[0].code).toBe('validation.unsupported-rule');
  });

  it('does not allow a Cartesian-product endpoint combination across separate pairs', () => {
    const { input, pack, model } = fixture();
    const relationship = pack.types[3];
    if (relationship.kind !== 'relationship')
      throw new Error('Expected relationship definition');
    const pair = relationship.endpointPairs[0];
    const changed = {
      ...relationship,
      endpointPairs: [pair, { source: pair.target, target: pair.source }],
    };
    const result = validateModel({
      ...input,
      registry: [
        {
          ...pack,
          types: pack.types.map((type) =>
            type === relationship ? changed : type,
          ),
        },
      ],
      model: {
        ...model,
        relationships: [
          { ...model.relationships[0], target: model.relationships[0].source },
        ],
      },
    });
    expectError(result, 'validation.endpoint-pair');
  });

  it('preserves opaque envelopes even when structural validation fails', () => {
    const { input, model } = fixture();
    const envelope: ExtensionEnvelope = {
      pack: { id: 'unknown', version: '1', contractVersion: '1' },
      extension: { id: 'example:data', version: '1' },
      get payload() {
        throw new Error('Do not read');
      },
    };
    const result = validateModel({
      ...input,
      model: { ...model, elements: [...model.elements, model.elements[0]] },
      extensions: [envelope],
    });
    expect(result).toMatchObject({ status: 'invalid', semantics: 'not-run' });
    expect(result.extensions[0].envelope).toBe(envelope);
  });

  it('preserves known and unknown extension payloads without reading or validating them', () => {
    const { input } = fixture();
    const known: ExtensionEnvelope = {
      pack: { id: 'example', version: '2', contractVersion: '1' },
      extension: { id: 'example:annotation', version: '1' },
      get payload() {
        throw new Error('Payload must remain opaque');
      },
    };
    const unknown: ExtensionEnvelope = {
      pack: known.pack,
      extension: { id: 'example:unknown', version: '9' },
      get payload() {
        throw new Error('Payload must remain opaque');
      },
    };
    const result = validateModel({ ...input, extensions: [known, unknown] });
    expect(result).toMatchObject({
      status: 'unsupported',
      structure: 'valid',
      semantics: 'partial',
    });
    expect(result.extensions.map((extension) => extension.status)).toEqual([
      'supported',
      'unsupported',
    ]);
    expect(
      result.extensions.every(
        (extension) => extension.semanticValidation === 'not-performed',
      ),
    ).toBe(true);
    expect(result.extensions[0].envelope).toBe(known);
    expect(result.extensions[1].envelope).toBe(unknown);
  });

  it('keeps a plain semantic model structurally valid without claiming method validation', () => {
    const { model } = fixture();
    expect(validateModelStructure(model)).toEqual({
      valid: true,
      diagnostics: [],
    });
  });
});
