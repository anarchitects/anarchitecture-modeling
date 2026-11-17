import {
  createModel,
  createModelRevision,
  createElementId,
  createViewId,
  createElementOccurrenceId,
  validateViews,
  type ModelDocument,
  type ElementReference,
  type DiagramView,
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  validateModel,
  proposeDefaultPlan,
  applyChangePlan,
  DEFAULTS_OPERATOR,
  assessDocument,
  openDocumentSession,
  prepareSessionCommand,
  inspectDocumentReversal,
  pruneDocumentHistory,
  encodeDocument,
  decodeDocument,
  DOCUMENT_CODEC_LIMITS,
  type ModelingPackDefinition,
  type ModelingProfileDefinition,
  type DefaultRule,
  type DocumentCheckpoint,
  type DocumentContext,
  type DocumentCommand,
} from '@anarchitects/modeling-metamodel';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// A synthetic language supplied by the consumer, not a standard implementation.
const pin = { id: 'example', version: '1', contractVersion: '1' };
const pack: ModelingPackDefinition = {
  ...pin,
  displayName: 'Example language',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    {
      kind: 'element',
      id: 'example:item',
      constraints: [],
      properties: [
        {
          id: 'example:state',
          required: false,
          value: { kind: 'scalar', valueType: 'string' },
          defaultValue: { kind: 'scalar', value: 'draft' },
        },
      ],
    },
  ],
};
const profile: ModelingProfileDefinition = {
  id: 'example-profile',
  version: '1',
  selections: [{ dimension: 'method', pack: pin }],
};
// The model stores only profile identity; selections belong in the snapshot.
const empty = createModel('example-model', 'Example', {
  id: profile.id,
  version: profile.version,
});
const item: ElementReference = {
  kind: 'element',
  modelId: empty.id,
  id: createElementId('item'),
};
const model: ModelDocument = {
  ...empty,
  elements: [
    {
      id: item.id,
      type: 'example:item',
      name: 'Original',
      container: { kind: 'model', id: empty.id },
      properties: {},
    },
  ],
};
const composition = composeModelingProfile(profile, [pack]);
check(composition.ok, 'Exact profile must compose');
check(
  !composeModelingProfile(profile, [{ ...pack, version: '2' }]).ok,
  'A newer pack is not a substitute for an exact pin',
);
const validation = { profile, registry: [pack] };
check(
  validateModel({ model, ...validation }).status === 'valid',
  'Known model',
);
const opaque = {
  pack: pin,
  extension: { id: 'example:future' as const, version: '1' },
  payload: { preserve: ['caller', 'data'] },
};
check(
  validateModel({ model, ...validation, extensions: [opaque] }).status ===
    'unsupported',
  'Opaque payloads do not become validated by being retained',
);

// Two occurrences refer to one semantic identity; layout lives in the view.
const view: DiagramView = {
  id: createViewId('view'),
  modelId: model.id,
  name: 'Overview',
  elements: [0, 200].map((x, index) => ({
    kind: 'element-occurrence',
    id: createElementOccurrenceId(`occurrence-${index}`),
    target: item,
    bounds: { x, y: 0, width: 100, height: 50 },
    overrides: {},
    accessibility: { label: 'Item' },
  })),
  connectors: [],
};
check(validateViews(model, [view]).length === 0, 'Two valid occurrences');
const notationReference = {
  pack: pin,
  id: 'example:box' as const,
  version: '1',
};
const rule: DefaultRule = {
  pack: pin,
  rule: { id: 'example:defaults', version: '1', operator: DEFAULTS_OPERATOR },
  subjectType: { pack: pin, kind: 'element', id: 'example:item' },
  dependsOn: [],
  conflicts: [],
  propertyDefaults: true,
  members: [],
};
const context: DocumentContext = {
  packs: [pack],
  validationRules: [],
  defaultRules: [rule],
  theme: { id: 'example-theme', tokens: { surface: '#fff', ink: '#111' } },
  notations: [
    {
      reference: notationReference,
      type: { pack: pin, kind: 'element', id: 'example:item' },
      defaults: {
        shape: 'box',
        fillToken: 'surface',
        strokeToken: 'ink',
        textToken: 'ink',
      },
      allowedOverrides: {},
      accessibility: {
        labelRequired: true,
        nonColorCueRequired: true,
        minimumTextContrast: 4.5,
        minimumGraphicContrast: 3,
      },
    },
  ],
};
const checkpoint: DocumentCheckpoint = {
  snapshot: {
    model,
    applied: [],
    baselines: [],
    profile,
    views: [view],
    constraints: [],
    extensions: [],
    notationBindings: view.elements.map((occurrence) => ({
      view: { modelId: model.id, id: view.id },
      occurrence: { kind: occurrence.kind, id: occurrence.id },
      notation: notationReference,
    })),
  },
  commands: [],
};
const assessment = assessDocument(checkpoint, context);
check(assessment.status === 'valid', 'Trusted checkpoint assessment');
check(
  assessment.notation.every(
    ({ result }) =>
      result.ok &&
      result.value.accessibilityAssessment === 'pending-host-verification',
  ),
  'Rendering/accessibility still needs host verification',
);

// Defaults are explicit proposals. They do not run when a model is created.
const changeContext = { validation, defaultRules: [rule] };
const proposal = proposeDefaultPlan({
  state: checkpoint.snapshot,
  context: changeContext,
  subject: item,
  planId: 'defaults-1',
  nextRevision: createModelRevision('r1'),
  source: { id: 'example-review', revision: '1' },
  rules: [rule],
});
check(proposal.ok, 'Default proposal');
check(proposal.comparisons[0]?.decision === 'add', 'Review proposed default');
check(
  model.elements[0].properties['example:state'] === undefined,
  'Input untouched',
);
const applied = applyChangePlan(
  checkpoint.snapshot,
  proposal.plan,
  changeContext,
);
check(applied.ok, 'Bounded plan applies');
const retried = applyChangePlan(applied.state, proposal.plan, changeContext);
check(retried.ok && retried.status === 'replayed', 'Exact plan retry');

// Use the session coordinator when defaults should join guarded live history.
const policy = {
  maxTransactions: 100,
  maxReceipts: DOCUMENT_CODEC_LIMITS.maxReceipts,
};
const initial = openDocumentSession(checkpoint);
const defaults: DocumentCommand = {
  kind: 'apply-defaults',
  id: 'defaults-command',
  modelId: model.id,
  actor: 'example-user',
  source: proposal.plan.source,
  expectedRevision: model.revision,
  nextRevision: proposal.plan.nextRevision,
  plan: proposal.plan,
};
const preparedDefaults = prepareSessionCommand(
  initial,
  defaults,
  context,
  policy,
);
check(preparedDefaults.status === 'prepared', 'Default session candidate');
// In this in-memory example only, adopting a candidate means assigning it.
// A real host must authorize and atomically recheck expectedRevision at commit.
const rename: DocumentCommand = {
  kind: 'edit',
  id: 'rename-1',
  modelId: model.id,
  actor: 'example-user',
  source: defaults.source,
  expectedRevision: proposal.plan.nextRevision,
  nextRevision: createModelRevision('r2'),
  deletionReviews: [],
  edits: [
    { kind: 'rename', target: item, expected: 'Original', value: 'Renamed' },
  ],
};
const renamed = prepareSessionCommand(
  preparedDefaults.candidate,
  rename,
  context,
  policy,
);
check(renamed.status === 'prepared', 'Rename candidate');
check(
  renamed.candidate.checkpoint.snapshot.model.elements[0].id === item.id,
  'Identity retained',
);
check(
  renamed.candidate.checkpoint.snapshot.views[0].elements[1].bounds.x === 200,
  'Layout retained',
);
check(
  prepareSessionCommand(renamed.candidate, rename, context, policy).status ===
    'replayed',
  'Exact command retry',
);
check(
  prepareSessionCommand(
    renamed.candidate,
    { ...rename, id: 'stale-request' },
    context,
    policy,
  ).status === 'rejected',
  'New stale command rejected',
);
check(
  inspectDocumentReversal(renamed.candidate, 'undo', rename.id).status ===
    'ready',
  'Inspect before undo',
);
const undo: DocumentCommand = {
  kind: 'undo',
  id: 'undo-1',
  transactionId: rename.id,
  modelId: model.id,
  actor: rename.actor,
  source: rename.source,
  expectedRevision: rename.nextRevision,
  nextRevision: createModelRevision('r3'),
  deletionReviews: [], // Rename removes nothing; removals require reviewed impact.
};
const undone = prepareSessionCommand(renamed.candidate, undo, context, policy);
check(undone.status === 'prepared', 'Undo candidate');
check(
  undone.candidate.checkpoint.snapshot.model.elements[0].name === 'Original',
  'Undo restores name',
);
const redone = prepareSessionCommand(
  undone.candidate,
  {
    ...undo,
    kind: 'redo',
    id: 'redo-1',
    expectedRevision: undo.nextRevision,
    nextRevision: createModelRevision('r4'),
  },
  context,
  policy,
);
check(redone.status === 'prepared', 'Redo candidate');
check(
  redone.candidate.checkpoint.snapshot.model.elements[0].name === 'Renamed',
  'Redo restores edit',
);

// Codec classification and permission to edit are distinct decisions.
const encoded = encodeDocument(redone.candidate.checkpoint, context);
check(
  encoded.status === 'encoded' && encoded.classification === 'valid',
  'Encode known format',
);
const decoded = decodeDocument(encoded.bytes, context);
check(
  decoded.status === 'decoded' && decoded.classification === 'valid',
  'Decode known format',
);
check(decoded.source === encoded.bytes, 'Original caller-owned bytes retained');
const reopened = openDocumentSession(decoded.checkpoint);
check(
  reopened.history.undo.length === 0 && reopened.history.redo.length === 0,
  'No restored executable history',
);
check(
  prepareSessionCommand(reopened, rename, context, policy).status ===
    'replayed',
  'Durable retry evidence retained',
);
check(
  pruneDocumentHistory(redone.candidate).checkpoint ===
    redone.candidate.checkpoint,
  'History pruning does not prune receipts',
);
const withOpaque: DocumentCheckpoint = {
  ...checkpoint,
  snapshot: { ...checkpoint.snapshot, extensions: [opaque] },
};
const opaqueBytes = encodeDocument(withOpaque, context);
check(
  opaqueBytes.status === 'encoded' &&
    opaqueBytes.classification === 'unsupported',
  'Opaque data remains unsupported',
);
const opaqueDecoded = decodeDocument(opaqueBytes.bytes, context);
check(
  opaqueDecoded.status === 'decoded' &&
    opaqueDecoded.classification === 'unsupported',
  'Preservation is not validation',
);
check(
  JSON.stringify(opaqueDecoded.checkpoint.snapshot.extensions[0].payload) ===
    JSON.stringify(opaque.payload),
  'Opaque JSON content preserved',
);
check(
  decodeDocument(new Uint8Array([0xff]), context).status === 'not-decoded',
  'Corrupt bytes refused',
);
console.log(
  'Consumer lifecycle example passed: exact pins, coverage, views, defaults, guarded edits/retries, undo/redo and codec recovery.',
);
