import type { ModelId } from './identity.js';
import type { ModelDocument, ModelEntityReference } from './modeling-core.js';

export interface ModelDiagnosticLocation {
  readonly modelId: ModelId;
  readonly entity?: ModelEntityReference;
  /** Indexed path from the validation input; preserves property names as literal segments. */
  readonly path: readonly (string | number)[];
}

export interface ModelDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly location: ModelDiagnosticLocation;
  readonly message: string;
}

export interface StructuralValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly ModelDiagnostic[];
}

function record(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Typed document boundary; not a parser for arbitrary documents or hostile JS objects. */
export function validateModelReference(
  model: ModelDocument,
  reference: unknown,
  location: ModelDiagnosticLocation,
  allowedKinds: readonly ModelEntityReference['kind'][] = [
    'model',
    'element',
    'relationship',
    'member',
  ],
): readonly ModelDiagnostic[] {
  function error(code: string, message: string): readonly ModelDiagnostic[] {
    return [{ code, severity: 'error', location, message }];
  }
  if (
    !record(reference) ||
    !nonblank(reference.id) ||
    !['model', 'element', 'relationship', 'member'].includes(
      String(reference.kind),
    )
  )
    return error(
      'model.invalid-reference',
      'Provide a tagged reference with a nonblank identity.',
    );
  if (!allowedKinds.includes(reference.kind as ModelEntityReference['kind']))
    return error(
      'model.wrong-reference-kind',
      'Use a reference of the kind required at this location.',
    );
  if (reference.kind === 'model')
    return reference.id === model.id
      ? []
      : error(
          'model.foreign-reference',
          'Reference the current model; external model loading is not supported.',
        );
  if (reference.modelId !== model.id)
    return error(
      'model.foreign-reference',
      'Reference an entity in the current model.',
    );
  const entities =
    reference.kind === 'element'
      ? model.elements
      : reference.kind === 'member'
        ? model.members
        : model.relationships;
  const count = entities.filter((entity) => entity.id === reference.id).length;
  return count === 1
    ? []
    : error(
        count ? 'model.ambiguous-reference' : 'model.missing-reference',
        'Restore exactly one target of the stated kind or explicitly update the reference.',
      );
}

/** Checks tagged value shapes, cycles, finite scalars and references without changing data. */
export function validateModelValue(
  model: ModelDocument,
  value: unknown,
  location: ModelDiagnosticLocation,
): readonly ModelDiagnostic[] {
  const diagnostics: ModelDiagnostic[] = [];
  function visit(
    current: unknown,
    path: readonly (string | number)[],
    ancestors: ReadonlySet<object>,
  ) {
    const report = (code: string, message: string) =>
      diagnostics.push({
        code,
        severity: 'error',
        location: { ...location, path },
        message,
      });
    if (!record(current)) {
      report(
        'model.invalid-value',
        'Use a tagged scalar, reference, list or record value.',
      );
      return;
    }
    if (ancestors.has(current)) {
      report('model.cyclic-value', 'Remove the cycle in structured values.');
      return;
    }
    const next = new Set(ancestors).add(current);
    const fields =
      current.kind === 'scalar' || current.kind === 'reference'
        ? ['kind', 'value']
        : current.kind === 'list'
          ? ['kind', 'items']
          : ['kind', 'fields'];
    if (Object.keys(current).some((key) => !fields.includes(key)))
      report(
        'model.unsupported-value-field',
        'Remove unsupported fields from the tagged value or represent them explicitly in a record.',
      );
    switch (current.kind) {
      case 'scalar':
        if (
          !(
            current.value === null ||
            typeof current.value === 'string' ||
            typeof current.value === 'boolean' ||
            (typeof current.value === 'number' &&
              Number.isFinite(current.value))
          )
        )
          report(
            'model.invalid-value',
            'Use a string, boolean, null or finite number scalar.',
          );
        break;
      case 'reference':
        diagnostics.push(
          ...validateModelReference(model, current.value, {
            ...location,
            path: [...path, 'value'],
          }),
        );
        break;
      case 'list':
        if (!Array.isArray(current.items))
          report(
            'model.invalid-value',
            'Provide an array of tagged list items.',
          );
        else
          for (let index = 0; index < current.items.length; index++)
            visit(current.items[index], [...path, 'items', index], next);
        break;
      case 'record':
        if (!record(current.fields))
          report(
            'model.invalid-value',
            'Provide a plain record of tagged fields.',
          );
        else
          for (const [name, field] of Object.entries(current.fields))
            visit(field, [...path, 'fields', name], next);
        break;
      default:
        report('model.invalid-value', 'Use a recognized value kind.');
    }
  }
  visit(value, location.path, new Set());
  return diagnostics;
}

export function validateModelStructure(
  model: ModelDocument,
): StructuralValidationResult {
  const diagnostics: ModelDiagnostic[] = [];
  const report = (
    code: string,
    path: readonly (string | number)[],
    message: string,
    entity?: ModelEntityReference,
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      location: { modelId: model.id, path, ...(entity && { entity }) },
      message,
    });
  if (model.formatVersion !== 2)
    report(
      'model.unsupported-format',
      ['model', 'formatVersion'],
      'Use an explicitly migrated format-2 document.',
    );
  for (const [path, value] of [
    ['id', model.id],
    ['revision', model.revision],
    ['name', model.name],
  ] as const) {
    if (!nonblank(value))
      report(
        'model.invalid-identity',
        ['model', path],
        'Supply a nonblank model identity, revision and name.',
      );
  }
  if (!nonblank(model.profile.id) || !nonblank(model.profile.version))
    report(
      'model.invalid-profile',
      ['model', 'profile'],
      'Supply a named, versioned profile.',
    );
  for (const [collection, kind] of [
    ['elements', 'element'],
    ['members', 'member'],
    ['relationships', 'relationship'],
  ] as const) {
    const ids = new Set<string>();
    model[collection].forEach((value, index) => {
      const path = ['model', collection, index];
      const entity = {
        kind,
        modelId: model.id,
        id: value.id,
      } as ModelEntityReference;
      if (!nonblank(value.id))
        report(
          'model.invalid-identity',
          [...path, 'id'],
          'Supply a nonblank entity identity.',
          entity,
        );
      if (ids.has(value.id))
        report(
          'model.duplicate-id',
          [...path, 'id'],
          'Assign a unique identity within this entity kind.',
          entity,
        );
      ids.add(value.id);
      if (!nonblank(value.type))
        report(
          'model.invalid-type',
          [...path, 'type'],
          'Supply a nonblank type identifier.',
          entity,
        );
      const location = { modelId: model.id, entity, path };
      if (kind === 'element')
        diagnostics.push(
          ...validateModelReference(
            model,
            'container' in value ? value.container : undefined,
            { ...location, path: [...path, 'container'] },
            ['model', 'element'],
          ),
        );
      if (kind === 'member')
        diagnostics.push(
          ...validateModelReference(
            model,
            'owner' in value ? value.owner : undefined,
            { ...location, path: [...path, 'owner'] },
            ['element'],
          ),
        );
      if (kind === 'relationship') {
        diagnostics.push(
          ...validateModelReference(
            model,
            'source' in value ? value.source : undefined,
            { ...location, path: [...path, 'source'] },
            ['element'],
          ),
        );
        diagnostics.push(
          ...validateModelReference(
            model,
            'target' in value ? value.target : undefined,
            { ...location, path: [...path, 'target'] },
            ['element'],
          ),
        );
      }
      diagnostics.push(
        ...validateModelValue(
          model,
          { kind: 'record', fields: value.properties },
          { ...location, path: [...path, 'properties'] },
        ).map((diagnostic) => ({
          ...diagnostic,
          location: {
            ...diagnostic.location,
            path: diagnostic.location.path.filter(
              (part, offset) =>
                !(offset === path.length + 1 && part === 'fields'),
            ),
          },
        })),
      );
    });
  }
  // Follow only unambiguous, same-model containment edges. Dangling edges were reported above.
  const complete = new Set<string>();
  model.elements.forEach((element, index) => {
    let current = element;
    const chain = new Set<string>();
    while (!complete.has(current.id)) {
      if (chain.has(current.id)) {
        report(
          'model.containment-cycle',
          ['model', 'elements', index, 'container'],
          'Break the semantic containment cycle so it terminates at the model root.',
          { kind: 'element', modelId: model.id, id: element.id },
        );
        break;
      }
      chain.add(current.id);
      if (
        !record(current.container) ||
        current.container.kind !== 'element' ||
        current.container.modelId !== model.id
      )
        break;
      const parents = model.elements.filter(
        (parent) => parent.id === current.container.id,
      );
      if (parents.length !== 1) break;
      current = parents[0];
    }
    for (const id of chain) complete.add(id);
  });
  return { valid: diagnostics.length === 0, diagnostics };
}
