import type {
  DiagramView,
  ElementReference,
  MemberReference,
  ModelElement,
  ModelId,
  ModelMember,
  ModelRelationship,
  ModelRevision,
  ModelValue,
  PropertyState,
  RelationshipReference,
  ViewDiagnostic,
  ViewOccurrence,
  ViewOccurrenceIdentity,
  ViewReference,
} from '@anarchitects/modeling-core';
import type {
  ChangePlan,
  ChangeSource,
  ChangeState,
  ChangeTarget,
  DefaultRule,
  GeneratedBaseline,
} from './change-contracts.js';
import type {
  ExtensionEnvelope,
  ModelingPackDefinition,
  ModelingProfileDefinition,
} from './contracts.js';
import type {
  HostTheme,
  NotationDefinition,
  NotationReference,
  NotationResult,
} from './notation.js';
import type {
  ConstraintBinding,
  ModelValidationResult,
  ValidationRuleRegistration,
} from './validation-contracts.js';

/** Persist the selected notation identity, never inferred registry array order. */
export interface OccurrenceNotationBinding {
  readonly view: ViewReference;
  readonly occurrence: ViewOccurrenceIdentity;
  readonly notation: NotationReference;
}

/**
 * Trusted typed aggregate, NOT an on-disk encoding or an arbitrary-data parser.
 * model.revision guards ALL fields, including receipt/baseline-only changes.
 * Existing ChangeState consumers can read this without a second model copy.
 */
export interface DocumentSnapshot extends ChangeState {
  readonly profile: ModelingProfileDefinition;
  readonly views: readonly DiagramView[];
  readonly constraints: readonly ConstraintBinding[];
  readonly extensions: readonly ExtensionEnvelope[];
  readonly notationBindings: readonly OccurrenceNotationBinding[];
}

/** Locally supplied exact registries. Never load implementations from a document. */
export interface DocumentContext {
  readonly packs: readonly ModelingPackDefinition[];
  readonly validationRules: readonly ValidationRuleRegistration[];
  readonly defaultRules: readonly DefaultRule[];
  readonly notations: readonly NotationDefinition[];
  readonly theme: HostTheme;
}

/** Plain literal paths, not executable selectors or a promised file schema. */
export interface DocumentLocation {
  readonly modelId: ModelId;
  readonly section:
    | 'model'
    | 'profile'
    | 'views'
    | 'constraints'
    | 'extensions'
    | 'notationBindings'
    | 'applied'
    | 'baselines'
    | 'command';
  readonly path: readonly (string | number)[];
  readonly view?: ViewReference;
  readonly occurrence?: ViewOccurrenceIdentity;
}
export interface DocumentDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly location: DocumentLocation;
  readonly commandId?: string;
}

/** Retain stage provenance/locations and explicit coverage; never flatten to a boolean. */
export interface DocumentAssessment {
  readonly status: 'valid' | 'invalid' | 'unsupported';
  readonly semantics: ModelValidationResult;
  readonly views: readonly ViewDiagnostic[];
  readonly notation: readonly {
    readonly binding: OccurrenceNotationBinding;
    readonly result: NotationResult;
  }[];
  /** Missing/duplicate/dangling bindings and lifecycle metadata diagnostics. */
  readonly diagnostics: readonly DocumentDiagnostic[];
  /** Semantic/view validity alone does not establish receipt/baseline integrity. */
  readonly lifecycle: 'valid' | 'invalid' | 'not-checked';
}

/** Minimal load handoff; DocumentDecodeResult adds envelope version, assessment and recovery bytes. Decoded is not authorization. */
export type DocumentLoadResult =
  | {
      readonly status: 'not-decoded';
      readonly reason: 'corrupt' | 'unsupported-format' | 'resource-limit';
      readonly diagnostics: readonly {
        readonly path: readonly (string | number)[];
        readonly message: string;
      }[];
    }
  | { readonly status: 'decoded'; readonly checkpoint: DocumentCheckpoint };

/** Whole-entity replacement retains ID/type/owner; executors must enforce those guards. */
export type DocumentEdit =
  | { readonly kind: 'create-element'; readonly value: ModelElement }
  | {
      readonly kind: 'replace-element';
      readonly expected: ModelElement;
      readonly value: ModelElement;
    }
  | { readonly kind: 'remove-element'; readonly expected: ModelElement }
  | { readonly kind: 'create-member'; readonly value: ModelMember }
  | {
      readonly kind: 'replace-member';
      readonly expected: ModelMember;
      readonly value: ModelMember;
    }
  | { readonly kind: 'remove-member'; readonly expected: ModelMember }
  | { readonly kind: 'create-relationship'; readonly value: ModelRelationship }
  | {
      readonly kind: 'replace-relationship';
      readonly expected: ModelRelationship;
      readonly value: ModelRelationship;
    }
  | {
      readonly kind: 'remove-relationship';
      readonly expected: ModelRelationship;
    }
  | {
      readonly kind: 'rename';
      readonly target: ElementReference | MemberReference;
      readonly expected: string;
      readonly value: string;
    }
  | {
      readonly kind: 'set-property';
      readonly target:
        | ElementReference
        | MemberReference
        | RelationshipReference;
      readonly property: string;
      readonly expected: PropertyState;
      /** present:false explicitly requests removal; requiredness still applies. */
      readonly value:
        | { readonly present: false }
        | { readonly present: true; readonly value: ModelValue };
    }
  | {
      readonly kind: 'create-view';
      readonly value: DiagramView;
      readonly notationBindings: readonly OccurrenceNotationBinding[];
    }
  | {
      readonly kind: 'rename-view';
      readonly view: ViewReference;
      readonly expected: string;
      readonly value: string;
    }
  | {
      readonly kind: 'remove-view';
      readonly expected: DiagramView;
      readonly expectedNotations: readonly OccurrenceNotationBinding[];
    }
  | {
      readonly kind: 'add-occurrence';
      readonly view: ViewReference;
      readonly value: ViewOccurrence;
      readonly notation: NotationReference;
    }
  | {
      readonly kind: 'replace-occurrence';
      readonly view: ViewReference;
      readonly expected: ViewOccurrence;
      readonly value: ViewOccurrence;
    }
  | {
      readonly kind: 'remove-occurrence';
      readonly view: ViewReference;
      readonly expected: ViewOccurrence;
      readonly expectedNotation: NotationReference;
    }
  | { readonly kind: 'add-constraint'; readonly value: ConstraintBinding }
  | {
      readonly kind: 'replace-constraint';
      readonly expected: ConstraintBinding;
      readonly value: ConstraintBinding;
    }
  | {
      readonly kind: 'remove-constraint';
      readonly expected: ConstraintBinding;
    };

/** Recompute against the guarded input; a caller's asserted impact is not proof. */
export interface DeletionReview {
  readonly operationIndex: number;
  readonly dependents: readonly {
    readonly location: DocumentLocation;
    /** Explicit operations in the SAME transaction that resolve this reference. */
    readonly resolvedBy: readonly number[];
  }[];
}

export interface DocumentCommandIdentity {
  readonly id: string;
  readonly modelId: ModelId;
  readonly expectedRevision: ModelRevision;
  readonly nextRevision: ModelRevision;
  readonly actor: string;
  readonly source: ChangeSource;
}

/** Shared vocabulary; session preparation coordinates bounded edits, reviewed defaults and guarded reversals. */
export type DocumentCommand = DocumentCommandIdentity &
  (
    | {
        readonly kind: 'edit';
        readonly edits: readonly DocumentEdit[];
        /** Required even when empty; each removal needs a recomputed reviewed impact. */
        readonly deletionReviews: readonly DeletionReview[];
      }
    | { readonly kind: 'apply-defaults'; readonly plan: ChangePlan }
    | {
        readonly kind: 'undo' | 'redo';
        readonly transactionId: string;
        /** Required for any removal in the inspected reversal; no automatic cleanup. */
        readonly deletionReviews?: readonly DeletionReview[];
      }
  );

/** Exact keyed metadata transition, not replacement of a prior whole snapshot. */
export interface DocumentBaselineChange {
  readonly target: ChangeTarget;
  readonly before?: GeneratedBaseline;
  readonly after?: GeneratedBaseline;
}
export interface DocumentExecution {
  readonly edits: readonly DocumentEdit[];
  readonly baselines: readonly DocumentBaselineChange[];
}

/**
 * Full command content retained for equality-based replay, never ID alone.
 * Authored preparation captures inverse intent; session preparation executes guarded reversal candidates.
 */
export interface DocumentCommandReceipt {
  /** Coordinated execution evidence; absent on earlier authored-only receipts. */
  readonly execution?: DocumentExecution;
  /** Guarded inverse intent; session preparation validates it before staging a reversal. */
  readonly inverse?: readonly DocumentEdit[];
  readonly command: DocumentCommand;
  readonly beforeRevision: ModelRevision;
  readonly afterRevision: ModelRevision;
}

/** Durable command replay records complement existing bounded default-plan records. */
export interface DocumentCheckpoint {
  readonly snapshot: DocumentSnapshot;
  readonly commands: readonly DocumentCommandReceipt[];
}

/**
 * Session-only transaction indexes, coordinated by prepareSessionCommand.
 * Reopen starts with empty undo/redo stacks; durable retry receipts remain intact.
 */
export interface DocumentSession {
  readonly checkpoint: DocumentCheckpoint;
  readonly history: {
    readonly undo: readonly string[];
    readonly redo: readonly string[];
  };
}

export interface DocumentHistoryPolicy {
  /** Eligible live transactions only; evicted entries retain durable retry evidence. */
  readonly maxTransactions: number;
  /** New receipts fail at capacity; never silently prune retry records. */
  readonly maxReceipts: number;
}

export type PrepareSessionResult =
  | Exclude<PrepareDocumentResult, { status: 'prepared' }>
  | (Omit<
      Extract<PrepareDocumentResult, { status: 'prepared' }>,
      'candidate'
    > & {
      readonly candidate: DocumentSession;
    });

/** Valid preparation is conditional intent; only the host owns the current checkpoint. */
export type PrepareDocumentResult =
  | {
      readonly status: 'rejected';
      readonly diagnostics: readonly DocumentDiagnostic[];
      readonly assessment?: DocumentAssessment;
    }
  | { readonly status: 'replayed'; readonly receipt: DocumentCommandReceipt }
  | {
      readonly status: 'prepared';
      readonly command: DocumentCommand;
      readonly expectedRevision: ModelRevision;
      readonly candidate: DocumentCheckpoint;
      readonly assessment: DocumentAssessment & {
        readonly status: 'valid';
        readonly lifecycle: 'valid';
      };
    };

/** No implementation is installed by this interface; adapters recheck on commit. */
export interface DocumentCommitPort {
  commit(
    prepared: Extract<PrepareDocumentResult, { status: 'prepared' }>,
  ): Promise<
    | { readonly status: 'committed'; readonly checkpoint: DocumentCheckpoint }
    | { readonly status: 'conflict'; readonly currentRevision: ModelRevision }
    | { readonly status: 'failed'; readonly message: string }
  >;
}
