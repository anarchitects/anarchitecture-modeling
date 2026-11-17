import {
  createModel,
  createElementId,
  createRelationshipId,
  createViewId,
  createElementOccurrenceId,
  createConnectorOccurrenceId,
  validateViews,
  type DiagramView,
  type ModelDocument,
  type ElementReference,
  type ElementOccurrence,
  type ViewOccurrence,
  type PresentationOverrides,
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  packReference,
  resolveOccurrenceNotation,
  type ModelingPackDefinition,
  type NotationDefinition,
  type NotationReference,
  type HostTheme,
  type NotationResult,
} from '../index.js';

/** ArchiMate-shaped synthetic seam only; no production pack or conformance claim. */
function fixture() {
  const empty = createModel('model', 'Synthetic actor/role view', {
    id: 'example-profile',
    version: '1',
  });
  const actor: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('actor'),
  };
  const role: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('role'),
  };
  const model: ModelDocument = {
    ...empty,
    elements: [
      {
        id: actor.id,
        type: 'example:actor',
        name: 'Actor',
        container: { kind: 'model', id: empty.id },
        properties: {
          'example:description': {
            kind: 'scalar',
            value: 'Semantic description',
          },
        },
      },
      {
        id: role.id,
        type: 'example:role',
        name: 'Role',
        container: actor,
        properties: {},
      },
    ],
    relationships: [
      {
        id: createRelationshipId('assignment'),
        type: 'example:assignment',
        source: actor,
        target: role,
        properties: {},
      },
    ],
  };
  function makeView(id: string, x: number): DiagramView {
    const view = { modelId: model.id, id: createViewId(id) };
    const elements: readonly ElementOccurrence[] = [actor, role].map(
      (target, index) => ({
        kind: 'element-occurrence',
        id: createElementOccurrenceId(`node-${index}`),
        target,
        bounds: { x: x + index * 200, y: 0, width: 100, height: 50 },
        overrides: {},
        accessibility: { label: index ? 'Role' : 'Actor' },
      }),
    );
    return {
      ...view,
      name: id,
      elements,
      connectors: [
        {
          kind: 'connector-occurrence',
          id: createConnectorOccurrenceId('connector'),
          target: {
            kind: 'relationship',
            modelId: model.id,
            id: model.relationships[0].id,
          },
          source: { kind: 'element-occurrence', view, id: elements[0].id },
          destination: { kind: 'element-occurrence', view, id: elements[1].id },
          waypoints: [{ x: x + 150, y: 25 }],
          overrides: {},
          accessibility: { label: 'Actor assigned to role' },
        },
      ],
    };
  }
  const views = [makeView('overview', 0), makeView('detail', 50)];
  const pin = { id: 'example-language', version: '1', contractVersion: '1' };
  const pack: ModelingPackDefinition = {
    ...pin,
    displayName: 'Synthetic language',
    implementation: 'scaffold',
    dimensions: ['method'],
    requires: [],
    conflicts: [],
    constraints: [],
    extensions: [],
    types: [
      { kind: 'element', id: 'example:actor', properties: [], constraints: [] },
      { kind: 'element', id: 'example:role', properties: [], constraints: [] },
      {
        kind: 'relationship',
        id: 'example:assignment',
        properties: [],
        constraints: [],
        endpointPairs: [
          {
            source: {
              role: 'example:source',
              types: [{ pack: pin, kind: 'element', id: 'example:actor' }],
            },
            target: {
              role: 'example:target',
              types: [{ pack: pin, kind: 'element', id: 'example:role' }],
            },
          },
        ],
      },
    ],
  };
  const result = composeModelingProfile(
    {
      id: 'example-profile',
      version: '1',
      selections: [{ dimension: 'method', pack: packReference(pack) }],
    },
    [pack],
  );
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  const reference: NotationReference = {
    pack: pin,
    id: 'example:actor-notation',
    version: '2',
  };
  const notation: NotationDefinition = {
    reference,
    type: { pack: pin, kind: 'element', id: 'example:actor' },
    defaults: {
      shape: 'example:actor-shape',
      fillToken: 'surface',
      strokeToken: 'outline',
      textToken: 'text',
    },
    allowedOverrides: { fillToken: ['surface', 'highlight'] },
    accessibility: {
      labelRequired: true,
      nonColorCueRequired: true,
      minimumTextContrast: 4.5,
      minimumGraphicContrast: 3,
    },
  };
  const theme: HostTheme = {
    id: 'test-host',
    tokens: {
      surface: '#ffffff',
      highlight: '#eeeeee',
      outline: '#222222',
      text: '#111111',
    },
  };
  const request = {
    model,
    view: views[0],
    occurrence: views[0].elements[0],
    notation: reference,
    registry: [notation],
    composition: result.value,
    theme,
  };
  return { model, views, notation, theme, request };
}

function expectFailure(result: NotationResult, code: string) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected diagnostic');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      severity: 'error',
      message: expect.any(String),
      location: expect.objectContaining({
        viewId: 'overview',
        occurrenceId: 'node-0',
      }),
    }),
  );
}

function withOccurrence(
  view: DiagramView,
  occurrence: ViewOccurrence,
): DiagramView {
  return occurrence.kind === 'element-occurrence'
    ? { ...view, elements: [occurrence, ...view.elements.slice(1)] }
    : { ...view, connectors: [occurrence] };
}

describe('semantic model / view seam', () => {
  it('moves and restyles one of two occurrences without changing model meaning or the other view', () => {
    const { model, views, request } = fixture();
    const snapshot = JSON.stringify({ model, views });
    const changed = {
      ...views[0].elements[0],
      bounds: { x: -10, y: 200, width: 120, height: 60 },
      overrides: { fillToken: 'highlight' },
    };
    const edited = [withOccurrence(views[0], changed), views[1]];
    expect(validateViews(model, edited)).toEqual([]);
    const result = resolveOccurrenceNotation({
      ...request,
      view: edited[0],
      occurrence: changed,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected allowed override');
    expect(result.value.appearance.fillToken).toBe('highlight');
    expect(changed.target).toBe(views[1].elements[0].target);
    expect(edited[1]).toBe(views[1]);
    expect(JSON.stringify({ model, views })).toBe(snapshot);
    expect(model.elements[1].container).toEqual(model.relationships[0].source);
    expect(model.elements[0].properties['example:description']).toEqual({
      kind: 'scalar',
      value: 'Semantic description',
    });
    expect(model).not.toHaveProperty('views');
  });

  it('removes an occurrence without deleting its element and diagnoses the remaining connector', () => {
    const { model, views } = fixture();
    const removed = { ...views[0], elements: views[0].elements.slice(1) };
    const diagnostics = validateViews(model, [removed, views[1]]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'view.invalid-endpoint',
      severity: 'error',
      location: {
        viewId: 'overview',
        occurrenceId: 'connector',
        path: ['connectors', 0, 'source'],
      },
    });
    expect(model.elements.map((e) => e.id)).toEqual(['actor', 'role']);
    expect(
      validateViews(model, [{ ...removed, connectors: [] }, views[1]]),
    ).toEqual([]);
    expect(model.relationships).toHaveLength(1);
  });

  it('surfaces removed semantic elements and relationships without repairing them', () => {
    const { model, views } = fixture();
    const deleted = {
      ...model,
      elements: model.elements.slice(1),
      relationships: [],
    };
    const diagnostics = validateViews(deleted, views);
    expect(
      diagnostics.filter((d) => d.code === 'view.missing-semantic-target'),
    ).toHaveLength(4);
    expect(diagnostics[0].semanticTarget?.id).toBe('actor');
    expect(views[0].elements).toHaveLength(2);
  });

  it('rejects cross-view endpoints and semantic endpoint reversal', () => {
    const { model, views } = fixture();
    const connector = views[0].connectors[0];
    const cross = {
      ...connector,
      source: {
        ...connector.source,
        view: { modelId: model.id, id: views[1].id },
      },
    };
    expect(
      validateViews(model, [withOccurrence(views[0], cross)])[0].code,
    ).toBe('view.invalid-endpoint');
    const reverse = {
      ...connector,
      source: connector.destination,
      destination: connector.source,
    };
    expect(
      validateViews(model, [withOccurrence(views[0], reverse)]).map(
        (d) => d.code,
      ),
    ).toEqual(['view.endpoint-mismatch', 'view.endpoint-mismatch']);
  });

  it('rejects ambiguous IDs without choosing the first target', () => {
    const { model, views } = fixture();
    const duplicate = {
      ...views[0],
      elements: [...views[0].elements, views[0].elements[0]],
    };
    expect(validateViews(model, [duplicate]).map((d) => d.code)).toEqual([
      'view.duplicate-id',
      'view.invalid-endpoint',
    ]);
    expect(validateViews(model, [views[0], views[0]])[0].code).toBe(
      'view.duplicate-id',
    );
    const ambiguous = {
      ...model,
      elements: [...model.elements, model.elements[0]],
    };
    expect(validateViews(ambiguous, [views[0]])[0].code).toBe(
      'view.ambiguous-semantic-target',
    );
  });

  it.each([
    { x: NaN, y: 0, width: 100, height: 50 },
    { x: 0, y: Infinity, width: 100, height: 50 },
    { x: 0, y: 0, width: 0, height: 50 },
    { x: 0, y: 0, width: 100, height: -1 },
  ])('rejects invalid geometry %j', (bounds) => {
    const { model, views } = fixture();
    expect(
      validateViews(model, [
        withOccurrence(views[0], { ...views[0].elements[0], bounds }),
      ])[0].code,
    ).toBe('view.invalid-geometry');
  });

  it('diagnoses missing labels, nonfinite waypoints and foreign model references deterministically', () => {
    const { model, views } = fixture();
    const foreign = createModel('foreign', 'Foreign', model.profile);
    const invalid: DiagramView = {
      ...views[0],
      modelId: foreign.id,
      elements: [
        {
          ...views[0].elements[0],
          target: { ...views[0].elements[0].target, modelId: foreign.id },
          accessibility: { label: ' ' },
        },
      ],
      connectors: [
        { ...views[0].connectors[0], waypoints: [{ x: Infinity, y: 0 }] },
      ],
    };
    const before = JSON.stringify(invalid);
    const diagnostics = validateViews(model, [invalid]);
    expect(diagnostics.map((d) => d.code)).toContain('view.foreign-model');
    expect(diagnostics.map((d) => d.code)).toContain(
      'view.missing-accessible-label',
    );
    expect(diagnostics.map((d) => d.code)).toContain('view.invalid-geometry');
    expect(validateViews(model, [invalid])).toEqual(diagnostics);
    expect(JSON.stringify(invalid)).toBe(before);
  });
});

describe('pack notation / host theme / occurrence overrides', () => {
  it('resolves by stable occurrence identity, rejecting absent or ambiguous identities and a different profile', () => {
    const { request } = fixture();
    expect(
      resolveOccurrenceNotation({
        ...request,
        occurrence: {
          kind: request.occurrence.kind,
          id: request.occurrence.id,
        },
      }).ok,
    ).toBe(true);
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        view: { ...request.view, elements: [] },
      }),
      'notation.incompatible-type',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        view: {
          ...request.view,
          elements: [...request.view.elements, request.occurrence],
        },
      }),
      'notation.incompatible-type',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        model: {
          ...request.model,
          profile: { ...request.model.profile, version: '2' },
        },
      }),
      'notation.incompatible-type',
    );
  });

  it('resolves defaults without changing inputs and leaves accessibility verification to the host', () => {
    const { request } = fixture();
    const before = JSON.stringify(request);
    const result = resolveOccurrenceNotation(request);
    expect(result).toMatchObject({
      ok: true,
      value: {
        notation: request.notation,
        appearance: request.registry[0].defaults,
        themeId: 'test-host',
        tokenValues: {
          surface: '#ffffff',
          outline: '#222222',
          text: '#111111',
        },
        accessibilityAssessment: 'pending-host-verification',
      },
    });
    expect(JSON.stringify(request)).toBe(before);
    const otherTheme = {
      id: 'another-host',
      tokens: {
        surface: 'host:white',
        outline: 'host:black',
        text: 'host:black',
      },
    };
    expect(
      resolveOccurrenceNotation({ ...request, theme: otherTheme }),
    ).toMatchObject({
      ok: true,
      value: { themeId: 'another-host', tokenValues: otherTheme.tokens },
    });
  });

  it.each(['shape', 'sourceMarker', 'type', 'properties'])(
    'rejects forbidden %s overrides without semantic changes',
    (key) => {
      const { request, model } = fixture();
      const before = JSON.stringify(model);
      const occurrence = {
        ...request.occurrence,
        overrides: { [key]: 'unauthorized' } as PresentationOverrides,
      };
      expectFailure(
        resolveOccurrenceNotation({
          ...request,
          occurrence,
          view: withOccurrence(request.view, occurrence),
        }),
        'notation.forbidden-override',
      );
      expect(JSON.stringify(model)).toBe(before);
    },
  );

  it('rejects values outside the allowed override set', () => {
    const { request } = fixture();
    const occurrence = {
      ...request.occurrence,
      overrides: { fillToken: 'arbitrary-color' },
    };
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        occurrence,
        view: withOccurrence(request.view, occurrence),
      }),
      'notation.forbidden-override',
    );
  });

  it('requires exact notation, pack and contract versions without fallback', () => {
    const { request } = fixture();
    for (const notation of [
      { ...request.notation, version: 'latest' },
      { ...request.notation, version: '3' },
      { ...request.notation, pack: { ...request.notation.pack, version: '2' } },
      {
        ...request.notation,
        pack: { ...request.notation.pack, contractVersion: '2' },
      },
    ])
      expectFailure(
        resolveOccurrenceNotation({ ...request, notation }),
        'notation.missing-definition',
      );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        registry: [...request.registry, ...request.registry],
      }),
      'notation.duplicate-definition',
    );
  });

  it('rejects incompatible types and missing semantic targets', () => {
    const { request, notation } = fixture();
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        registry: [
          { ...notation, type: { ...notation.type, id: 'example:role' } },
        ],
      }),
      'notation.incompatible-type',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        model: { ...request.model, elements: [] },
      }),
      'notation.incompatible-type',
    );
  });

  it('reports absent and inherited theme tokens as unsupported', () => {
    const { request } = fixture();
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        theme: { id: 'empty', tokens: {} },
      }),
      'notation.missing-theme-token',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        theme: { id: 'inherited', tokens: Object.create(request.theme.tokens) },
      }),
      'notation.missing-theme-token',
    );
  });

  it('requires labels, default non-color cues and explicit accessibility requirements', () => {
    const { request, notation } = fixture();
    const occurrence = { ...request.occurrence, accessibility: { label: '' } };
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        occurrence,
        view: withOccurrence(request.view, occurrence),
      }),
      'notation.missing-accessibility',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        registry: [
          {
            ...notation,
            defaults: {
              fillToken: 'surface',
              strokeToken: 'outline',
              textToken: 'text',
            },
          },
        ],
      }),
      'notation.invalid-definition',
    );
    expectFailure(
      resolveOccurrenceNotation({
        ...request,
        registry: [
          {
            ...notation,
            accessibility: {
              ...notation.accessibility,
              minimumTextContrast: NaN,
            },
          },
        ],
      }),
      'notation.invalid-definition',
    );
  });

  it('resolves connector notation without changing relation endpoints or route', () => {
    const { request, notation } = fixture();
    const occurrence = request.view.connectors[0];
    const connectorNotation: NotationDefinition = {
      ...notation,
      reference: { ...notation.reference, id: 'example:assignment-notation' },
      type: {
        ...notation.type,
        kind: 'relationship',
        id: 'example:assignment',
      },
      defaults: {
        strokeToken: 'outline',
        textToken: 'text',
        lineStyle: 'example:solid',
        targetMarker: 'example:arrow',
      },
      allowedOverrides: {},
    };
    const before = JSON.stringify({ model: request.model, occurrence });
    expect(
      resolveOccurrenceNotation({
        ...request,
        occurrence,
        notation: connectorNotation.reference,
        registry: [connectorNotation],
      }).ok,
    ).toBe(true);
    expect(JSON.stringify({ model: request.model, occurrence })).toBe(before);
  });
});
