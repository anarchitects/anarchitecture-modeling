import type { ModelId, ModelRevision } from '@anarchitects/modeling-core';
import type {
  ModelingPackDefinition,
  ModelingProfileDefinition,
  PackReference,
} from './contracts.js';
import type {
  DocumentLocation,
  DocumentSnapshot,
} from './document-session-contracts.js';
import type { ValidationRuleRegistration } from './validation-contracts.js';

/** Comparison semantics version, independent of package, model and codec versions. */
export const SEMANTIC_COMPARISON_CONTRACT_VERSION = '1';

export interface SemanticComparisonInput {
  readonly snapshot: DocumentSnapshot;
  readonly packs: readonly ModelingPackDefinition[];
  readonly rules: readonly ValidationRuleRegistration[];
}

export interface SemanticComparisonRequest {
  readonly contractVersion: string;
  readonly scope: 'semantic-model';
  readonly before: SemanticComparisonInput;
  readonly after: SemanticComparisonInput;
}

/** Detached, normalized supported data; not a wire format or an executable edit. */
export type SemanticComparisonValue =
  | string
  | number
  | boolean
  | null
  | readonly SemanticComparisonValue[]
  | { readonly [key: string]: SemanticComparisonValue };

export interface SemanticDifference {
  readonly kind: 'added' | 'removed' | 'changed';
  /** Entity collection segments use stable IDs, never input array indexes. */
  readonly location: DocumentLocation;
  readonly before?: SemanticComparisonValue;
  readonly after?: SemanticComparisonValue;
}

export interface SemanticComparisonDiagnostic {
  readonly side: 'before' | 'after' | 'both';
  readonly code: string;
  readonly location: DocumentLocation;
  readonly message: string;
}

export interface SemanticComparisonEvidence {
  readonly modelId: ModelId;
  readonly revision: ModelRevision;
  readonly formatVersion: number;
  readonly profile: ModelingProfileDefinition;
  /** Exact selected pins; absence from the registry remains a diagnostic. */
  readonly packs: readonly PackReference[];
  readonly rules: readonly ValidationRuleRegistration[];
}

export interface SemanticComparisonResult {
  readonly contractVersion: typeof SEMANTIC_COMPARISON_CONTRACT_VERSION;
  readonly scope: 'semantic-model';
  readonly status: 'equivalent' | 'different' | 'incomplete' | 'incompatible';
  readonly coverage: {
    readonly status: 'complete' | 'partial' | 'not-run';
    readonly excluded: readonly string[];
  };
  readonly before: SemanticComparisonEvidence;
  readonly after: SemanticComparisonEvidence;
  readonly differences: readonly SemanticDifference[];
  readonly diagnostics: readonly SemanticComparisonDiagnostic[];
}
