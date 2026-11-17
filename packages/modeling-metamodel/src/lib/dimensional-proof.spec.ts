import {
  createElementId,
  createMemberId,
  createModel,
  createModelRevision,
  type ElementReference,
  type MemberReference,
  type ModelProperties,
} from '@anarchitects/modeling-core';
import {
  MEMBER_GROUP_OPERATOR,
  validateModel,
  type ConstraintBinding,
  type ConstraintDefinition,
  type ModelValidationInput,
  type ModelingPackDefinition,
  type PropertyDefinition,
  type TypeReference,
} from '../index.js';

/** Original fixture-only dimensional intent. No warehouse or method validator is exported. */
function dimensionalFixture() {
  const base = createModel('order-lines', 'Synthetic order-line fact', {
    id: 'dimensional-proof',
    version: '1',
  });
  const pin = { id: 'dimensional-proof', version: '1', contractVersion: '1' };
  const type = <K extends 'element' | 'member'>(
    kind: K,
    id: `dim:${string}`,
  ): TypeReference<K> => ({ kind, id, pack: pin });
  const factType = type('element', 'dim:order-line-fact'),
    dateType = type('element', 'dim:date');
  const grainType = type('member', 'dim:grain-field'),
    measureType = type('member', 'dim:measure');
  const orderType = type('member', 'dim:order-date-role'),
    shipType = type('member', 'dim:ship-date-role');
  const fact: ElementReference = {
    kind: 'element',
    modelId: base.id,
    id: createElementId('fact:order-line'),
  };
  const date: ElementReference = {
    ...fact,
    id: createElementId('dimension:date'),
  };
  const member = (id: string): MemberReference => ({
    kind: 'member',
    modelId: base.id,
    id: createMemberId(id),
  });
  const orderId = member('grain:order-id'),
    lineId = member('grain:line-id');
  const orderDate = member('role:ordered-on'),
    shipDate = member('role:shipped-on'),
    amount = member('measure:net-amount');
  const scalarProperty = (
    id: `dim:${string}`,
    permittedValues?: string[],
  ): PropertyDefinition => ({
    id,
    required: true,
    value: {
      kind: 'scalar',
      valueType: 'string',
      ...(permittedValues && { permittedValues }),
    },
  });
  const roleProperties: PropertyDefinition[] = [
    {
      id: 'dim:dimension',
      required: true,
      value: {
        kind: 'reference',
        target: { kind: 'element', types: [dateType] },
      },
    },
    scalarProperty('dim:missing-date-policy', ['reject-row']),
  ];
  const constraint = (
    id: `dim:${string}`,
    role: `dim:${string}`,
    memberType: TypeReference<'member'>,
    count: number,
  ): ConstraintDefinition => ({
    id,
    mandatory: true,
    rule: { id: `${id}-shape`, version: '1', operator: MEMBER_GROUP_OPERATOR },
    roles: [
      {
        id: role,
        memberTypes: [memberType],
        cardinality: { min: count, max: count },
        distinct: true,
        ordered: true,
      },
    ],
  });
  const definitions = [
    constraint('dim:grain-required', 'dim:grain-fields', grainType, 2),
    constraint('dim:order-date-required', 'dim:order-date', orderType, 1),
    constraint('dim:ship-date-required', 'dim:ship-date', shipType, 1),
    constraint('dim:measure-required', 'dim:measures', measureType, 1),
  ];
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic dimensional intent',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    extensions: [],
    constraints: definitions,
    types: [
      {
        ...factType,
        constraints: definitions.map(({ id }) => ({ id, pack: pin })),
        properties: [scalarProperty('dim:grain', ['one row per order line'])],
      },
      {
        ...dateType,
        constraints: [],
        properties: [
          scalarProperty('dim:history-policy', ['overwrite-calendar-labels']),
          scalarProperty('dim:calendar', ['synthetic-gregorian']),
        ],
      },
      { ...grainType, owners: [factType], constraints: [], properties: [] },
      ...[orderType, shipType].map((type) => ({
        ...type,
        owners: [factType],
        constraints: [],
        properties: roleProperties,
      })),
      {
        ...measureType,
        owners: [factType],
        constraints: [],
        properties: [
          scalarProperty('dim:aggregation', ['sum']),
          scalarProperty('dim:unit', ['EUR']),
          scalarProperty('dim:history-policy', [
            'immutable-transaction-amount',
          ]),
        ],
      },
    ],
  };
  const referenceGroups = [
    [orderId, lineId],
    [orderDate],
    [shipDate],
    [amount],
  ];
  const constraints: ConstraintBinding[] = definitions.map(
    (definition, index) => ({
      subject: fact,
      instance: {
        definition: { id: definition.id, pack: pin },
        parameters: {},
        roles: [
          {
            role: definition.roles[0].id,
            group: { members: referenceGroups[index] },
          },
        ],
      },
    }),
  );
  const dimensionProperties: ModelProperties = {
    'dim:dimension': { kind: 'reference', value: date },
    'dim:missing-date-policy': { kind: 'scalar', value: 'reject-row' },
  };
  const input: ModelValidationInput = {
    model: {
      ...base,
      elements: [
        {
          id: fact.id,
          type: factType.id,
          name: 'Order line',
          container: { kind: 'model', id: base.id },
          properties: {
            'dim:grain': { kind: 'scalar', value: 'one row per order line' },
          },
        },
        {
          id: date.id,
          type: dateType.id,
          name: 'Date',
          container: { kind: 'model', id: base.id },
          properties: {
            'dim:history-policy': {
              kind: 'scalar',
              value: 'overwrite-calendar-labels',
            },
            'dim:calendar': { kind: 'scalar', value: 'synthetic-gregorian' },
          },
        },
      ],
      members: [
        ...[orderId, lineId].map((ref) => ({
          id: ref.id,
          name: ref.id,
          type: grainType.id,
          owner: fact,
          properties: {},
        })),
        {
          id: orderDate.id,
          name: 'Ordered on',
          type: orderType.id,
          owner: fact,
          properties: dimensionProperties,
        },
        {
          id: shipDate.id,
          name: 'Shipped on',
          type: shipType.id,
          owner: fact,
          properties: dimensionProperties,
        },
        {
          id: amount.id,
          name: 'Net amount',
          type: measureType.id,
          owner: fact,
          properties: {
            'dim:aggregation': { kind: 'scalar', value: 'sum' },
            'dim:unit': { kind: 'scalar', value: 'EUR' },
            'dim:history-policy': {
              kind: 'scalar',
              value: 'immutable-transaction-amount',
            },
          },
        },
      ],
    },
    profile: {
      ...base.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    registry: [pack],
    constraints,
    rules: definitions.map(({ rule }) => ({ pack: pin, rule })),
  };
  return {
    input,
    pack,
    constraints,
    fact,
    date,
    orderId,
    lineId,
    orderDate,
    shipDate,
    amount,
  };
}

function changeMember(
  input: ModelValidationInput,
  reference: MemberReference,
  properties: ModelProperties,
): ModelValidationInput {
  return {
    ...input,
    model: {
      ...input.model,
      members: input.model.members.map((member) =>
        member.id === reference.id ? { ...member, properties } : member,
      ),
    },
  };
}

function expectDiagnostic(input: ModelValidationInput, code: string) {
  const result = validateModel(input);
  expect(result.status).toBe('invalid');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      location: expect.objectContaining({ path: expect.any(Array) }),
    }),
  );
  return result;
}

describe('ADR 0002 proof 4: distinct roles for one dimension', () => {
  it('preserves explicit grain, independently addressable roles, measures and history intent', () => {
    const { input, constraints, fact, date, orderDate, shipDate, amount } =
      dimensionalFixture();
    const before = structuredClone(input);
    expect(validateModel(input).status).toBe('valid');
    expect(
      input.model.elements.filter((e) => e.type === 'dim:date'),
    ).toHaveLength(1);
    const roles = [orderDate, shipDate].map((ref) =>
      input.model.members.find((m) => m.id === ref.id),
    );
    expect(roles[0]?.id).not.toBe(roles[1]?.id);
    expect(roles.map((role) => role?.properties['dim:dimension'])).toEqual([
      { kind: 'reference', value: date },
      { kind: 'reference', value: date },
    ]);
    expect(constraints[1].instance.definition.id).not.toBe(
      constraints[2].instance.definition.id,
    );
    expect(
      constraints.slice(1, 3).map((c) => c.instance.roles[0].group.members),
    ).toEqual([[orderDate], [shipDate]]);
    expect(
      input.model.elements.find((e) => e.id === fact.id)?.properties[
        'dim:grain'
      ],
    ).toEqual({ kind: 'scalar', value: 'one row per order line' });
    expect(
      input.model.members.find((m) => m.id === amount.id)?.properties,
    ).toMatchObject({
      'dim:aggregation': { kind: 'scalar', value: 'sum' },
      'dim:history-policy': {
        kind: 'scalar',
        value: 'immutable-transaction-amount',
      },
    });
    expect(input).toEqual(before);
  });

  it('keeps role and constraint identities through rename/reorder without cloning the dimension', () => {
    const { input, orderDate, constraints } = dimensionalFixture();
    const renamed = {
      ...input,
      model: {
        ...input.model,
        revision: createModelRevision('renamed'),
        members: input.model.members
          .map((m) =>
            m.id === orderDate.id ? { ...m, name: 'Order date' } : m,
          )
          .reverse(),
        elements: input.model.elements
          .map((e) => ({ ...e, name: `Renamed ${e.name}` }))
          .reverse(),
      },
    };
    expect(validateModel(renamed).status).toBe('valid');
    expect(renamed.constraints).toBe(constraints);
    expect(renamed.model.members.find((m) => m.id === orderDate.id)?.name).toBe(
      'Order date',
    );
  });

  it('diagnoses the deleted role at its own constraint while preserving the other role', () => {
    const { input, orderDate, shipDate, constraints } = dimensionalFixture();
    const removed = {
      ...input,
      model: {
        ...input.model,
        members: input.model.members.filter((m) => m.id !== orderDate.id),
      },
    };
    const result = validateModel(removed);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      location: {
        path: ['constraints', 1, 'instance', 'roles', 0, 'group', 'members', 0],
      },
      provenance: { constraint: constraints[1].instance.definition },
    });
    expect(removed.model.members.some((m) => m.id === shipDate.id)).toBe(true);
    expect(removed.constraints).toBe(constraints);
  });

  it('reports both role references when the shared dimension is deleted', () => {
    const { input, date } = dimensionalFixture();
    const result = validateModel({
      ...input,
      model: {
        ...input.model,
        elements: input.model.elements.filter((e) => e.id !== date.id),
      },
    });
    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toHaveLength(2);
    expect(
      result.diagnostics.every((d) =>
        d.location.path.includes('dim:dimension'),
      ),
    ).toBe(true);
  });

  it.each([1, 2])(
    'rejects omitting independently required role constraint %s',
    (index) => {
      const { input, constraints } = dimensionalFixture();
      const result = expectDiagnostic(
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

  it('does not let the order-date role satisfy the ship-date constraint', () => {
    const { input, constraints, orderDate } = dimensionalFixture();
    const changed = constraints.map((binding, index) =>
      index !== 2
        ? binding
        : {
            ...binding,
            instance: {
              ...binding.instance,
              roles: [
                {
                  ...binding.instance.roles[0],
                  group: { members: [orderDate] },
                },
              ],
            },
          },
    );
    expectDiagnostic(
      { ...input, constraints: changed },
      'validation.member-type',
    );
  });

  it('rejects a role aimed at a fact rather than a dimension and a missing target property', () => {
    const { input, fact, orderDate } = dimensionalFixture();
    const original = input.model.members.find((m) => m.id === orderDate.id);
    if (!original) throw new Error('Missing fixture order-date role');
    expectDiagnostic(
      changeMember(input, orderDate, {
        ...original.properties,
        'dim:dimension': { kind: 'reference', value: fact },
      }),
      'validation.reference-target',
    );
    expectDiagnostic(
      changeMember(input, orderDate, {
        'dim:missing-date-policy':
          original.properties['dim:missing-date-policy'],
      }),
      'validation.required-property',
    );
  });

  it('rejects a missing grain statement and duplicate grain members', () => {
    const { input, fact, constraints, orderId } = dimensionalFixture();
    expectDiagnostic(
      {
        ...input,
        model: {
          ...input.model,
          elements: input.model.elements.map((e) =>
            e.id === fact.id ? { ...e, properties: {} } : e,
          ),
        },
      },
      'validation.required-property',
    );
    expectDiagnostic(
      {
        ...input,
        constraints: [
          {
            ...constraints[0],
            instance: {
              ...constraints[0].instance,
              roles: [
                {
                  ...constraints[0].instance.roles[0],
                  group: { members: [orderId, orderId] },
                },
              ],
            },
          },
          ...constraints.slice(1),
        ],
      },
      'validation.duplicate-member',
    );
  });

  it.each(['dim:aggregation', 'dim:history-policy'] as const)(
    'rejects unsupported measure %s without interpreting it',
    (property) => {
      const { input, amount } = dimensionalFixture();
      const original = input.model.members.find((m) => m.id === amount.id);
      if (!original) throw new Error('Missing fixture measure');
      expectDiagnostic(
        changeMember(input, amount, {
          ...original.properties,
          [property]: { kind: 'scalar', value: 'guess' },
        }),
        'validation.scalar-value',
      );
    },
  );

  it('requires the dimension history policy rather than inferring it from the method label', () => {
    const { input, date } = dimensionalFixture();
    expectDiagnostic(
      {
        ...input,
        model: {
          ...input.model,
          elements: input.model.elements.map((e) =>
            e.id === date.id
              ? {
                  ...e,
                  properties: { 'dim:calendar': e.properties['dim:calendar'] },
                }
              : e,
          ),
        },
      },
      'validation.required-property',
    );
  });
});
