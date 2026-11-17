import {
  createElementId,
  createMemberId,
  createModel,
  createModelRevision,
  type ElementReference,
  type MemberReference,
} from '@anarchitects/modeling-core';
import {
  MEMBER_GROUP_OPERATOR,
  validateModel,
  type ConstraintBinding,
  type ModelValidationInput,
  type ModelingPackDefinition,
} from '../index.js';

/** Original test-owned intent, not a 3NF validator or production method pack. */
function relationalFixture() {
  const empty = createModel('relational-proof', 'Tenant customer', {
    id: 'relational-proof',
    version: '1',
  });
  const pin = { id: 'relational-proof', version: '1', contractVersion: '1' };
  const tableType = {
    kind: 'element' as const,
    id: 'rel:table' as const,
    pack: pin,
  };
  const fieldType = {
    kind: 'member' as const,
    id: 'rel:field' as const,
    pack: pin,
  };
  const table: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('customer'),
  };
  const other: ElementReference = {
    ...table,
    id: createElementId('unrelated'),
  };
  const field = (id: string): MemberReference => ({
    kind: 'member',
    modelId: empty.id,
    id: createMemberId(id),
  });
  const tenant = field('tenant');
  const number = field('customer-number');
  const name = field('display-name');
  const email = field('email');
  const outsider = field('unrelated-field');
  const key = { pack: pin, id: 'rel:candidate-key' as const };
  const dependency = { pack: pin, id: 'rel:functional-dependency' as const };
  // Rule names deliberately describe the checked structure, not relational truth.
  const keyRule = {
    id: 'rel:key-group-shape' as const,
    version: '1',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const dependencyRule = {
    id: 'rel:dependency-group-shape' as const,
    version: '1',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const role = (id: `rel:${string}`, ordered: boolean) => ({
    id,
    ordered,
    distinct: true,
    cardinality: { min: 2, max: 2 },
    memberTypes: [fieldType],
  });
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic relational intent',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    extensions: [],
    types: [
      {
        kind: 'element',
        id: tableType.id,
        properties: [],
        constraints: [key, dependency],
      },
      { kind: 'element', id: 'rel:other', properties: [], constraints: [] },
      {
        kind: 'member',
        id: fieldType.id,
        owners: [tableType, { ...tableType, id: 'rel:other' }],
        properties: [],
        constraints: [],
      },
    ],
    constraints: [
      {
        id: key.id,
        mandatory: true,
        rule: keyRule,
        roles: [role('rel:key-fields', true)],
      },
      {
        id: dependency.id,
        mandatory: true,
        rule: dependencyRule,
        roles: [role('rel:determinant', false), role('rel:dependent', false)],
      },
    ],
  };
  const constraints: ConstraintBinding[] = [
    {
      subject: table,
      instance: {
        definition: key,
        parameters: {},
        roles: [
          { role: 'rel:key-fields', group: { members: [tenant, number] } },
        ],
      },
    },
    {
      subject: table,
      instance: {
        definition: dependency,
        parameters: {},
        roles: [
          { role: 'rel:determinant', group: { members: [tenant, number] } },
          { role: 'rel:dependent', group: { members: [name, email] } },
        ],
      },
    },
  ];
  const input: ModelValidationInput = {
    model: {
      ...empty,
      elements: [
        {
          id: table.id,
          type: tableType.id,
          name: 'Customer',
          container: { kind: 'model', id: empty.id },
          properties: {},
        },
        {
          id: other.id,
          type: 'rel:other',
          name: 'Unrelated',
          container: { kind: 'model', id: empty.id },
          properties: {},
        },
      ],
      members: [tenant, number, name, email, outsider].map((ref) => ({
        id: ref.id,
        type: fieldType.id,
        name: ref.id,
        owner: ref === outsider ? other : table,
        properties: {},
      })),
    },
    profile: {
      ...empty.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    registry: [pack],
    constraints,
    rules: [keyRule, dependencyRule].map((rule) => ({ pack: pin, rule })),
  };
  return { input, constraints, pack, tenant, number, name, email, outsider };
}

describe('ADR 0002 proof 2: relational member groups', () => {
  it('preserves one composite key and one dependency over two field sets', () => {
    const { input, constraints, tenant, number, name, email } =
      relationalFixture();
    const before = structuredClone(input);
    expect(validateModel(input).status).toBe('valid');
    expect(constraints).toHaveLength(2);
    expect(constraints[0].instance.roles[0].group.members).toEqual([
      tenant,
      number,
    ]);
    expect(
      constraints[1].instance.roles.map((role) => role.group.members),
    ).toEqual([
      [tenant, number],
      [name, email],
    ]);
    expect(
      input.model.members.every(
        (member) => Object.keys(member.properties).length === 0,
      ),
    ).toBe(true);
    expect(input).toEqual(before);
  });

  it('renames and reorders fields without changing any constraint reference', () => {
    const { input, number, constraints } = relationalFixture();
    const renamed = {
      ...input,
      model: {
        ...input.model,
        revision: createModelRevision('renamed'),
        members: input.model.members
          .map((member) =>
            member.id === number.id
              ? { ...member, name: 'Account number' }
              : member,
          )
          .reverse(),
      },
    };
    expect(validateModel(renamed).status).toBe('valid');
    expect(renamed.constraints).toBe(constraints);
    expect(
      renamed.model.members.find((member) => member.id === number.id)?.name,
    ).toBe('Account number');
    expect(constraints[0].instance.roles[0].group.members[1]).toEqual(number);
  });

  it('reports every dependent constraint when a shared key field is deleted', () => {
    const { input, number, constraints } = relationalFixture();
    const removed = {
      ...input,
      model: {
        ...input.model,
        members: input.model.members.filter(
          (member) => member.id !== number.id,
        ),
      },
    };
    const result = validateModel(removed);
    expect(result.status).toBe('invalid');
    const dangling = result.diagnostics.filter(
      (d) => d.location.path[0] === 'constraints',
    );
    expect(dangling).toHaveLength(2);
    expect(dangling.map((d) => d.provenance?.constraint?.id)).toEqual([
      'rel:candidate-key',
      'rel:functional-dependency',
    ]);
    expect(dangling.map((d) => d.location.path)).toEqual([
      ['constraints', 0, 'instance', 'roles', 0, 'group', 'members', 1],
      ['constraints', 1, 'instance', 'roles', 0, 'group', 'members', 1],
    ]);
    expect(
      dangling.every(
        (d) => d.provenance?.rule?.operator.id === MEMBER_GROUP_OPERATOR.id,
      ),
    ).toBe(true);
    expect(removed.constraints).toBe(constraints);
    expect(constraints[0].instance.roles[0].group.members).toContainEqual(
      number,
    );
  });

  it.each(['duplicate', 'empty', 'foreign-owner'] as const)(
    'rejects a %s determinant group with a locatable constraint diagnostic',
    (failure) => {
      const { input, constraints, tenant, outsider } = relationalFixture();
      const members =
        failure === 'duplicate'
          ? [tenant, tenant]
          : failure === 'empty'
            ? []
            : [tenant, outsider];
      const changed: ConstraintBinding = {
        ...constraints[1],
        instance: {
          ...constraints[1].instance,
          roles: [
            { role: 'rel:determinant', group: { members } },
            constraints[1].instance.roles[1],
          ],
        },
      };
      const result = validateModel({
        ...input,
        constraints: [constraints[0], changed],
      });
      expect(result.status).toBe('invalid');
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code:
            failure === 'duplicate'
              ? 'validation.duplicate-member'
              : failure === 'empty'
                ? 'validation.role-cardinality'
                : 'validation.member-owner',
          provenance: expect.objectContaining({
            constraint: constraints[1].instance.definition,
          }),
        }),
      );
    },
  );

  it('rejects silently dropping the dependency while retaining the table', () => {
    const { input, constraints } = relationalFixture();
    const result = validateModel({ ...input, constraints: [constraints[0]] });
    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'validation.missing-constraint' }),
    );
  });

  it('preserves declared key order and unordered dependency sets without normalizing either', () => {
    const { input, constraints, pack } = relationalFixture();
    const changed = constraints.map((binding) => ({
      ...binding,
      instance: {
        ...binding.instance,
        roles: binding.instance.roles.map((role) => ({
          ...role,
          group: { members: [...role.group.members].reverse() },
        })),
      },
    }));
    expect(validateModel({ ...input, constraints: changed }).status).toBe(
      'valid',
    );
    expect(pack.constraints[0].roles[0].ordered).toBe(true);
    expect(pack.constraints[1].roles.every((role) => !role.ordered)).toBe(true);
    expect(changed[0].instance.roles[0].group.members).not.toEqual(
      constraints[0].instance.roles[0].group.members,
    );
    expect(
      new Set(changed[1].instance.roles[0].group.members.map((ref) => ref.id)),
    ).toEqual(
      new Set(
        constraints[1].instance.roles[0].group.members.map((ref) => ref.id),
      ),
    );
  });

  it('does not claim a normalization operator is supported because its role shape is valid', () => {
    const { input, pack } = relationalFixture();
    const normalization = {
      ...pack.constraints[1].rule,
      operator: { id: 'rel:prove-3nf' as const, version: '1' },
    };
    const result = validateModel({
      ...input,
      registry: [
        {
          ...pack,
          constraints: [
            pack.constraints[0],
            { ...pack.constraints[1], rule: normalization },
          ],
        },
      ],
      rules: [...(input.rules ?? []), { pack, rule: normalization }],
    });
    expect(result.status).toBe('unsupported');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'validation.unsupported-rule' }),
    );
  });
});
