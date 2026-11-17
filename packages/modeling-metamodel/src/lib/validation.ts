import {
  validateModelReference,
  validateModelStructure,
  validateModelValue,
  type ModelDiagnosticLocation,
  type ModelEntityReference,
  type ModelProperties,
} from '@anarchitects/modeling-core';
import { composeModelingProfile, packReference } from './composition.js';
import type {
  ConstraintReference,
  PropertyDefinition,
  RuleReference,
  TypeDefinition,
  TypeKind,
} from './contracts.js';
import { samePack } from './definition-checks.js';
import { inspectExtensionSupport } from './extensions.js';
import {
  MEMBER_GROUP_OPERATOR,
  type ModelValidationInput,
  type ModelValidationResult,
  type ValidationDiagnostic,
  type ValidationProvenance,
  type ValidationReporter,
} from './validation-contracts.js';
import {
  matchesReferenceType,
  propertyValidator,
  withinCardinality,
} from './value-validation.js';

function sameConstraint(
  a: ConstraintReference,
  b: ConstraintReference,
): boolean {
  return a.id === b.id && samePack(a.pack, b.pack);
}

function sameRule(a: RuleReference, b: RuleReference): boolean {
  return (
    a.id === b.id &&
    a.version === b.version &&
    a.operator.id === b.operator.id &&
    a.operator.version === b.operator.version
  );
}

/** Non-mutating structural + pinned-schema validation with explicit coverage limits. */
export function validateModel(
  input: ModelValidationInput,
): ModelValidationResult {
  const {
    model,
    profile,
    registry,
    constraints = [],
    extensions = [],
    rules = [],
  } = input;
  const structural = validateModelStructure(model);
  const diagnostics: ValidationDiagnostic[] = [...structural.diagnostics];
  const report: ValidationReporter = (
    code,
    location,
    message,
    provenance,
    severity = 'error',
  ) =>
    diagnostics.push({
      code,
      severity,
      location,
      message,
      ...(provenance && { provenance }),
    });
  const root: ModelDiagnosticLocation = { modelId: model.id, path: [] };
  const composed = composeModelingProfile(profile, registry);
  constraints.forEach((binding, index) => {
    const start = diagnostics.length;
    const location = {
      ...root,
      entity: binding.subject,
      path: ['constraints', index],
    };
    diagnostics.push(
      ...validateModelReference(
        model,
        binding.subject,
        { ...location, path: [...location.path, 'subject'] },
        ['element', 'relationship', 'member'],
      ),
    );
    diagnostics.push(
      ...validateModelValue(
        model,
        { kind: 'record', fields: binding.instance.parameters },
        { ...location, path: [...location.path, 'instance', 'parameters'] },
      ),
    );
    binding.instance.roles.forEach((role, roleIndex) =>
      role.group.members.forEach((member, memberIndex) => {
        diagnostics.push(
          ...validateModelReference(
            model,
            member,
            {
              ...location,
              path: [
                ...location.path,
                'instance',
                'roles',
                roleIndex,
                'group',
                'members',
                memberIndex,
              ],
            },
            ['member'],
          ),
        );
      }),
    );
    const reference = binding.instance.definition;
    const definition = composed.ok
      ? composed.value.packs
          .find((pack) => samePack(pack, reference.pack))
          ?.constraints.find((constraint) => constraint.id === reference.id)
      : undefined;
    for (
      let diagnosticIndex = start;
      diagnosticIndex < diagnostics.length;
      diagnosticIndex++
    ) {
      diagnostics[diagnosticIndex] = {
        ...diagnostics[diagnosticIndex],
        provenance: {
          pack: reference.pack,
          constraint: reference,
          ...(definition && { rule: definition.rule }),
        },
      };
    }
  });
  const structureValid = diagnostics.length === 0;
  if (!composed.ok) {
    for (const diagnostic of composed.diagnostics)
      report(
        `profile.${diagnostic.code}`,
        { ...root, path: ['profile', diagnostic.path] },
        diagnostic.message,
      );
  }
  if (
    model.profile.id !== profile.id ||
    model.profile.version !== profile.version
  )
    report(
      'validation.profile-mismatch',
      { ...root, path: ['model', 'profile'] },
      'Validate against the exact profile pinned by the model.',
    );
  const extensionResults = extensions.map((envelope, index) => {
    const result = inspectExtensionSupport(
      envelope,
      composed.ok ? composed.value : { profile, packs: [] },
    );
    report(
      result.status === 'supported'
        ? 'validation.unvalidated-extension'
        : 'validation.unsupported-extension',
      { ...root, path: ['extensions', index] },
      'Payload is preserved untouched; registration availability does not validate extension semantics.',
      { pack: envelope.pack },
      'warning',
    );
    return result;
  });
  const finish = (
    semantics: ModelValidationResult['semantics'],
  ): ModelValidationResult => ({
    status: diagnostics.some((d) => d.severity === 'error')
      ? 'invalid'
      : semantics !== 'complete'
        ? 'unsupported'
        : 'valid',
    structure: structureValid ? 'valid' : 'invalid',
    semantics,
    diagnostics,
    extensions: extensionResults,
  });
  if (
    !structureValid ||
    !composed.ok ||
    model.profile.id !== profile.id ||
    model.profile.version !== profile.version
  )
    return finish('not-run');
  const composition = composed.value;
  const check = propertyValidator(model, composition, report);
  const definitions = composition.packs.flatMap((pack) =>
    pack.types.map((type) => ({ type, pack: packReference(pack) })),
  );
  const definitionFor = (kind: TypeKind, id: string) =>
    definitions.find(
      (entry) => entry.type.kind === kind && entry.type.id === id,
    );
  const entityFor = (
    reference: Exclude<ModelEntityReference, { kind: 'model' }>,
  ) =>
    (reference.kind === 'element'
      ? model.elements
      : reference.kind === 'member'
        ? model.members
        : model.relationships
    ).find((entity) => entity.id === reference.id);

  // Validate all selected default proposals, including nested/unused type schemas, without applying them.
  function defaults(
    properties: readonly PropertyDefinition[],
    location: ModelDiagnosticLocation,
    provenance: ValidationProvenance,
  ) {
    for (const property of properties) {
      const nested = { ...location, path: [...location.path, property.id] };
      if (Object.hasOwn(property, 'defaultValue')) {
        const atDefault = { ...nested, path: [...nested.path, 'defaultValue'] };
        const errors = validateModelValue(
          model,
          property.defaultValue,
          atDefault,
        );
        diagnostics.push(...errors.map((error) => ({ ...error, provenance })));
        if (!errors.length && property.defaultValue !== undefined)
          check.value(
            property.defaultValue,
            property.value,
            atDefault,
            provenance,
          );
      }
      function descend(value: PropertyDefinition['value']) {
        if (value.kind === 'record')
          defaults(
            value.fields,
            { ...nested, path: [...nested.path, 'fields'] },
            provenance,
          );
        if (value.kind === 'list') descend(value.items);
      }
      descend(property.value);
    }
  }
  for (const entry of definitions)
    defaults(
      entry.type.properties,
      {
        ...root,
        path: [
          'definitions',
          entry.pack.id,
          entry.type.kind,
          entry.type.id,
          'properties',
        ],
      },
      { pack: entry.pack },
    );

  for (const [collection, kind] of [
    ['elements', 'element'],
    ['members', 'member'],
    ['relationships', 'relationship'],
  ] as const) {
    model[collection].forEach((entity, index) => {
      const subject = { kind, modelId: model.id, id: entity.id } as Exclude<
        ModelEntityReference,
        { kind: 'model' }
      >;
      const location = {
        ...root,
        entity: subject,
        path: ['model', collection, index],
      };
      const entry = definitionFor(kind, entity.type);
      if (!entry) {
        report(
          'validation.missing-type',
          { ...location, path: [...location.path, 'type'] },
          'Register this exact entity kind/type in the selected profile.',
        );
        return;
      }
      const provenance = { pack: entry.pack };
      check.properties(
        entity.properties,
        entry.type.properties,
        { ...location, path: [...location.path, 'properties'] },
        provenance,
      );
      if (
        entry.type.kind === 'member' &&
        'owner' in entity &&
        !entry.type.owners.some((type) =>
          matchesReferenceType(model, composition, entity.owner, type),
        )
      )
        report(
          'validation.owner-type',
          { ...location, path: [...location.path, 'owner'] },
          'Select an owner with a type permitted by this member definition.',
          provenance,
        );
      if (
        entry.type.kind === 'relationship' &&
        'source' in entity &&
        !entry.type.endpointPairs.some(
          (pair) =>
            pair.source.types.some((type) =>
              matchesReferenceType(model, composition, entity.source, type),
            ) &&
            pair.target.types.some((type) =>
              matchesReferenceType(model, composition, entity.target, type),
            ),
        )
      )
        report(
          'validation.endpoint-pair',
          location,
          'Use one allowed source/target pair; separate allowed endpoints do not imply every combination.',
          provenance,
        );
      for (const reference of entry.type.constraints) {
        const definition = composition.packs
          .find((pack) => samePack(pack, reference.pack))
          ?.constraints.find((constraint) => constraint.id === reference.id);
        if (
          definition?.mandatory &&
          !constraints.some(
            (binding) =>
              binding.subject.kind === kind &&
              binding.subject.id === entity.id &&
              sameConstraint(binding.instance.definition, reference),
          )
        )
          report(
            'validation.missing-constraint',
            {
              ...location,
              path: [...location.path, 'constraints', reference.id],
            },
            'Supply an instance of this mandatory constraint for the entity.',
            {
              pack: reference.pack,
              constraint: reference,
              rule: definition.rule,
            },
          );
      }
    });
  }

  constraints.forEach((binding, index) => {
    const instance = binding.instance;
    const reference = instance.definition;
    const location = {
      ...root,
      entity: binding.subject,
      path: ['constraints', index, 'instance'],
    };
    const subject = entityFor(binding.subject);
    const subjectType: TypeDefinition | undefined =
      subject && definitionFor(binding.subject.kind, subject.type)?.type;
    const definition = composition.packs
      .find((pack) => samePack(pack, reference.pack))
      ?.constraints.find((constraint) => constraint.id === reference.id);
    if (
      !definition ||
      !subjectType?.constraints.some((allowed) =>
        sameConstraint(allowed, reference),
      )
    ) {
      report(
        'validation.incompatible-constraint',
        location,
        'Use a constraint explicitly allowed by the subject type and selected pack.',
        { pack: reference.pack, constraint: reference },
      );
      return;
    }
    const provenance = {
      pack: reference.pack,
      constraint: reference,
      rule: definition.rule,
    };
    const roleNames = new Set<string>();
    instance.roles.forEach((bindingRole, roleIndex) => {
      const roleLocation = {
        ...location,
        path: [...location.path, 'roles', roleIndex],
      };
      if (roleNames.has(bindingRole.role))
        report(
          'validation.duplicate-role',
          roleLocation,
          'Bind each declared role once, preserving the group as one constraint.',
          provenance,
        );
      roleNames.add(bindingRole.role);
      const role = definition.roles.find(
        (role) => role.id === bindingRole.role,
      );
      if (!role) {
        report(
          'validation.unknown-role',
          roleLocation,
          'Use a role declared by the pinned constraint.',
          provenance,
        );
        return;
      }
      const members = bindingRole.group.members;
      if (!withinCardinality(members.length, role.cardinality))
        report(
          'validation.role-cardinality',
          roleLocation,
          'Supply a member group within this role’s inclusive bounds.',
          provenance,
        );
      if (
        role.distinct &&
        new Set(members.map((member) => member.id)).size !== members.length
      )
        report(
          'validation.duplicate-member',
          roleLocation,
          'Use distinct member identities in this role.',
          provenance,
        );
      members.forEach((member, memberIndex) => {
        if (
          !role.memberTypes.some((type) =>
            matchesReferenceType(model, composition, member, type),
          )
        )
          report(
            'validation.member-type',
            {
              ...roleLocation,
              path: [...roleLocation.path, 'group', 'members', memberIndex],
            },
            'Use a member of a type allowed by this role.',
            provenance,
          );
      });
    });
    for (const role of definition.roles)
      if (!roleNames.has(role.id))
        report(
          'validation.missing-role',
          { ...location, path: [...location.path, 'roles', role.id] },
          'Bind this role explicitly, using an empty group only when its cardinality permits.',
          provenance,
        );
    const registrations = rules.filter(
      (registration) =>
        samePack(registration.pack, reference.pack) &&
        sameRule(registration.rule, definition.rule),
    );
    if (registrations.length > 1) {
      report(
        'validation.duplicate-rule',
        location,
        'Register the exact pack/rule/operator identity only once.',
        provenance,
      );
      return;
    }
    if (
      registrations.length !== 1 ||
      definition.rule.operator.id !== MEMBER_GROUP_OPERATOR.id ||
      definition.rule.operator.version !== MEMBER_GROUP_OPERATOR.version
    ) {
      report(
        'validation.unsupported-rule',
        location,
        'Register this exact rule with a supported bounded operator; role structure alone does not validate its meaning.',
        provenance,
        'warning',
      );
      return;
    }
    if (Object.keys(instance.parameters as ModelProperties).length)
      report(
        'validation.unsupported-parameters',
        { ...location, path: [...location.path, 'parameters'] },
        'The member-group operator has no parameters; their semantics are not validated.',
        provenance,
        'warning',
      );
    if (binding.subject.kind !== 'element') {
      report(
        'validation.rule-subject',
        location,
        'The member-group operator requires an element subject.',
        provenance,
      );
      return;
    }
    instance.roles.forEach((role, roleIndex) =>
      role.group.members.forEach((member, memberIndex) => {
        const target = model.members.find(
          (candidate) => candidate.id === member.id,
        );
        if (target?.owner.id !== binding.subject.id)
          report(
            'validation.member-owner',
            {
              ...location,
              path: [
                ...location.path,
                'roles',
                roleIndex,
                'group',
                'members',
                memberIndex,
              ],
            },
            'Use members owned by the constrained element; cross-element groups require a different rule.',
            provenance,
          );
      }),
    );
  });
  return finish(
    diagnostics.some((d) => d.severity === 'warning') ? 'partial' : 'complete',
  );
}
