import type {
  ModelDiagnosticLocation,
  ModelDocument,
  ModelProperties,
  ModelValue,
  ModelEntityReference,
} from '@anarchitects/modeling-core';
import type {
  Cardinality,
  ComposedModelingProfile,
  PropertyDefinition,
  TypeReference,
  ValueDefinition,
} from './contracts.js';
import { resolveTypeDefinition } from './composition.js';
import type {
  ValidationProvenance,
  ValidationReporter,
} from './validation-contracts.js';

export function withinCardinality(count: number, bounds: Cardinality): boolean {
  return count >= bounds.min && (bounds.max === null || count <= bounds.max);
}

/** Requires structurally checked references and an unambiguous composed profile. */
export function matchesReferenceType(
  model: ModelDocument,
  composition: ComposedModelingProfile,
  reference: ModelEntityReference,
  allowed: TypeReference,
): boolean {
  if (
    reference.kind === 'model' ||
    reference.kind !== allowed.kind ||
    !resolveTypeDefinition(composition, allowed).ok
  )
    return false;
  const entities =
    reference.kind === 'element'
      ? model.elements
      : reference.kind === 'member'
        ? model.members
        : model.relationships;
  const target = entities.filter((entity) => entity.id === reference.id);
  return (
    reference.modelId === model.id &&
    target.length === 1 &&
    target[0].type === allowed.id
  );
}

export function propertyValidator(
  model: ModelDocument,
  composition: ComposedModelingProfile,
  report: ValidationReporter,
) {
  function properties(
    values: ModelProperties,
    definitions: readonly PropertyDefinition[],
    location: ModelDiagnosticLocation,
    provenance: ValidationProvenance,
  ) {
    for (const definition of definitions) {
      const path = [...location.path, definition.id];
      if (!Object.hasOwn(values, definition.id)) {
        if (definition.required)
          report(
            'validation.required-property',
            { ...location, path },
            'Supply this required property; a default proposal does not satisfy presence.',
            provenance,
          );
      } else
        value(
          values[definition.id],
          definition.value,
          { ...location, path },
          provenance,
        );
    }
    for (const key of Object.keys(values)) {
      if (!definitions.some((definition) => definition.id === key))
        report(
          'validation.unsupported-property',
          { ...location, path: [...location.path, key] },
          'Declare this field in the pinned schema or explicitly remove it; it is not silently discarded.',
          provenance,
        );
    }
  }
  function value(
    current: ModelValue,
    definition: ValueDefinition,
    location: ModelDiagnosticLocation,
    provenance: ValidationProvenance,
  ) {
    if (current.kind !== definition.kind) {
      report(
        'validation.value-type',
        location,
        'Use the value kind required by the pinned property definition.',
        provenance,
      );
      return;
    }
    switch (definition.kind) {
      case 'scalar':
        if (current.kind !== 'scalar') return;
        if (
          (definition.valueType === 'null'
            ? current.value !== null
            : typeof current.value !== definition.valueType) ||
          (definition.permittedValues &&
            !(definition.permittedValues as readonly unknown[]).includes(
              current.value,
            ))
        )
          report(
            'validation.scalar-value',
            location,
            'Use a scalar of the declared type and permitted value set.',
            provenance,
          );
        break;
      case 'reference':
        if (current.kind !== 'reference') return;
        if (
          current.value.kind !== definition.target.kind ||
          (definition.target.kind !== 'model' &&
            !definition.target.types.some((type) =>
              matchesReferenceType(model, composition, current.value, type),
            ))
        )
          report(
            'validation.reference-target',
            location,
            'Reference a target of the kind and exact type allowed by this property.',
            provenance,
          );
        break;
      case 'list':
        if (current.kind !== 'list') return;
        if (!withinCardinality(current.items.length, definition.cardinality))
          report(
            'validation.cardinality',
            location,
            'Supply a list within the declared inclusive cardinality bounds.',
            provenance,
          );
        current.items.forEach((item, index) =>
          value(
            item,
            definition.items,
            { ...location, path: [...location.path, 'items', index] },
            provenance,
          ),
        );
        break;
      case 'record':
        if (current.kind === 'record')
          properties(
            current.fields,
            definition.fields,
            { ...location, path: [...location.path, 'fields'] },
            provenance,
          );
    }
  }
  return { properties, value };
}
