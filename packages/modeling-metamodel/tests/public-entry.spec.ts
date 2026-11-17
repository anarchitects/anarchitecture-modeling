import { fileURLToPath } from 'node:url';
import {
  createModel,
  createModelRevision,
  createElementId,
} from '@anarchitects/modeling-core';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Consumer evidence deliberately resolves this package's built public entry.
import * as metamodel from '@anarchitects/modeling-metamodel';

function fixture() {
  const pin = { id: 'consumer-proof', version: '1', contractVersion: '1' };
  const model = createModel('consumer', 'Built metamodel proof', {
    id: 'profile',
    version: '1',
  });
  const target = {
    kind: 'element' as const,
    modelId: model.id,
    id: createElementId('entity'),
  };
  const checkpoint: metamodel.DocumentCheckpoint = {
    snapshot: {
      model: {
        ...model,
        elements: [
          {
            id: target.id,
            type: 'proof:entity',
            name: 'Entity',
            container: { kind: 'model', id: model.id },
            properties: {},
          },
        ],
      },
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
  const context: metamodel.DocumentContext = {
    packs: [
      {
        ...pin,
        displayName: 'Synthetic consumer',
        implementation: 'scaffold',
        dimensions: ['method'],
        requires: [],
        conflicts: [],
        constraints: [],
        extensions: [],
        types: [
          {
            kind: 'element',
            id: 'proof:entity',
            properties: [],
            constraints: [],
          },
        ],
      },
    ],
    validationRules: [],
    defaultRules: [],
    notations: [],
    theme: { id: 'consumer', tokens: {} },
  };
  const command: metamodel.DocumentCommand = {
    kind: 'edit',
    id: 'rename',
    modelId: model.id,
    expectedRevision: model.revision,
    nextRevision: createModelRevision('edit-1'),
    actor: 'consumer',
    source: { id: 'review', revision: '1' },
    deletionReviews: [],
    edits: [{ kind: 'rename', target, expected: 'Entity', value: 'Renamed' }],
  };
  return { checkpoint, context, command };
}

describe('built metamodel public contract', () => {
  it('resolves ordinary ESM exports and preserves the runtime surface and capacity constants', () => {
    expect(
      fileURLToPath(
        import.meta.resolve('@anarchitects/modeling-metamodel'),
      ).replaceAll('\\', '/'),
    ).toMatch(/\/modeling-metamodel\/dist\/index\.js$/);
    expect(Object.keys(metamodel).sort()).toEqual(
      [
        'DEFAULTS_OPERATOR',
        'DEFAULT_DOCUMENT_HISTORY_POLICY',
        'DOCUMENT_CODEC_LIMITS',
        'DOCUMENT_ENVELOPE_FORMAT',
        'DOCUMENT_ENVELOPE_VERSION',
        'MEMBER_GROUP_OPERATOR',
        'METAMODEL_CONTRACT_VERSION',
        'PROFILE_DIMENSIONS',
        'applyChangePlan',
        'assessDocument',
        'composeModelingProfile',
        'decodeDocument',
        'encodeDocument',
        'generatedMemberIdentity',
        'historyDiagnostics',
        'inspectDocumentDeletion',
        'inspectDocumentReversal',
        'inspectExtensionSupport',
        'openDocumentSession',
        'packReference',
        'prepareSemanticCommand',
        'prepareSessionCommand',
        'prepareViewCommand',
        'proposeDefaultPlan',
        'pruneDocumentHistory',
        'resolveModelingPack',
        'resolveOccurrenceNotation',
        'resolveTypeDefinition',
        'reviewDeletion',
        'validateModel',
        'validateOccurrenceNotation',
      ].sort(),
    );
    expect(metamodel.DEFAULT_DOCUMENT_HISTORY_POLICY).toEqual({
      maxTransactions: 100,
      maxReceipts: 10000,
    });
    expect(metamodel.DOCUMENT_CODEC_LIMITS.maxReceipts).toBe(256);
    expect(metamodel.DOCUMENT_ENVELOPE_FORMAT).toBe('archimatrix-document');
    expect(metamodel.DOCUMENT_ENVELOPE_VERSION).toBe(1);
  });

  it('resolves exact composition and rejects absent versions without upgrading', () => {
    const { checkpoint, context } = fixture();
    expect(metamodel.assessDocument(checkpoint, context).status).toBe('valid');
    expect(
      metamodel.composeModelingProfile(
        checkpoint.snapshot.profile,
        context.packs,
      ).ok,
    ).toBe(true);
    expect(() =>
      metamodel.resolveModelingPack(context.packs, {
        id: 'consumer-proof',
        version: '2',
      }),
    ).toThrow();
  });

  it('prepares guarded edits without adopting state and preserves retry evidence through codec reopen', () => {
    const { checkpoint, context, command } = fixture();
    const before = structuredClone(checkpoint);
    const session = metamodel.openDocumentSession(checkpoint);
    const changed = metamodel.prepareSessionCommand(session, command, context);
    expect(changed.status).toBe('prepared');
    if (changed.status !== 'prepared') throw new Error(JSON.stringify(changed));
    expect(changed.candidate.checkpoint.snapshot.model.elements[0].name).toBe(
      'Renamed',
    );
    expect(changed.candidate.history.undo).toEqual(['rename']);
    expect(checkpoint).toEqual(before);
    expect(session.history).toEqual({ undo: [], redo: [] });
    expect(
      metamodel.prepareSessionCommand(changed.candidate, command, context)
        .status,
    ).toBe('replayed');
    const stale = {
      ...command,
      id: 'stale',
      nextRevision: createModelRevision('edit-2'),
    };
    expect(
      metamodel.prepareSessionCommand(changed.candidate, stale, context).status,
    ).toBe('rejected');
    const encoded = metamodel.encodeDocument(
      changed.candidate.checkpoint,
      context,
    );
    expect(encoded.status).toBe('encoded');
    if (encoded.status !== 'encoded') throw new Error(JSON.stringify(encoded));
    const decoded = metamodel.decodeDocument(encoded.bytes, context);
    expect(decoded.status).toBe('decoded');
    if (decoded.status !== 'decoded') throw new Error(JSON.stringify(decoded));
    expect(decoded.classification).toBe('valid');
    expect(decoded.source).toBe(encoded.bytes);
    expect(JSON.parse(JSON.stringify(decoded.checkpoint))).toEqual(
      JSON.parse(JSON.stringify(changed.candidate.checkpoint)),
    );
    const reopened = metamodel.openDocumentSession(decoded.checkpoint);
    expect(reopened.history).toEqual({ undo: [], redo: [] });
    expect(
      metamodel.prepareSessionCommand(reopened, command, context).status,
    ).toBe('replayed');
  });

  it('keeps corrupt and future envelopes distinct and retains caller-owned bytes', () => {
    const { context, checkpoint } = fixture();
    const corrupt = new Uint8Array([0xff]);
    const future = new TextEncoder().encode(
      JSON.stringify({
        format: 'archimatrix-document',
        envelopeVersion: 2,
        checkpoint,
      }),
    );
    for (const [bytes, reason] of [
      [corrupt, 'corrupt'],
      [future, 'unsupported-format'],
    ] as const) {
      const before = bytes.slice();
      const result = metamodel.decodeDocument(bytes, context);
      expect(result).toMatchObject({ status: 'not-decoded', reason });
      expect(result.source).toBe(bytes);
      expect(bytes).toEqual(before);
    }
  });
});
