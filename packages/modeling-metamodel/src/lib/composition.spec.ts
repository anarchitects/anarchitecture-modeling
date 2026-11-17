import { createMemberId, createModelId } from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  inspectExtensionSupport,
  packReference,
  resolveTypeDefinition,
  type ComposedModelingProfile,
  type ConstraintInstance,
  type ExtensionEnvelope,
  type MetamodelDiagnostic,
  type MetamodelResult,
  type ModelingPackDefinition,
  type ModelingProfileDefinition,
  type PackReference,
  type TypeReference,
  type ValueDefinition,
} from '../index.js';

function fixture() {
  const pin: PackReference = {
    id: 'demo-method',
    version: '2.1',
    contractVersion: '1',
  };
  const entity: TypeReference<'element'> = {
    pack: pin,
    kind: 'element',
    id: 'demo:entity',
  };
  const other: TypeReference<'element'> = {
    pack: pin,
    kind: 'element',
    id: 'demo:other',
  };
  const member: TypeReference<'member'> = {
    pack: pin,
    kind: 'member',
    id: 'demo:field',
  };
  const method: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic method',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    types: [
      {
        kind: 'element',
        id: entity.id,
        properties: [
          {
            id: 'demo:state',
            required: true,
            value: {
              kind: 'scalar',
              valueType: 'string',
              permittedValues: ['draft', 'reviewed'],
            },
            defaultValue: { kind: 'scalar', value: 'draft' },
          },
          {
            id: 'demo:references',
            required: false,
            value: {
              kind: 'list',
              cardinality: { min: 1, max: 3 },
              items: {
                kind: 'reference',
                target: { kind: 'member', types: [member] },
              },
            },
          },
          {
            id: 'demo:details',
            required: false,
            value: {
              kind: 'record',
              fields: [
                {
                  id: 'demo:weight',
                  required: true,
                  value: { kind: 'scalar', valueType: 'number' },
                },
              ],
            },
          },
        ],
        constraints: [{ pack: pin, id: 'demo:group-rule' }],
      },
      { kind: 'element', id: other.id, properties: [], constraints: [] },
      {
        kind: 'member',
        id: member.id,
        owners: [entity],
        properties: [],
        constraints: [],
      },
      {
        kind: 'relationship',
        id: 'demo:links',
        properties: [],
        constraints: [],
        endpointPairs: [
          {
            source: { role: 'demo:source', types: [entity] },
            target: { role: 'demo:target', types: [other] },
          },
          {
            source: { role: 'demo:source', types: [other] },
            target: { role: 'demo:target', types: [entity] },
          },
        ],
      },
    ],
    constraints: [
      {
        id: 'demo:group-rule',
        mandatory: true,
        roles: [
          {
            id: 'demo:group',
            memberTypes: [member],
            cardinality: { min: 2, max: null },
            ordered: true,
            distinct: true,
          },
        ],
        rule: {
          id: 'demo:rule',
          version: '3',
          operator: { id: 'demo:operator', version: '4' },
        },
      },
    ],
    extensions: [{ id: 'demo:annotation', version: '5' }],
  };
  const processing: ModelingPackDefinition = {
    id: 'demo-processing',
    version: '7',
    contractVersion: '1',
    displayName: 'Synthetic processing architecture',
    implementation: 'scaffold',
    dimensions: ['processing-architecture'],
    requires: [pin],
    conflicts: [],
    types: [],
    constraints: [],
    extensions: [],
  };
  const profile: ModelingProfileDefinition = {
    id: 'demo-profile',
    version: '9',
    selections: [
      { dimension: 'processing-architecture', pack: packReference(processing) },
      { dimension: 'method', pack: pin },
    ],
  };
  return { pin, entity, member, method, processing, profile };
}

function success(
  result: MetamodelResult<ComposedModelingProfile>,
): ComposedModelingProfile {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

function failure(
  result: MetamodelResult<unknown>,
  code: MetamodelDiagnostic['code'],
) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a composition failure');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      path: expect.any(String),
      message: expect.any(String),
    }),
  );
}

describe('exact, additive profile composition', () => {
  it('keeps target kinds and permitted scalar values distinct at the type boundary', () => {
    expectTypeOf<TypeReference<'member'>>().not.toMatchTypeOf<
      TypeReference<'element'>
    >();
    expectTypeOf<
      Extract<
        ValueDefinition,
        { kind: 'scalar'; valueType: 'string' }
      >['permittedValues']
    >().toEqualTypeOf<readonly string[] | undefined>();
  });
  it('composes separate dimensions deterministically without mutating inputs', () => {
    const { method, processing, profile, entity } = fixture();
    const before = JSON.stringify({ method, processing, profile });
    const a = success(composeModelingProfile(profile, [processing, method]));
    const b = success(
      composeModelingProfile(
        { ...profile, selections: [...profile.selections].reverse() },
        [method, processing],
      ),
    );
    expect(a).toEqual(b);
    expect(a.packs.map((pack) => pack.id)).toEqual([
      'demo-method',
      'demo-processing',
    ]);
    expect(a.profile.version).toBe('9');
    expect(a.packs[0].version).toBe('2.1');
    expect(a.packs[0].contractVersion).toBe('1');
    expect(a.packs[0].constraints[0].rule).toEqual({
      id: 'demo:rule',
      version: '3',
      operator: { id: 'demo:operator', version: '4' },
    });
    expect(resolveTypeDefinition(a, entity)).toEqual({
      ok: true,
      value: method.types[0],
    });
    expect(JSON.stringify({ method, processing, profile })).toBe(before);
    expect(method.types[0].properties[0].defaultValue).toEqual({
      kind: 'scalar',
      value: 'draft',
    });
  });

  it('retains allowed endpoint pairs and ordered role groups as explicit contracts', () => {
    const { method, processing, profile, pin } = fixture();
    const composition = success(
      composeModelingProfile(profile, [method, processing]),
    );
    const relation = resolveTypeDefinition(composition, {
      pack: pin,
      kind: 'relationship',
      id: 'demo:links',
    });
    expect(relation.ok).toBe(true);
    if (!relation.ok || relation.value.kind !== 'relationship')
      throw new Error('Missing relationship');
    expect(
      relation.value.endpointPairs.map((pair) => [
        pair.source.types[0].id,
        pair.target.types[0].id,
      ]),
    ).toEqual([
      ['demo:entity', 'demo:other'],
      ['demo:other', 'demo:entity'],
    ]);
    const instance: ConstraintInstance = {
      definition: { pack: pin, id: 'demo:group-rule' },
      roles: [
        {
          role: 'demo:group',
          group: {
            members: ['second', 'first'].map((id) => ({
              kind: 'member',
              modelId: createModelId('model'),
              id: createMemberId(id),
            })),
          },
        },
      ],
      parameters: {},
    };
    expect(
      instance.roles[0].group.members.map((reference) => reference.id),
    ).toEqual(['second', 'first']);
    expect(composition.packs[0].constraints[0]).toMatchObject({
      mandatory: true,
      roles: [
        { ordered: true, distinct: true, cardinality: { min: 2, max: null } },
      ],
    });
  });

  it('rejects a missing exact pack version rather than selecting another version', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(profile, [
        { ...method, version: '2.2' },
        processing,
      ]),
      'missing-pack',
    );
  });
  it('rejects duplicate pack registrations', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(profile, [method, method, processing]),
      'duplicate-pack',
    );
  });
  it.each(['latest', '^2.1', '*', '2.x', ' 2.1'])(
    'rejects unpinned version %s',
    (version) => {
      const { method, processing, profile } = fixture();
      failure(
        composeModelingProfile(
          {
            ...profile,
            selections: [
              {
                dimension: 'method',
                pack: { ...packReference(method), version },
              },
            ],
          },
          [method, processing],
        ),
        'invalid-definition',
      );
    },
  );
  it('rejects unsupported requested and registered contract versions', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(profile, [
        { ...method, contractVersion: '2' },
        processing,
      ]),
      'incompatible-contract',
    );
    failure(
      composeModelingProfile(
        {
          ...profile,
          selections: [
            {
              dimension: 'method',
              pack: { ...packReference(method), contractVersion: '2' },
            },
          ],
        },
        [method],
      ),
      'incompatible-contract',
    );
  });
  it('requires explicit selection of dependencies and respects declared conflicts', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(
        { ...profile, selections: [profile.selections[0]] },
        [method, processing],
      ),
      'incompatible-profile',
    );
    failure(
      composeModelingProfile(profile, [
        method,
        { ...processing, conflicts: [packReference(method)] },
      ]),
      'incompatible-profile',
    );
  });
  it('rejects duplicate dimensions and unsupported dimension assignments', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(
        {
          ...profile,
          selections: [...profile.selections, profile.selections[1]],
        },
        [method, processing],
      ),
      'incompatible-profile',
    );
    failure(
      composeModelingProfile(
        {
          ...profile,
          selections: [{ dimension: 'target', pack: packReference(method) }],
        },
        [method],
      ),
      'incompatible-profile',
    );
  });
  it('allows the same exact pack in two declared dimensions but not two pack versions', () => {
    const { method, profile } = fixture();
    const shared: ModelingPackDefinition = {
      ...method,
      dimensions: ['method', 'abstraction'],
    };
    const selections: ModelingProfileDefinition['selections'] = [
      { dimension: 'method', pack: packReference(shared) },
      { dimension: 'abstraction', pack: packReference(shared) },
    ];
    expect(
      success(composeModelingProfile({ ...profile, selections }, [shared]))
        .packs,
    ).toHaveLength(1);
    const other = { ...shared, version: '3' };
    failure(
      composeModelingProfile(
        {
          ...profile,
          selections: [
            selections[0],
            { dimension: 'abstraction', pack: packReference(other) },
          ],
        },
        [shared, other],
      ),
      'incompatible-profile',
    );
  });
  it('never weakens a mandatory rule through a later conflicting definition', () => {
    const { method, processing, profile } = fixture();
    const weakening = {
      ...processing,
      constraints: [{ ...method.constraints[0], mandatory: false }],
    };
    failure(
      composeModelingProfile(profile, [method, weakening]),
      'duplicate-definition',
    );
    failure(
      composeModelingProfile(
        { ...profile, selections: [...profile.selections].reverse() },
        [weakening, method],
      ),
      'duplicate-definition',
    );
  });
  it('rejects type-ID collisions even when the owning packs differ', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(profile, [
        method,
        { ...processing, types: [method.types[1]] },
      ]),
      'duplicate-definition',
    );
  });
  it('diagnoses missing type and constraint definitions', () => {
    const { method, processing, profile } = fixture();
    failure(
      composeModelingProfile(profile, [
        {
          ...method,
          types: method.types.filter((type) => type.kind !== 'member'),
        },
        processing,
      ]),
      'missing-definition',
    );
    failure(
      composeModelingProfile(profile, [
        { ...method, constraints: [] },
        processing,
      ]),
      'missing-definition',
    );
  });
  it('rejects invalid names, cardinalities and duplicate property/role definitions', () => {
    const { method, processing, profile } = fixture();
    const malformed: ModelingPackDefinition = {
      ...method,
      types: [
        {
          ...method.types[0],
          id: ':missing-namespace',
          properties: [
            method.types[0].properties[0],
            method.types[0].properties[0],
          ],
        },
        ...method.types.slice(1),
      ],
      constraints: [
        {
          ...method.constraints[0],
          roles: [
            {
              ...method.constraints[0].roles[0],
              cardinality: { min: 3, max: 2 },
            },
            method.constraints[0].roles[0],
          ],
        },
      ],
    };
    const result = composeModelingProfile(profile, [malformed, processing]);
    failure(result, 'invalid-definition');
    failure(result, 'duplicate-definition');
  });
  it('rejects cyclic inline schemas instead of recursing forever', () => {
    const { method, processing, profile } = fixture();
    const cyclic: {
      kind: 'record';
      fields: { id: 'demo:loop'; required: boolean; value: ValueDefinition }[];
    } = { kind: 'record', fields: [] };
    cyclic.fields.push({ id: 'demo:loop', required: false, value: cyclic });
    failure(
      composeModelingProfile(profile, [
        {
          ...method,
          types: [
            {
              ...method.types[0],
              properties: [
                { id: 'demo:cycle', required: false, value: cyclic },
              ],
            },
            ...method.types.slice(1),
          ],
        },
        processing,
      ]),
      'invalid-definition',
    );
  });
  it('does not fall back across type kind, pack or contract versions', () => {
    const { method, processing, profile, entity } = fixture();
    const composition = success(
      composeModelingProfile(profile, [method, processing]),
    );
    failure(
      resolveTypeDefinition(composition, { ...entity, kind: 'member' }),
      'missing-definition',
    );
    failure(
      resolveTypeDefinition(composition, {
        ...entity,
        pack: { ...entity.pack, version: '3' },
      }),
      'missing-definition',
    );
    failure(
      resolveTypeDefinition(composition, {
        ...entity,
        pack: { ...entity.pack, contractVersion: '2' },
      }),
      'missing-definition',
    );
  });
});

describe('opaque extension support', () => {
  it('reports registered support without claiming payload validation', () => {
    const { method, processing, profile } = fixture();
    const envelope: ExtensionEnvelope = {
      pack: packReference(method),
      extension: method.extensions[0],
      payload: { arbitrary: ['preserve', 1] },
    };
    const result = inspectExtensionSupport(
      envelope,
      success(composeModelingProfile(profile, [method, processing])),
    );
    expect(result).toEqual({
      status: 'supported',
      semanticValidation: 'not-performed',
      envelope,
    });
    expect(result.envelope).toBe(envelope);
  });
  it.each(['pack', 'contract', 'extension', 'version'])(
    'preserves unknown %s data without interpretation',
    (unknown) => {
      const { method, processing, profile } = fixture();
      const envelope: ExtensionEnvelope = {
        pack: {
          ...packReference(method),
          ...(unknown === 'pack' ? { version: '999' } : {}),
          ...(unknown === 'contract' ? { contractVersion: '999' } : {}),
        },
        extension: {
          ...method.extensions[0],
          ...(unknown === 'extension' ? { id: 'unknown:data' as const } : {}),
          ...(unknown === 'version' ? { version: '999' } : {}),
        },
        get payload() {
          throw new Error('Opaque payload must not be read');
        },
      };
      const result = inspectExtensionSupport(
        envelope,
        success(composeModelingProfile(profile, [method, processing])),
      );
      expect(result.status).toBe('unsupported');
      expect(result.semanticValidation).toBe('not-performed');
      expect(result.envelope).toBe(envelope);
    },
  );
});
