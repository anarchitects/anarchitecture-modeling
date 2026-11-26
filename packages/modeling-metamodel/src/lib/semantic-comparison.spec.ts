import {
  createModel,
  createElementId,
  createMemberId,
  createRelationshipId,
  createModelRevision,
  createViewId,
  type ElementReference,
  type ModelValue,
} from '@anarchitects/modeling-core';
import {
  compareDocumentSnapshots,
  SEMANTIC_COMPARISON_CONTRACT_VERSION,
  MEMBER_GROUP_OPERATOR,
  openDocumentSession,
  prepareSessionCommand,
  type SemanticComparisonInput,
  type SemanticComparisonRequest,
  type DocumentContext,
  type ModelingPackDefinition,
} from '../index.js';

/** Independently authored synthetic semantics; no data-method conformance claim. */
function fixture(): SemanticComparisonInput {
  const model = createModel('comparison', 'Model', {
    id: 'comparison',
    version: '1',
  });
  const pin = { id: 'comparison', version: '1', contractVersion: '1' };
  const node = {
    kind: 'element' as const,
    id: 'test:node' as const,
    pack: pin,
  };
  const field = {
    kind: 'member' as const,
    id: 'test:field' as const,
    pack: pin,
  };
  const a: ElementReference = {
    kind: 'element',
    modelId: model.id,
    id: createElementId('a'),
  };
  const b = { ...a, id: createElementId('b') };
  const members = ['m', 'n'].map((id) => ({
    kind: 'member' as const,
    modelId: model.id,
    id: createMemberId(id),
  }));
  const rule = {
    id: 'test:group-check' as const,
    version: '1',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic comparison fixture',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    extensions: [],
    types: [
      {
        kind: 'element',
        id: node.id,
        properties: [
          {
            id: 'test:owner',
            required: false,
            value: { kind: 'scalar', valueType: 'string' },
          },
          {
            id: 'test:list',
            required: false,
            value: {
              kind: 'list',
              cardinality: { min: 0, max: null },
              items: { kind: 'scalar', valueType: 'string' },
            },
          },
          {
            id: 'test:record',
            required: false,
            value: {
              kind: 'record',
              fields: [
                {
                  id: 'test:a',
                  required: false,
                  value: { kind: 'scalar', valueType: 'string' },
                },
                {
                  id: 'test:b',
                  required: false,
                  value: { kind: 'scalar', valueType: 'string' },
                },
              ],
            },
          },
        ],
        constraints: [{ pack: pin, id: 'test:group' }],
      },
      { kind: 'element', id: 'test:other', properties: [], constraints: [] },
      {
        kind: 'member',
        id: field.id,
        owners: [node],
        properties: [],
        constraints: [],
      },
      {
        kind: 'relationship',
        id: 'test:link',
        properties: [],
        constraints: [],
        endpointPairs: [
          {
            source: { role: 'test:source', types: [node] },
            target: { role: 'test:target', types: [node] },
          },
        ],
      },
    ],
    constraints: [
      {
        id: 'test:group',
        mandatory: false,
        rule,
        roles: [
          {
            id: 'test:ordered',
            memberTypes: [field],
            cardinality: { min: 0, max: null },
            ordered: true,
            distinct: false,
          },
          {
            id: 'test:unordered',
            memberTypes: [field],
            cardinality: { min: 0, max: null },
            ordered: false,
            distinct: false,
          },
        ],
      },
    ],
  };
  return {
    snapshot: {
      model: {
        ...model,
        elements: [a, b].map((ref) => ({
          id: ref.id,
          type: node.id,
          name: ref.id,
          container: { kind: 'model', id: model.id },
          properties: {},
        })),
        members: members.map((ref) => ({
          id: ref.id,
          type: field.id,
          name: ref.id,
          owner: a,
          properties: {},
        })),
        relationships: [
          {
            id: createRelationshipId('r'),
            type: 'test:link',
            source: a,
            target: b,
            properties: {},
          },
        ],
      },
      profile: {
        ...model.profile,
        selections: [{ dimension: 'method', pack: pin }],
      },
      constraints: [
        {
          subject: a,
          instance: {
            definition: { pack: pin, id: 'test:group' },
            parameters: {},
            roles: [
              { role: 'test:ordered', group: { members } },
              { role: 'test:unordered', group: { members } },
            ],
          },
        },
      ],
      extensions: [],
      views: [],
      notationBindings: [],
      applied: [],
      baselines: [],
    },
    packs: [pack],
    rules: [{ pack: pin, rule }],
  };
}

const compare = (before: SemanticComparisonInput, after = before) =>
  compareDocumentSnapshots({
    contractVersion: SEMANTIC_COMPARISON_CONTRACT_VERSION,
    scope: 'semantic-model',
    before,
    after,
  });
const withModel = (
  input: SemanticComparisonInput,
  model: Partial<SemanticComparisonInput['snapshot']['model']>,
): SemanticComparisonInput => ({
  ...input,
  snapshot: { ...input.snapshot, model: { ...input.snapshot.model, ...model } },
});
function property(
  input: SemanticComparisonInput,
  key: string,
  value: ModelValue,
): SemanticComparisonInput {
  return withModel(input, {
    elements: input.snapshot.model.elements.map((e, index) =>
      index ? e : { ...e, properties: { ...e.properties, [key]: value } },
    ),
  });
}
function group(
  input: SemanticComparisonInput,
  role: string,
  ids: readonly string[],
): SemanticComparisonInput {
  return {
    ...input,
    snapshot: {
      ...input.snapshot,
      constraints: input.snapshot.constraints.map((binding) => ({
        ...binding,
        instance: {
          ...binding.instance,
          roles: binding.instance.roles.map((r) =>
            r.role !== role
              ? r
              : {
                  ...r,
                  group: {
                    members: ids.map((id) => ({
                      kind: 'member',
                      modelId: input.snapshot.model.id,
                      id: createMemberId(id),
                    })),
                  },
                },
          ),
        },
      })),
    },
  };
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
}

describe('bounded semantic snapshot comparison', () => {
  it('returns scoped equivalence with exact evidence and never mutates frozen inputs', () => {
    const input = fixture(),
      original = structuredClone(input);
    freeze(input);
    const result = compare(input);
    expect(result.status).toBe('equivalent');
    expect(result.coverage.status).toBe('complete');
    expect(result.differences).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.before).toMatchObject({
      modelId: 'comparison',
      revision: '0',
      formatVersion: 2,
      packs: [{ id: 'comparison', version: '1', contractVersion: '1' }],
      rules: input.rules,
    });
    expect(compare(input)).toEqual(result);
    expect(input).toEqual(original);
  });

  it('is repeatable under entity, definition, role, registration and record enumeration changes', () => {
    const first = property(fixture(), 'test:record', {
      kind: 'record',
      fields: {
        'test:a': { kind: 'scalar', value: 'A' },
        'test:b': { kind: 'scalar', value: 'B' },
      },
    });
    const permute = (
      input: SemanticComparisonInput,
    ): SemanticComparisonInput => ({
      ...input,
      rules: [...input.rules].reverse(),
      packs: [...input.packs].reverse().map((p) => ({
        ...p,
        types: [...p.types]
          .reverse()
          .map((t) => ({ ...t, properties: [...t.properties].reverse() })),
        constraints: [...p.constraints]
          .reverse()
          .map((c) => ({ ...c, roles: [...c.roles].reverse() })),
      })),
      snapshot: {
        ...input.snapshot,
        model: {
          ...input.snapshot.model,
          elements: [...input.snapshot.model.elements].reverse(),
          members: [...input.snapshot.model.members].reverse(),
          relationships: [...input.snapshot.model.relationships].reverse(),
        },
        constraints: [...input.snapshot.constraints].reverse().map((c) => ({
          ...c,
          instance: { ...c.instance, roles: [...c.instance.roles].reverse() },
        })),
      },
    });
    const second = property(first, 'test:record', {
      kind: 'record',
      fields: {
        'test:b': { kind: 'scalar', value: 'B' },
        'test:a': { kind: 'scalar', value: 'A' },
      },
    });
    expect(compare(first, permute(second))).toEqual(compare(first));
    const renamed = withModel(first, {
      members: first.snapshot.model.members.map((m) => ({
        ...m,
        name: `${m.name} renamed`,
      })),
    });
    expect(compare(permute(first), permute(renamed))).toEqual(
      compare(first, renamed),
    );
  });

  it('reports a rename at the existing stable member identity', () => {
    const input = fixture();
    const after = withModel(input, {
      members: input.snapshot.model.members.map((m) =>
        m.id === 'm' ? { ...m, name: 'Renamed' } : m,
      ),
    });
    expect(compare(input, after).differences).toEqual([
      {
        kind: 'changed',
        location: {
          modelId: 'comparison',
          section: 'model',
          path: ['members', 'm', 'name'],
        },
        before: 'm',
        after: 'Renamed',
      },
    ]);
  });

  it('never matches same-name distinct IDs and reports additions/removals', () => {
    const input = fixture();
    const independent = {
      ...input.snapshot.model.elements[0],
      id: createElementId('independent'),
      name: 'Same',
    };
    const before = withModel(input, {
      elements: [...input.snapshot.model.elements, independent],
    });
    const after = withModel(input, {
      elements: [
        ...input.snapshot.model.elements,
        { ...independent, id: createElementId('replacement') },
      ],
    });
    const result = compare(before, after);
    expect(result.status).toBe('different');
    expect(result.differences.map((d) => [d.kind, d.location.path])).toEqual([
      ['removed', ['elements', 'independent']],
      ['added', ['elements', 'replacement']],
    ]);
  });

  it.each(['elements', 'members', 'relationships'] as const)(
    'reports %s additions without depending on collection position',
    (collection) => {
      const input = fixture();
      const entity = { ...input.snapshot.model[collection][0], id: 'extra' };
      const after = withModel(input, {
        [collection]: [...input.snapshot.model[collection], entity],
      });
      expect(compare(input, after).differences).toMatchObject([
        { kind: 'added', location: { path: [collection, 'extra'] } },
      ]);
      expect(compare(after, input).differences).toMatchObject([
        { kind: 'removed', location: { path: [collection, 'extra'] } },
      ]);
    },
  );

  it('reports model name, entity type, containment and relationship endpoint changes', () => {
    const input = fixture();
    const after = withModel(input, {
      name: 'Changed',
      elements: [
        ...input.snapshot.model.elements,
        {
          ...input.snapshot.model.elements[0],
          id: createElementId('free'),
          type: 'test:other',
        },
      ],
      relationships: input.snapshot.model.relationships.map((r) => ({
        ...r,
        source: r.target,
        target: r.source,
      })),
    });
    expect(compare(input, after).status).toBe('different');
    const next = withModel(after, {
      elements: after.snapshot.model.elements.map((e) =>
        e.id === 'free'
          ? {
              ...e,
              type: 'test:node',
              container: after.snapshot.model.relationships[0].source,
            }
          : e,
      ),
    });
    expect(
      compare(after, next).differences.map((d) => d.location.path.at(-1)),
    ).toEqual(['container', 'type']);
  });

  it('preserves meaningful governance metadata and property presence', () => {
    const input = fixture();
    const before = property(input, 'test:owner', {
      kind: 'scalar',
      value: 'Owner A',
    });
    const after = property(input, 'test:owner', {
      kind: 'scalar',
      value: 'Owner B',
    });
    expect(compare(before, after)).toMatchObject({
      status: 'different',
      differences: [
        { location: { path: ['elements', 'a', 'properties', 'test:owner'] } },
      ],
    });
    expect(compare(input, before).differences[0].kind).toBe('added');
    expect(compare(before, input).differences[0].kind).toBe('removed');
  });

  it('keeps property lists ordered', () => {
    const input = fixture();
    const list = (items: string[]): ModelValue => ({
      kind: 'list',
      items: items.map((value) => ({ kind: 'scalar', value })),
    });
    expect(
      compare(
        property(input, 'test:list', list(['a', 'b'])),
        property(input, 'test:list', list(['b', 'a'])),
      ).status,
    ).toBe('different');
  });

  it('uses declared constraint ordering and preserves unordered multiplicity', () => {
    const input = fixture();
    expect(
      compare(input, group(input, 'test:ordered', ['n', 'm'])).status,
    ).toBe('different');
    expect(
      compare(input, group(input, 'test:unordered', ['n', 'm'])).status,
    ).toBe('equivalent');
    expect(
      compare(input, group(input, 'test:unordered', ['m', 'm', 'n'])).status,
    ).toBe('different');
    expect(
      compare(input, group(input, 'test:ordered', ['n'])).differences[0]
        .location.path,
    ).toEqual(['element', 'a', 'comparison', '1', '1', 'test:group']);
  });

  it('compares constraint-binding multisets without inventing binding identities', () => {
    const input = fixture();
    const removed = {
      ...input,
      snapshot: { ...input.snapshot, constraints: [] },
    };
    expect(compare(input, removed).differences[0].kind).toBe('removed');
    const duplicate = {
      ...input,
      snapshot: {
        ...input.snapshot,
        constraints: [
          ...input.snapshot.constraints,
          ...input.snapshot.constraints,
        ],
      },
    };
    expect(compare(input, duplicate).status).toBe('different');
  });

  it('ignores excluded presentation and operational state without authenticating it', () => {
    const input = fixture();
    const after: SemanticComparisonInput = {
      ...input,
      snapshot: {
        ...input.snapshot,
        model: {
          ...input.snapshot.model,
          revision: createModelRevision('presentation'),
        },
        views: [
          {
            id: createViewId('view'),
            modelId: input.snapshot.model.id,
            name: 'Layout',
            elements: [],
            connectors: [],
          },
        ],
      },
    };
    Object.defineProperty(after.snapshot, 'baselines', {
      get: () => {
        throw new Error('Excluded data must not be inspected');
      },
      enumerable: true,
    });
    expect(compare(input, after).status).toBe('equivalent');
    expect(compare(input, after).after.revision).toBe('presentation');
  });

  it.each(['edit', 'view'] as const)(
    'semantic equality after a %s revision advance never authorizes a stale write',
    (mode) => {
      const input = fixture();
      const context: DocumentContext = {
        packs: input.packs,
        validationRules: input.rules,
        defaultRules: [],
        notations: [],
        theme: { id: 'fixture', tokens: {} },
      };
      const checkpoint = { snapshot: input.snapshot, commands: [] };
      const command = {
        kind: 'edit' as const,
        id: 'advance',
        modelId: input.snapshot.model.id,
        expectedRevision: input.snapshot.model.revision,
        nextRevision: createModelRevision('1'),
        actor: 'fixture',
        source: { id: 'fixture', revision: '1' },
        deletionReviews: [],
        edits:
          mode === 'edit'
            ? []
            : [
                {
                  kind: 'create-view' as const,
                  value: {
                    id: createViewId('view'),
                    modelId: input.snapshot.model.id,
                    name: 'Only layout',
                    elements: [],
                    connectors: [],
                  },
                  notationBindings: [],
                },
              ],
      };
      const prepared = prepareSessionCommand(
        openDocumentSession(checkpoint),
        command,
        context,
      );
      expect(prepared.status).toBe('prepared');
      if (prepared.status !== 'prepared')
        throw new Error('Expected prepared candidate');
      expect(
        compare(input, {
          ...input,
          snapshot: prepared.candidate.checkpoint.snapshot,
        }).status,
      ).toBe('equivalent');
      const stale = prepareSessionCommand(
        prepared.candidate,
        {
          ...command,
          id: 'stale',
          nextRevision: createModelRevision('2'),
        },
        context,
      );
      expect(stale.status).toBe('rejected');
      if (stale.status === 'rejected')
        expect(stale.diagnostics.some((d) => d.code.includes('revision'))).toBe(
          true,
        );
    },
  );

  it('does not inspect identical opaque payloads, and retains supported differences with partial coverage', () => {
    const input = fixture();
    const envelope = {
      pack: input.packs[0],
      extension: { id: 'test:opaque' as const, version: '1' },
      get payload(): unknown {
        throw new Error('Opaque');
      },
    };
    const before = {
      ...input,
      snapshot: { ...input.snapshot, extensions: [envelope] },
    };
    expect(compare(before)).toMatchObject({
      status: 'incomplete',
      coverage: { status: 'partial' },
      differences: [],
    });
    expect(
      compare(before, withModel(before, { name: 'Changed' })),
    ).toMatchObject({
      status: 'incomplete',
      differences: [{ before: 'Model', after: 'Changed' }],
    });
  });

  it.each([
    'unknown-field',
    'unknown-property',
    'unsupported-rule',
    'parameters',
    'missing-pack',
    'missing-type',
    'dangling',
    'duplicate-id',
  ] as const)('never reports equality with %s', (failure) => {
    const input = fixture();
    let bad: SemanticComparisonInput = input;
    if (failure === 'unknown-field')
      bad = withModel(input, {
        ...input.snapshot.model,
        futureMeaning: true,
      } as Partial<typeof input.snapshot.model>);
    if (failure === 'unknown-property')
      bad = property(input, 'test:future', {
        kind: 'scalar',
        value: 'unsupported',
      });
    if (failure === 'unsupported-rule') bad = { ...input, rules: [] };
    if (failure === 'parameters')
      bad = {
        ...input,
        snapshot: {
          ...input.snapshot,
          constraints: input.snapshot.constraints.map((c) => ({
            ...c,
            instance: {
              ...c.instance,
              parameters: { 'test:future': { kind: 'scalar', value: true } },
            },
          })),
        },
      };
    if (failure === 'missing-pack') bad = { ...input, packs: [] };
    if (failure === 'missing-type')
      bad = withModel(input, {
        elements: input.snapshot.model.elements.map((e) => ({
          ...e,
          type: 'test:missing',
        })),
      });
    if (failure === 'dangling') bad = withModel(input, { members: [] });
    if (failure === 'duplicate-id')
      bad = withModel(input, {
        elements: [
          ...input.snapshot.model.elements,
          input.snapshot.model.elements[0],
        ],
      });
    const result = compare(bad);
    expect(result.status).toBe('incomplete');
    expect(result.coverage.status).not.toBe('complete');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('rejects unsupported definitions even when pins and input objects match', () => {
    const input = fixture();
    const bad = {
      ...input,
      packs: input.packs.map((p) => ({ ...p, futureSemantics: true })),
    };
    expect(compare(bad).status).toBe('incomplete');
  });

  it.each([
    'model',
    'profile',
    'pack',
    'contract',
    'format',
    'definitions',
  ] as const)(
    'reports incompatible %s instead of implicit migration',
    (change) => {
      const input = fixture();
      let after = input;
      if (change === 'model')
        after = withModel(input, {
          id: createModel('other', 'Other', input.snapshot.model.profile).id,
        });
      if (change === 'format')
        after = withModel(input, { formatVersion: 3 as 2 });
      if (change === 'profile')
        after = {
          ...input,
          snapshot: {
            ...input.snapshot,
            profile: { ...input.snapshot.profile, version: '2' },
          },
        };
      if (change === 'pack' || change === 'contract')
        after = {
          ...input,
          snapshot: {
            ...input.snapshot,
            profile: {
              ...input.snapshot.profile,
              selections: input.snapshot.profile.selections.map((s) => ({
                ...s,
                pack: {
                  ...s.pack,
                  ...(change === 'pack'
                    ? { version: '2' }
                    : { contractVersion: '2' }),
                },
              })),
            },
          },
        };
      if (change === 'definitions')
        after = {
          ...input,
          packs: input.packs.map((p) => ({
            ...p,
            constraints: p.constraints.map((c) => ({ ...c, mandatory: true })),
          })),
        };
      expect(compare(input, after).status).toBe('incompatible');
    },
  );

  it('rejects unsupported comparison versions/scopes', () => {
    const input = fixture();
    const request: SemanticComparisonRequest = {
      contractVersion: '2',
      scope: 'semantic-model',
      before: input,
      after: input,
    };
    expect(compareDocumentSnapshots(request).status).toBe('incompatible');
    expect(
      compareDocumentSnapshots({
        ...request,
        contractVersion: '1',
        scope: 'everything' as 'semantic-model',
      }).status,
    ).toBe('incompatible');
  });

  it('returns detached difference values and evidence', () => {
    const input = fixture();
    const after = property(input, 'test:owner', { kind: 'scalar', value: 'A' });
    const result = compare(input, after);
    (result.differences[0].after as { value: string }).value =
      'Modified report';
    (result.before.profile as { version: string }).version = 'Changed report';
    expect(after.snapshot.model.elements[0].properties['test:owner']).toEqual({
      kind: 'scalar',
      value: 'A',
    });
    expect(input.snapshot.profile.version).toBe('1');
  });

  it('canonicalizes multiple pack selections and rule registrations', () => {
    const input = fixture();
    const extra: ModelingPackDefinition = {
      ...input.packs[0],
      id: 'provenance',
      dimensions: ['provenance'],
      types: [],
      constraints: [],
    };
    const before: SemanticComparisonInput = {
      ...input,
      packs: [...input.packs, extra],
      rules: [
        ...input.rules,
        { pack: extra, rule: { ...input.rules[0].rule, id: 'test:unused' } },
      ],
      snapshot: {
        ...input.snapshot,
        profile: {
          ...input.snapshot.profile,
          selections: [
            ...input.snapshot.profile.selections,
            {
              dimension: 'provenance',
              pack: {
                id: extra.id,
                version: extra.version,
                contractVersion: extra.contractVersion,
              },
            },
          ],
        },
      },
    };
    // Registration pins contain no definition data.
    const exact = {
      ...before,
      rules: before.rules.map((r) => ({
        ...r,
        pack: {
          id: r.pack.id,
          version: r.pack.version,
          contractVersion: r.pack.contractVersion,
        },
      })),
    };
    const after: SemanticComparisonInput = {
      ...exact,
      packs: [...exact.packs].reverse(),
      rules: [...exact.rules].reverse(),
      snapshot: {
        ...exact.snapshot,
        profile: {
          ...exact.snapshot.profile,
          selections: [...exact.snapshot.profile.selections].reverse(),
        },
      },
    };
    expect(compare(exact).status).toBe('equivalent');
    expect(compare(exact, after)).toEqual(compare(exact));
  });

  it('keeps unsupported diagnostics deterministic without reading unknown values', () => {
    const input = fixture();
    const binding = input.snapshot.constraints[0];
    const bad: SemanticComparisonInput = {
      ...input,
      snapshot: {
        ...input.snapshot,
        constraints: [
          { ...binding, future: true },
          { ...binding, instance: { ...binding.instance, future: true } },
        ] as unknown as typeof input.snapshot.constraints,
      },
    };
    const permuted = {
      ...bad,
      snapshot: {
        ...bad.snapshot,
        constraints: [...bad.snapshot.constraints].reverse(),
      },
    };
    expect(compare(bad).status).toBe('incomplete');
    expect(compare(bad, permuted)).toEqual(compare(bad));
    const pack = { ...input.packs[0] };
    Object.defineProperty(pack, 'future', {
      enumerable: true,
      get: () => {
        throw new Error('Unknown payload must not be read');
      },
    });
    expect(compare({ ...input, packs: [pack] }).status).toBe('incomplete');
  });

  it('preserves reference values and scalar encoding without heuristic normalization', () => {
    const input = fixture();
    const referenceInput: SemanticComparisonInput = {
      ...input,
      packs: input.packs.map((p) => ({
        ...p,
        types: p.types.map((t) =>
          t.id !== 'test:node'
            ? t
            : {
                ...t,
                properties: [
                  ...t.properties,
                  {
                    id: 'test:ref',
                    required: false,
                    value: {
                      kind: 'reference',
                      target: {
                        kind: 'element',
                        types: [
                          {
                            pack: input.snapshot.profile.selections[0].pack,
                            kind: 'element',
                            id: 'test:node',
                          },
                        ],
                      },
                    },
                  },
                ],
              },
        ),
      })),
    };
    const ref = (id: string): ModelValue => ({
      kind: 'reference',
      value: {
        kind: 'element',
        modelId: input.snapshot.model.id,
        id: createElementId(id),
      },
    });
    expect(
      compare(
        property(referenceInput, 'test:ref', ref('a')),
        property(referenceInput, 'test:ref', ref('b')),
      ).status,
    ).toBe('different');
    expect(
      compare(
        property(input, 'test:owner', { kind: 'scalar', value: 'Owner' }),
        property(input, 'test:owner', { kind: 'scalar', value: 'owner' }),
      ).status,
    ).toBe('different');
  });
});
