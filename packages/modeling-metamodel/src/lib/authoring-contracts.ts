import type {
  ModelEntityReference,
  ModelProfile,
} from '@anarchitects/modeling-core';
import type { TypeReference, NamespacedId } from './contracts.js';
import type {
  DocumentAssessment,
  DocumentCheckpoint,
  DocumentCommand,
  DocumentCommandReceipt,
  DocumentContext,
  DocumentDiagnostic,
  DocumentSession,
} from './document-session-contracts.js';

export const AUTHORING_POLICY_CONTRACT_VERSION = '1';
export const AUTHORING_ENVELOPE_FORMAT = 'anarchitects-authoring-document';
export const AUTHORING_ENVELOPE_VERSION = 1;
/** Data only. The host authorizes this exact selection, independently of persisted claims. */
export interface AuthoringPolicy {
  readonly contractVersion: typeof AUTHORING_POLICY_CONTRACT_VERSION;
  readonly id: string;
  readonly version: string;
  readonly profile: ModelProfile;
  readonly allowMissing: readonly {
    readonly type: TypeReference;
    readonly property: NamespacedId;
  }[];
}
/** Equality evidence, never a signature or permission. Immutable for this document's lifetime. */
export interface AuthoringBinding {
  readonly policy: AuthoringPolicy;
  readonly definitionKey: string;
}
export interface AuthoringContext {
  readonly document: DocumentContext;
  /** Absent policy permits recovery/historical replay, never a fresh write. */
  readonly policy?: AuthoringPolicy;
}
export interface AuthoringCheckpoint {
  readonly document: DocumentCheckpoint;
  readonly binding: AuthoringBinding;
  readonly importCommandId: string;
}
export interface AuthoringSession {
  readonly checkpoint: AuthoringCheckpoint;
  readonly history: DocumentSession['history'];
}
export interface AuthoringCommand {
  readonly command: DocumentCommand;
  readonly binding: AuthoringBinding;
}
export interface AuthoringDeficiency {
  readonly entity: Exclude<ModelEntityReference, { kind: 'model' }>;
  readonly property: NamespacedId;
  readonly type: TypeReference;
  readonly policy: {
    readonly id: string;
    readonly version: string;
    readonly contractVersion: '1';
  };
}
export interface AuthoringAssessment {
  readonly admission: 'complete' | 'incomplete' | 'blocked';
  readonly assessment: DocumentAssessment;
  readonly deficiencies: readonly AuthoringDeficiency[];
  readonly diagnostics: readonly DocumentDiagnostic[];
}
export type PrepareAuthoringResult =
  | {
      readonly status: 'rejected';
      readonly diagnostics: readonly DocumentDiagnostic[];
      readonly assessment?: DocumentAssessment;
    }
  | {
      readonly status: 'authoring-replayed';
      readonly receipt: DocumentCommandReceipt;
      readonly binding: AuthoringBinding;
    }
  | {
      readonly status: 'authoring-prepared';
      readonly command: AuthoringCommand;
      readonly expectedRevision: DocumentCommand['expectedRevision'];
      readonly candidate: AuthoringSession;
      readonly assessment: AuthoringAssessment;
    };
/** Hosts atomically recheck revision, admission binding AND server authorization. */
export interface AuthoringCommitPort {
  commit(
    prepared: Extract<PrepareAuthoringResult, { status: 'authoring-prepared' }>,
  ): Promise<
    | { readonly status: 'committed'; readonly checkpoint: AuthoringCheckpoint }
    | {
        readonly status: 'conflict';
        readonly currentRevision: DocumentCommand['expectedRevision'];
      }
    | { readonly status: 'failed'; readonly message: string }
  >;
}
