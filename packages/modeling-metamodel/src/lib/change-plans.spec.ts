import {
  createElementId,
  createModel,
  createModelId,
  createModelRevision,
  type ElementReference,
  type ModelChange,
  type ModelDocument,
} from '@anarchitects/modeling-core';
import {
  DEFAULTS_OPERATOR,
  applyChangePlan,
  generatedMemberIdentity,
  proposeDefaultPlan,
  type ApplyPlanResult,
  type ChangeContext,
  type ChangePlan,
  type ChangeState,
  type DefaultProposalInput,
  type DefaultRule,
  type ModelingPackDefinition,
  type ProposalResult,
} from '../index.js';

function fixture() {
  const empty = createModel('model', 'Change proof', {
    id: 'profile',
    version: '1',
  });
  const subject: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('entity'),
  };
  const pin = { id: 'example', version: '1', contractVersion: '1' };
  const elementType = {
    kind: 'element' as const,
    id: 'example:entity' as const,
    pack: pin,
  };
  const memberType = {
    kind: 'member' as const,
    id: 'example:field' as const,
    pack: pin,
  };
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Example',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    extensions: [],
    constraints: [],
    types: [
      {
        kind: 'element',
        id: elementType.id,
        constraints: [],
        properties: [
          {
            id: 'example:status',
            required: true,
            value: { kind: 'scalar', valueType: 'string' },
            defaultValue: { kind: 'scalar', value: 'draft' },
          },
        ],
      },
      {
        kind: 'member',
        id: memberType.id,
        owners: [elementType],
        constraints: [],
        properties: [
          {
            id: 'example:purpose',
            required: true,
            value: { kind: 'scalar', valueType: 'string' },
          },
          {
            id: 'example:link',
            required: false,
            value: {
              kind: 'reference',
              target: { kind: 'element', types: [elementType] },
            },
          },
        ],
      },
    ],
  };
  const rule: DefaultRule = {
    pack: pin,
    rule: { id: 'example:defaults', version: '1', operator: DEFAULTS_OPERATOR },
    subjectType: elementType,
    dependsOn: [],
    conflicts: [],
    propertyDefaults: true,
    members: [
      {
        key: 'example:generated-field',
        type: memberType,
        name: 'Generated field',
        properties: {
          'example:purpose': { kind: 'scalar', value: 'generated' },
        },
      },
    ],
  };
  const state: ChangeState = {
    model: {
      ...empty,
      elements: [
        {
          id: subject.id,
          type: elementType.id,
          name: 'Entity',
          container: { kind: 'model', id: empty.id },
          properties: {},
        },
      ],
    },
    baselines: [],
    applied: [],
  };
  const context: ChangeContext = {
    validation: {
      profile: {
        ...empty.profile,
        selections: [{ dimension: 'method', pack: pin }],
      },
      registry: [pack],
    },
    defaultRules: [rule],
  };
  const input: DefaultProposalInput = {
    state,
    context,
    subject,
    planId: 'plan-1',
    nextRevision: createModelRevision('r1'),
    source: { id: 'decision', revision: '1' },
    rules: [rule],
  };
  return { input, state, context, rule, pack, subject };
}

function ready(result: ProposalResult): ChangePlan {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
}
function applied(result: ApplyPlanResult) {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result;
}
function expectFailure(result: ApplyPlanResult | ProposalResult, code: string) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      severity: 'error',
      planId: expect.any(String),
      location: expect.objectContaining({
        modelId: 'model',
        path: expect.any(Array),
      }),
    }),
  );
}
function regenerate(
  input: DefaultProposalInput,
  state: ChangeState,
  rule = input.rules[0],
): DefaultProposalInput {
  return {
    ...input,
    state,
    planId: 'plan-2',
    nextRevision: createModelRevision('r2'),
    source: { id: 'decision', revision: '2' },
    rules: [rule],
    context: { ...input.context, defaultRules: [rule] },
  };
}
function revisedRule(rule: DefaultRule): DefaultRule {
  return {
    ...rule,
    rule: { ...rule.rule, version: '2' },
    members: rule.members.map((member) => ({
      ...member,
      properties: { 'example:purpose': { kind: 'scalar', value: 'updated' } },
    })),
  };
}

describe('bounded plans and defaulting', () => {
  it('proposes deterministically, validates the whole candidate, and returns a separate atomic snapshot', () => {
    const { input, state, context } = fixture();
    const before = JSON.stringify(input);
    const proposal = proposeDefaultPlan(input);
    expect(proposeDefaultPlan(input)).toEqual(proposal);
    const plan = ready(proposal);
    expect(plan.operations.map((operation) => operation.change.kind)).toEqual([
      'set-property',
      'add-member',
    ]);
    expect(state.model.members).toEqual([]);
    const result = applied(applyChangePlan(state, plan, context));
    expect(result.status).toBe('applied');
    expect(result.state.model.revision).toBe('r1');
    expect(result.state.model.members).toHaveLength(1);
    expect(result.state.model.elements[0].properties['example:status']).toEqual(
      { kind: 'scalar', value: 'draft' },
    );
    expect(result.state.baselines).toHaveLength(2);
    expect(result.record.plan.source).toEqual(input.source);
    expect(result.record.plan.operations[1].origin).toMatchObject({
      kind: 'generated',
      pack: { id: 'example', version: '1', contractVersion: '1' },
      rule: {
        id: 'example:defaults',
        version: '1',
        operator: DEFAULTS_OPERATOR,
      },
    });
    expect(JSON.stringify(input)).toBe(before);
    expect(result.state.model).not.toBe(state.model);
    expect(result.state.model).not.toHaveProperty('applied');
  });

  it('replays an identical recorded plan without duplicates, even after later manual edits', () => {
    const { input, state, context } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    const first = applied(applyChangePlan(state, plan, context));
    const manual: ChangeState = {
      ...first.state,
      model: {
        ...first.state.model,
        revision: createModelRevision('manual'),
        members: first.state.model.members.map((member) => ({
          ...member,
          name: 'Human name',
        })),
      },
    };
    const result = applied(applyChangePlan(manual, plan, context));
    expect(result.status).toBe('replayed');
    expect(result.state).toBe(manual);
    expect(result.state.model.members).toHaveLength(1);
    expect(result.state.model.members[0].name).toBe('Human name');
    expect(result.state.applied).toHaveLength(1);
  });

  it('rejects an unrelated stale plan and a reused identity with different content', () => {
    const { input, state, context } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    const next = applied(applyChangePlan(state, plan, context)).state;
    expectFailure(
      applyChangePlan(next, { ...plan, id: 'unrecorded' }, context),
      'plan.stale-revision',
    );
    expectFailure(
      applyChangePlan(
        next,
        { ...plan, source: { ...plan.source, revision: 'different' } },
        context,
      ),
      'plan.identity-conflict',
    );
    const regeneration = ready(proposeDefaultPlan(regenerate(input, next)));
    expectFailure(
      applyChangePlan(
        next,
        { ...regeneration, nextRevision: state.model.revision },
        context,
      ),
      'plan.reused-revision',
    );
  });

  it('fails atomically when a later generated member contains an invalid reference', () => {
    const { input, rule, state, subject } = fixture();
    const invalidRule: DefaultRule = {
      ...rule,
      members: [
        {
          ...rule.members[0],
          properties: {
            ...rule.members[0].properties,
            'example:link': {
              kind: 'reference',
              value: { ...subject, id: createElementId('missing') },
            },
          },
        },
      ],
    };
    const context = { ...input.context, defaultRules: [invalidRule] };
    const plan = ready(
      proposeDefaultPlan({ ...input, rules: [invalidRule], context }),
    );
    const before = JSON.stringify(state);
    const result = applyChangePlan(state, plan, context);
    expectFailure(result, 'plan.invalid-candidate');
    if (result.ok) throw new Error('Expected failure');
    expect(
      result.validation?.diagnostics.some(
        (d) => d.code === 'model.missing-reference',
      ),
    ).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.model.elements[0].properties).toEqual({});
  });

  it('does not apply a candidate whose semantic coverage is unsupported', () => {
    const { input, state, context, rule } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    const unsupported = {
      ...context,
      validation: {
        ...context.validation,
        extensions: [
          {
            pack: rule.pack,
            extension: { id: 'example:unknown' as const, version: '1' },
            get payload() {
              throw new Error('Payload read');
            },
          },
        ],
      },
    };
    const result = applyChangePlan(state, plan, unsupported);
    expectFailure(result, 'plan.invalid-candidate');
    if (!result.ok) expect(result.validation?.status).toBe('unsupported');
    expect(state.applied).toEqual([]);
  });

  it('regenerates with the same identity and refreshes the generated baseline when no manual change intervened', () => {
    const { input, state, context, rule } = fixture();
    const first = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).state;
    const regen = regenerate(input, first, revisedRule(rule));
    const plan = ready(proposeDefaultPlan(regen));
    expect(plan.operations.map((operation) => operation.change.kind)).toEqual([
      'update-member',
    ]);
    const result = applied(applyChangePlan(first, plan, regen.context));
    expect(result.state.model.members[0].id).toBe(first.model.members[0].id);
    expect(result.state.model.members[0].properties['example:purpose']).toEqual(
      { kind: 'scalar', value: 'updated' },
    );
    expect(result.state.model.members).toHaveLength(1);
    expect(
      result.state.baselines.find((b) => b.target.kind === 'member')?.origin
        .rule.version,
    ).toBe('2');
    expect(result.record.inverse[0]).toMatchObject({
      kind: 'restore-member',
      value: first.model.members[0],
    });
  });

  it('preserves authored properties instead of adopting them as generated ownership', () => {
    const { input, state } = fixture();
    const authored: ChangeState = {
      ...state,
      model: {
        ...state.model,
        elements: state.model.elements.map((element) => ({
          ...element,
          properties: {
            'example:status': { kind: 'scalar', value: 'authored' },
          },
        })),
      },
    };
    const result = proposeDefaultPlan({ ...input, state: authored });
    const plan = ready(result);
    expect(
      result.comparisons.some((c) => c.decision === 'preserve-authored'),
    ).toBe(true);
    const output = applied(
      applyChangePlan(authored, plan, input.context),
    ).state;
    expect(output.model.elements[0].properties['example:status']).toEqual({
      kind: 'scalar',
      value: 'authored',
    });
    expect(output.baselines.every((b) => b.target.kind === 'member')).toBe(
      true,
    );
  });

  it('preserves manual overrides when proposed output is unchanged and exposes conflicts when it changes', () => {
    const { input, state, context, rule } = fixture();
    const first = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).state;
    const manual: ChangeState = {
      ...first,
      model: {
        ...first.model,
        revision: createModelRevision('manual'),
        members: first.model.members.map((member) => ({
          ...member,
          properties: { 'example:purpose': { kind: 'scalar', value: 'human' } },
        })),
      },
    };
    const preserved = proposeDefaultPlan(regenerate(input, manual));
    expect(ready(preserved).operations).toEqual([]);
    expect(
      preserved.comparisons.some((c) => c.decision === 'preserve-override'),
    ).toBe(true);
    const conflicted = proposeDefaultPlan(
      regenerate(input, manual, revisedRule(rule)),
    );
    expectFailure(conflicted, 'plan.manual-conflict');
    expect(
      conflicted.comparisons.find((c) => c.decision === 'conflict'),
    ).toMatchObject({
      baseline: { present: true },
      current: { present: true },
      proposed: { present: true },
    });
    expect(manual.model.members[0].properties['example:purpose']).toEqual({
      kind: 'scalar',
      value: 'human',
    });
  });

  it('recognizes convergence and records a no-write receipt without replacing current content', () => {
    const { input, state, context, rule } = fixture();
    const first = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).state;
    const revised = revisedRule(rule);
    const converged: ChangeState = {
      ...first,
      model: {
        ...first.model,
        revision: createModelRevision('manual'),
        members: first.model.members.map((member) => ({
          ...member,
          properties: revised.members[0].properties,
        })),
      },
    };
    const regen = regenerate(input, converged, revised);
    const proposal = proposeDefaultPlan(regen);
    const plan = ready(proposal);
    expect(plan.operations).toEqual([]);
    expect(proposal.comparisons.some((c) => c.decision === 'converged')).toBe(
      true,
    );
    const result = applied(applyChangePlan(converged, plan, regen.context));
    expect(result.state.model.members).toEqual(converged.model.members);
    expect(result.record.inverse).toEqual([]);
    expect(result.state.model.revision).toBe('r2');
  });

  it('does not recreate manually deleted output or silently retire output omitted by a new rule', () => {
    const { input, state, context, rule } = fixture();
    const first = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).state;
    const deleted = {
      ...first,
      model: {
        ...first.model,
        revision: createModelRevision('manual'),
        members: [],
      },
    };
    expectFailure(
      proposeDefaultPlan(regenerate(input, deleted)),
      'plan.manual-conflict',
    );
    expectFailure(
      proposeDefaultPlan(
        regenerate(input, first, { ...revisedRule(rule), members: [] }),
      ),
      'plan.retired-output',
    );
  });

  it('rejects precondition failures, overlapping writes and unsupported/destructive operations without partial mutation', () => {
    const { input, state, context } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    const property = plan.operations[0];
    if (property.change.kind !== 'set-property')
      throw new Error('Expected property');
    expectFailure(
      applyChangePlan(
        state,
        {
          ...plan,
          operations: [
            {
              ...property,
              change: {
                ...property.change,
                expected: {
                  present: true,
                  value: { kind: 'scalar', value: 'stale' },
                },
              },
            },
            ...plan.operations.slice(1),
          ],
        },
        context,
      ),
      'plan.precondition',
    );
    expectFailure(
      applyChangePlan(
        state,
        { ...plan, operations: [...plan.operations, property] },
        context,
      ),
      'plan.overlapping-write',
    );
    const destructive = {
      kind: 'delete-element',
      id: input.subject.id,
    } as unknown as ModelChange;
    expectFailure(
      applyChangePlan(
        state,
        {
          ...plan,
          operations: [
            {
              origin: { kind: 'authored', actor: 'reviewer' },
              change: destructive,
            },
          ],
        },
        context,
      ),
      'plan.unsupported-operation',
    );
    expect(state.model.members).toEqual([]);
  });

  it('rejects member property deletion and type/owner conversion even with matching preconditions', () => {
    const { input, state, context } = fixture();
    const first = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).state;
    const member = first.model.members[0];
    const base: ChangePlan = {
      id: 'reviewed-edit',
      modelId: first.model.id,
      expectedRevision: first.model.revision,
      nextRevision: createModelRevision('edit'),
      source: { id: 'review', revision: '1' },
      rules: [],
      operations: [],
      baselineUpdates: [],
    };
    for (const replacement of [
      { ...member, properties: {} },
      { ...member, type: 'example:other' },
    ]) {
      const plan: ChangePlan = {
        ...base,
        operations: [
          {
            origin: { kind: 'authored', actor: 'reviewer' },
            change: {
              kind: 'update-member',
              expected: member,
              member: replacement,
            },
          },
        ],
      };
      expectFailure(
        applyChangePlan(first, plan, context),
        replacement.type === member.type
          ? 'plan.destructive-change'
          : 'plan.incompatible-change',
      );
    }
  });

  it('keeps inverse records limited to touched values with guards for later semantic undo', () => {
    const { input, state, context } = fixture();
    const record = applied(
      applyChangePlan(state, ready(proposeDefaultPlan(input)), context),
    ).record;
    expect(record.inverse.map((change) => change.kind)).toEqual([
      'remove-added-member',
      'restore-property',
    ]);
    expect(record.inverse[1]).toMatchObject({
      subject: input.subject,
      property: 'example:status',
      expected: { kind: 'scalar', value: 'draft' },
      value: { present: false },
    });
    expect(record).not.toHaveProperty('model');
    expect(record).toMatchObject({ beforeRevision: '0', afterRevision: 'r1' });
  });

  it('orders an explicit acyclic batch deterministically without using input order as precedence', () => {
    const { input, rule } = fixture();
    const second: DefaultRule = {
      ...rule,
      rule: { ...rule.rule, id: 'example:second' },
      dependsOn: [rule.rule.id],
      propertyDefaults: false,
      members: [{ ...rule.members[0], key: 'example:second-field' }],
    };
    const context = { ...input.context, defaultRules: [rule, second] };
    const a = ready(
      proposeDefaultPlan({ ...input, context, rules: [second, rule] }),
    );
    const b = ready(
      proposeDefaultPlan({ ...input, context, rules: [rule, second] }),
    );
    expect(a).toEqual(b);
    expect(a.rules.map((item) => item.rule.id)).toEqual([
      'example:defaults',
      'example:second',
    ]);
    expect(
      applied(applyChangePlan(input.state, a, context)).state.model.members,
    ).toHaveLength(2);
  });

  it('rejects cyclic, missing, incompatible and overlapping rule composition', () => {
    const { input, rule } = fixture();
    for (const [changed, code] of [
      [{ ...rule, dependsOn: [rule.rule.id] }, 'plan.rule-cycle'],
      [
        { ...rule, dependsOn: ['example:absent' as const] },
        'plan.missing-rule',
      ],
      [{ ...rule, conflicts: [rule.rule.id] }, 'plan.rule-conflict'],
    ] as const)
      expectFailure(
        proposeDefaultPlan({
          ...input,
          rules: [changed],
          context: { ...input.context, defaultRules: [changed] },
        }),
        code,
      );
    const overlap: DefaultRule = {
      ...rule,
      rule: { ...rule.rule, id: 'example:overlap' },
      members: [],
    };
    expectFailure(
      proposeDefaultPlan({
        ...input,
        rules: [rule, overlap],
        context: { ...input.context, defaultRules: [rule, overlap] },
      }),
      'plan.overlapping-output',
    );
  });

  it('requires exact unchanged rule registration and supported operator versions', () => {
    const { input, rule } = fixture();
    expectFailure(
      proposeDefaultPlan({ ...input, rules: [revisedRule(rule)] }),
      'plan.unregistered-rule',
    );
    const unsupported = {
      ...rule,
      rule: {
        ...rule.rule,
        operator: { id: 'example:script' as const, version: '1' },
      },
    };
    expectFailure(
      proposeDefaultPlan({
        ...input,
        rules: [unsupported],
        context: { ...input.context, defaultRules: [unsupported] },
      }),
      'plan.unsupported-operator',
    );
  });

  it('uses collision-safe generated identities independent of display names and revisions', () => {
    expect(generatedMemberIdentity('m', 'a/b', 'c', 'd', 'e')).not.toBe(
      generatedMemberIdentity('m', 'a', 'b/c', 'd', 'e'),
    );
    const { input, state } = fixture();
    const original = ready(proposeDefaultPlan(input));
    const renamed: ModelDocument = {
      ...state.model,
      revision: createModelRevision('renamed'),
      elements: state.model.elements.map((e) => ({ ...e, name: 'New name' })),
    };
    const other = ready(
      proposeDefaultPlan({ ...input, state: { ...state, model: renamed } }),
    );
    const a = original.operations.find(
      (operation) => operation.change.kind === 'add-member',
    );
    const b = other.operations.find(
      (operation) => operation.change.kind === 'add-member',
    );
    expect(a?.change).toEqual(b?.change);
  });

  it('rejects a baseline targeting another model even when a local element ID matches', () => {
    const { input, state, context } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    const property = plan.baselineUpdates.find(
      (update) => update.next.target.kind === 'property',
    );
    if (!property || property.next.target.kind !== 'property')
      throw new Error('Expected a generated property baseline');
    const foreign = {
      next: {
        ...property.next,
        target: {
          ...property.next.target,
          subject: {
            ...property.next.target.subject,
            modelId: createModelId('another-model'),
          },
        },
      },
    };
    expectFailure(
      applyChangePlan(
        state,
        { ...plan, baselineUpdates: [...plan.baselineUpdates, foreign] },
        context,
      ),
      'plan.baseline-output',
    );
    expect(state.applied).toHaveLength(0);
    expect(state.model.members).toHaveLength(0);
  });

  it('retains detached receipts and rejects missing or stale generated baselines', () => {
    const { input, state, context } = fixture();
    const plan = ready(proposeDefaultPlan(input));
    expectFailure(
      applyChangePlan(state, { ...plan, baselineUpdates: [] }, context),
      'plan.missing-baseline',
    );
    const first = applied(applyChangePlan(state, plan, context));
    expect(first.record.plan).not.toBe(plan);
    expect(first.record.plan.operations[0]).not.toBe(plan.operations[0]);
    const regen = regenerate(input, first.state);
    const nextPlan = ready(proposeDefaultPlan(regen));
    expectFailure(
      applyChangePlan(
        { ...first.state, baselines: [] },
        nextPlan,
        regen.context,
      ),
      'plan.baseline-conflict',
    );
  });
});
