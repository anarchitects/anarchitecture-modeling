import assert from 'node:assert/strict';
import {
  createModel,
  createElementId,
  createViewId,
  createElementOccurrenceId,
  validateViews,
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  validateModel,
  resolveOccurrenceNotation,
  applyChangePlan,
  assessDocument,
  prepareSemanticCommand,
  prepareViewCommand,
  validateOccurrenceNotation,
  openDocumentSession,
  prepareSessionCommand,
  inspectDocumentReversal,
  pruneDocumentHistory,
  encodeDocument,
  decodeDocument,
} from '@anarchitects/modeling-metamodel';

// Node resolves built package exports; no source aliases or deep imports are used.
const pin = { id: 'consumer-proof', version: '1', contractVersion: '1' };
const model = {
  ...createModel('consumer', 'Built entry point proof', {
    id: 'consumer-profile',
    version: '1',
  }),
  elements: [
    {
      id: createElementId('entity'),
      type: 'consumer:entity',
      name: 'Entity',
      container: { kind: 'model', id: 'consumer' },
      properties: {},
    },
  ],
};
const pack = {
  ...pin,
  displayName: 'Synthetic consumer',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    { kind: 'element', id: 'consumer:entity', properties: [], constraints: [] },
  ],
};
const profile = {
  ...model.profile,
  selections: [{ dimension: 'method', pack: pin }],
};
const validation = { profile, registry: [pack] };
const composition = composeModelingProfile(profile, [pack]);
assert.equal(composition.ok, true);
assert.equal(validateModel({ model, ...validation }).status, 'valid');
const view = {
  id: createViewId('view'),
  modelId: model.id,
  name: 'View',
  elements: [
    {
      kind: 'element-occurrence',
      id: createElementOccurrenceId('occurrence'),
      target: { kind: 'element', modelId: model.id, id: model.elements[0].id },
      bounds: { x: 0, y: 0, width: 100, height: 50 },
      overrides: {},
      accessibility: { label: 'Entity' },
    },
  ],
  connectors: [],
};
assert.deepEqual(validateViews(model, [view]), []);
const reference = { pack: pin, id: 'consumer:notation', version: '1' };
const notation = {
  reference,
  type: { pack: pin, kind: 'element', id: 'consumer:entity' },
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
};
const resolved = resolveOccurrenceNotation({
  model,
  view,
  occurrence: view.elements[0],
  notation: reference,
  registry: [notation],
  composition: composition.value,
  theme: { id: 'smoke', tokens: { surface: '#fff', ink: '#111' } },
});
assert.equal(resolved.ok, true);
assert.equal(
  resolved.value.accessibilityAssessment,
  'pending-host-verification',
);
const state = { model, applied: [], baselines: [] };
const plan = {
  id: 'consumer-plan',
  modelId: model.id,
  expectedRevision: model.revision,
  nextRevision: 'consumer-1',
  source: { id: 'review', revision: '1' },
  rules: [],
  operations: [],
  baselineUpdates: [],
};
const next = applyChangePlan(state, plan, { validation, defaultRules: [] });
assert.equal(next.ok, true);
assert.equal(next.status, 'applied');
assert.equal(
  applyChangePlan(next.state, plan, { validation, defaultRules: [] }).status,
  'replayed',
);
assert.equal(state.model.revision, '0');
const checkpoint = {
  snapshot: {
    ...state,
    profile,
    views: [view],
    constraints: [],
    extensions: [],
    notationBindings: [
      {
        view: { modelId: model.id, id: view.id },
        occurrence: { kind: view.elements[0].kind, id: view.elements[0].id },
        notation: reference,
      },
    ],
  },
  commands: [],
};
const documentContext = {
  packs: [pack],
  validationRules: [],
  defaultRules: [],
  notations: [notation],
  theme: { id: 'smoke', tokens: { surface: '#fff', ink: '#111' } },
};
assert.equal(assessDocument(checkpoint, documentContext).status, 'valid');
const command = {
  kind: 'edit',
  id: 'rename-consumer',
  modelId: model.id,
  actor: 'consumer',
  source: { id: 'review', revision: '1' },
  expectedRevision: model.revision,
  nextRevision: 'semantic-1',
  deletionReviews: [],
  edits: [
    {
      kind: 'rename',
      target: view.elements[0].target,
      expected: 'Entity',
      value: 'Renamed entity',
    },
  ],
};
const prepared = prepareSemanticCommand(checkpoint, command, documentContext);
assert.equal(prepared.status, 'prepared');
assert.equal(
  prepared.candidate.snapshot.model.elements[0].name,
  'Renamed entity',
);
assert.equal(prepared.candidate.commands[0].inverse[0].kind, 'rename');
assert.equal(
  prepareSemanticCommand(prepared.candidate, command, documentContext).status,
  'replayed',
);
assert.equal(model.elements[0].name, 'Entity');
const viewCommand = {
  ...command,
  id: 'move-consumer',
  expectedRevision: prepared.candidate.snapshot.model.revision,
  nextRevision: 'view-1',
  edits: [
    {
      kind: 'replace-occurrence',
      view: { modelId: model.id, id: view.id },
      expected: view.elements[0],
      value: {
        ...view.elements[0],
        bounds: { ...view.elements[0].bounds, x: 42 },
      },
    },
  ],
};
const moved = prepareViewCommand(
  prepared.candidate,
  viewCommand,
  documentContext,
);
assert.equal(moved.status, 'prepared');
assert.equal(moved.candidate.snapshot.views[0].elements[0].bounds.x, 42);
assert.deepEqual(
  moved.candidate.snapshot.model.elements,
  prepared.candidate.snapshot.model.elements,
);
assert.equal(moved.candidate.commands[1].inverse[0].kind, 'replace-occurrence');
assert.equal(
  prepareViewCommand(moved.candidate, viewCommand, documentContext).status,
  'replayed',
);
const movedComposition = composeModelingProfile(profile, [pack]);
assert.equal(movedComposition.ok, true);
const appearance = validateOccurrenceNotation({
  model: moved.candidate.snapshot.model,
  view: moved.candidate.snapshot.views[0],
  occurrence: view.elements[0],
  notation: reference,
  registry: [notation],
  composition: movedComposition.value,
});
assert.equal(appearance.ok, true);
assert.equal(
  appearance.value.accessibilityAssessment,
  'pending-host-verification',
);
assert.equal(Object.hasOwn(appearance.value, 'themeId'), false);
const session = openDocumentSession(moved.candidate);
const sessionRequest = {
  ...viewCommand,
  id: 'session-rename-view',
  expectedRevision: moved.candidate.snapshot.model.revision,
  nextRevision: 'session-1',
  edits: [
    {
      kind: 'rename-view',
      view: { modelId: model.id, id: view.id },
      expected: view.name,
      value: 'Session view',
    },
  ],
};
const sessionEdit = prepareSessionCommand(
  session,
  sessionRequest,
  documentContext,
);
assert.equal(sessionEdit.status, 'prepared');
assert.deepEqual(sessionEdit.candidate.history.undo, [sessionRequest.id]);
assert.equal(
  inspectDocumentReversal(sessionEdit.candidate, 'undo', sessionRequest.id)
    .status,
  'ready',
);
const undo = prepareSessionCommand(
  sessionEdit.candidate,
  {
    modelId: sessionRequest.modelId,
    actor: sessionRequest.actor,
    source: sessionRequest.source,
    kind: 'undo',
    id: 'session-undo',
    transactionId: sessionRequest.id,
    expectedRevision: 'session-1',
    nextRevision: 'session-2',
    deletionReviews: [],
  },
  documentContext,
);
assert.equal(undo.status, 'prepared');
assert.equal(undo.candidate.checkpoint.snapshot.views[0].name, view.name);
const redo = prepareSessionCommand(
  undo.candidate,
  {
    modelId: sessionRequest.modelId,
    actor: sessionRequest.actor,
    source: sessionRequest.source,
    kind: 'redo',
    id: 'session-redo',
    transactionId: sessionRequest.id,
    expectedRevision: 'session-2',
    nextRevision: 'session-3',
    deletionReviews: [],
  },
  documentContext,
);
assert.equal(redo.status, 'prepared');
assert.equal(redo.candidate.checkpoint.snapshot.views[0].name, 'Session view');
const reopened = openDocumentSession(
  pruneDocumentHistory(redo.candidate).checkpoint,
);
assert.deepEqual(reopened.history, { undo: [], redo: [] });
assert.equal(
  prepareSessionCommand(reopened, sessionRequest, documentContext).status,
  'replayed',
);
const encoded = encodeDocument(reopened.checkpoint, documentContext);
assert.equal(encoded.status, 'encoded');
assert.equal(encoded.classification, 'valid');
const decoded = decodeDocument(encoded.bytes, documentContext);
assert.equal(decoded.status, 'decoded');
assert.equal(decoded.classification, 'valid');
// Decoded records have null prototypes; compare semantic JSON content.
assert.deepEqual(
  JSON.parse(JSON.stringify(decoded.checkpoint)),
  JSON.parse(JSON.stringify(reopened.checkpoint)),
);
assert.equal(decoded.source, encoded.bytes);
const loaded = openDocumentSession(decoded.checkpoint);
assert.deepEqual(loaded.history, { undo: [], redo: [] });
assert.equal(
  prepareSessionCommand(loaded, sessionRequest, documentContext).status,
  'replayed',
);
assert.equal(
  decodeDocument(new Uint8Array([0xff]), documentContext).status,
  'not-decoded',
);
console.log(
  'Built public exports passed: notation/theme checks, bounded plans, semantic/view commands and session undo/redo/reopen retries with a versioned codec round-trip.',
);
