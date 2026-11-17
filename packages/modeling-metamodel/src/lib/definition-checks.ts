import {
  METAMODEL_CONTRACT_VERSION,
  PROFILE_DIMENSIONS,
  type Cardinality,
  type MetamodelDiagnostic,
  type ModelingPackDefinition,
  type PackReference,
  type PropertyDefinition,
  type TypeKind,
  type TypeReference,
  type ValueDefinition,
} from './contracts.js';

/** Concrete numeric release tokens, not ranges, wildcards or mutable tags. */
export function isExactVersion(version: string): boolean {
  return /^\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    version,
  );
}

export function samePack(a: PackReference, b: PackReference): boolean {
  return (
    a.id === b.id &&
    a.version === b.version &&
    a.contractVersion === b.contractVersion
  );
}

/** Manifest integrity checks only; model values and rule semantics belong to #17. */
export function inspectDefinitions(
  packs: readonly ModelingPackDefinition[],
): MetamodelDiagnostic[] {
  const diagnostics: MetamodelDiagnostic[] = [];
  const report = (
    code: MetamodelDiagnostic['code'],
    path: string,
    message: string,
  ) => diagnostics.push({ code, path, message });
  function namespaced(id: string, path: string) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]*:[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(id)) {
      report(
        'invalid-definition',
        path,
        'Expected a nonblank namespace:local identifier without whitespace.',
      );
    }
  }
  function version(value: string, path: string) {
    if (!isExactVersion(value))
      report(
        'invalid-definition',
        path,
        'Expected an exact release version, not a range or tag.',
      );
  }
  function pin(reference: PackReference, path: string) {
    if (!reference.id.trim())
      report('invalid-definition', path, 'Pack ID must be nonblank.');
    version(reference.version, `${path}.version`);
    if (reference.contractVersion !== METAMODEL_CONTRACT_VERSION) {
      report(
        'incompatible-contract',
        path,
        `Unsupported contract ${reference.contractVersion}.`,
      );
    }
  }
  function unique(ids: readonly string[], path: string) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id))
        report('duplicate-definition', path, `Duplicate definition ${id}.`);
      seen.add(id);
    }
  }
  function cardinality(value: Cardinality, path: string) {
    if (
      !Number.isSafeInteger(value.min) ||
      value.min < 0 ||
      (value.max !== null &&
        (!Number.isSafeInteger(value.max) || value.max < value.min))
    ) {
      report(
        'invalid-definition',
        path,
        'Cardinality requires nonnegative integer bounds, max >= min or null.',
      );
    }
  }
  function typeReference(
    reference: TypeReference,
    kind: TypeKind,
    path: string,
  ) {
    pin(reference.pack, path);
    namespaced(reference.id, path);
    const definitions = packs
      .filter((pack) => samePack(pack, reference.pack))
      .flatMap((pack) =>
        pack.types.filter(
          (type) => type.id === reference.id && type.kind === kind,
        ),
      );
    if (reference.kind !== kind || definitions.length !== 1) {
      report(
        'missing-definition',
        path,
        `Expected exactly one ${kind} definition for ${reference.id} in the pinned pack.`,
      );
    }
  }
  function typeReferences(
    references: readonly TypeReference[],
    kind: TypeKind,
    path: string,
  ) {
    if (!references.length)
      report(
        'invalid-definition',
        path,
        'At least one allowed type is required.',
      );
    references.forEach((reference, index) =>
      typeReference(reference, kind, `${path}[${index}]`),
    );
  }
  function properties(
    definitions: readonly PropertyDefinition[],
    path: string,
    ancestors: Set<ValueDefinition>,
  ) {
    unique(
      definitions.map((property) => property.id),
      path,
    );
    for (const property of definitions) {
      namespaced(property.id, `${path}.${property.id}`);
      valueDefinition(property.value, `${path}.${property.id}`, ancestors);
    }
  }
  function valueDefinition(
    value: ValueDefinition,
    path: string,
    ancestors: Set<ValueDefinition>,
  ) {
    if (ancestors.has(value)) {
      report(
        'invalid-definition',
        path,
        'Recursive inline value definitions are not supported.',
      );
      return;
    }
    const nested = new Set(ancestors).add(value);
    switch (value.kind) {
      case 'scalar':
        for (const permitted of value.permittedValues ?? []) {
          if (
            (value.valueType === 'null'
              ? permitted !== null
              : typeof permitted !== value.valueType) ||
            (typeof permitted === 'number' && !Number.isFinite(permitted))
          ) {
            report(
              'invalid-definition',
              path,
              'Permitted values must match the scalar type and numbers must be finite.',
            );
          }
        }
        break;
      case 'reference':
        if (value.target.kind !== 'model')
          typeReferences(
            value.target.types,
            value.target.kind,
            `${path}.target`,
          );
        break;
      case 'list':
        cardinality(value.cardinality, `${path}.cardinality`);
        valueDefinition(value.items, `${path}.items`, nested);
        break;
      case 'record':
        properties(value.fields, `${path}.fields`, nested);
        break;
    }
  }

  // The kernel carries a type ID and kind, so collisions across packs are ambiguous.
  unique(
    packs.flatMap((pack) =>
      pack.types.map((type) => `${type.kind}/${type.id}`),
    ),
    'types',
  );
  unique(
    packs.flatMap((pack) =>
      pack.constraints.map((constraint) => constraint.id),
    ),
    'constraints',
  );
  for (const pack of packs) {
    const path = `packs.${pack.id}@${pack.version}`;
    unique(pack.dimensions, `${path}.dimensions`);
    if (
      pack.dimensions.some(
        (dimension) => !PROFILE_DIMENSIONS.includes(dimension),
      )
    ) {
      report(
        'invalid-definition',
        `${path}.dimensions`,
        'Unknown composition dimension.',
      );
    }
    [...pack.requires, ...pack.conflicts].forEach((reference) =>
      pin(reference, path),
    );
    for (const type of pack.types) {
      const typePath = `${path}.types.${type.kind}.${type.id}`;
      namespaced(type.id, typePath);
      properties(type.properties, `${typePath}.properties`, new Set());
      for (const reference of type.constraints) {
        pin(reference.pack, typePath);
        namespaced(reference.id, typePath);
        const matches = packs
          .filter((candidate) => samePack(candidate, reference.pack))
          .flatMap((candidate) =>
            candidate.constraints.filter(
              (constraint) => constraint.id === reference.id,
            ),
          );
        if (matches.length !== 1)
          report(
            'missing-definition',
            `${typePath}.constraints`,
            `Expected one constraint ${reference.id} in the pinned pack.`,
          );
      }
      if (type.kind === 'member')
        typeReferences(type.owners, 'element', `${typePath}.owners`);
      if (type.kind === 'relationship') {
        if (!type.endpointPairs.length)
          report(
            'invalid-definition',
            typePath,
            'A relationship needs an allowed endpoint pair.',
          );
        type.endpointPairs.forEach((pair, index) => {
          for (const endpoint of ['source', 'target'] as const) {
            const endpointPath = `${typePath}.endpointPairs[${index}].${endpoint}`;
            namespaced(pair[endpoint].role, endpointPath);
            typeReferences(pair[endpoint].types, 'element', endpointPath);
          }
        });
      }
    }
    for (const constraint of pack.constraints) {
      const constraintPath = `${path}.constraints.${constraint.id}`;
      namespaced(constraint.id, constraintPath);
      namespaced(constraint.rule.id, `${constraintPath}.rule`);
      version(constraint.rule.version, `${constraintPath}.rule.version`);
      namespaced(constraint.rule.operator.id, `${constraintPath}.operator`);
      version(
        constraint.rule.operator.version,
        `${constraintPath}.operator.version`,
      );
      unique(
        constraint.roles.map((role) => role.id),
        `${constraintPath}.roles`,
      );
      for (const role of constraint.roles) {
        const rolePath = `${constraintPath}.roles.${role.id}`;
        namespaced(role.id, rolePath);
        cardinality(role.cardinality, rolePath);
        typeReferences(role.memberTypes, 'member', rolePath);
      }
    }
    unique(
      pack.extensions.map(
        (extension) => `${extension.id}@${extension.version}`,
      ),
      `${path}.extensions`,
    );
    for (const extension of pack.extensions) {
      namespaced(extension.id, `${path}.extensions`);
      version(extension.version, `${path}.extensions.${extension.id}`);
    }
  }
  return diagnostics;
}
