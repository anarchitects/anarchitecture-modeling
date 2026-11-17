import type {
  ModelDiagnostic,
  ModelDiagnosticLocation,
  ModelDocument,
  ElementReference,
  MemberReference,
  RelationshipReference,
} from '@anarchitects/modeling-core';
import type {
  ConstraintInstance,
  ConstraintReference,
  ExtensionEnvelope,
  ModelingPackDefinition,
  ModelingProfileDefinition,
  PackReference,
  RuleReference,
} from './contracts.js';
import type { ExtensionSupport } from './extensions.js';

export interface ValidationProvenance {
  readonly pack: PackReference;
  readonly constraint?: ConstraintReference;
  readonly rule?: RuleReference;
}

export interface ValidationDiagnostic extends ModelDiagnostic {
  readonly provenance?: ValidationProvenance;
}

/** Constraint storage remains a sidecar until #9 explicitly defines persisted encoding. */
export interface ConstraintBinding {
  readonly subject: ElementReference | MemberReference | RelationshipReference;
  readonly instance: ConstraintInstance;
}

/** Explicit opt-in to a known bounded operator; never source code or a callback. */
export interface ValidationRuleRegistration {
  readonly pack: PackReference;
  readonly rule: RuleReference;
}

export interface ModelValidationInput {
  readonly model: ModelDocument;
  readonly profile: ModelingProfileDefinition;
  readonly registry: readonly ModelingPackDefinition[];
  readonly constraints?: readonly ConstraintBinding[];
  readonly extensions?: readonly ExtensionEnvelope[];
  readonly rules?: readonly ValidationRuleRegistration[];
}

export interface ModelValidationResult {
  /** Unsupported coverage never collapses into a successful valid result. */
  readonly status: 'valid' | 'invalid' | 'unsupported';
  readonly structure: 'valid' | 'invalid';
  readonly semantics: 'complete' | 'partial' | 'not-run';
  readonly diagnostics: readonly ValidationDiagnostic[];
  /** Same envelope objects; payloads are never inspected or normalized. */
  readonly extensions: readonly ExtensionSupport[];
}

export type ValidationReporter = (
  code: string,
  location: ModelDiagnosticLocation,
  message: string,
  provenance?: ValidationProvenance,
  severity?: 'error' | 'warning',
) => void;

/** Checks role structure plus ownership of all referenced members by the element subject. */
export const MEMBER_GROUP_OPERATOR = {
  id: 'foundation:member-group',
  version: '1',
} as const;
