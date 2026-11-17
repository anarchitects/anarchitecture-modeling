import type {
  DiagramView,
  ModelDocument,
  PresentationOverrides,
  ViewDiagnostic,
  ViewOccurrenceIdentity,
} from '@anarchitects/modeling-core';
import { resolveTypeDefinition } from './composition.js';
import type {
  ComposedModelingProfile,
  NamespacedId,
  PackReference,
  TypeReference,
} from './contracts.js';
import { isExactVersion, samePack } from './definition-checks.js';

export interface NotationReference {
  readonly pack: PackReference;
  readonly id: NamespacedId;
  /** Notation revision, separate from pack, metamodel and model-format versions. */
  readonly version: string;
}

/** Host-supplied opaque values; Foundation neither interprets CSS nor owns a palette. */
export interface HostTheme {
  readonly id: string;
  readonly tokens: Readonly<Record<string, string>>;
}

export interface NotationAccessibility {
  readonly labelRequired: true;
  readonly nonColorCueRequired: true;
  /** Pack requirements to be verified by the renderer against resolved host colors. */
  readonly minimumTextContrast: number;
  readonly minimumGraphicContrast: number;
}

/** Pack-owned, data-only sidecar. Not a new profile dimension or executable renderer. */
export interface NotationDefinition {
  readonly reference: NotationReference;
  readonly type: TypeReference<'element' | 'relationship'>;
  readonly defaults: PresentationOverrides;
  /** Absent key = forbidden; explicit finite lists prevent arbitrary overrides. */
  readonly allowedOverrides: Readonly<
    Partial<Record<keyof PresentationOverrides, readonly string[]>>
  >;
  readonly accessibility: NotationAccessibility;
}

export type NotationDiagnosticCode =
  | 'notation.missing-definition'
  | 'notation.duplicate-definition'
  | 'notation.incompatible-type'
  | 'notation.invalid-definition'
  | 'notation.forbidden-override'
  | 'notation.missing-theme-token'
  | 'notation.missing-accessibility';

export interface NotationDiagnostic
  extends ViewDiagnostic<NotationDiagnosticCode> {
  readonly notation: NotationReference;
}

export type NotationResult =
  | { readonly ok: false; readonly diagnostics: readonly NotationDiagnostic[] }
  | {
      readonly ok: true;
      readonly value: {
        readonly notation: NotationReference;
        readonly appearance: PresentationOverrides;
        readonly themeId: string;
        readonly tokenValues: Readonly<Record<string, string>>;
        readonly accessibility: NotationAccessibility;
        readonly accessibilityAssessment: 'pending-host-verification';
      };
    };

const elementKeys = [
  'shape',
  'icon',
  'fillToken',
  'strokeToken',
  'textToken',
] as const;
const connectorKeys = [
  'lineStyle',
  'sourceMarker',
  'targetMarker',
  'strokeToken',
  'textToken',
] as const;
const tokenKeys = ['fillToken', 'strokeToken', 'textToken'] as const;

export interface OccurrenceNotationInput {
  readonly model: ModelDocument;
  readonly view: DiagramView;
  readonly occurrence: ViewOccurrenceIdentity;
  readonly notation: NotationReference;
  readonly registry: readonly NotationDefinition[];
  readonly composition: ComposedModelingProfile;
}

export type NotationValidationResult =
  | { readonly ok: false; readonly diagnostics: readonly NotationDiagnostic[] }
  | {
      readonly ok: true;
      readonly value: Omit<
        Extract<NotationResult, { ok: true }>['value'],
        'themeId' | 'tokenValues'
      >;
    };

/** Validate exact pack-owned notation and permitted overrides without consulting host theme values. */
export function validateOccurrenceNotation(
  input: OccurrenceNotationInput,
): NotationValidationResult {
  const {
    model,
    view,
    occurrence: identity,
    notation,
    registry,
    composition,
  } = input;
  const diagnostics: NotationDiagnostic[] = [];
  const collection =
    identity.kind === 'element-occurrence' ? 'elements' : 'connectors';
  const occurrences = view[collection].filter(
    (candidate) => candidate.id === identity.id,
  );
  const occurrence = occurrences.length === 1 ? occurrences[0] : undefined;
  const index = view[collection].findIndex(
    (candidate) => candidate.id === identity.id,
  );
  function report(
    code: NotationDiagnosticCode,
    path: readonly (string | number)[],
    message: string,
  ) {
    diagnostics.push({
      code,
      severity: 'error',
      message,
      notation,
      location: {
        modelId: view.modelId,
        viewId: view.id,
        occurrenceId: identity.id,
        path: index < 0 ? [collection, ...path] : [collection, index, ...path],
      },
      ...(occurrence && { semanticTarget: occurrence.target }),
    });
  }
  if (
    !occurrence ||
    view.modelId !== model.id ||
    occurrence.target.modelId !== model.id ||
    model.profile.id !== composition.profile.id ||
    model.profile.version !== composition.profile.version
  ) {
    report(
      'notation.incompatible-type',
      ['target'],
      'Resolve one occurrence in the supplied view, semantic model and exact model profile.',
    );
    return { ok: false, diagnostics };
  }
  const selected = composition.packs.filter((pack) =>
    samePack(pack, notation.pack),
  );
  const matches = registry.filter(
    (definition) =>
      samePack(definition.reference.pack, notation.pack) &&
      definition.reference.id === notation.id &&
      definition.reference.version === notation.version,
  );
  if (selected.length !== 1 || matches.length !== 1) {
    report(
      selected.length > 1 || matches.length > 1
        ? 'notation.duplicate-definition'
        : 'notation.missing-definition',
      ['notation'],
      'Register one exact notation version owned by one selected pack; no fallback is used.',
    );
    return { ok: false, diagnostics };
  }
  const definition = matches[0];
  const entities =
    occurrence.kind === 'element-occurrence'
      ? model.elements
      : model.relationships;
  const semantic = entities.filter(
    (entity) => entity.id === occurrence.target.id,
  );
  if (
    !samePack(definition.type.pack, notation.pack) ||
    !resolveTypeDefinition(composition, definition.type).ok ||
    semantic.length !== 1 ||
    semantic[0].type !== definition.type.id ||
    definition.type.kind !== occurrence.target.kind
  ) {
    report(
      'notation.incompatible-type',
      ['target'],
      'Use notation owned by the defining pack for this exact semantic type and kind.',
    );
  }
  if (
    !isExactVersion(notation.version) ||
    !/^[A-Za-z][A-Za-z0-9_.-]*:[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(notation.id)
  ) {
    report(
      'notation.invalid-definition',
      ['notation'],
      'Pin a concrete notation version and namespaced ID.',
    );
  }
  const allowedKeys: readonly string[] =
    occurrence.kind === 'element-occurrence' ? elementKeys : connectorKeys;
  for (const [key, value] of Object.entries(definition.defaults)) {
    if (
      !allowedKeys.includes(key) ||
      typeof value !== 'string' ||
      !value.trim()
    )
      report(
        'notation.invalid-definition',
        ['notation', 'defaults', key],
        'Provide a nonblank presentation identifier allowed for this occurrence kind.',
      );
  }
  for (const [key, values] of Object.entries(definition.allowedOverrides)) {
    if (
      !allowedKeys.includes(key) ||
      !values.every((value) => typeof value === 'string' && value.trim())
    )
      report(
        'notation.invalid-definition',
        ['notation', 'allowedOverrides', key],
        'Declare only nonblank allowed values for presentation keys of this occurrence kind.',
      );
  }
  for (const [key, value] of Object.entries(occurrence.overrides)) {
    const permitted = Object.hasOwn(definition.allowedOverrides, key)
      ? definition.allowedOverrides[key as keyof PresentationOverrides]
      : undefined;
    if (!allowedKeys.includes(key) || !permitted?.includes(value))
      report(
        'notation.forbidden-override',
        ['overrides', key],
        'Remove this override or choose a value explicitly permitted by the pinned notation.',
      );
  }
  const appearance = { ...definition.defaults, ...occurrence.overrides };
  const requiredTokens: readonly (typeof tokenKeys)[number][] =
    occurrence.kind === 'element-occurrence'
      ? tokenKeys
      : ['strokeToken', 'textToken'];
  for (const key of requiredTokens) {
    if (!definition.defaults[key]?.trim())
      report(
        'notation.invalid-definition',
        ['notation', 'defaults', key],
        'Declare a default theme token; overrides cannot repair an incomplete notation.',
      );
  }
  const accessibility = definition.accessibility;
  if (
    accessibility.labelRequired !== true ||
    accessibility.nonColorCueRequired !== true ||
    !validContrast(accessibility.minimumTextContrast) ||
    !validContrast(accessibility.minimumGraphicContrast)
  ) {
    report(
      'notation.invalid-definition',
      ['notation', 'accessibility'],
      'Require text labels, non-color cues and finite contrast ratios between 1 and 21.',
    );
  }
  const cueKeys: readonly (keyof PresentationOverrides)[] =
    occurrence.kind === 'element-occurrence'
      ? ['shape', 'icon']
      : ['lineStyle', 'sourceMarker', 'targetMarker'];
  if (!cueKeys.some((key) => definition.defaults[key]?.trim()))
    report(
      'notation.invalid-definition',
      ['notation', 'defaults'],
      'Declare a default non-color cue for this occurrence kind.',
    );
  if (
    !occurrence.accessibility.label.trim() ||
    !cueKeys.some((key) => appearance[key]?.trim())
  )
    report(
      'notation.missing-accessibility',
      ['accessibility'],
      'Provide an accessible label and a notation-defined non-color cue.',
    );
  return diagnostics.length
    ? { ok: false, diagnostics }
    : {
        ok: true,
        value: {
          notation,
          appearance,
          accessibility,
          accessibilityAssessment: 'pending-host-verification',
        },
      };
}

/** Resolve a validated appearance against the host theme; rendered accessibility still needs host evidence. */
export function resolveOccurrenceNotation(
  input: OccurrenceNotationInput & { readonly theme: HostTheme },
): NotationResult {
  const validated = validateOccurrenceNotation(input);
  if (!validated.ok) return validated;
  const { view, occurrence: identity, notation, theme } = input;
  const { appearance } = validated.value;
  const collection =
    identity.kind === 'element-occurrence' ? 'elements' : 'connectors';
  const index = view[collection].findIndex((o) => o.id === identity.id);
  const occurrence = view[collection][index];
  const diagnostics: NotationDiagnostic[] = [];
  function report(
    code: NotationDiagnosticCode,
    path: readonly (string | number)[],
    message: string,
  ) {
    diagnostics.push({
      code,
      severity: 'error',
      message,
      notation,
      location: {
        modelId: view.modelId,
        viewId: view.id,
        occurrenceId: identity.id,
        path: [collection, index, ...path],
      },
      semanticTarget: occurrence.target,
    });
  }
  const tokenValues: Record<string, string> = Object.create(null);
  if (!theme.id.trim())
    report(
      'notation.missing-theme-token',
      ['theme'],
      'Supply a named host theme.',
    );
  for (const key of tokenKeys) {
    const token = appearance[key];
    if (token !== undefined) {
      if (!Object.hasOwn(theme.tokens, token) || !theme.tokens[token]?.trim())
        report(
          'notation.missing-theme-token',
          ['theme', token],
          'Define this token in the host theme or select a supported override.',
        );
      else tokenValues[token] = theme.tokens[token];
    }
  }

  return diagnostics.length
    ? { ok: false, diagnostics }
    : {
        ok: true,
        value: { ...validated.value, themeId: theme.id, tokenValues },
      };
}

function validContrast(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 21;
}
