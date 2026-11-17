import {
  createElementId,
  createMemberId,
  createModel,
  createModelRevision,
  type ElementReference,
  type MemberReference,
  type ModelMember,
  type ModelRevision,
  type ModelValue,
} from '@anarchitects/modeling-core';
import {
  DEFAULTS_OPERATOR,
  applyChangePlan,
  composeModelingProfile,
  generatedMemberIdentity,
  proposeDefaultPlan,
  validateModel,
  type ApplyPlanResult,
  type ChangeContext,
  type ChangePlan,
  type ChangeSnapshot,
  type ChangeState,
  type DefaultProposalInput,
  type DefaultRule,
  type ModelingPackDefinition,
  type PropertyDefinition,
  type ProposalResult,
} from '../index.js';

/** Original test-owned hub configuration, never a production Data Vault pack. */
function vaultFixture(version: '1' | '2' = '1') {
  const empty = createModel('vault-proof', 'Synthetic Customer hub', {
    id: 'hub-proof',
    version,
  });
  const pin = { id: 'vault-fixture', version, contractVersion: '1' };
  const hubType = {
    kind: 'element' as const,
    id: 'dv:hub' as const,
    pack: pin,
  };
  const businessType = {
    kind: 'member' as const,
    id: 'dv:business-key' as const,
    pack: pin,
  };
  const hashType = { ...businessType, id: 'dv:hash-key' as const };
  const loadType = { ...businessType, id: 'dv:load-date' as const };
  const hub: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('hub:customer'),
  };
  const member = (key: string): MemberReference => ({
    kind: 'member',
    modelId: empty.id,
    id: generatedMemberIdentity(
      empty.id,
      hub.id,
      pin.id,
      'dv:hub-defaults',
      key,
    ),
  });
  const business = member('dv:business-key'),
    hash = member('dv:hash-key'),
    load = member('dv:load-date');
  const scalar = (value: string): ModelValue => ({ kind: 'scalar', value });
  const text = (
    id: `dv:${string}`,
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
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic hub defaults',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    extensions: [],
    constraints: [],
    types: [
      { kind: 'element', id: hubType.id, properties: [], constraints: [] },
      { kind: 'element', id: 'dv:satellite', properties: [], constraints: [] },
      {
        kind: 'member',
        id: businessType.id,
        owners: [hubType],
        constraints: [],
        properties: [
          text('dv:description'),
          text('dv:physical-type', ['text']),
        ],
      },
      {
        kind: 'member',
        id: hashType.id,
        owners: [hubType],
        constraints: [],
        properties: [
          text('dv:description'),
          {
            id: 'dv:derivation',
            required: true,
            value: {
              kind: 'record',
              fields: [
                text('dv:algorithm', ['sha256-intent']),
                text(
                  'dv:normalization',
                  version === '1' ? ['trim'] : ['trim-uppercase'],
                ),
                text('dv:execution', ['definition-only']),
                {
                  id: 'dv:inputs',
                  required: true,
                  value: {
                    kind: 'list',
                    cardinality: { min: 1, max: 1 },
                    items: {
                      kind: 'reference',
                      target: { kind: 'member', types: [businessType] },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      {
        kind: 'member',
        id: loadType.id,
        owners: [hubType],
        constraints: [],
        properties: [
          text('dv:description'),
          text('dv:clock', ['external-load-time']),
        ],
      },
    ],
  };
  const rule: DefaultRule = {
    pack: pin,
    rule: { id: 'dv:hub-defaults', version, operator: DEFAULTS_OPERATOR },
    subjectType: hubType,
    dependsOn: [],
    conflicts: [],
    propertyDefaults: false,
    members: [
      {
        key: 'dv:business-key',
        type: businessType,
        name: 'Customer business key',
        properties: {
          'dv:description': scalar('Reviewed customer business identifier'),
          'dv:physical-type': scalar('text'),
        },
      },
      {
        key: 'dv:hash-key',
        type: hashType,
        name: 'Customer hash key',
        properties: {
          'dv:description': scalar('Generated hub hash key'),
          'dv:derivation': {
            kind: 'record',
            fields: {
              'dv:algorithm': scalar('sha256-intent'),
              'dv:normalization': scalar(
                version === '1' ? 'trim' : 'trim-uppercase',
              ),
              'dv:execution': scalar('definition-only'),
              'dv:inputs': {
                kind: 'list',
                items: [{ kind: 'reference', value: business }],
              },
            },
          },
        },
      },
      // Version 2 proposes retiring this output. No deletion operation is available.
      ...(version === '1'
        ? [
            {
              key: 'dv:load-date' as const,
              type: loadType,
              name: 'Loaded at',
              properties: {
                'dv:description': scalar('Source load timestamp definition'),
                'dv:clock': scalar('external-load-time'),
              },
            },
          ]
        : []),
    ],
  };
  const state: ChangeState = {
    model: {
      ...empty,
      elements: [
        {
          id: hub.id,
          type: hubType.id,
          name: 'Customer hub',
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
    subject: hub,
    planId: 'hub-defaults-1',
    nextRevision: createModelRevision('generated-1'),
    source: { id: 'fixture:assign-hub-profile', revision: 'decision-1' },
    rules: [rule],
  };
  return { input, context, state, rule, pack, hub, business, hash, load };
}
function plan(result: ProposalResult): ChangePlan {
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
      location: expect.objectContaining({ path: expect.any(Array) }),
    }),
  );
}
function seeded(fixture = vaultFixture()) {
  const initial = plan(proposeDefaultPlan(fixture.input));
  const state = applied(
    applyChangePlan(fixture.state, initial, fixture.context),
  ).state;
  return { fixture, initial, state };
}
function regenerate(
  fixture: ReturnType<typeof vaultFixture>,
  state: ChangeState,
  rule = fixture.rule,
  suffix = '2',
): DefaultProposalInput {
  return {
    ...fixture.input,
    state,
    planId: `regenerate-${suffix}`,
    nextRevision: createModelRevision(`generated-${suffix}`),
    source: { id: 'fixture:regenerate-hub', revision: suffix },
    rules: [rule],
    context: { ...fixture.context, defaultRules: [rule] },
  };
}
function memberAt(state: ChangeState, reference: MemberReference): ModelMember {
  const member = state.model.members.find((m) => m.id === reference.id);
  if (!member) throw new Error('Missing fixture member');
  return member;
}
function manualOverride(
  fixture: ReturnType<typeof vaultFixture>,
  state: ChangeState,
) {
  const before = memberAt(state, fixture.hash);
  const manual: ChangePlan = {
    id: 'manual-description',
    modelId: state.model.id,
    expectedRevision: state.model.revision,
    nextRevision: createModelRevision('manual-1'),
    source: { id: 'fixture:human-review', revision: '1' },
    rules: [],
    baselineUpdates: [],
    operations: [
      {
        origin: { kind: 'authored', actor: 'synthetic-reviewer' },
        change: {
          kind: 'set-property',
          subject: fixture.hash,
          property: 'dv:description',
          expected: {
            present: true,
            value: before.properties['dv:description'],
          },
          value: { kind: 'scalar', value: 'Human reviewed hash description' },
        },
      },
    ],
  };
  return applied(applyChangePlan(state, manual, fixture.context)).state;
}
function revisedDescription(rule: DefaultRule): DefaultRule {
  return {
    ...rule,
    rule: { ...rule.rule, version: '1.1' },
    members: rule.members.map((member) =>
      member.key === 'dv:hash-key'
        ? {
            ...member,
            properties: {
              ...member.properties,
              'dv:description': {
                kind: 'scalar',
                value: 'New template description',
              },
            },
          }
        : member,
    ),
  };
}

/** Bounded report adapter for this one v1 -> v2 experiment; never an apply/migration API. */
function previewUpgrade(
  state: ChangeState,
  expectedRevision: ModelRevision,
  target = vaultFixture('2'),
) {
  const source = vaultFixture('1');
  if (state.model.revision !== expectedRevision)
    return { ok: false, code: 'fixture.stale-preview' } as const;
  if (
    state.model.id !== source.state.model.id ||
    state.model.profile.id !== source.state.model.profile.id ||
    state.model.profile.version !== '1' ||
    target.pack.id !== source.pack.id ||
    target.context.validation.profile.id !== source.state.model.profile.id ||
    target.pack.version !== '2' ||
    target.context.validation.profile.version !== '2'
  )
    return { ok: false, code: 'fixture.incompatible-preview' } as const;
  const sourceValidation = validateModel({
    ...source.context.validation,
    model: state.model,
  });
  if (sourceValidation.status !== 'valid')
    return {
      ok: false,
      code: 'fixture.invalid-source',
      validation: sourceValidation,
    } as const;
  // Refuse to produce a deceptively complete impact report for untracked source content.
  const sourceIds = new Set([
    source.business.id,
    source.hash.id,
    source.load.id,
  ]);
  if (
    state.model.elements.length !== 1 ||
    state.model.elements[0].id !== source.hub.id ||
    state.model.relationships.length !== 0 ||
    state.model.members.length !== sourceIds.size ||
    state.model.members.some((member) => !sourceIds.has(member.id)) ||
    state.baselines.length !== sourceIds.size ||
    [...sourceIds].some(
      (id) =>
        state.baselines.filter(
          (baseline) =>
            baseline.target.kind === 'member' &&
            baseline.target.id === id &&
            baseline.snapshot.present &&
            baseline.origin.pack.id === source.pack.id &&
            baseline.origin.pack.version === '1' &&
            baseline.origin.pack.contractVersion === '1' &&
            baseline.origin.rule.id === source.rule.rule.id &&
            baseline.origin.rule.version === '1',
        ).length !== 1,
    )
  )
    return { ok: false, code: 'fixture.unaccounted-source' } as const;
  const targetComposition = composeModelingProfile(
    target.context.validation.profile,
    target.context.validation.registry,
  );
  if (!targetComposition.ok)
    return {
      ok: false,
      code: 'fixture.incompatible-target',
      diagnostics: targetComposition.diagnostics,
    } as const;
  // Proposal compares v2 templates with the original source snapshot; no profile is rewritten.
  const proposal = proposeDefaultPlan(
    regenerate(target, state, target.rule, 'upgrade-preview'),
  );
  if (!proposal.ok && proposal.comparisons.length === 0)
    return {
      ok: false,
      code: 'fixture.incompatible-target',
      diagnostics: proposal.diagnostics,
    } as const;
  const traces = proposal.comparisons.map((comparison) => ({
    source:
      comparison.current.present && comparison.target.kind === 'member'
        ? {
            kind: 'member' as const,
            modelId: state.model.id,
            id: comparison.target.id,
          }
        : null,
    target:
      comparison.proposed.present && comparison.target.kind === 'member'
        ? {
            kind: 'member' as const,
            modelId: state.model.id,
            id: comparison.target.id,
          }
        : null,
    comparison,
  }));
  const normalization = (snapshot: ChangeSnapshot) => {
    if (!snapshot.present || !('properties' in snapshot.value))
      return undefined;
    const derivation = snapshot.value.properties['dv:derivation'];
    if (derivation?.kind !== 'record') return undefined;
    const value = derivation.fields['dv:normalization'];
    return value?.kind === 'scalar' ? value.value : undefined;
  };
  return {
    ok: true,
    status: 'review-required',
    applicable: false,
    source: {
      modelId: state.model.id,
      revision: state.model.revision,
      profile: state.model.profile,
      pack: source.rule.pack,
      rule: source.rule.rule,
    },
    target: {
      profile: target.context.validation.profile,
      pack: target.rule.pack,
      rule: target.rule.rule,
    },
    traces,
    informationLoss: traces
      .filter((trace) => trace.source && !trace.target)
      .map((trace) => ({
        source: trace.source,
        reason:
          'Retiring this generated field would lose its modeled definition and load-time intent; preserve it or approve a separate migration.',
      })),
    ambiguities: traces
      .filter(
        ({ comparison }) =>
          normalization(comparison.current) !==
            normalization(comparison.proposed) &&
          normalization(comparison.current) !== undefined &&
          comparison.proposed.present,
      )
      .map(({ source, comparison }) => ({
        source,
        before: normalization(comparison.current),
        after: normalization(comparison.proposed),
        reason:
          'Changed canonicalization may merge previously distinct business identifiers and change derived hash meaning; no data was evaluated.',
      })),
    diagnostics: proposal.ok ? [] : proposal.diagnostics,
  } as const;
}

describe('ADR 0002 proof 5: synthetic hub defaulting', () => {
  it('proposes configured business-key, hash-key and load-date definitions deterministically without mutation or hashing', () => {
    const f = vaultFixture();
    const before = structuredClone(f.input);
    const proposal = proposeDefaultPlan(f.input);
    expect(proposeDefaultPlan(f.input)).toEqual(proposal);
    const initial = plan(proposal);
    expect(initial.operations.map((o) => o.change.kind)).toEqual([
      'add-member',
      'add-member',
      'add-member',
    ]);
    const result = applied(applyChangePlan(f.state, initial, f.context));
    expect(result.state.model.members.map((m) => m.id)).toEqual([
      f.business.id,
      f.hash.id,
      f.load.id,
    ]);
    expect(result.state.baselines).toHaveLength(3);
    expect(
      validateModel({ ...f.context.validation, model: result.state.model })
        .status,
    ).toBe('valid');
    expect(memberAt(result.state, f.hash).properties['dv:derivation']).toEqual({
      kind: 'record',
      fields: {
        'dv:algorithm': { kind: 'scalar', value: 'sha256-intent' },
        'dv:normalization': { kind: 'scalar', value: 'trim' },
        'dv:execution': { kind: 'scalar', value: 'definition-only' },
        'dv:inputs': {
          kind: 'list',
          items: [{ kind: 'reference', value: f.business }],
        },
      },
    });
    expect(
      initial.operations.every(
        (o) =>
          o.origin.kind === 'generated' &&
          o.origin.pack.version === '1' &&
          o.origin.rule.operator.id === DEFAULTS_OPERATOR.id,
      ),
    ).toBe(true);
    expect(result.record.plan.source).toEqual(f.input.source);
    expect(result.record.inverse).toHaveLength(3);
    expect(f.input).toEqual(before);
  });

  it('uses exact receipt replay and stable regeneration without duplicate fields', () => {
    const { fixture: f, initial, state } = seeded();
    const retry = applied(applyChangePlan(state, initial, f.context));
    expect(retry.status).toBe('replayed');
    expect(retry.state).toBe(state);
    const nextInput = regenerate(f, state);
    const next = plan(proposeDefaultPlan(nextInput));
    expect(next.operations).toEqual([]);
    const regenerated = applied(
      applyChangePlan(state, next, nextInput.context),
    ).state;
    expect(regenerated.model.members.map((m) => m.id)).toEqual(
      state.model.members.map((m) => m.id),
    );
    expect(regenerated.model.members).toHaveLength(3);
    expect(regenerated.model.revision).toBe('generated-2');
  });

  it('leaves applicability and field variations in the selected profile rule', () => {
    const f = vaultFixture();
    const satellite = {
      ...f.state,
      model: {
        ...f.state.model,
        elements: f.state.model.elements.map((e) => ({
          ...e,
          type: 'dv:satellite',
        })),
      },
    };
    expectFailure(
      proposeDefaultPlan({ ...f.input, state: satellite }),
      'plan.inapplicable-rule',
    );
    const varied: DefaultRule = {
      ...f.rule,
      rule: { ...f.rule.rule, version: '1.1' },
      members: f.rule.members.map((m) =>
        m.key === 'dv:business-key'
          ? { ...m, name: 'External customer identifier' }
          : m,
      ),
    };
    const input = regenerate(f, f.state, varied);
    const result = applied(
      applyChangePlan(f.state, plan(proposeDefaultPlan(input)), input.context),
    );
    expect(memberAt(result.state, f.business).name).toBe(
      'External customer identifier',
    );
    expect(result.state.model.members).toHaveLength(3);
  });

  it('preserves a human override and later exact replay does not undo it', () => {
    const { fixture: f, initial, state } = seeded();
    const manual = manualOverride(f, state);
    const input = regenerate(f, manual);
    const proposal = proposeDefaultPlan(input);
    expect(proposal.comparisons).toContainEqual(
      expect.objectContaining({
        target: { kind: 'member', id: f.hash.id },
        decision: 'preserve-override',
      }),
    );
    const result = applied(
      applyChangePlan(manual, plan(proposal), input.context),
    );
    expect(memberAt(result.state, f.hash).properties['dv:description']).toEqual(
      { kind: 'scalar', value: 'Human reviewed hash description' },
    );
    expect(
      applied(applyChangePlan(result.state, initial, f.context)).state,
    ).toBe(result.state);
    expect(result.state.applied[1].plan.operations[0].origin).toEqual({
      kind: 'authored',
      actor: 'synthetic-reviewer',
    });
  });

  it('exposes baseline/current/proposed conflict evidence and converges after a separately reviewed resolution', () => {
    const { fixture: f, state } = seeded();
    const manual = manualOverride(f, state);
    const input = regenerate(f, manual, revisedDescription(f.rule));
    const conflict = proposeDefaultPlan(input);
    expectFailure(conflict, 'plan.manual-conflict');
    const evidence = conflict.comparisons.find(
      (c) => c.target.kind === 'member' && c.target.id === f.hash.id,
    );
    expect(evidence).toMatchObject({
      decision: 'conflict',
      baseline: {
        present: true,
        value: {
          properties: { 'dv:description': { value: 'Generated hub hash key' } },
        },
      },
      current: {
        present: true,
        value: {
          properties: {
            'dv:description': { value: 'Human reviewed hash description' },
          },
        },
      },
      proposed: {
        present: true,
        value: {
          properties: {
            'dv:description': { value: 'New template description' },
          },
        },
      },
    });
    if (
      !evidence?.proposed.present ||
      !('properties' in evidence.proposed.value)
    )
      throw new Error('Missing proposed member');
    const resolution: ChangePlan = {
      id: 'reviewed-resolution',
      modelId: manual.model.id,
      expectedRevision: manual.model.revision,
      nextRevision: createModelRevision('resolved'),
      source: { id: 'fixture:accept-new-description', revision: '1' },
      rules: [],
      baselineUpdates: [],
      operations: [
        {
          origin: { kind: 'authored', actor: 'synthetic-reviewer' },
          change: {
            kind: 'update-member',
            expected: memberAt(manual, f.hash),
            member: evidence.proposed.value,
          },
        },
      ],
    };
    const resolved = applied(
      applyChangePlan(manual, resolution, input.context),
    ).state;
    const regeneration = regenerate(f, resolved, input.rules[0], '3');
    const converged = proposeDefaultPlan(regeneration);
    expect(converged.comparisons).toContainEqual(
      expect.objectContaining({
        target: { kind: 'member', id: f.hash.id },
        decision: 'converged',
      }),
    );
    expect(plan(converged).operations).toEqual([]);
    const final = applied(
      applyChangePlan(resolved, plan(converged), regeneration.context),
    ).state;
    expect(
      final.baselines.find(
        (b) => b.target.kind === 'member' && b.target.id === f.hash.id,
      )?.origin.rule.version,
    ).toBe('1.1');
    expect(final.model.members).toHaveLength(3);
    expect(memberAt(manual, f.hash).properties['dv:description']).toEqual({
      kind: 'scalar',
      value: 'Human reviewed hash description',
    });
  });

  it('rejects stale plans and reused plan IDs with changed decisions', () => {
    const { fixture: f, initial, state } = seeded();
    expectFailure(
      applyChangePlan(state, { ...initial, id: 'unrecorded-stale' }, f.context),
      'plan.stale-revision',
    );
    expectFailure(
      applyChangePlan(
        state,
        { ...initial, source: { ...initial.source, revision: 'different' } },
        f.context,
      ),
      'plan.identity-conflict',
    );
  });

  it('validates references against the complete candidate, including fields added later in operation order', () => {
    const f = vaultFixture();
    const reversed = { ...f.rule, members: [...f.rule.members].reverse() };
    const input = regenerate(f, f.state, reversed);
    const result = applied(
      applyChangePlan(f.state, plan(proposeDefaultPlan(input)), input.context),
    );
    expect(result.state.model.members.map((m) => m.id)).toEqual([
      f.load.id,
      f.hash.id,
      f.business.id,
    ]);
    expect(
      validateModel({ ...f.context.validation, model: result.state.model })
        .status,
    ).toBe('valid');
  });

  it('fails atomically when a generated derivation references a nonexistent input', () => {
    const f = vaultFixture();
    const invalid: DefaultRule = {
      ...f.rule,
      members: f.rule.members.map((m) =>
        m.key !== 'dv:hash-key'
          ? m
          : {
              ...m,
              properties: {
                ...m.properties,
                'dv:derivation': {
                  kind: 'record',
                  fields: {
                    'dv:algorithm': { kind: 'scalar', value: 'sha256-intent' },
                    'dv:normalization': { kind: 'scalar', value: 'trim' },
                    'dv:execution': {
                      kind: 'scalar',
                      value: 'definition-only',
                    },
                    'dv:inputs': {
                      kind: 'list',
                      items: [
                        {
                          kind: 'reference',
                          value: {
                            ...f.business,
                            id: createMemberId('missing-business-key'),
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
      ),
    };
    const input = regenerate(f, f.state, invalid);
    const before = structuredClone(f.state);
    const result = applyChangePlan(
      f.state,
      plan(proposeDefaultPlan(input)),
      input.context,
    );
    expectFailure(result, 'plan.invalid-candidate');
    if (result.ok) throw new Error('Expected atomic failure');
    expect(result.validation?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'model.missing-reference' }),
    );
    expect(f.state).toEqual(before);
    expect(f.state.model.members).toEqual([]);
  });

  it.each(['cycle', 'conflict'] as const)(
    'rejects %s in the explicit hub rule batch at proposal and application',
    (failure) => {
      const f = vaultFixture();
      const primary = {
        ...f.rule,
        ...(failure === 'cycle'
          ? { dependsOn: ['dv:other' as const] }
          : { conflicts: ['dv:other' as const] }),
      };
      const other: DefaultRule = {
        ...f.rule,
        rule: { ...f.rule.rule, id: 'dv:other' },
        members: [],
        dependsOn: failure === 'cycle' ? [f.rule.rule.id] : [],
      };
      const context = { ...f.context, defaultRules: [primary, other] };
      const input = { ...f.input, context, rules: [primary, other] };
      const code =
        failure === 'cycle' ? 'plan.rule-cycle' : 'plan.rule-conflict';
      expectFailure(proposeDefaultPlan(input), code);
      const reviewed = plan(proposeDefaultPlan(f.input));
      expectFailure(
        applyChangePlan(f.state, { ...reviewed, rules: input.rules }, context),
        code,
      );
      expect(f.state.model.members).toEqual([]);
    },
  );

  it('rejects an arbitrary executable operator instead of treating a derivation definition as code', () => {
    const f = vaultFixture();
    const unknown = {
      ...f.rule,
      rule: {
        ...f.rule.rule,
        operator: { id: 'dv:execute-hash' as const, version: '1' },
      },
    };
    expectFailure(
      proposeDefaultPlan(regenerate(f, f.state, unknown)),
      'plan.unsupported-operator',
    );
  });
});

describe('ADR 0002 proof 7: pinned hub upgrade preview', () => {
  it('traces v1 to v2 identities and reports retirement loss plus changed derivation ambiguity without applying', () => {
    const { fixture: f, state } = seeded();
    const before = structuredClone(state);
    const preview = previewUpgrade(state, state.model.revision);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error(preview.code);
    expect(preview).toMatchObject({
      status: 'review-required',
      applicable: false,
      source: {
        revision: 'generated-1',
        profile: { id: 'hub-proof', version: '1' },
        pack: { id: 'vault-fixture', version: '1', contractVersion: '1' },
      },
      target: {
        profile: { id: 'hub-proof', version: '2' },
        pack: { id: 'vault-fixture', version: '2', contractVersion: '1' },
        rule: { version: '2', operator: DEFAULTS_OPERATOR },
      },
    });
    expect(preview.traces.map((t) => [t.source?.id, t.target?.id])).toEqual([
      [f.business.id, f.business.id],
      [f.hash.id, f.hash.id],
      [f.load.id, undefined],
    ]);
    expect(preview.informationLoss).toContainEqual(
      expect.objectContaining({ source: f.load }),
    );
    expect(preview.ambiguities).toContainEqual(
      expect.objectContaining({
        source: f.hash,
        before: 'trim',
        after: 'trim-uppercase',
      }),
    );
    expect(preview.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'plan.retired-output' }),
    );
    expect(preview).not.toHaveProperty('plan');
    expect(state).toEqual(before);
    expect(state.model.members).toHaveLength(3);
    expect(previewUpgrade(state, state.model.revision)).toEqual(preview);
  });

  it('includes manual divergence in upgrade evidence without silently choosing a winner', () => {
    const { fixture: f, state } = seeded();
    const manual = manualOverride(f, state);
    const preview = previewUpgrade(manual, manual.model.revision);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error(preview.code);
    expect(preview.diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(['plan.manual-conflict', 'plan.retired-output']),
    );
    expect(
      preview.traces.find((t) => t.source?.id === f.hash.id)?.comparison,
    ).toMatchObject({
      decision: 'conflict',
      current: {
        present: true,
        value: {
          properties: {
            'dv:description': { value: 'Human reviewed hash description' },
          },
        },
      },
    });
    expect(memberAt(manual, f.load).id).toBe(f.load.id);
  });

  it('rejects a stale preview or incompatible source/target profile instead of guessing versions', () => {
    const { state } = seeded();
    expect(previewUpgrade(state, createModelRevision('stale'))).toEqual({
      ok: false,
      code: 'fixture.stale-preview',
    });
    expect(
      previewUpgrade(
        {
          ...state,
          model: {
            ...state.model,
            profile: { id: 'another-method', version: '1' },
          },
        },
        state.model.revision,
      ),
    ).toEqual({ ok: false, code: 'fixture.incompatible-preview' });
    const target = vaultFixture('2');
    expect(
      previewUpgrade(state, state.model.revision, {
        ...target,
        context: {
          ...target.context,
          validation: { ...target.context.validation, registry: [] },
        },
      }),
    ).toMatchObject({ ok: false, code: 'fixture.incompatible-target' });
  });

  it('refuses a partial impact report when source members or generated baselines are unaccounted for', () => {
    const { fixture: f, state } = seeded();
    const extended = {
      ...state,
      model: {
        ...state.model,
        members: [
          ...state.model.members,
          {
            ...memberAt(state, f.load),
            id: createMemberId('authored:extra-load-field'),
          },
        ],
      },
    };
    expect(
      validateModel({ ...f.context.validation, model: extended.model }).status,
    ).toBe('valid');
    expect(previewUpgrade(extended, extended.model.revision)).toEqual({
      ok: false,
      code: 'fixture.unaccounted-source',
    });
    expect(
      previewUpgrade({ ...state, baselines: [] }, state.model.revision),
    ).toEqual({ ok: false, code: 'fixture.unaccounted-source' });
  });

  it('rejects an invalid source with a dangling derivation reference before producing an upgrade report', () => {
    const { fixture: f, state } = seeded();
    const invalid = {
      ...state,
      model: {
        ...state.model,
        members: state.model.members.filter((m) => m.id !== f.business.id),
      },
    };
    expect(previewUpgrade(invalid, invalid.model.revision)).toMatchObject({
      ok: false,
      code: 'fixture.invalid-source',
      validation: { status: 'invalid' },
    });
  });

  it('cannot smuggle a profile migration through otherwise valid member writes', () => {
    const { state } = seeded();
    const target = vaultFixture('2');
    // A non-destructive variant keeps the load-date output, exposing the separate profile boundary.
    const keepLoad = {
      ...target.rule,
      members: [
        ...target.rule.members,
        {
          ...vaultFixture('1').rule.members[2],
          type: {
            ...vaultFixture('1').rule.members[2].type,
            pack: target.rule.pack,
          },
        },
      ],
    };
    const input = regenerate(
      target,
      state,
      keepLoad,
      'non-destructive-preview',
    );
    const proposed = plan(proposeDefaultPlan(input));
    const before = structuredClone(state);
    const result = applyChangePlan(state, proposed, input.context);
    expectFailure(result, 'plan.invalid-candidate');
    if (result.ok) throw new Error('Expected profile mismatch');
    expect(result.validation?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'validation.profile-mismatch' }),
    );
    expect(state).toEqual(before);
  });
});
