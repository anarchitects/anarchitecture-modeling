import {
  createElementId,
  createMemberId,
  createModel,
  type ElementReference,
  type MemberReference,
  type ModelProperties,
  type ModelValue,
} from '@anarchitects/modeling-core';
import {
  MEMBER_GROUP_OPERATOR,
  PROFILE_DIMENSIONS,
  composeModelingProfile,
  packReference,
  resolveTypeDefinition,
  validateModel,
  type ConstraintBinding,
  type ExtensionEnvelope,
  type ModelValidationInput,
  type ModelingPackDefinition,
  type ProfileDimension,
  type PropertyDefinition,
} from '../index.js';

/** Five test-owned packs. Selection order is never policy override authority. */
function medallionFixture() {
  const base = createModel(
    'silver-customer',
    'Synthetic Silver customer model',
    { id: 'silver-normalized-proof', version: '1' },
  );
  const emptyPack = (
    id: string,
    dimension: ProfileDimension,
  ): ModelingPackDefinition => ({
    id,
    version: '1',
    contractVersion: '1',
    displayName: id,
    implementation: 'scaffold',
    dimensions: [dimension],
    requires: [],
    conflicts: [],
    types: [],
    constraints: [],
    extensions: [],
  });
  const logical = emptyPack('logical-abstraction', 'abstraction');
  const normalized = emptyPack('normalized-method', 'method');
  const medallion = emptyPack(
    'medallion-processing',
    'processing-architecture',
  );
  const provenance = emptyPack('observed-provenance', 'provenance');
  const target = emptyPack('declared-target', 'target');
  const methodPin = packReference(normalized),
    processingPin = packReference(medallion);
  const tableType = {
    kind: 'element' as const,
    id: 'norm:table' as const,
    pack: methodPin,
  };
  const keyType = {
    kind: 'member' as const,
    id: 'norm:key-field' as const,
    pack: methodPin,
  };
  const layerType = {
    kind: 'element' as const,
    id: 'med:layer' as const,
    pack: processingPin,
  };
  const checkType = {
    kind: 'member' as const,
    id: 'med:quality-check' as const,
    pack: processingPin,
  };
  const keyDefinition = {
    id: 'norm:key-required' as const,
    mandatory: true,
    rule: {
      id: 'norm:key-shape' as const,
      version: '1',
      operator: MEMBER_GROUP_OPERATOR,
    },
    roles: [
      {
        id: 'norm:key-fields' as const,
        memberTypes: [keyType],
        cardinality: { min: 1, max: 1 },
        ordered: true,
        distinct: true,
      },
    ],
  };
  const qualityDefinition = {
    id: 'med:quality-required' as const,
    mandatory: true,
    rule: {
      id: 'med:quality-shape' as const,
      version: '1',
      operator: MEMBER_GROUP_OPERATOR,
    },
    roles: [
      {
        id: 'med:checks' as const,
        memberTypes: [checkType],
        cardinality: { min: 1, max: 1 },
        ordered: false,
        distinct: true,
      },
    ],
  };
  const stringProperty = (
    id: `${string}:${string}`,
    values?: string[],
  ): PropertyDefinition => ({
    id,
    required: true,
    value: {
      kind: 'scalar',
      valueType: 'string',
      ...(values && { permittedValues: values }),
    },
  });
  const tableReference: PropertyDefinition['value'] = {
    kind: 'reference',
    target: { kind: 'element', types: [tableType] },
  };
  const method: ModelingPackDefinition = {
    ...normalized,
    constraints: [keyDefinition],
    types: [
      {
        kind: 'element',
        id: tableType.id,
        properties: [],
        constraints: [{ pack: methodPin, id: keyDefinition.id }],
      },
      {
        kind: 'member',
        id: keyType.id,
        owners: [tableType],
        properties: [],
        constraints: [],
      },
    ],
  };
  const processing: ModelingPackDefinition = {
    ...medallion,
    requires: [methodPin],
    constraints: [qualityDefinition],
    types: [
      {
        kind: 'element',
        id: layerType.id,
        constraints: [{ pack: processingPin, id: qualityDefinition.id }],
        properties: [
          stringProperty('med:stage', ['silver']),
          stringProperty('med:responsibility', [
            'validated-conformed-observations',
          ]),
          {
            id: 'med:datasets',
            required: true,
            value: {
              kind: 'list',
              items: tableReference,
              cardinality: { min: 1, max: 1 },
            },
          },
          stringProperty('med:promotion', ['owner-review-required']),
          {
            id: 'med:retention-days',
            required: true,
            value: {
              kind: 'scalar',
              valueType: 'number',
              permittedValues: [90],
            },
          },
          stringProperty('med:replay', ['pinned-source-snapshot']),
          stringProperty('med:execution', ['intent-only']),
        ],
      },
      {
        kind: 'member',
        id: checkType.id,
        owners: [layerType],
        constraints: [],
        properties: [
          stringProperty('med:operator', ['required-field-present']),
          stringProperty('med:on-failure', ['quarantine']),
          { id: 'med:dataset', required: true, value: tableReference },
          {
            id: 'med:field',
            required: true,
            value: {
              kind: 'reference',
              target: { kind: 'member', types: [keyType] },
            },
          },
        ],
      },
    ],
  };
  const observed: ModelingPackDefinition = {
    ...provenance,
    requires: [methodPin],
    types: [
      {
        kind: 'element',
        id: 'prov:observation',
        constraints: [],
        properties: [
          { id: 'prov:subject', required: true, value: tableReference },
          stringProperty('prov:source-id'),
          stringProperty('prov:source-revision'),
          stringProperty('prov:interpretation', ['unapproved-observation']),
        ],
      },
    ],
  };
  const capabilities: ModelingPackDefinition = {
    ...target,
    types: [
      {
        kind: 'element',
        id: 'target:capabilities',
        constraints: [],
        properties: [
          stringProperty('target:status', ['declared-not-probed']),
          {
            id: 'target:snapshot-read',
            required: true,
            value: {
              kind: 'scalar',
              valueType: 'boolean',
              permittedValues: [true],
            },
          },
          {
            id: 'target:atomic-write',
            required: true,
            value: {
              kind: 'scalar',
              valueType: 'boolean',
              permittedValues: [true],
            },
          },
        ],
      },
    ],
  };
  const element = (id: string): ElementReference => ({
    kind: 'element',
    modelId: base.id,
    id: createElementId(id),
  });
  const table = element('customer'),
    layer = element('silver'),
    observation = element('observation'),
    targetIntent = element('target-intent');
  const key: MemberReference = {
    kind: 'member',
    modelId: base.id,
    id: createMemberId('customer-id'),
  };
  const check: MemberReference = {
    ...key,
    id: createMemberId('quality:customer-id-present'),
  };
  const scalar = (value: string | number | boolean): ModelValue => ({
    kind: 'scalar',
    value,
  });
  const layerProperties: ModelProperties = {
    'med:stage': scalar('silver'),
    'med:responsibility': scalar('validated-conformed-observations'),
    'med:datasets': {
      kind: 'list',
      items: [{ kind: 'reference', value: table }],
    },
    'med:promotion': scalar('owner-review-required'),
    'med:retention-days': scalar(90),
    'med:replay': scalar('pinned-source-snapshot'),
    'med:execution': scalar('intent-only'),
  };
  const constraints: ConstraintBinding[] = [
    {
      subject: table,
      instance: {
        definition: { pack: methodPin, id: keyDefinition.id },
        parameters: {},
        roles: [{ role: keyDefinition.roles[0].id, group: { members: [key] } }],
      },
    },
    {
      subject: layer,
      instance: {
        definition: { pack: processingPin, id: qualityDefinition.id },
        parameters: {},
        roles: [
          { role: qualityDefinition.roles[0].id, group: { members: [check] } },
        ],
      },
    },
  ];
  const registry = [logical, method, processing, observed, capabilities];
  const input: ModelValidationInput = {
    model: {
      ...base,
      elements: [
        {
          id: table.id,
          type: tableType.id,
          name: 'Customer',
          container: { kind: 'model', id: base.id },
          properties: {},
        },
        {
          id: layer.id,
          type: layerType.id,
          name: 'Silver responsibilities',
          container: { kind: 'model', id: base.id },
          properties: layerProperties,
        },
        {
          id: observation.id,
          type: 'prov:observation',
          name: 'Observed Customer source',
          container: { kind: 'model', id: base.id },
          properties: {
            'prov:subject': { kind: 'reference', value: table },
            'prov:source-id': scalar('synthetic:customer-feed'),
            'prov:source-revision': scalar('snapshot-7'),
            'prov:interpretation': scalar('unapproved-observation'),
          },
        },
        {
          id: targetIntent.id,
          type: 'target:capabilities',
          name: 'Required target capabilities',
          container: { kind: 'model', id: base.id },
          properties: {
            'target:status': scalar('declared-not-probed'),
            'target:snapshot-read': scalar(true),
            'target:atomic-write': scalar(true),
          },
        },
      ],
      members: [
        {
          id: key.id,
          type: keyType.id,
          name: 'Customer ID',
          owner: table,
          properties: {},
        },
        {
          id: check.id,
          type: checkType.id,
          name: 'Required Customer ID',
          owner: layer,
          properties: {
            'med:operator': scalar('required-field-present'),
            'med:on-failure': scalar('quarantine'),
            'med:dataset': { kind: 'reference', value: table },
            'med:field': { kind: 'reference', value: key },
          },
        },
      ],
    },
    profile: {
      ...base.profile,
      selections: registry.map((pack) => ({
        dimension: pack.dimensions[0],
        pack: packReference(pack),
      })),
    },
    registry,
    constraints,
    rules: [
      { pack: methodPin, rule: keyDefinition.rule },
      { pack: processingPin, rule: qualityDefinition.rule },
    ],
  };
  return {
    input,
    method,
    processing,
    observed,
    capabilities,
    tableType,
    table,
    layer,
    key,
    check,
    constraints,
    layerProperties,
  };
}

function expectInvalid(input: ModelValidationInput, code: string) {
  const result = validateModel(input);
  expect(result.status).toBe('invalid');
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code }));
  return result;
}

function withLayer(
  input: ModelValidationInput,
  properties: ModelProperties,
): ModelValidationInput {
  return {
    ...input,
    model: {
      ...input.model,
      elements: input.model.elements.map((e) =>
        e.type === 'med:layer' ? { ...e, properties } : e,
      ),
    },
  };
}

describe('ADR 0002 proof 6: independent method and processing dimensions', () => {
  it('composes all five dimensions deterministically and leaves normalized method intent intact', () => {
    const { input, method, processing, tableType, table, layer } =
      medallionFixture();
    const before = structuredClone(input);
    const first = composeModelingProfile(input.profile, input.registry);
    const reordered = composeModelingProfile(
      { ...input.profile, selections: [...input.profile.selections].reverse() },
      [...input.registry].reverse(),
    );
    expect(first).toEqual(reordered);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('Expected composed profile');
    expect(first.value.profile.selections.map((s) => s.dimension)).toEqual(
      PROFILE_DIMENSIONS,
    );
    expect(first.value.packs.map((p) => p.id)).toEqual([
      'logical-abstraction',
      'normalized-method',
      'medallion-processing',
      'observed-provenance',
      'declared-target',
    ]);
    expect(resolveTypeDefinition(first.value, tableType)).toEqual({
      ok: true,
      value: method.types[0],
    });
    expect(first.value.packs.find((p) => p.id === method.id)).toEqual(method);
    expect(first.value.packs.find((p) => p.id === processing.id)).toEqual(
      processing,
    );
    expect(validateModel(input).status).toBe('valid');
    const dataset = input.model.elements.find((e) => e.id === table.id);
    const silver = input.model.elements.find((e) => e.id === layer.id);
    if (!dataset || !silver) throw new Error('Missing fixture dataset/layer');
    expect(dataset.type).toBe('norm:table');
    expect(dataset.container).toEqual({ kind: 'model', id: input.model.id });
    expect(silver.properties['med:datasets']).toEqual({
      kind: 'list',
      items: [{ kind: 'reference', value: table }],
    });
    expect(input).toEqual(before);
  });

  it('keeps quality, promotion, retention and replay as explicit intent without executing policies', () => {
    const { input, check, layerProperties } = medallionFixture();
    const before = structuredClone(input.model);
    expect(validateModel(input).status).toBe('valid');
    expect(layerProperties).toMatchObject({
      'med:promotion': { kind: 'scalar', value: 'owner-review-required' },
      'med:retention-days': { kind: 'scalar', value: 90 },
      'med:replay': { kind: 'scalar', value: 'pinned-source-snapshot' },
      'med:execution': { kind: 'scalar', value: 'intent-only' },
    });
    expect(
      input.model.members.find((m) => m.id === check.id)?.properties,
    ).toMatchObject({
      'med:operator': { kind: 'scalar', value: 'required-field-present' },
      'med:on-failure': { kind: 'scalar', value: 'quarantine' },
    });
    expect(input.model).toEqual(before);
    expect(input.model.revision).toBe('0');
  });

  it.each(['med:promotion', 'med:retention-days', 'med:replay'] as const)(
    'rejects missing %s policy intent rather than inferring it from Silver',
    (key) => {
      const { input, layerProperties } = medallionFixture();
      const properties = Object.fromEntries(
        Object.entries(layerProperties).filter(([id]) => id !== key),
      );
      const result = expectInvalid(
        withLayer(input, properties),
        'validation.required-property',
      );
      expect(
        result.diagnostics.some((d) => d.location.path.includes(key)),
      ).toBe(true);
    },
  );

  it.each([0, 1])(
    'retains mandatory constraint %s across method/processing composition',
    (index) => {
      const { input, constraints } = medallionFixture();
      const result = expectInvalid(
        { ...input, constraints: constraints.filter((_, i) => i !== index) },
        'validation.missing-constraint',
      );
      expect(
        result.diagnostics.some(
          (d) =>
            d.provenance?.constraint?.id ===
            constraints[index].instance.definition.id,
        ),
      ).toBe(true);
    },
  );

  it('rejects a dangling dataset or quality-field reference without dropping policy intent', () => {
    const { input, layerProperties, key } = medallionFixture();
    const missing: ElementReference = {
      kind: 'element',
      modelId: input.model.id,
      id: createElementId('missing'),
    };
    const result = validateModel(
      withLayer(input, {
        ...layerProperties,
        'med:datasets': {
          kind: 'list',
          items: [{ kind: 'reference', value: missing }],
        },
      }),
    );
    expect(result.status).toBe('invalid');
    expect(
      result.diagnostics.some((d) => d.location.path.includes('med:datasets')),
    ).toBe(true);
    const removed = validateModel({
      ...input,
      model: {
        ...input.model,
        members: input.model.members.filter((m) => m.id !== key.id),
      },
    });
    expect(removed.status).toBe('invalid');
    expect(
      removed.diagnostics.some((d) => d.location.path.includes('med:field')),
    ).toBe(true);
    expect(
      removed.diagnostics.some(
        (d) => d.provenance?.constraint?.id === 'norm:key-required',
      ),
    ).toBe(true);
  });

  it('rejects policy values outside this fixture, including automatic promotion or execution', () => {
    const { input, layerProperties } = medallionFixture();
    for (const [key, value] of [
      ['med:promotion', 'automatic'],
      ['med:retention-days', -1],
      ['med:replay', 'unversioned-latest'],
      ['med:execution', 'run-now'],
    ] as const)
      expectInvalid(
        withLayer(input, {
          ...layerProperties,
          [key]: { kind: 'scalar', value },
        }),
        'validation.scalar-value',
      );
  });

  it('requires explicit method selection and exact version compatibility', () => {
    const { input, method } = medallionFixture();
    const missingMethod = composeModelingProfile(
      {
        ...input.profile,
        selections: input.profile.selections.filter(
          (s) => s.dimension !== 'method',
        ),
      },
      input.registry,
    );
    expect(missingMethod.ok).toBe(false);
    if (missingMethod.ok) throw new Error('Expected a missing dependency');
    expect(missingMethod.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'incompatible-profile',
        path: expect.stringContaining('.requires'),
      }),
    );
    const wrongVersion = composeModelingProfile(
      input.profile,
      input.registry.map((p) =>
        p.id === method.id ? { ...p, version: '2' } : p,
      ),
    );
    expect(wrongVersion.ok).toBe(false);
    if (wrongVersion.ok) throw new Error('Expected a missing exact version');
    expect(wrongVersion.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing-pack' }),
    );
  });

  it.each([false, true])(
    'rejects a mandatory-rule weakening regardless of selection order (reversed=%s)',
    (reverse) => {
      const { input, method, processing } = medallionFixture();
      const weakening = {
        ...processing,
        constraints: [
          ...processing.constraints,
          { ...method.constraints[0], mandatory: false },
        ],
      };
      const selections = reverse
        ? [...input.profile.selections].reverse()
        : input.profile.selections;
      const registry = input.registry.map((p) =>
        p.id === processing.id ? weakening : p,
      );
      const result = composeModelingProfile(
        { ...input.profile, selections },
        reverse ? registry.reverse() : registry,
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Mandatory rules cannot be overwritten');
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'duplicate-definition',
          path: 'constraints',
          message: expect.stringContaining('norm:key-required'),
        }),
      );
      expect(method.constraints[0].mandatory).toBe(true);
    },
  );

  it('rejects declared incompatible target policy without choosing a winning pack', () => {
    const { input, processing, capabilities } = medallionFixture();
    const incompatible = {
      ...capabilities,
      conflicts: [packReference(processing)],
    };
    const result = composeModelingProfile(
      input.profile,
      input.registry.map((p) => (p.id === capabilities.id ? incompatible : p)),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected declared policy conflict');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'incompatible-profile',
        path: `packs.${capabilities.id}@1.conflicts`,
      }),
    );
  });

  it('rejects replacing the method dimension with a layer label', () => {
    const { input, processing } = medallionFixture();
    const result = composeModelingProfile(
      {
        ...input.profile,
        selections: input.profile.selections.map((s) =>
          s.dimension === 'method'
            ? { ...s, pack: packReference(processing) }
            : s,
        ),
      },
      input.registry,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('A layer cannot stand in for the method');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'incompatible-profile',
        path: 'profile.selections.method',
      }),
    );
  });

  it('preserves unknown extension data alongside valid definitions with unsupported semantics', () => {
    const { input, processing } = medallionFixture();
    const payload = {
      vendor: 'synthetic',
      lineage: ['snapshot-7'],
      flags: { reviewed: false },
    };
    const before = structuredClone(payload);
    const envelope: ExtensionEnvelope = {
      pack: packReference(processing),
      extension: { id: 'vendor:quality-evidence', version: '9' },
      payload,
    };
    const result = validateModel({ ...input, extensions: [envelope] });
    expect(result.status).toBe('unsupported');
    expect(result.structure).toBe('valid');
    expect(result.semantics).toBe('partial');
    expect(result.extensions[0]).toMatchObject({
      status: 'unsupported',
      semanticValidation: 'not-performed',
    });
    expect(result.extensions[0].envelope).toBe(envelope);
    expect(result.extensions[0].envelope.payload).toBe(payload);
    expect(payload).toEqual(before);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'validation.unsupported-extension',
        severity: 'warning',
      }),
    );
    expect(validateModel(input).status).toBe('valid');
  });

  it('never reads unknown payloads, and registration alone still does not validate payload semantics', () => {
    const { input, processing } = medallionFixture();
    const extension = { id: 'vendor:quality-evidence' as const, version: '9' };
    const envelope: ExtensionEnvelope = {
      pack: packReference(processing),
      extension,
      get payload() {
        throw new Error('Opaque evidence must not be read');
      },
    };
    for (const registered of [false, true]) {
      const result = validateModel({
        ...input,
        extensions: [envelope],
        registry: input.registry.map((p) =>
          p.id === processing.id && registered
            ? { ...p, extensions: [extension] }
            : p,
        ),
      });
      expect(result.status).toBe('unsupported');
      expect(result.extensions[0].status).toBe(
        registered ? 'supported' : 'unsupported',
      );
      expect(result.extensions[0].semanticValidation).toBe('not-performed');
      expect(result.extensions[0].envelope).toBe(envelope);
      expect(result.diagnostics[0].code).toBe(
        registered
          ? 'validation.unvalidated-extension'
          : 'validation.unsupported-extension',
      );
    }
  });
});
