import {
  createModel,
  createModelRevision,
  createElementId,
  createViewId,
  createElementOccurrenceId,
  validateViews,
  type DiagramView,
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  validateModel,
  resolveOccurrenceNotation,
  type DocumentAssessment,
  type DocumentCheckpoint,
  type DocumentCommand,
  type DocumentCommitPort,
  type DocumentContext,
  type DocumentDiagnostic,
  type DocumentSnapshot,
  type DocumentLoadResult,
  type PrepareDocumentResult,
  type DocumentSession,
} from '../index.js';

function fixture() {
  const pin = { id: 'session-proof', version: '1', contractVersion: '1' };
  const empty = createModel('model', 'Session proof', {
    id: 'profile',
    version: '1',
  });
  const element = {
    id: createElementId('actor'),
    type: 'proof:actor',
    name: 'Actor',
    container: { kind: 'model' as const, id: empty.id },
    properties: {},
  };
  const model = { ...empty, elements: [element] };
  const views: DiagramView[] = ['one', 'two'].map((id) => ({
    id: createViewId(id),
    modelId: model.id,
    name: id,
    elements: [
      {
        kind: 'element-occurrence',
        id: createElementOccurrenceId('actor'),
        target: { kind: 'element', modelId: model.id, id: element.id },
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        overrides: {},
        accessibility: { label: 'Actor' },
      },
    ],
    connectors: [],
  }));
  const notation = {
    pack: pin,
    id: 'proof:actor-notation' as const,
    version: '1',
  };
  const snapshot: DocumentSnapshot = {
    model,
    profile: {
      ...model.profile,
      selections: [{ dimension: 'method', pack: pin }],
    },
    views,
    constraints: [],
    extensions: [],
    baselines: [],
    applied: [],
    notationBindings: views.map((view) => ({
      view: { modelId: model.id, id: view.id },
      occurrence: { kind: 'element-occurrence', id: view.elements[0].id },
      notation,
    })),
  };
  const context: DocumentContext = {
    packs: [
      {
        ...pin,
        displayName: 'Synthetic session',
        implementation: 'scaffold',
        dimensions: ['method'],
        requires: [],
        conflicts: [],
        extensions: [],
        constraints: [],
        types: [
          {
            kind: 'element',
            id: 'proof:actor',
            properties: [],
            constraints: [],
          },
        ],
      },
    ],
    validationRules: [],
    defaultRules: [],
    notations: [
      {
        reference: notation,
        type: { pack: pin, kind: 'element', id: 'proof:actor' },
        defaults: {
          shape: 'box',
          fillToken: 'surface',
          textToken: 'ink',
          strokeToken: 'ink',
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
    theme: { id: 'host', tokens: { surface: '#fff', ink: '#111' } },
  };
  const checkpoint: DocumentCheckpoint = { snapshot, commands: [] };
  const command: DocumentCommand = {
    kind: 'edit',
    id: 'rename',
    modelId: model.id,
    actor: 'fixture-author',
    source: { id: 'review', revision: '1' },
    expectedRevision: model.revision,
    nextRevision: createModelRevision('revision-1'),
    deletionReviews: [],
    edits: [
      {
        kind: 'rename',
        target: { kind: 'element', modelId: model.id, id: element.id },
        expected: element.name,
        value: 'Renamed actor',
      },
    ],
  };
  return { checkpoint, context, command };
}

function diagnostic(
  snapshot: DocumentSnapshot,
  code: string,
  path: readonly (string | number)[] = [],
): DocumentDiagnostic {
  return {
    code,
    severity: 'error',
    message: 'Review this fixture input before preparing a command.',
    location: { modelId: snapshot.model.id, section: 'command', path },
  };
}

/** Test-only adapter. Only the empty generation-metadata subset is assessed here. */
function assess(
  snapshot: DocumentSnapshot,
  context: DocumentContext,
): DocumentAssessment {
  const semantics = validateModel({
    model: snapshot.model,
    profile: snapshot.profile,
    registry: context.packs,
    constraints: snapshot.constraints,
    extensions: snapshot.extensions,
    rules: context.validationRules,
  });
  const views = validateViews(snapshot.model, snapshot.views);
  const composition = composeModelingProfile(snapshot.profile, context.packs);
  const diagnostics: DocumentDiagnostic[] = [];
  const notation: DocumentAssessment['notation'][number][] = [];
  for (const view of snapshot.views)
    for (const occurrence of [...view.elements, ...view.connectors]) {
      const bindings = snapshot.notationBindings.filter(
        (binding) =>
          binding.view.modelId === view.modelId &&
          binding.view.id === view.id &&
          binding.occurrence.kind === occurrence.kind &&
          binding.occurrence.id === occurrence.id,
      );
      if (bindings.length !== 1 || !composition.ok) {
        diagnostics.push({
          ...diagnostic(snapshot, 'fixture.notation-coverage'),
          location: {
            modelId: snapshot.model.id,
            section: 'notationBindings',
            path: [],
            view: { modelId: view.modelId, id: view.id },
            occurrence,
          },
        });
        continue;
      }
      notation.push({
        binding: bindings[0],
        result: resolveOccurrenceNotation({
          model: snapshot.model,
          view,
          occurrence,
          notation: bindings[0].notation,
          registry: context.notations,
          composition: composition.value,
          theme: context.theme,
        }),
      });
    }
  for (const binding of snapshot.notationBindings) {
    if (
      !snapshot.views.some(
        (view) =>
          view.id === binding.view.id &&
          view.modelId === binding.view.modelId &&
          [...view.elements, ...view.connectors].some(
            (occurrence) =>
              occurrence.kind === binding.occurrence.kind &&
              occurrence.id === binding.occurrence.id,
          ),
      )
    ) {
      diagnostics.push(
        diagnostic(snapshot, 'fixture.dangling-notation-binding'),
      );
    }
  }
  const lifecycle =
    snapshot.baselines.length || snapshot.applied.length
      ? 'not-checked'
      : 'valid';
  const invalid =
    semantics.status === 'invalid' ||
    views.length > 0 ||
    diagnostics.length > 0 ||
    notation.some((n) => !n.result.ok);
  return {
    status: invalid
      ? 'invalid'
      : lifecycle === 'not-checked'
        ? 'unsupported'
        : semantics.status,
    semantics,
    views,
    notation,
    diagnostics,
    lifecycle,
  };
}

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Executable protocol sketch, not an exported executor. Supports only element rename,
 * element-occurrence replacement and a reviewed zero-edit receipt. #33–#35 own the rest.
 */
function prepare(
  checkpoint: DocumentCheckpoint,
  command: DocumentCommand,
  context: DocumentContext,
): PrepareDocumentResult {
  const { snapshot } = checkpoint;
  const reject = (
    code: string,
    assessment?: DocumentAssessment,
  ): PrepareDocumentResult => ({
    status: 'rejected',
    diagnostics: [diagnostic(snapshot, code)],
    ...(assessment && { assessment }),
  });
  const receipts = checkpoint.commands.filter(
    (r) => r.command.id === command.id,
  );
  if (receipts.length)
    return receipts.length === 1 && equal(receipts[0].command, command)
      ? { status: 'replayed', receipt: receipts[0] }
      : reject('fixture.reused-command');
  if (
    !command.id.trim() ||
    !command.actor.trim() ||
    !command.source.id.trim() ||
    !command.source.revision.trim() ||
    command.modelId !== snapshot.model.id ||
    command.expectedRevision !== snapshot.model.revision
  )
    return reject('fixture.stale-or-invalid-command');
  if (
    !command.nextRevision.trim() ||
    command.nextRevision === snapshot.model.revision ||
    checkpoint.commands.some(
      (r) =>
        r.beforeRevision === command.nextRevision ||
        r.afterRevision === command.nextRevision,
    )
  )
    return reject('fixture.reused-revision');
  const initial = assess(snapshot, context);
  if (initial.status !== 'valid' || initial.lifecycle !== 'valid')
    return reject('fixture.not-editable', initial);
  if (command.kind !== 'edit' || command.deletionReviews.length)
    return reject('fixture.unimplemented-command');
  // Guards always read the ORIGINAL snapshot, not a partially modified candidate.
  let model = snapshot.model;
  let views = snapshot.views;
  const writes = new Set<string>();
  for (const edit of command.edits) {
    if (edit.kind === 'rename' && edit.target.kind === 'element') {
      const entity = snapshot.model.elements.find(
        (e) => e.id === edit.target.id,
      );
      const key = `element:${edit.target.id}`;
      if (
        !entity ||
        edit.target.modelId !== model.id ||
        entity.name !== edit.expected ||
        !edit.value.trim() ||
        writes.has(key)
      )
        return reject('fixture.precondition');
      writes.add(key);
      model = {
        ...model,
        elements: model.elements.map((e) =>
          e.id === entity.id ? { ...e, name: edit.value } : e,
        ),
      };
    } else if (
      edit.kind === 'replace-occurrence' &&
      edit.expected.kind === 'element-occurrence' &&
      edit.value.kind === 'element-occurrence'
    ) {
      const view = snapshot.views.find(
        (v) => v.id === edit.view.id && v.modelId === edit.view.modelId,
      );
      const occurrence = view?.elements.find((o) => o.id === edit.expected.id);
      const key = `view:${edit.view.id}:${edit.expected.id}`;
      if (
        !view ||
        !occurrence ||
        !equal(occurrence, edit.expected) ||
        edit.expected.id !== edit.value.id ||
        !equal(edit.expected.target, edit.value.target) ||
        writes.has(key)
      )
        return reject('fixture.precondition');
      writes.add(key);
      const value = edit.value;
      views = views.map((v) =>
        v.id === view.id
          ? {
              ...v,
              elements: v.elements.map((o) => (o.id === value.id ? value : o)),
            }
          : v,
      );
    } else return reject('fixture.unimplemented-command');
  }
  const candidateSnapshot: DocumentSnapshot = {
    ...snapshot,
    model: { ...model, revision: command.nextRevision },
    views,
  };
  const assessment = assess(candidateSnapshot, context);
  if (assessment.status !== 'valid' || assessment.lifecycle !== 'valid')
    return reject('fixture.invalid-candidate', assessment);
  return {
    status: 'prepared',
    command,
    expectedRevision: command.expectedRevision,
    candidate: {
      snapshot: candidateSnapshot,
      commands: [
        ...checkpoint.commands,
        {
          command,
          beforeRevision: command.expectedRevision,
          afterRevision: command.nextRevision,
        },
      ],
    },
    assessment: { ...assessment, status: 'valid', lifecycle: 'valid' },
  };
}

/** In-memory host stand-in: proves the port boundary, not durable filesystem CAS. */
function memoryHost(initial: DocumentCheckpoint) {
  let current = initial;
  const port: DocumentCommitPort = {
    async commit(prepared) {
      if (
        prepared.command.modelId !== current.snapshot.model.id ||
        prepared.expectedRevision !== current.snapshot.model.revision
      )
        return {
          status: 'conflict',
          currentRevision: current.snapshot.model.revision,
        };
      current = prepared.candidate;
      return { status: 'committed', checkpoint: current };
    },
  };
  return { port, read: () => current };
}

function mustPrepare(result: PrepareDocumentResult) {
  if (result.status !== 'prepared')
    throw new Error(`Expected preparation, got ${result.status}`);
  return result;
}

describe('coordinated document-session protocol (test-only host)', () => {
  it('does not treat a decoded outer shape as structural validity or permission to edit', () => {
    const { checkpoint, command, context } = fixture();
    const decoded: DocumentLoadResult = {
      status: 'decoded',
      checkpoint: {
        ...checkpoint,
        snapshot: {
          ...checkpoint.snapshot,
          model: {
            ...checkpoint.snapshot.model,
            elements: [
              ...checkpoint.snapshot.model.elements,
              ...checkpoint.snapshot.model.elements,
            ],
          },
        },
      },
    };
    const result = prepare(decoded.checkpoint, command, context);
    expect(result).toMatchObject({
      status: 'rejected',
      assessment: {
        status: 'invalid',
        semantics: { structure: 'invalid', semantics: 'not-run' },
      },
    });
    expect(result).not.toHaveProperty('candidate');
    expect(decoded.checkpoint.commands).toEqual([]);
  });

  it('retains the existing ChangeState shape, explicit profile pins and independent two-view notation bindings', () => {
    const { checkpoint, context } = fixture();
    expect(checkpoint.snapshot.model.formatVersion).toBe(2);
    expect(checkpoint.snapshot).not.toHaveProperty('revision');
    expect(assess(checkpoint.snapshot, context)).toMatchObject({
      status: 'valid',
      lifecycle: 'valid',
      semantics: { semantics: 'complete' },
    });
    expect(checkpoint.snapshot.notationBindings.map((b) => b.view.id)).toEqual([
      'one',
      'two',
    ]);
  });

  it('prepares a detached rename candidate, preserving meaning and locations until the host commits', async () => {
    const { checkpoint, command, context } = fixture();
    const before = JSON.stringify(checkpoint);
    const host = memoryHost(checkpoint);
    const prepared = mustPrepare(prepare(checkpoint, command, context));
    expect(host.read()).toBe(checkpoint);
    expect(prepared.candidate.snapshot.model.elements[0].name).toBe(
      'Renamed actor',
    );
    expect(prepared.candidate.snapshot.views).toBe(checkpoint.snapshot.views);
    expect(prepared.candidate.commands[0].command.source).toEqual(
      command.source,
    );
    expect(await host.port.commit(prepared)).toMatchObject({
      status: 'committed',
    });
    expect(JSON.stringify(checkpoint)).toBe(before);
  });

  it('advances the same revision for a view-only edit and rejects a stale semantic commit', async () => {
    const { checkpoint, command, context } = fixture();
    const stale = mustPrepare(prepare(checkpoint, command, context));
    const occurrence = checkpoint.snapshot.views[0].elements[0];
    const move: DocumentCommand = {
      ...command,
      id: 'move',
      nextRevision: createModelRevision('move-1'),
      kind: 'edit',
      deletionReviews: [],
      edits: [
        {
          kind: 'replace-occurrence',
          view: {
            modelId: checkpoint.snapshot.model.id,
            id: checkpoint.snapshot.views[0].id,
          },
          expected: occurrence,
          value: { ...occurrence, bounds: { ...occurrence.bounds, x: 42 } },
        },
      ],
    };
    const moved = mustPrepare(prepare(checkpoint, move, context));
    const host = memoryHost(checkpoint);
    await host.port.commit(moved);
    expect(await host.port.commit(stale)).toMatchObject({
      status: 'conflict',
      currentRevision: 'move-1',
    });
    expect(host.read().snapshot.model.elements).toBe(
      checkpoint.snapshot.model.elements,
    );
    expect(host.read().snapshot.views[1]).toBe(checkpoint.snapshot.views[1]);
    expect(host.read().snapshot.views[0].elements[0].bounds.x).toBe(42);
  });

  it('advances revision for receipt-only acceptance and keeps retry receipts separate from session undo indexes', () => {
    const { checkpoint, command, context } = fixture();
    const prepared = mustPrepare(
      prepare(
        checkpoint,
        { ...command, kind: 'edit', edits: [], deletionReviews: [] },
        context,
      ),
    );
    expect(prepared.candidate.snapshot.model.elements).toBe(
      checkpoint.snapshot.model.elements,
    );
    expect(prepared.candidate.snapshot.model.revision).toBe(
      command.nextRevision,
    );
    const reopened: DocumentSession = {
      checkpoint: prepared.candidate,
      history: { undo: [], redo: [] },
    };
    expect(reopened.checkpoint.commands).toHaveLength(1);
    expect(
      prepare(
        reopened.checkpoint,
        reopened.checkpoint.commands[0].command,
        context,
      ).status,
    ).toBe('replayed');
  });

  it('returns replay evidence without a candidate or stale snapshot replacement after later edits', async () => {
    const { checkpoint, command, context } = fixture();
    const first = mustPrepare(prepare(checkpoint, command, context));
    const later: DocumentCommand = {
      ...command,
      id: 'later',
      expectedRevision: command.nextRevision,
      nextRevision: createModelRevision('later-2'),
      kind: 'edit',
      deletionReviews: [],
      edits: [
        {
          kind: 'rename',
          target: {
            kind: 'element',
            modelId: command.modelId,
            id: checkpoint.snapshot.model.elements[0].id,
          },
          expected: 'Renamed actor',
          value: 'Human choice',
        },
      ],
    };
    const host = memoryHost(first.candidate);
    await host.port.commit(mustPrepare(prepare(host.read(), later, context)));
    const replay = prepare(host.read(), command, context);
    expect(replay.status).toBe('replayed');
    expect(replay).not.toHaveProperty('candidate');
    expect(host.read().snapshot.model.elements[0].name).toBe('Human choice');
    expect(
      prepare(host.read(), { ...command, actor: 'different' }, context).status,
    ).toBe('rejected');
  });

  it('rejects a late invalid view candidate without changing an earlier staged rename or any input metadata', () => {
    const { checkpoint, command, context } = fixture();
    if (command.kind !== 'edit') throw new Error('edit fixture');
    const occurrence = checkpoint.snapshot.views[0].elements[0];
    const before = JSON.stringify(checkpoint);
    const result = prepare(
      checkpoint,
      {
        ...command,
        edits: [
          ...command.edits,
          {
            kind: 'replace-occurrence',
            view: {
              modelId: command.modelId,
              id: checkpoint.snapshot.views[0].id,
            },
            expected: occurrence,
            value: {
              ...occurrence,
              bounds: { ...occurrence.bounds, width: -1 },
            },
          },
        ],
      },
      context,
    );
    expect(result).toMatchObject({
      status: 'rejected',
      assessment: {
        views: expect.arrayContaining([
          expect.objectContaining({
            code: 'view.invalid-geometry',
            location: expect.objectContaining({
              viewId: 'one',
              occurrenceId: 'actor',
            }),
          }),
        ]),
      },
    });
    expect(result).not.toHaveProperty('candidate');
    expect(JSON.stringify(checkpoint)).toBe(before);
  });

  it('refuses unsupported opaque extensions without inspecting, dropping or treating them as editable', () => {
    const { checkpoint, command, context } = fixture();
    const envelope = {
      pack: { id: 'unknown', version: '1', contractVersion: '1' },
      extension: { id: 'unknown:data' as const, version: '1' },
      get payload() {
        throw new Error('Do not inspect opaque payload');
      },
    };
    const extended = {
      ...checkpoint,
      snapshot: { ...checkpoint.snapshot, extensions: [envelope] },
    };
    const result = prepare(extended, command, context);
    expect(result).toMatchObject({
      status: 'rejected',
      assessment: {
        status: 'unsupported',
        semantics: { structure: 'valid', semantics: 'partial' },
      },
    });
    if (result.status !== 'rejected') throw new Error('Expected rejection');
    expect(result.assessment?.semantics.extensions[0].envelope).toBe(envelope);
  });

  it('distinguishes invalid semantics, incomplete notation coverage and unassessed lifecycle metadata', () => {
    const { checkpoint, context } = fixture();
    const snapshot = checkpoint.snapshot;
    expect(
      assess(
        {
          ...snapshot,
          model: {
            ...snapshot.model,
            elements: [{ ...snapshot.model.elements[0], type: 'unknown:type' }],
          },
        },
        context,
      ),
    ).toMatchObject({ status: 'invalid', semantics: { structure: 'valid' } });
    expect(
      assess(
        { ...snapshot, notationBindings: snapshot.notationBindings.slice(1) },
        context,
      ).diagnostics[0].code,
    ).toBe('fixture.notation-coverage');
    expect(
      assess(
        {
          ...snapshot,
          notationBindings: [
            ...snapshot.notationBindings,
            snapshot.notationBindings[0],
          ],
        },
        context,
      ).status,
    ).toBe('invalid');
    expect(
      assess(
        {
          ...snapshot,
          notationBindings: [
            {
              ...snapshot.notationBindings[0],
              view: { modelId: snapshot.model.id, id: createViewId('missing') },
            },
          ],
        },
        context,
      ).diagnostics.map((d) => d.code),
    ).toContain('fixture.dangling-notation-binding');
    // A record's shape alone cannot establish generation provenance or replay trust.
    const unassessed: DocumentSnapshot = {
      ...snapshot,
      applied: [
        {
          plan: {
            id: 'unverified-receipt',
            modelId: snapshot.model.id,
            expectedRevision: snapshot.model.revision,
            nextRevision: createModelRevision('claimed-revision'),
            source: { id: 'external-claim', revision: '1' },
            rules: [],
            operations: [],
            baselineUpdates: [],
          },
          inverse: [],
          beforeRevision: snapshot.model.revision,
          afterRevision: createModelRevision('claimed-revision'),
        },
      ],
    };
    expect(assess(unassessed, context)).toMatchObject({
      status: 'unsupported',
      lifecycle: 'not-checked',
    });
    expect(assess(snapshot, { ...context, packs: [] }).status).toBe('invalid');
  });

  it('rejects stale/foreign/blank commands, reused revisions, failed guards and overlapping writes', () => {
    const { checkpoint, command, context } = fixture();
    if (command.kind !== 'edit') throw new Error('edit fixture');
    for (const invalid of [
      { ...command, id: ' ' },
      { ...command, actor: '' },
      {
        ...command,
        modelId: createModel(
          'other',
          'Other',
          checkpoint.snapshot.model.profile,
        ).id,
      },
      { ...command, expectedRevision: createModelRevision('stale') },
      { ...command, nextRevision: command.expectedRevision },
      { ...command, edits: [...command.edits, ...command.edits] },
      {
        ...command,
        edits: [{ ...command.edits[0], expected: 'wrong' }],
      } as DocumentCommand,
    ])
      expect(prepare(checkpoint, invalid, context).status).toBe('rejected');
    const accepted = mustPrepare(
      prepare(checkpoint, command, context),
    ).candidate;
    expect(
      prepare(
        accepted,
        {
          ...command,
          id: 'new',
          expectedRevision: command.nextRevision,
          nextRevision: checkpoint.snapshot.model.revision,
        },
        context,
      ).status,
    ).toBe('rejected');
  });

  it('keeps future deletion, defaults and undo requests explicitly unimplemented in the fixture', () => {
    const { checkpoint, command, context } = fixture();
    const removal: DocumentCommand = {
      ...command,
      kind: 'edit',
      edits: [
        {
          kind: 'remove-element',
          expected: checkpoint.snapshot.model.elements[0],
        },
      ],
      deletionReviews: [{ operationIndex: 0, dependents: [] }],
    };
    const undo: DocumentCommand = {
      ...command,
      kind: 'undo',
      transactionId: 'prior',
    };
    const defaults: DocumentCommand = {
      ...command,
      kind: 'apply-defaults',
      plan: {
        id: 'defaults',
        modelId: command.modelId,
        expectedRevision: command.expectedRevision,
        nextRevision: command.nextRevision,
        source: command.source,
        rules: [],
        operations: [],
        baselineUpdates: [],
      },
    };
    for (const request of [removal, undo, defaults])
      expect(prepare(checkpoint, request, context)).toMatchObject({
        status: 'rejected',
        diagnostics: [
          expect.objectContaining({ code: 'fixture.unimplemented-command' }),
        ],
      });
  });
});
