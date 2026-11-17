import {
  METAMODEL_CONTRACT_VERSION,
  PROFILE_DIMENSIONS,
  type ComposedModelingProfile,
  type MetamodelDiagnostic,
  type MetamodelResult,
  type ModelingPackDefinition,
  type ModelingProfileDefinition,
  type PackReference,
  type TypeDefinition,
  type TypeReference,
} from './contracts.js';
import {
  inspectDefinitions,
  isExactVersion,
  samePack,
} from './definition-checks.js';

/** Composes trusted, typed manifests. This is not a parser for imported model data. */
export function composeModelingProfile(
  profile: ModelingProfileDefinition,
  registry: readonly ModelingPackDefinition[],
): MetamodelResult<ComposedModelingProfile> {
  const diagnostics: MetamodelDiagnostic[] = [];
  const report = (
    code: MetamodelDiagnostic['code'],
    path: string,
    message: string,
  ) => diagnostics.push({ code, path, message });
  if (!profile.id.trim() || !isExactVersion(profile.version)) {
    report(
      'invalid-definition',
      'profile',
      'A profile needs an ID and an exact version.',
    );
  }
  if (!profile.selections.length) {
    report(
      'invalid-definition',
      'profile.selections',
      'Select at least one dimension.',
    );
  }
  const packs: ModelingPackDefinition[] = [];
  const dimensions = new Set<string>();
  // Sort a copy: caller order does not become implicit override precedence.
  const selections = [...profile.selections].sort(
    (a, b) =>
      PROFILE_DIMENSIONS.indexOf(a.dimension) -
      PROFILE_DIMENSIONS.indexOf(b.dimension),
  );
  for (const selection of selections) {
    const path = `profile.selections.${selection.dimension}`;
    if (
      !PROFILE_DIMENSIONS.includes(selection.dimension) ||
      dimensions.has(selection.dimension)
    ) {
      report(
        'incompatible-profile',
        path,
        'Each known dimension permits exactly one selection.',
      );
      continue;
    }
    dimensions.add(selection.dimension);
    const reference = selection.pack;
    if (!reference.id.trim() || !isExactVersion(reference.version)) {
      report(
        'invalid-definition',
        path,
        'Pack references must pin an exact ID and version.',
      );
      continue;
    }
    if (reference.contractVersion !== METAMODEL_CONTRACT_VERSION) {
      report(
        'incompatible-contract',
        path,
        `Unsupported metamodel contract ${reference.contractVersion}.`,
      );
      continue;
    }
    const matches = registry.filter(
      (pack) => pack.id === reference.id && pack.version === reference.version,
    );
    if (matches.length !== 1) {
      report(
        matches.length ? 'duplicate-pack' : 'missing-pack',
        path,
        `Expected one registration for ${reference.id}@${reference.version}; found ${matches.length}.`,
      );
      continue;
    }
    const pack = matches[0];
    if (!samePack(pack, reference)) {
      report(
        'incompatible-contract',
        path,
        'The registered pack does not implement the pinned contract.',
      );
      continue;
    }
    if (!pack.dimensions.includes(selection.dimension)) {
      report(
        'incompatible-profile',
        path,
        'The pack does not declare this dimension.',
      );
      continue;
    }
    const existing = packs.find((candidate) => candidate.id === pack.id);
    if (existing && !samePack(existing, pack)) {
      report(
        'incompatible-profile',
        path,
        'One profile cannot select different versions of the same pack.',
      );
    } else if (!existing) {
      packs.push(pack);
    }
  }
  // Avoid cascaded definition errors until all selections are resolved.
  if (diagnostics.length) return { ok: false, diagnostics };
  for (const pack of packs) {
    const path = `packs.${pack.id}@${pack.version}`;
    for (const required of pack.requires) {
      if (!packs.some((candidate) => samePack(candidate, required))) {
        report(
          'incompatible-profile',
          `${path}.requires`,
          `Explicitly select required pack ${required.id}@${required.version} with contract ${required.contractVersion}.`,
        );
      }
    }
    for (const conflict of pack.conflicts) {
      if (packs.some((candidate) => samePack(candidate, conflict))) {
        report(
          'incompatible-profile',
          `${path}.conflicts`,
          `Conflicts with ${conflict.id}@${conflict.version}.`,
        );
      }
    }
  }
  diagnostics.push(...inspectDefinitions(packs));
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: { profile: { ...profile, selections }, packs } };
}

/** Resolves the defining pack, contract, entity kind and ID without a fallback. */
export function resolveTypeDefinition(
  composition: ComposedModelingProfile,
  reference: TypeReference,
): MetamodelResult<TypeDefinition> {
  const packs = composition.packs.filter((pack) =>
    samePack(pack, reference.pack),
  );
  const matches = packs.flatMap((pack) =>
    pack.types.filter(
      (type) => type.kind === reference.kind && type.id === reference.id,
    ),
  );
  if (packs.length !== 1 || matches.length !== 1) {
    return {
      ok: false,
      diagnostics: [
        {
          code:
            matches.length > 1 || packs.length > 1
              ? 'duplicate-definition'
              : 'missing-definition',
          path: `types.${reference.kind}.${reference.id}`,
          message: `Expected one definition in ${reference.pack.id}@${reference.pack.version} with contract ${reference.pack.contractVersion}.`,
        },
      ],
    };
  }
  return { ok: true, value: matches[0] };
}

/** Captures the exact pack/contract identity without copying its definitions. */
export function packReference(pack: ModelingPackDefinition): PackReference {
  return {
    id: pack.id,
    version: pack.version,
    contractVersion: pack.contractVersion,
  };
}
