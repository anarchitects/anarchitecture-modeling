// Original synthetic Foundation fixture; no consumer implementation or method specification.
import {
  createElementId,
  createMemberId,
  createModel,
  createModelRevision,
  createRelationshipId,
  createViewId,
  type ElementReference,
  type MemberReference,
} from '@anarchitects/modeling-core';
import {
  compareDocumentSnapshots,
  decodeDocument,
  encodeDocument,
  MEMBER_GROUP_OPERATOR,
  validateModel,
  type ChangeOrigin,
  type ChangeSource,
  type DocumentContext,
  type DocumentSnapshot,
  type ModelingPackDefinition,
  type SemanticComparisonInput,
} from '@anarchitects/modeling-metamodel';

const checks: string[] = [];
function check(condition: unknown, name: string): asserts condition {
  if (!condition) throw new Error(name);
  checks.push(name);
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function fixture(layer: 'conceptual' | 'logical'): SemanticComparisonInput {
  const pin = {
    id: `synthetic-${layer}`,
    version: '1.0.0',
    contractVersion: '1',
  };
  const model = createModel(`fixture-${layer}`, `${layer} sales`, {
    id: `synthetic-${layer}-profile`,
    version: '1.0.0',
  });
  const entity = {
    kind: 'element' as const,
    id: 'proof:entity' as const,
    pack: pin,
  };
  const field = {
    kind: 'member' as const,
    id: 'proof:field' as const,
    pack: pin,
  };
  const key = { pack: pin, id: 'proof:key' as const };
  const rule = {
    id: 'proof:key-shape' as const,
    version: '1.0.0',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: `Synthetic ${layer} fixture`,
    implementation: 'scaffold',
    dimensions: ['abstraction'],
    requires: [],
    conflicts: [],
    extensions: [{ id: 'proof:opaque', version: '1.0.0' }],
    types: [
      {
        kind: entity.kind,
        id: entity.id,
        properties: [
          {
            id: 'proof:definition',
            required: true,
            value: { kind: 'scalar', valueType: 'string' },
          },
        ],
        constraints: [key],
      },
      {
        kind: field.kind,
        id: field.id,
        owners: [entity],
        properties: [
          {
            id: 'proof:datatype',
            required: true,
            value: {
              kind: 'scalar',
              valueType: 'string',
              permittedValues: ['text', 'integer'],
            },
          },
        ],
        constraints: [],
      },
      {
        kind: 'relationship',
        id: 'proof:places',
        properties: [],
        constraints: [],
        endpointPairs: [
          {
            source: { role: 'proof:customer', types: [entity] },
            target: { role: 'proof:order', types: [entity] },
          },
        ],
      },
    ],
    constraints: [
      {
        id: key.id,
        mandatory: true,
        rule,
        roles: [
          {
            id: 'proof:key-fields',
            memberTypes: [field],
            cardinality: { min: 1, max: 2 },
            ordered: false,
            distinct: true,
          },
        ],
      },
    ],
  };
  // IDs are assigned explicitly; neither display names nor cross-layer equality create identity.
  const customer: ElementReference = {
    kind: 'element',
    modelId: model.id,
    id: createElementId(`${layer}-e1`),
  };
  const order: ElementReference = {
    ...customer,
    id: createElementId(`${layer}-e2`),
  };
  const member = (id: string): MemberReference => ({
    kind: 'member',
    modelId: model.id,
    id: createMemberId(id),
  });
  const customerCode = member(`${layer}-m1`),
    region = member(`${layer}-m2`),
    orderCode = member(`${layer}-m3`);
  const snapshot: DocumentSnapshot = {
    model: {
      ...model,
      elements: [customer, order].map((ref, i) => ({
        id: ref.id,
        type: entity.id,
        name: ['Customer', 'Order'][i],
        container: { kind: 'model', id: model.id },
        properties: {
          'proof:definition': {
            kind: 'scalar',
            value: ['Party placing an order', 'Request placed by a party'][i],
          },
        },
      })),
      members: [customerCode, region, orderCode].map((ref, i) => ({
        id: ref.id,
        type: field.id,
        name: ['Code', 'Region', 'Code'][i],
        owner: i < 2 ? customer : order,
        properties: { 'proof:datatype': { kind: 'scalar', value: 'text' } },
      })),
      relationships: [
        {
          id: createRelationshipId(`${layer}-r1`),
          type: 'proof:places',
          source: customer,
          target: order,
          properties: {},
        },
      ],
    },
    profile: {
      ...model.profile,
      selections: [{ dimension: 'abstraction', pack: pin }],
    },
    constraints: [
      {
        subject: customer,
        instance: {
          definition: key,
          roles: [
            {
              role: 'proof:key-fields',
              group: { members: [customerCode, region] },
            },
          ],
          parameters: {},
        },
      },
      {
        subject: order,
        instance: {
          definition: key,
          roles: [
            { role: 'proof:key-fields', group: { members: [orderCode] } },
          ],
          parameters: {},
        },
      },
    ],
    extensions: [],
    views: [],
    notationBindings: [],
    applied: [],
    baselines: [],
  };
  return { snapshot, packs: [pack], rules: [{ pack: pin, rule }] };
}
const compare = (
  before: SemanticComparisonInput,
  after: SemanticComparisonInput,
) =>
  compareDocumentSnapshots({
    contractVersion: '1',
    scope: 'semantic-model',
    before,
    after,
  });
const validate = (input: SemanticComparisonInput) =>
  validateModel({
    model: input.snapshot.model,
    profile: input.snapshot.profile,
    registry: input.packs,
    constraints: input.snapshot.constraints,
    extensions: input.snapshot.extensions,
    rules: input.rules,
  });
const context = (input: SemanticComparisonInput): DocumentContext => ({
  packs: input.packs,
  validationRules: input.rules,
  defaultRules: [],
  notations: [],
  theme: { id: 'synthetic', tokens: {} },
});
const conceptual = fixture('conceptual'),
  logical = fixture('logical');
const reports: Record<string, unknown> = {};
const documents: Record<string, unknown> = {};

for (const [layer, input] of Object.entries({ conceptual, logical })) {
  const original = JSON.stringify(input);
  const validity = validate(input);
  check(
    validity.status === 'valid' &&
      validity.structure === 'valid' &&
      validity.semantics === 'complete',
    `${layer}: supported shape is valid`,
  );
  const renamed = copy(input);
  const renamedInput = {
    ...renamed,
    snapshot: {
      ...renamed.snapshot,
      model: {
        ...renamed.snapshot.model,
        elements: renamed.snapshot.model.elements.map((e, i) =>
          i === 0 ? { ...e, name: 'Account' } : e,
        ),
      },
    },
  };
  const renameReport = compare(input, renamedInput);
  check(
    renameReport.status === 'different' &&
      renameReport.differences.length === 1 &&
      renameReport.differences[0].location.path.join('/') ===
        `elements/${layer}-e1/name`,
    `${layer}: rename retains explicit identity`,
  );
  const typed = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: {
        ...input.snapshot.model,
        members: input.snapshot.model.members.map((m, i) =>
          i === 0
            ? {
                ...m,
                properties: {
                  'proof:datatype': {
                    kind: 'scalar' as const,
                    value: 'integer',
                  },
                },
              }
            : m,
        ),
      },
    },
  };
  check(
    compare(input, typed).status === 'different',
    `${layer}: declared datatype change is semantic`,
  );
  const definition = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: {
        ...input.snapshot.model,
        elements: input.snapshot.model.elements.map((e, i) =>
          i === 0
            ? {
                ...e,
                properties: {
                  'proof:definition': {
                    kind: 'scalar' as const,
                    value: 'Changed intent',
                  },
                },
              }
            : e,
        ),
      },
    },
  };
  check(
    compare(input, definition).status === 'different',
    `${layer}: descriptive intent is semantic`,
  );
  const changedKey = {
    ...input,
    snapshot: {
      ...input.snapshot,
      constraints: input.snapshot.constraints.map((c, i) =>
        i === 0
          ? {
              ...c,
              instance: {
                ...c.instance,
                roles: c.instance.roles.map((r) => ({
                  ...r,
                  group: { members: r.group.members.slice(0, 1) },
                })),
              },
            }
          : c,
      ),
    },
  };
  check(
    compare(input, changedKey).status === 'different',
    `${layer}: key membership change is semantic`,
  );
  const reordered = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: {
        ...input.snapshot.model,
        elements: [...input.snapshot.model.elements].reverse(),
        members: [...input.snapshot.model.members].reverse(),
      },
      constraints: [...input.snapshot.constraints].reverse().map((c) => ({
        ...c,
        instance: {
          ...c.instance,
          roles: c.instance.roles.map((r) => ({
            ...r,
            group: { members: [...r.group.members].reverse() },
          })),
        },
      })),
    },
    packs: input.packs.map((p) => ({ ...p, types: [...p.types].reverse() })),
  };
  check(
    compare(input, reordered).status === 'equivalent',
    `${layer}: collection and declared unordered key enumeration is non-semantic`,
  );
  check(
    equal(compare(input, renamedInput), compare(reordered, renamedInput)),
    `${layer}: report ordering is repeatable`,
  );
  const advanced = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: { ...input.snapshot.model, revision: createModelRevision('next') },
    },
  };
  check(
    compare(input, advanced).status === 'equivalent',
    `${layer}: revision alone does not change semantics`,
  );
  const presentation = {
    ...advanced,
    snapshot: {
      ...advanced.snapshot,
      views: [
        {
          id: createViewId('overview'),
          modelId: input.snapshot.model.id,
          name: 'Overview',
          elements: [],
          connectors: [],
        },
      ],
    },
  };
  check(
    compare(input, presentation).status === 'equivalent',
    `${layer}: presentation is excluded from comparison`,
  );
  // Empty views avoid inventing a notation registry; codec validation is tested separately below.
  const priorId = createElementId(`${layer}-e1`);
  const newId = createElementId(`${layer}-distinct`);
  const replaceReference = (ref: ElementReference): ElementReference =>
    ref.id === priorId ? { ...ref, id: newId } : ref;
  const replaced = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: {
        ...input.snapshot.model,
        elements: input.snapshot.model.elements.map((e) =>
          e.id === priorId ? { ...e, id: newId } : e,
        ),
        members: input.snapshot.model.members.map((m) => ({
          ...m,
          owner: replaceReference(m.owner),
        })),
        relationships: input.snapshot.model.relationships.map((r) => ({
          ...r,
          source: replaceReference(r.source),
          target: replaceReference(r.target),
        })),
      },
      constraints: input.snapshot.constraints.map((c) => ({
        ...c,
        subject:
          c.subject.kind === 'element'
            ? replaceReference(c.subject)
            : c.subject,
      })),
    },
  };
  const distinct = compare(input, replaced);
  check(
    distinct.status === 'different' &&
      distinct.differences.some(
        (d) =>
          d.kind === 'added' && d.location.path.includes(`${layer}-distinct`),
      ),
    `${layer}: same label never merges distinct IDs`,
  );
  const opaque: SemanticComparisonInput = {
    ...input,
    snapshot: {
      ...input.snapshot,
      extensions: [
        {
          pack: input.rules[0].pack,
          extension: { id: 'proof:opaque', version: '1.0.0' },
          payload: { operator: 'not interpreted' },
        },
      ],
    },
  };
  const opaqueValidation = validate(opaque),
    opaqueReport = compare(opaque, opaque);
  check(
    opaqueValidation.structure === 'valid' &&
      opaqueValidation.semantics === 'partial' &&
      opaqueReport.status === 'incomplete',
    `${layer}: registered opaque content is not complete semantics`,
  );
  const unknownRule = {
    ...input,
    rules: [],
    packs: input.packs.map((p) => ({
      ...p,
      constraints: p.constraints.map((c) => ({
        ...c,
        rule: {
          ...c.rule,
          operator: { id: 'proof:unknown' as const, version: '1' },
        },
      })),
    })),
  };
  check(
    validate(unknownRule).semantics !== 'complete' &&
      compare(unknownRule, unknownRule).status === 'incomplete',
    `${layer}: unsupported operators cannot establish equality`,
  );
  const missing = { ...input, packs: [] };
  check(
    compare(missing, missing).status === 'incomplete',
    `${layer}: missing definitions cannot establish equality`,
  );
  const mismatched = {
    ...input,
    snapshot: {
      ...input.snapshot,
      profile: { ...input.snapshot.profile, version: '2.0.0' },
    },
  };
  check(
    compare(input, mismatched).status === 'incompatible',
    `${layer}: profile versions are exact`,
  );
  const changedPack = {
    ...input,
    packs: input.packs.map((p) => ({
      ...p,
      types: p.types.map((t) => ({ ...t, properties: [] })),
    })),
  };
  check(
    compare(input, changedPack).status === 'incompatible',
    `${layer}: changed definitions under the same pin are rejected`,
  );
  const incomplete = {
    ...input,
    snapshot: {
      ...input.snapshot,
      model: {
        ...input.snapshot.model,
        elements: input.snapshot.model.elements.map((e) => ({
          ...e,
          properties: {},
        })),
      },
    },
  };
  check(
    validate(incomplete).status === 'invalid',
    `${layer}: mandatory completion information is not silently optional`,
  );
  for (const [suffix, item] of Object.entries({ valid: input, opaque })) {
    const ctx = context(item);
    const encoded = encodeDocument(
      { snapshot: item.snapshot, commands: [] },
      ctx,
    );
    check(encoded.status === 'encoded', `${layer}/${suffix}: envelope encoded`);
    const decoded = decodeDocument(encoded.bytes, ctx);
    check(
      decoded.status === 'decoded',
      `${layer}/${suffix}: envelope reopened`,
    );
    check(
      equal(decoded.checkpoint.snapshot, item.snapshot),
      `${layer}/${suffix}: snapshot survives reopen`,
    );
    check(
      decoded.classification === (suffix === 'valid' ? 'valid' : 'unsupported'),
      `${layer}/${suffix}: reopen preserves coverage`,
    );
    documents[`${layer}/${suffix}`] = {
      envelope: JSON.parse(new TextDecoder().decode(encoded.bytes)),
      context: ctx,
      classification: decoded.classification,
    };
  }
  check(
    JSON.stringify(input) === original,
    `${layer}: inputs remain immutable`,
  );
  reports[layer] = {
    validity,
    renameReport,
    opaqueReport,
    profile: input.snapshot.profile,
    packs: input.packs,
    rules: input.rules,
  };
}
check(
  compare(conceptual, logical).status === 'incompatible',
  'cross-layer: different models are not snapshot-equivalent',
);
const source: ChangeSource = {
  id: conceptual.snapshot.model.id,
  revision: conceptual.snapshot.model.revision,
};
const origin: ChangeOrigin = {
  kind: 'authored',
  actor: 'synthetic-fixture-author',
};
// Test-owned correspondence evidence only: no resolver, transformation or public API.
const correspondence = {
  source,
  origin,
  target: {
    id: logical.snapshot.model.id,
    revision: logical.snapshot.model.revision,
  },
  definition: { id: 'synthetic-correspondence', version: '1.0.0' },
  elements: [
    { from: 'conceptual-e1', to: 'logical-e1' },
    { from: 'conceptual-e2', to: 'logical-e2' },
  ],
  members: [
    { from: 'conceptual-m1', to: 'logical-m1' },
    { from: 'conceptual-m2', to: 'logical-m2' },
    { from: 'conceptual-m3', to: 'logical-m3' },
  ],
};
for (const mapping of correspondence.elements) {
  check(
    conceptual.snapshot.model.elements.some((e) => e.id === mapping.from) &&
      logical.snapshot.model.elements.some((e) => e.id === mapping.to),
    `cross-layer: explicit correspondence ${mapping.from}`,
  );
}
for (const mapping of correspondence.members) {
  check(
    conceptual.snapshot.model.members.some((m) => m.id === mapping.from) &&
      logical.snapshot.model.members.some((m) => m.id === mapping.to),
    `cross-layer: explicit correspondence ${mapping.from}`,
  );
}
console.log(JSON.stringify({ checks, reports, correspondence, documents }));
