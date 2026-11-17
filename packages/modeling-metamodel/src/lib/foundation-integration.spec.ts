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
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  packReference,
  resolveOccurrenceNotation,
  validateModel,
  type ModelingPackDefinition,
  type NotationDefinition,
  type NotationReference,
  type HostTheme,
  type ExtensionEnvelope,
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
        properties: {},
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
  const profile = {
    ...model.profile,
    selections: [{ dimension: 'method' as const, pack: pin }],
  };
  const definitions: NotationDefinition[] = pack.types
    .filter((type) => type.kind !== 'member')
    .map((type) => ({
      ...notation,
      reference: { ...reference, id: `${type.id}-notation` },
      type: { pack: pin, kind: type.kind, id: type.id },
      allowedOverrides:
        type.kind === 'relationship' ? {} : notation.allowedOverrides,
      defaults:
        type.kind === 'relationship'
          ? {
              strokeToken: 'outline',
              textToken: 'text',
              lineStyle: 'example:solid',
              targetMarker: 'example:arrow',
            }
          : notation.defaults,
    }));
  return { model, views, profile, registry: [pack], definitions, theme };
}

/** Test-owned host orchestration: stage results retain their original diagnostic types. */
function inspect(
  input: ReturnType<typeof fixture>,
  extensions: readonly ExtensionEnvelope[] = [],
) {
  const semantics = validateModel({ ...input, extensions });
  const views = validateViews(input.model, input.views);
  const composition = composeModelingProfile(input.profile, input.registry);
  const notation = composition.ok
    ? input.views.flatMap((view) =>
        [...view.elements, ...view.connectors].map((occurrence) => {
          const entities =
            occurrence.kind === 'element-occurrence'
              ? input.model.elements
              : input.model.relationships;
          const entity = entities.find(
            (candidate) => candidate.id === occurrence.target.id,
          );
          const definitions = input.definitions.filter(
            (definition) => definition.type.id === entity?.type,
          );
          // Missing/ambiguous host bindings cannot disappear from the aggregate result.
          if (definitions.length !== 1)
            return {
              viewId: view.id,
              occurrenceId: occurrence.id,
              result: undefined,
            };
          return {
            viewId: view.id,
            occurrenceId: occurrence.id,
            result: resolveOccurrenceNotation({
              model: input.model,
              view,
              occurrence,
              notation: definitions[0].reference,
              registry: input.definitions,
              composition: composition.value,
              theme: input.theme,
            }),
          };
        }),
      )
    : undefined;
  const invalid =
    semantics.status === 'invalid' ||
    views.length > 0 ||
    !notation ||
    notation.some(({ result }) => !result?.ok);
  return {
    status: invalid ? 'invalid' : semantics.status,
    semantics,
    views,
    notation,
  };
}

describe('assembled Foundation host handoff (synthetic language only)', () => {
  it('combines semantic, view and notation validation for every occurrence in two views', () => {
    const input = fixture();
    const before = JSON.stringify(input);
    const result = inspect(input);
    expect(result.status).toBe('valid');
    expect(result.semantics).toMatchObject({
      status: 'valid',
      semantics: 'complete',
      diagnostics: [],
    });
    expect(result.views).toEqual([]);
    expect(result.notation).toHaveLength(6);
    expect(
      result.notation?.every(
        ({ result }) =>
          result?.ok &&
          result.value.accessibilityAssessment === 'pending-host-verification',
      ),
    ).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('changes layout, routes and permitted styling independently while preserving semantic identity and revision', () => {
    const input = fixture();
    const before = JSON.stringify(input.model);
    const originalViews = JSON.stringify(input.views);
    const views = input.views.map((view, index) =>
      index
        ? view
        : {
            ...view,
            elements: view.elements.map((occurrence) => ({
              ...occurrence,
              bounds: { ...occurrence.bounds, y: 100 },
              overrides: { fillToken: 'highlight' },
            })),
            connectors: view.connectors.map((occurrence) => ({
              ...occurrence,
              waypoints: [{ x: 300, y: 120 }],
            })),
          },
    );
    expect(inspect({ ...input, views }).status).toBe('valid');
    expect(views[1]).toBe(input.views[1]);
    expect(views[0].elements[0].target).toEqual(views[1].elements[0].target);
    expect(JSON.stringify(input.model)).toBe(before);
    expect(JSON.stringify(input.views)).toBe(originalViews);
  });

  it('rejects a synthetic relationship endpoint pair even when all views and notation resolve', () => {
    const input = fixture();
    const relation = input.model.relationships[0];
    const result = inspect({
      ...input,
      model: {
        ...input.model,
        relationships: [
          { ...relation, source: relation.target, target: relation.source },
        ],
      },
      views: input.views.map((view) => ({
        ...view,
        connectors: view.connectors.map((connector) => ({
          ...connector,
          source: connector.destination,
          destination: connector.source,
        })),
      })),
    });
    expect(result.status).toBe('invalid');
    expect(result.views).toEqual([]);
    expect(result.notation?.every(({ result }) => result?.ok)).toBe(true);
    expect(result.semantics.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'validation.endpoint-pair',
        severity: 'error',
        location: expect.objectContaining({ modelId: input.model.id }),
        provenance: expect.objectContaining({
          pack: packReference(input.registry[0]),
        }),
      }),
    );
  });

  it('retains actionable semantic, view and notation diagnostics together without mutation', () => {
    const input = fixture();
    const broken = {
      ...input,
      model: {
        ...input.model,
        elements: input.model.elements.map((element, index) =>
          index
            ? element
            : {
                ...element,
                properties: {
                  'example:unknown': { kind: 'scalar' as const, value: 1 },
                },
              },
        ),
      },
      views: input.views.map((view, index) =>
        index
          ? view
          : {
              ...view,
              elements: view.elements.map((occurrence, i) =>
                i
                  ? occurrence
                  : {
                      ...occurrence,
                      bounds: { ...occurrence.bounds, width: -1 },
                      overrides: { fillToken: 'not-allowed' },
                    },
              ),
            },
      ),
    };
    const before = JSON.stringify(broken);
    const result = inspect(broken);
    expect(result.status).toBe('invalid');
    expect(
      result.semantics.diagnostics.some(
        (d) => d.severity === 'error' && d.location.path.includes('properties'),
      ),
    ).toBe(true);
    expect(result.views).toContainEqual(
      expect.objectContaining({
        code: 'view.invalid-geometry',
        location: expect.objectContaining({
          viewId: 'overview',
          occurrenceId: 'node-0',
        }),
      }),
    );
    expect(result.notation?.[0].result).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: 'notation.forbidden-override',
          location: expect.objectContaining({
            viewId: 'overview',
            occurrenceId: 'node-0',
          }),
        }),
      ]),
    });
    expect(inspect(broken)).toEqual(result);
    expect(JSON.stringify(broken)).toBe(before);
  });

  it('preserves opaque extensions and unsupported status alongside valid or invalid views', () => {
    const input = fixture();
    const envelope: ExtensionEnvelope = {
      pack: { id: 'unknown', version: '1', contractVersion: '1' },
      extension: { id: 'unknown:payload', version: '1' },
      get payload() {
        throw new Error('Opaque payload must not be read');
      },
    };
    const result = inspect(input, [envelope]);
    expect(result.status).toBe('unsupported');
    expect(result.semantics).toMatchObject({ semantics: 'partial' });
    expect(result.semantics.extensions[0]).toMatchObject({
      status: 'unsupported',
      semanticValidation: 'not-performed',
    });
    expect(result.semantics.extensions[0].envelope).toBe(envelope);
    const invalid = inspect(
      { ...input, views: [input.views[0], input.views[0]] },
      [envelope],
    );
    expect(invalid.status).toBe('invalid');
    expect(invalid.semantics.extensions[0].envelope).toBe(envelope);
    expect(invalid.semantics.status).toBe('unsupported');
  });

  it('cannot report success when composition or occurrence notation coverage is missing', () => {
    const input = fixture();
    const missingPack = inspect({ ...input, registry: [] });
    expect(missingPack.status).toBe('invalid');
    expect(missingPack.notation).toBeUndefined();
    expect(missingPack.semantics.semantics).toBe('not-run');
    for (const definitions of [
      input.definitions.slice(1),
      [...input.definitions, input.definitions[0]],
    ]) {
      const result = inspect({ ...input, definitions });
      expect(result.status).toBe('invalid');
      expect(result.notation?.filter(({ result }) => !result)).toHaveLength(2);
    }
  });
});
