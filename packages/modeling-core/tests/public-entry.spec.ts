import { fileURLToPath } from 'node:url';
// eslint-disable-next-line @nx/enforce-module-boundaries -- This consumer proof deliberately resolves the built package export.
import * as core from '@anarchitects/modeling-core';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Match the public declarations used by independent consumers.
import type { DiagramView, ModelDocument } from '@anarchitects/modeling-core';

function fixture() {
  const empty = core.createModel('contract-proof', 'Contract proof', {
    id: 'synthetic',
    version: '1',
  });
  const target = {
    kind: 'element' as const,
    modelId: empty.id,
    id: core.createElementId('entity'),
  };
  const model: ModelDocument = {
    ...empty,
    elements: [
      {
        id: target.id,
        type: 'synthetic:entity',
        name: 'Entity',
        container: { kind: 'model', id: empty.id },
        properties: {},
      },
    ],
    members: [
      {
        id: core.createMemberId('field'),
        type: 'synthetic:field',
        name: 'Field',
        owner: target,
        properties: {},
      },
    ],
  };
  const view: DiagramView = {
    id: core.createViewId('first'),
    modelId: model.id,
    name: 'First',
    connectors: [],
    elements: [
      {
        kind: 'element-occurrence',
        id: core.createElementOccurrenceId('occurrence'),
        target,
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        overrides: {},
        accessibility: { label: 'Entity' },
      },
    ],
  };
  return { model, view, target };
}

describe('independent built core contract', () => {
  it('resolves the ordinary package entry to built JavaScript and exposes the unchanged runtime names', () => {
    expect(
      fileURLToPath(
        import.meta.resolve('@anarchitects/modeling-core'),
      ).replaceAll('\\', '/'),
    ).toMatch(/\/modeling-core\/dist\/index\.js$/);
    expect(Object.keys(core).sort()).toEqual(
      [
        'createConnectorOccurrenceId',
        'createElementId',
        'createElementOccurrenceId',
        'createMemberId',
        'createModel',
        'createModelId',
        'createModelRevision',
        'createRelationshipId',
        'createViewId',
        'validateModelReference',
        'validateModelStructure',
        'validateModelValue',
        'validateViews',
      ].sort(),
    );
  });

  it('keeps two layouts independent of semantic meaning and accepts their structure', () => {
    const { model, view } = fixture();
    const before = structuredClone(model);
    const second = {
      ...view,
      id: core.createViewId('second'),
      elements: view.elements.map((e) => ({
        ...e,
        bounds: { ...e.bounds, x: 400 },
      })),
    };
    expect(core.validateModelStructure(model)).toEqual({
      valid: true,
      diagnostics: [],
    });
    expect(core.validateViews(model, [view, second])).toEqual([]);
    expect(model).toEqual(before);
    expect(view.elements[0].bounds.x).toBe(0);
  });

  it('reports dangling and foreign references at the supplied location without repair', () => {
    const { model, target } = fixture();
    const location = { modelId: model.id, path: ['proof', 'reference'] };
    expect(
      core.validateModelReference(
        model,
        { ...target, id: core.createElementId('missing') },
        location,
        ['element'],
      ),
    ).toMatchObject([
      { code: 'model.missing-reference', severity: 'error', location },
    ]);
    expect(
      core.validateModelReference(
        model,
        { ...target, modelId: core.createModelId('foreign') },
        location,
        ['element'],
      )[0].code,
    ).toBe('model.foreign-reference');
    expect(model.elements).toHaveLength(1);
  });

  it('rejects unknown tagged data and non-finite values without discarding fields', () => {
    const { model } = fixture();
    const location = { modelId: model.id, path: ['proof', 'value'] };
    const value = { kind: 'future-kind', payload: { keep: true } };
    const before = structuredClone(value);
    expect(
      core.validateModelValue(model, value, location).length,
    ).toBeGreaterThan(0);
    expect(
      core.validateModelValue(
        model,
        { kind: 'scalar', value: Infinity },
        location,
      ).length,
    ).toBeGreaterThan(0);
    expect(value).toEqual(before);
    expect(
      core.validateModelValue(
        model,
        { kind: 'record', fields: { keep: { kind: 'scalar', value: null } } },
        location,
      ),
    ).toEqual([]);
  });

  it('locates invalid view geometry and absent targets without modifying model or view', () => {
    const { model, view } = fixture();
    const broken: DiagramView = {
      ...view,
      elements: view.elements.map((e) => ({
        ...e,
        target: { ...e.target, id: core.createElementId('absent') },
        bounds: { ...e.bounds, width: 0 },
      })),
    };
    const before = structuredClone({ model, broken });
    expect(core.validateViews(model, [broken])).toMatchObject([
      {
        code: 'view.missing-semantic-target',
        location: {
          viewId: view.id,
          viewIndex: 0,
          path: ['elements', 0, 'target'],
        },
      },
      {
        code: 'view.invalid-geometry',
        location: {
          viewId: view.id,
          viewIndex: 0,
          path: ['elements', 0, 'bounds'],
        },
      },
    ]);
    expect({ model, broken }).toEqual(before);
  });
});
