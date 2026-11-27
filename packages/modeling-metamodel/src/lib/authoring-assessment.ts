import { assessDocument } from './document-assessment.js';
import {
  composeModelingProfile,
  resolveTypeDefinition,
} from './composition.js';
import { copyData, equalData } from './change-data.js';
import { isExactVersion } from './definition-checks.js';
import { CodecError, codecLimits, jsonData } from './codec-json.js';
import {
  comparisonShapes,
  dataKey,
  normalizeComparisonData,
  ordered,
} from './semantic-comparison-data.js';
import type {
  AuthoringAssessment,
  AuthoringBinding,
  AuthoringCheckpoint,
  AuthoringContext,
  AuthoringDeficiency,
  AuthoringPolicy,
} from './authoring-contracts.js';
import type {
  DocumentCheckpoint,
  DocumentDiagnostic,
} from './document-session-contracts.js';

export function authoringError(
  cp: DocumentCheckpoint,
  code: string,
  message: string,
): DocumentDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    location: {
      modelId: cp.snapshot.model.id,
      section: 'command',
      path: ['admission'],
    },
  };
}
function keys(
  value: unknown,
  allowed: readonly string[],
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === allowed.length &&
    allowed.every((k) => Object.hasOwn(value, k))
  );
}
function pin(value: unknown, pack = false): boolean {
  if (
    !keys(
      value,
      pack ? ['id', 'version', 'contractVersion'] : ['id', 'version'],
    )
  )
    return false;
  return (
    typeof value.id === 'string' &&
    !!value.id.trim() &&
    typeof value.version === 'string' &&
    isExactVersion(value.version) &&
    (!pack || value.contractVersion === '1')
  );
}
/** Validate unknown policy fields before canonicalization; never silently drop policy meaning. */
export function canonicalAuthoringPolicy(
  value: unknown,
): AuthoringPolicy | undefined {
  try {
    jsonData(value, codecLimits({}));
  } catch (e) {
    if (e instanceof CodecError) return;
    throw e;
  }
  if (
    !keys(value, [
      'id',
      'version',
      'contractVersion',
      'profile',
      'allowMissing',
    ]) ||
    value.contractVersion !== '1' ||
    !pin({ id: value.id, version: value.version }) ||
    !pin(value.profile) ||
    !Array.isArray(value.allowMissing)
  )
    return;
  const selectors = value.allowMissing;
  for (const s of selectors) {
    if (
      !keys(s, ['type', 'property']) ||
      !keys(s.type, ['pack', 'kind', 'id']) ||
      !pin(s.type.pack, true) ||
      !['element', 'member', 'relationship'].includes(s.type.kind as string) ||
      typeof s.type.id !== 'string' ||
      !s.type.id.includes(':') ||
      typeof s.property !== 'string' ||
      !s.property.includes(':')
    )
      return;
  }
  if (new Set(selectors.map(dataKey)).size !== selectors.length) return;
  return copyData({
    ...value,
    allowMissing: ordered(selectors),
  }) as unknown as AuthoringPolicy;
}

export function resolveAuthoringBinding(
  cp: DocumentCheckpoint,
  context: AuthoringContext,
): AuthoringBinding | undefined {
  const policy = canonicalAuthoringPolicy(context.policy);
  if (
    !policy ||
    !equalData(policy.profile, {
      id: cp.snapshot.profile.id,
      version: cp.snapshot.profile.version,
    })
  )
    return;
  const composition = composeModelingProfile(
    cp.snapshot.profile,
    context.document.packs,
  );
  if (!composition.ok) return;
  for (const selector of policy.allowMissing) {
    const resolved = resolveTypeDefinition(composition.value, selector.type);
    if (!resolved.ok) return;
    const property = resolved.value.properties.find(
      (p) => p.id === selector.property,
    );
    if (!property?.required || property.value.kind !== 'scalar') return;
  }
  let unknown = false;
  const normalize = <T>(
    input: T,
    shape: Parameters<typeof normalizeComparisonData>[1],
  ) =>
    normalizeComparisonData(input, shape, () => {
      unknown = true;
    });
  const definitions = {
    profile: normalize(cp.snapshot.profile, comparisonShapes.profile),
    packs: ordered(
      composition.value.packs.map((p) => normalize(p, comparisonShapes.pack)),
    ),
    rules: normalize(context.document.validationRules, comparisonShapes.rules),
    defaultRules: ordered(context.document.defaultRules),
    notations: ordered(context.document.notations),
    theme: context.document.theme,
  };
  try {
    jsonData(definitions, codecLimits({}));
  } catch (e) {
    if (e instanceof CodecError) return;
    throw e;
  }
  if (unknown) return;
  const definitionKey = dataKey(definitions);
  if (definitionKey.length > codecLimits({}).maxStringLength) return;
  return { policy, definitionKey };
}

export function classifyAuthoring(
  cp: DocumentCheckpoint,
  context: AuthoringContext,
  binding: AuthoringBinding,
  assessment = assessDocument(cp, context.document),
): AuthoringAssessment {
  const deficiencies: AuthoringDeficiency[] = [];
  const blocked = (code: string, message: string): AuthoringAssessment => ({
    admission: 'blocked',
    assessment,
    deficiencies: [],
    diagnostics: [authoringError(cp, code, message)],
  });
  const selected = resolveAuthoringBinding(cp, context);
  if (!selected || !equalData(selected, binding))
    return blocked(
      'authoring.binding',
      'Supply the authorized exact policy and unchanged definition context; no fallback or policy migration is implicit.',
    );
  if (
    assessment.lifecycle !== 'valid' ||
    assessment.semantics.structure !== 'valid' ||
    assessment.semantics.semantics !== 'complete' ||
    assessment.views.length ||
    assessment.diagnostics.length ||
    assessment.notation.some((n) => !n.result.ok)
  )
    return blocked(
      'authoring.invariants',
      'Structure, supported coverage, views, notation and lifecycle must remain valid.',
    );
  if (assessment.status === 'valid')
    return { admission: 'complete', assessment, deficiencies, diagnostics: [] };
  for (const d of assessment.semantics.diagnostics.filter(
    (d) => d.severity === 'error',
  )) {
    const ref = d.location.entity;
    const path = d.location.path;
    const collection =
      ref?.kind === 'element'
        ? 'elements'
        : ref?.kind === 'member'
          ? 'members'
          : ref?.kind === 'relationship'
            ? 'relationships'
            : undefined;
    const entity = collection
      ? cp.snapshot.model[collection].find((e) => e.id === ref?.id)
      : undefined;
    const property = path[4];
    const selector = selected.policy.allowMissing.find(
      (s) =>
        s.type.kind === ref?.kind &&
        s.type.id === entity?.type &&
        s.property === property &&
        equalData(s.type.pack, d.provenance?.pack),
    );
    // Inspect actual absence and exact top-level location, not merely the code.
    if (
      d.code !== 'validation.required-property' ||
      !entity ||
      !ref ||
      ref.kind === 'model' ||
      ref.modelId !== cp.snapshot.model.id ||
      path.length !== 5 ||
      path[0] !== 'model' ||
      path[1] !== collection ||
      path[3] !== 'properties' ||
      typeof property !== 'string' ||
      Object.hasOwn(entity.properties, property) ||
      !selector
    )
      return blocked(
        'authoring.semantic-violation',
        'Every semantic error must be an explicitly selected absent required top-level scalar property.',
      );
    deficiencies.push({
      entity: copyData(ref),
      property: selector.property,
      type: copyData(selector.type),
      policy: {
        id: selected.policy.id,
        version: selected.policy.version,
        contractVersion: '1',
      },
    });
  }
  if (!deficiencies.length)
    return blocked(
      'authoring.unsupported',
      'Unsupported or unexplained semantic state is never admitted.',
    );
  return {
    admission: 'incomplete',
    assessment,
    deficiencies: ordered(deficiencies),
    diagnostics: [],
  };
}
export function validAuthoringOrigin(cp: AuthoringCheckpoint): boolean {
  const receipts = cp.document.commands.filter(
    (r) => r.command.id === cp.importCommandId,
  );
  const c = receipts[0]?.command;
  return (
    receipts.length === 1 &&
    c?.kind === 'edit' &&
    c.edits.length === 0 &&
    c.deletionReviews.length === 0
  );
}
/** Fresh completion is ordinary strict assessment, not admission or owner approval. */
export function assessAuthoringCheckpoint(
  cp: AuthoringCheckpoint,
  context: AuthoringContext,
): AuthoringAssessment {
  const checked = classifyAuthoring(cp.document, context, cp.binding);
  if (validAuthoringOrigin(cp)) return checked;
  return {
    ...checked,
    admission: 'blocked',
    diagnostics: [
      authoringError(
        cp.document,
        'authoring.import',
        'Retain the explicit guarded import receipt.',
      ),
    ],
  };
}
