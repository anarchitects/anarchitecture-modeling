import type { ModelDocument } from '@anarchitects/modeling-core';
import { composeModelingProfile } from './composition.js';
import { samePack } from './definition-checks.js';
import type { DocumentLocation } from './document-session-contracts.js';
import type { ConstraintBinding } from './validation-contracts.js';
import { validateModel } from './validation.js';
import {
  SEMANTIC_COMPARISON_CONTRACT_VERSION,
  type SemanticComparisonDiagnostic,
  type SemanticComparisonEvidence,
  type SemanticComparisonInput,
  type SemanticComparisonRequest,
  type SemanticComparisonResult,
  type SemanticComparisonValue,
  type SemanticDifference,
} from './semantic-comparison-contracts.js';
import {
  comparisonShapes,
  compareText,
  dataKey,
  normalizeComparisonData,
  ordered,
} from './semantic-comparison-data.js';

const excluded = [
  'model.revision',
  'views',
  'notationBindings',
  'applied',
  'baselines',
] as const;
const snapshotFields = [
  'model',
  'profile',
  'constraints',
  'extensions',
  ...excluded.slice(1),
];

/**
 * Read-only evidence over trusted snapshots. No result authorizes a write, proves
 * provenance, executes method semantics or establishes cross-model identity.
 */
export function compareDocumentSnapshots(
  request: SemanticComparisonRequest,
): SemanticComparisonResult {
  const diagnostics: SemanticComparisonDiagnostic[] = [];
  const differences: SemanticDifference[] = [];
  const location = (
    input: SemanticComparisonInput,
    section: DocumentLocation['section'],
    path: DocumentLocation['path'] = [],
  ): DocumentLocation => ({ modelId: input.snapshot.model.id, section, path });
  function report(
    side: SemanticComparisonDiagnostic['side'],
    code: string,
    at: DocumentLocation,
    message: string,
  ) {
    diagnostics.push({ side, code, location: at, message });
  }
  function evidence(
    input: SemanticComparisonInput,
  ): SemanticComparisonEvidence {
    const profile = normalizeComparisonData(
      input.snapshot.profile,
      comparisonShapes.profile,
      () => undefined,
    );
    return {
      modelId: input.snapshot.model.id,
      revision: input.snapshot.model.revision,
      formatVersion: input.snapshot.model.formatVersion,
      profile,
      packs: ordered([
        ...new Map(
          profile.selections.map(({ pack }) => [dataKey(pack), pack]),
        ).values(),
      ]),
      rules: normalizeComparisonData(
        input.rules,
        comparisonShapes.rules,
        () => undefined,
      ),
    };
  }
  const before = evidence(request.before);
  const after = evidence(request.after);
  function finish(
    status: SemanticComparisonResult['status'],
    coverage: SemanticComparisonResult['coverage']['status'],
  ): SemanticComparisonResult {
    return {
      contractVersion: SEMANTIC_COMPARISON_CONTRACT_VERSION,
      scope: 'semantic-model',
      status,
      coverage: { status: coverage, excluded: [...excluded] },
      before,
      after,
      differences: differences.sort(
        (a, b) =>
          compareText(dataKey(a.location), dataKey(b.location)) ||
          compareText(a.kind, b.kind),
      ),
      diagnostics: ordered(diagnostics),
    };
  }
  function incompatible(
    code: string,
    section: DocumentLocation['section'],
    message: string,
  ) {
    report('both', code, location(request.before, section), message);
    return finish('incompatible', 'not-run');
  }
  if (
    request.contractVersion !== SEMANTIC_COMPARISON_CONTRACT_VERSION ||
    request.scope !== 'semantic-model'
  )
    return incompatible(
      'comparison.contract',
      'model',
      'Use comparison contract 1 and the semantic-model scope.',
    );
  if (before.modelId !== after.modelId)
    return incompatible(
      'comparison.model-identity',
      'model',
      'Different model identities require a separately defined reconciliation contract.',
    );
  if (before.formatVersion !== 2 || after.formatVersion !== 2)
    return incompatible(
      'comparison.model-format',
      'model',
      'Only model format 2 is supported.',
    );
  if (dataKey(before.profile) !== dataKey(after.profile))
    return incompatible(
      'comparison.profile',
      'profile',
      'Compare identical exact profile selections; upgrades require an explicit migration/comparison rule.',
    );
  if (before.packs.some((pack) => pack.contractVersion !== '1'))
    return incompatible(
      'comparison.metamodel-contract',
      'profile',
      'Only metamodel contract 1 is supported.',
    );

  function prepare(input: SemanticComparisonInput, side: 'before' | 'after') {
    const start = diagnostics.length;
    const unknown =
      (section: DocumentLocation['section']) =>
      (path: DocumentLocation['path']) =>
        report(
          side,
          'comparison.unknown-field',
          location(input, section, path),
          'This field or discriminator has no supported comparison semantics.',
        );
    for (const key of Object.keys(input.snapshot).sort(compareText))
      if (!snapshotFields.includes(key)) unknown('model')([key]);
    const model = normalizeComparisonData(
      input.snapshot.model,
      comparisonShapes.model,
      unknown('model'),
    );
    const profile = normalizeComparisonData(
      input.snapshot.profile,
      comparisonShapes.profile,
      unknown('profile'),
    );
    const constraints = normalizeComparisonData(
      input.snapshot.constraints,
      comparisonShapes.constraints,
      unknown('constraints'),
    );
    const rules = normalizeComparisonData(
      input.rules,
      comparisonShapes.rules,
      unknown('profile'),
      ['rules'],
    );
    // Unselected registries cannot influence this comparison. Selected registries
    // retain duplicates so composition can reject ambiguous registration.
    const packs = ordered(
      input.packs
        .filter((pack) =>
          profile.selections.some(
            (selection) =>
              selection.pack.id === pack.id &&
              selection.pack.version === pack.version,
          ),
        )
        .map((pack) =>
          normalizeComparisonData(
            pack,
            comparisonShapes.pack,
            unknown('profile'),
            ['packs', pack.id, pack.version],
          ),
        ),
    );
    if (diagnostics.length !== start) return undefined;
    const composition = composeModelingProfile(profile, packs);
    if (!composition.ok) {
      for (const diagnostic of composition.diagnostics)
        report(
          side,
          `comparison.${diagnostic.code}`,
          location(input, 'profile', [diagnostic.path]),
          diagnostic.message,
        );
      return undefined;
    }
    // Constraint bindings have no stable instance IDs. Preserve multiplicity and
    // compare per-subject/definition multisets, never match instances by position.
    const normalizedConstraints = ordered(
      constraints.map((binding) => {
        const definition = composition.value.packs
          .find((pack) => samePack(pack, binding.instance.definition.pack))
          ?.constraints.find(
            (candidate) => candidate.id === binding.instance.definition.id,
          );
        return {
          ...binding,
          instance: {
            ...binding.instance,
            roles: ordered(
              binding.instance.roles.map((role) => {
                const declared = definition?.roles.find(
                  (candidate) => candidate.id === role.role,
                );
                return {
                  ...role,
                  group: {
                    members:
                      declared?.ordered === false
                        ? ordered(role.group.members)
                        : role.group.members,
                  },
                };
              }),
            ),
          },
        };
      }),
    );
    const validation = validateModel({
      model,
      profile,
      registry: composition.value.packs,
      constraints: normalizedConstraints,
      rules,
    });
    for (const diagnostic of validation.diagnostics) {
      const path = [...diagnostic.location.path];
      let section: DocumentLocation['section'] = 'model';
      if (path[0] === 'model') path.shift();
      else if (path[0] === 'constraints') {
        section = 'constraints';
        path.shift();
      } else if (path[0] === 'profile' || path[0] === 'definitions')
        section = 'profile';
      if (section === 'model' && typeof path[1] === 'number') {
        const collection = path[0];
        if (
          collection === 'elements' ||
          collection === 'members' ||
          collection === 'relationships'
        )
          path[1] = model[collection][path[1]].id;
      }
      if (section === 'constraints' && typeof path[0] === 'number') {
        const binding = normalizedConstraints[path[0]];
        path.splice(0, 1, ...constraintPath(binding));
      }
      report(
        side,
        diagnostic.code,
        location(input, section, path),
        diagnostic.message,
      );
    }
    for (const envelope of input.snapshot.extensions)
      report(
        side,
        'comparison.unsupported-extension',
        location(input, 'extensions', [
          envelope.pack.id,
          envelope.pack.version,
          envelope.extension.id,
          envelope.extension.version,
        ]),
        'Extension payload semantics are not supported, even when registered or identical. Payload was not inspected.',
      );
    return {
      valid: validation.status === 'valid',
      model,
      constraints: normalizedConstraints,
      packs: ordered(composition.value.packs),
      rules,
    };
  }
  const left = prepare(request.before, 'before');
  const right = prepare(request.after, 'after');
  if (!left || !right) return finish('incomplete', 'not-run');
  if (
    dataKey(left.packs) !== dataKey(right.packs) ||
    dataKey(left.rules) !== dataKey(right.rules)
  )
    return incompatible(
      'comparison.definitions',
      'profile',
      'Exact selected definitions and rule registrations must agree, including their content under the same version.',
    );
  if (!left.valid || !right.valid) return finish('incomplete', 'not-run');

  function difference(
    section: DocumentLocation['section'],
    path: DocumentLocation['path'],
    a: unknown,
    b: unknown,
  ) {
    if (dataKey(a) === dataKey(b)) return;
    differences.push({
      kind: a === undefined ? 'added' : b === undefined ? 'removed' : 'changed',
      location: location(request.before, section, path),
      ...(a !== undefined && { before: a as SemanticComparisonValue }),
      ...(b !== undefined && { after: b as SemanticComparisonValue }),
    });
  }
  difference('model', ['name'], left.model.name, right.model.name);
  for (const collection of ['elements', 'members', 'relationships'] as const) {
    const a = new Map<string, ModelDocument[typeof collection][number]>(
      left.model[collection].map((entity) => [entity.id, entity]),
    );
    const b = new Map<string, ModelDocument[typeof collection][number]>(
      right.model[collection].map((entity) => [entity.id, entity]),
    );
    for (const id of [...new Set([...a.keys(), ...b.keys()])].sort(
      compareText,
    )) {
      const previous = a.get(id),
        next = b.get(id);
      const path = [collection, id];
      if (!previous || !next) {
        difference('model', path, previous, next);
        continue;
      }
      for (const key of Object.keys(previous)
        .filter((key) => key !== 'id' && key !== 'properties')
        .sort(compareText))
        difference(
          'model',
          [...path, key],
          previous[key as keyof typeof previous],
          next[key as keyof typeof next],
        );
      for (const key of [
        ...new Set([
          ...Object.keys(previous.properties),
          ...Object.keys(next.properties),
        ]),
      ].sort(compareText))
        difference(
          'model',
          [...path, 'properties', key],
          previous.properties[key],
          next.properties[key],
        );
    }
  }
  function groups(bindings: readonly ConstraintBinding[]) {
    const result = new Map<
      string,
      { path: string[]; values: ConstraintBinding[] }
    >();
    for (const binding of bindings) {
      const path = constraintPath(binding),
        key = dataKey(path);
      const group = result.get(key) ?? { path, values: [] };
      group.values.push(binding);
      result.set(key, group);
    }
    return result;
  }
  const a = groups(left.constraints),
    b = groups(right.constraints);
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort(
    compareText,
  )) {
    const group = a.get(key) ?? b.get(key);
    if (group)
      difference(
        'constraints',
        group.path,
        a.get(key)?.values,
        b.get(key)?.values,
      );
  }
  return finish(
    diagnostics.length
      ? 'incomplete'
      : differences.length
        ? 'different'
        : 'equivalent',
    diagnostics.length ? 'partial' : 'complete',
  );
}

function constraintPath(binding: ConstraintBinding): string[] {
  const pin = binding.instance.definition.pack;
  return [
    binding.subject.kind,
    binding.subject.id,
    pin.id,
    pin.version,
    pin.contractVersion,
    binding.instance.definition.id,
  ];
}
