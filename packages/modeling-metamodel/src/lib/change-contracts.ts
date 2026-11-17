import type {
  ElementReference,
  InverseModelChange,
  MemberId,
  ModelChange,
  ModelDiagnostic,
  ModelDocument,
  ModelId,
  ModelMember,
  ModelProperties,
  ModelRevision,
  ModelValue,
  PropertySubject,
} from '@anarchitects/modeling-core';
import type {
  NamespacedId,
  PackReference,
  RuleReference,
  TypeReference,
} from './contracts.js';
import type {
  ModelValidationInput,
  ModelValidationResult,
} from './validation-contracts.js';

export const DEFAULTS_OPERATOR = {
  id: 'foundation:defaults',
  version: '1',
} as const;

export interface GenerationOrigin {
  readonly kind: 'generated';
  readonly pack: PackReference;
  readonly rule: RuleReference;
}
export type ChangeOrigin =
  | GenerationOrigin
  | { readonly kind: 'authored'; readonly actor: string };
export interface ChangeSource {
  readonly id: string;
  readonly revision: string;
}

export interface DefaultRule {
  readonly pack: PackReference;
  readonly rule: RuleReference;
  readonly subjectType: TypeReference<'element'>;
  /** Rule IDs are unique within this explicitly supplied batch. */
  readonly dependsOn: readonly NamespacedId[];
  readonly conflicts: readonly NamespacedId[];
  readonly propertyDefaults: boolean;
  readonly members: readonly {
    readonly key: NamespacedId;
    readonly type: TypeReference<'member'>;
    readonly name: string;
    readonly properties: ModelProperties;
  }[];
}

export type ChangeTarget =
  | { readonly kind: 'member'; readonly id: MemberId }
  | {
      readonly kind: 'property';
      readonly subject: PropertySubject;
      readonly property: string;
    };
export type ChangeSnapshot =
  | { readonly present: false }
  | { readonly present: true; readonly value: ModelMember | ModelValue };
export interface GeneratedBaseline {
  readonly target: ChangeTarget;
  readonly snapshot: ChangeSnapshot;
  readonly origin: GenerationOrigin;
  readonly source: ChangeSource;
}

export interface ChangePlan {
  readonly id: string;
  readonly modelId: ModelId;
  readonly expectedRevision: ModelRevision;
  readonly nextRevision: ModelRevision;
  readonly source: ChangeSource;
  /** Complete reviewed declarative rule batch; application compares it with its registry. */
  readonly rules: readonly DefaultRule[];
  readonly operations: readonly {
    readonly change: ModelChange;
    readonly origin: ChangeOrigin;
  }[];
  readonly baselineUpdates: readonly {
    readonly expected?: GeneratedBaseline;
    readonly next: GeneratedBaseline;
  }[];
}

export interface AppliedChangeRecord {
  readonly plan: ChangePlan;
  readonly inverse: readonly InverseModelChange[];
  readonly beforeRevision: ModelRevision;
  readonly afterRevision: ModelRevision;
}

/** Caller-owned immutable snapshot. Journal/baselines are not embedded in format 2. */
export interface ChangeState {
  readonly model: ModelDocument;
  readonly applied: readonly AppliedChangeRecord[];
  readonly baselines: readonly GeneratedBaseline[];
}

export interface ChangeContext {
  readonly validation: Omit<ModelValidationInput, 'model'>;
  readonly defaultRules: readonly DefaultRule[];
}

export interface ChangeDiagnostic extends ModelDiagnostic {
  readonly planId: string;
  readonly origin?: ChangeOrigin;
}
export interface GenerationComparison {
  readonly target: ChangeTarget;
  readonly baseline?: ChangeSnapshot;
  readonly current: ChangeSnapshot;
  readonly proposed: ChangeSnapshot;
  readonly decision:
    | 'add'
    | 'update'
    | 'unchanged'
    | 'converged'
    | 'preserve-authored'
    | 'preserve-override'
    | 'conflict';
}

export type ProposalResult =
  | {
      readonly ok: true;
      readonly plan: ChangePlan;
      readonly comparisons: readonly GenerationComparison[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ChangeDiagnostic[];
      readonly comparisons: readonly GenerationComparison[];
    };
export type ApplyPlanResult =
  | {
      readonly ok: true;
      readonly status: 'applied' | 'replayed';
      readonly state: ChangeState;
      readonly record: AppliedChangeRecord;
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ChangeDiagnostic[];
      readonly validation?: ModelValidationResult;
    };

export interface DefaultProposalInput {
  readonly state: ChangeState;
  readonly context: ChangeContext;
  readonly subject: ElementReference;
  readonly planId: string;
  readonly nextRevision: ModelRevision;
  readonly source: ChangeSource;
  readonly rules: readonly DefaultRule[];
}
