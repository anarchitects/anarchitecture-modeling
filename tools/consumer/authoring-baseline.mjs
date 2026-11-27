// Original synthetic research fixture for #83. Run in an isolated npm consumer.
import assert from 'node:assert/strict';
import {
  createModel,
  createElementId,
  createModelRevision,
} from '@anarchitects/modeling-core';
import {
  assessDocument,
  compareDocumentSnapshots,
  decodeDocument,
  encodeDocument,
  openDocumentSession,
  prepareSemanticCommand,
  prepareSessionCommand,
} from '@anarchitects/modeling-metamodel';
import core from '@anarchitects/modeling-core/package.json' with { type: 'json' };
import metamodel from '@anarchitects/modeling-metamodel/package.json' with { type: 'json' };

assert.equal(core.version, '0.0.2');
assert.equal(metamodel.version, '0.0.2');
assert.equal(metamodel.dependencies['@anarchitects/modeling-core'], '0.0.2');
const pin = {
  id: 'authoring-baseline',
  version: '1.0.0',
  contractVersion: '1',
};
const pack = {
  ...pin,
  displayName: 'Synthetic authoring research',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    {
      kind: 'element',
      id: 'research:entity',
      constraints: [],
      properties: [
        {
          id: 'research:definition',
          required: true,
          value: { kind: 'scalar', valueType: 'string' },
        },
      ],
    },
  ],
};
const model = createModel('authoring-baseline', 'Synthetic sales', {
  id: 'research-profile',
  version: '1.0.0',
});
const context = {
  packs: [pack],
  validationRules: [],
  defaultRules: [],
  notations: [],
  theme: { id: 'research', tokens: {} },
};
const empty = {
  snapshot: {
    model,
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
  commands: [],
};
const customer = {
  id: createElementId('customer-1'),
  type: 'research:entity',
  name: 'Customer',
  container: { kind: 'model', id: model.id },
  properties: {},
};
const definition = { kind: 'scalar', value: 'A party placing an order' };
const command = (id, edits) => ({
  id,
  kind: 'edit',
  modelId: model.id,
  actor: 'synthetic-author',
  source: { id: 'research', revision: '1' },
  expectedRevision: model.revision,
  nextRevision: createModelRevision('1'),
  edits,
  deletionReviews: [],
});
const create = command('create-customer', [
  { kind: 'create-element', value: customer },
]);
const incomplete = {
  ...empty,
  snapshot: { ...empty.snapshot, model: { ...model, elements: [customer] } },
};
const repair = command('describe-customer', [
  {
    kind: 'set-property',
    target: { kind: 'element', modelId: model.id, id: customer.id },
    property: 'research:definition',
    expected: { present: false },
    value: { present: true, value: definition },
  },
]);
const atomic = command('create-complete-customer', [
  {
    kind: 'create-element',
    value: { ...customer, properties: { 'research:definition': definition } },
  },
]);
const observations = [];
for (const [name, prepare] of [
  ['semantic', (cp, cmd) => prepareSemanticCommand(cp, cmd, context)],
  [
    'session',
    (cp, cmd) => prepareSessionCommand(openDocumentSession(cp), cmd, context),
  ],
]) {
  for (const [label, cp, cmd, code] of [
    ['missing candidate property', empty, create, 'command.invalid-candidate'],
    ['repair incomplete original', incomplete, repair, 'command.not-editable'],
  ]) {
    const result = prepare(cp, cmd);
    assert.equal(result.status, 'rejected');
    assert.ok(result.diagnostics.some((d) => d.code === code));
    observations.push({ path: name, case: label, outcome: code });
  }
  assert.equal(prepare(empty, atomic).status, 'prepared');
  observations.push({
    path: name,
    case: 'fully populated atomic create',
    outcome: 'prepared',
  });
}
const assessment = assessDocument(incomplete, context);
assert.equal(assessment.status, 'invalid');
assert.equal(assessment.semantics.structure, 'valid');
assert.equal(assessment.semantics.semantics, 'complete');
assert.ok(
  assessment.semantics.diagnostics.some(
    (d) => d.code === 'validation.required-property',
  ),
);
observations.push({
  case: 'missing required property',
  outcome:
    'structurally valid; complete validation coverage; semantically invalid',
});
const encoded = encodeDocument(incomplete, context);
assert.equal(encoded.status, 'encoded');
assert.equal(encoded.classification, 'invalid');
const reopened = decodeDocument(encoded.bytes, context);
assert.equal(reopened.status, 'decoded');
assert.equal(reopened.classification, 'invalid');
observations.push({
  case: 'preserve incomplete envelope',
  outcome: 'encodes/reopens as invalid; not edit authorization',
});
const input = {
  snapshot: incomplete.snapshot,
  packs: context.packs,
  rules: [],
};
const comparison = compareDocumentSnapshots({
  contractVersion: '1',
  scope: 'semantic-model',
  before: input,
  after: input,
});
assert.equal(comparison.status, 'incomplete');
observations.push({
  case: 'compare identical incomplete snapshots',
  outcome: 'incomplete',
});
console.log(
  JSON.stringify(
    {
      packages: { core: core.version, metamodel: metamodel.version },
      observations,
    },
    null,
    2,
  ),
);
