// Unreleased contract-1 example. Published 0.0.1 does not export the comparator.
// The package-check target compiles and executes this against local archives.
import {
  createElementId,
  createModel,
  createModelRevision,
} from '@anarchitects/modeling-core';
import {
  compareDocumentSnapshots,
  SEMANTIC_COMPARISON_CONTRACT_VERSION,
  type ModelingPackDefinition,
  type SemanticComparisonInput,
  type SemanticComparisonResult,
} from '@anarchitects/modeling-metamodel';

const pin = { id: 'comparison-example', version: '1', contractVersion: '1' };
const pack: ModelingPackDefinition = {
  ...pin,
  displayName: 'Independently authored synthetic example',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    { kind: 'element', id: 'example:item', properties: [], constraints: [] },
  ],
};
const model = createModel('example', 'Example', {
  id: 'example-profile',
  version: '1',
});
const input: SemanticComparisonInput = {
  packs: [pack],
  rules: [],
  snapshot: {
    model: {
      ...model,
      elements: [
        {
          id: createElementId('stable-item'),
          type: 'example:item',
          name: 'Before',
          container: { kind: 'model', id: model.id },
          properties: {},
        },
      ],
    },
    profile: {
      ...model.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    constraints: [],
    extensions: [],
    views: [],
    notationBindings: [],
    applied: [],
    baselines: [],
  },
};
const compare = (after: SemanticComparisonInput): SemanticComparisonResult =>
  compareDocumentSnapshots({
    contractVersion: SEMANTIC_COMPARISON_CONTRACT_VERSION,
    scope: 'semantic-model',
    before: input,
    after,
  });
const advanced: SemanticComparisonInput = {
  ...input,
  snapshot: {
    ...input.snapshot,
    model: { ...input.snapshot.model, revision: createModelRevision('1') },
  },
};
const equal = compare(advanced);
if (equal.status !== 'equivalent' || equal.coverage.status !== 'complete')
  throw new Error('Expected scoped equivalence');
if (equal.before.revision === equal.after.revision)
  throw new Error('Revision evidence must remain distinct');
// A host must still reject commands expecting revision 0 after adopting revision 1.
const renamed: SemanticComparisonInput = {
  ...advanced,
  snapshot: {
    ...advanced.snapshot,
    model: {
      ...advanced.snapshot.model,
      elements: advanced.snapshot.model.elements.map((item) => ({
        ...item,
        name: 'After',
      })),
    },
  },
};
const changed = compare(renamed);
if (
  changed.status !== 'different' ||
  changed.differences.length !== 1 ||
  changed.differences[0].location.path.join('/') !== 'elements/stable-item/name'
)
  throw new Error('Expected rename at stable ID');
const unknown = compare({
  ...input,
  snapshot: {
    ...input.snapshot,
    extensions: [
      {
        pack: pin,
        extension: { id: 'example:opaque', version: '1' },
        payload: { meaning: 'not interpreted' },
      },
    ],
  },
});
if (
  unknown.status !== 'incomplete' ||
  unknown.coverage.status !== 'partial' ||
  !unknown.diagnostics.length
)
  throw new Error('Opaque data must not compare equal');
const incompatible = compare({
  ...input,
  snapshot: {
    ...input.snapshot,
    profile: { ...input.snapshot.profile, version: '2' },
  },
});
if (incompatible.status !== 'incompatible')
  throw new Error('Profile upgrades require explicit handling');
console.log(
  'Semantic comparison: equivalent, renamed, incomplete and incompatible packed public-entry proofs passed.',
);
