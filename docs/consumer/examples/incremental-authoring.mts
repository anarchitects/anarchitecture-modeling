// Preview: opt-in incremental authoring through the public package API.
import {
  createModel,
  createElementId,
  createModelRevision,
} from '@anarchitects/modeling-core';
import {
  prepareAuthoringImport,
  prepareAuthoringCommand,
  prepareSessionCommand,
  openDocumentSession,
  encodeAuthoringDocument,
  decodeAuthoringDocument,
  decodeDocument,
  compareDocumentSnapshots,
  type AuthoringContext,
  type AuthoringSession,
  type AuthoringCommand,
  type DocumentCheckpoint,
  type DocumentCommand,
  type DocumentEdit,
  type PrepareAuthoringResult,
  type DocumentCommitPort,
} from '@anarchitects/modeling-metamodel';
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const model = createModel('sales', 'Sales', { id: 'sales', version: '1' });
const pin = { id: 'sales', version: '1', contractVersion: '1' };
const type = {
  pack: pin,
  kind: 'element' as const,
  id: 'sales:entity' as const,
};
const context: AuthoringContext = {
  policy: {
    id: 'draft-metadata',
    version: '1',
    contractVersion: '1',
    profile: model.profile,
    allowMissing: ['sales:definition', 'sales:owner'].map((property) => ({
      type,
      property: property as 'sales:definition' | 'sales:owner',
    })),
  },
  document: {
    packs: [
      {
        ...pin,
        displayName: 'Synthetic sales',
        implementation: 'scaffold',
        dimensions: ['method'],
        requires: [],
        conflicts: [],
        constraints: [],
        extensions: [],
        types: [
          {
            kind: 'element',
            id: type.id,
            constraints: [],
            properties: ['sales:definition', 'sales:owner'].map((id) => ({
              id: id as 'sales:definition' | 'sales:owner',
              required: true,
              value: { kind: 'scalar', valueType: 'string' },
            })),
          },
        ],
      },
    ],
    validationRules: [],
    defaultRules: [],
    notations: [],
    theme: { id: 'plain', tokens: {} },
  },
};
const checkpoint: DocumentCheckpoint = {
  snapshot: {
    model,
    profile: {
      ...model.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    views: [],
    constraints: [],
    extensions: [],
    notationBindings: [],
    applied: [],
    baselines: [],
  },
  commands: [],
};
const customer = {
  id: createElementId('customer'),
  type: type.id,
  name: 'Customer',
  container: { kind: 'model' as const, id: model.id },
  properties: {},
};
function command(
  cp: DocumentCheckpoint,
  id: string,
  edits: readonly DocumentEdit[] = [],
): DocumentCommand {
  return {
    kind: 'edit',
    id,
    modelId: model.id,
    actor: 'host-authorized-user',
    source: { id: 'example', revision: '1' },
    expectedRevision: cp.snapshot.model.revision,
    nextRevision: createModelRevision(id),
    edits,
    deletionReviews: [],
  };
}
function prepared(result: PrepareAuthoringResult) {
  check(result.status === 'authoring-prepared', JSON.stringify(result));
  return result;
}
const create = [{ kind: 'create-element' as const, value: customer }];
check(
  prepareSessionCommand(
    openDocumentSession(checkpoint),
    command(checkpoint, 'strict-create', create),
    context.document,
  ).status === 'rejected',
  'Strict creation must still reject missing requirements',
);
let session: AuthoringSession = prepared(
  prepareAuthoringImport(checkpoint, command(checkpoint, 'import'), context),
).candidate;
const request = (
  id: string,
  edits: readonly DocumentEdit[],
): AuthoringCommand => ({
  command: command(session.checkpoint.document, id, edits),
  binding: session.checkpoint.binding,
});
const created = prepared(
  prepareAuthoringCommand(session, request('create', create), context),
);
check(
  created.assessment.admission === 'incomplete' &&
    created.assessment.assessment.status === 'invalid',
  'Admitted does not mean semantically valid',
);
check(
  created.assessment.deficiencies.length === 2,
  'Both exact required fields remain missing',
);
session = created.candidate;
const input = {
  snapshot: session.checkpoint.document.snapshot,
  packs: context.document.packs,
  rules: [],
};
check(
  compareDocumentSnapshots({
    contractVersion: '1',
    scope: 'semantic-model',
    before: input,
    after: input,
  }).status === 'incomplete',
  'Comparator does not infer validity',
);
const complete = prepared(
  prepareAuthoringCommand(
    session,
    request(
      'complete',
      ['sales:definition', 'sales:owner'].map((property) => ({
        kind: 'set-property',
        target: { kind: 'element', modelId: model.id, id: customer.id },
        property,
        expected: { present: false },
        value: {
          present: true,
          value: {
            kind: 'scalar',
            value:
              property === 'sales:definition'
                ? 'Party placing an order'
                : 'Sales team',
          },
        },
      })),
    ),
    context,
  ),
);
check(
  complete.assessment.admission === 'complete',
  'Adding required information completes the model',
);
session = complete.candidate;
const undo: AuthoringCommand = {
  binding: session.checkpoint.binding,
  command: {
    kind: 'undo',
    id: 'undo',
    actor: 'host-authorized-user',
    modelId: model.id,
    source: { id: 'example', revision: '1' },
    expectedRevision: session.checkpoint.document.snapshot.model.revision,
    nextRevision: createModelRevision('undo'),
    transactionId: 'complete',
  },
};
session = prepared(prepareAuthoringCommand(session, undo, context)).candidate;
check(
  prepareAuthoringCommand(session, complete.command, {
    document: context.document,
  }).status === 'authoring-replayed',
  'Historical replay is not a new write',
);
const encoded = encodeAuthoringDocument(session.checkpoint, context);
check(encoded.status === 'encoded', JSON.stringify(encoded));
export const draftBytes = encoded.bytes;
const legacy = decodeDocument(encoded.bytes, context.document);
check(
  legacy.status === 'not-decoded' &&
    legacy.reason === 'unsupported-format' &&
    legacy.source === encoded.bytes,
  'Legacy decoder preserves unsupported bytes',
);
const reopened = decodeAuthoringDocument(encoded.bytes, context);
check(reopened.status === 'decoded', JSON.stringify(reopened));
check(
  reopened.assessment.admission === 'incomplete' &&
    reopened.session.history.undo.length === 0,
  'Reopen retains deficiencies, not live stacks',
);
check(
  prepareAuthoringCommand(reopened.session, complete.command, context)
    .status === 'authoring-replayed',
  'Exact retry survives reopen',
);
const unavailable = decodeAuthoringDocument(encoded.bytes, {
  document: context.document,
});
check(
  unavailable.status === 'decoded' &&
    unavailable.assessment.admission === 'blocked',
  'No policy means recovery only',
);
check(
  prepareAuthoringCommand(
    session,
    {
      ...complete.command,
      binding: { ...complete.command.binding, definitionKey: 'changed' },
    },
    context,
  ).status === 'rejected',
  'Policy context is part of identity',
);
const typesOnly = (legacyPort: DocumentCommitPort) => {
  // @ts-expect-error Separate success discriminator and candidate prevent legacy commit.
  void legacyPort.commit(complete);
  // @ts-expect-error Authoring checkpoints cannot silently enter legacy session APIs.
  openDocumentSession(session.checkpoint);
};
void typesOnly;
console.log(
  'Authoring public contract: strict rejection → incomplete create → complete enrichment → incomplete undo → durable replay/recovery passed.',
);
