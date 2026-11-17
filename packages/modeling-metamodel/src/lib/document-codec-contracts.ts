import type {
  DocumentAssessment,
  DocumentCheckpoint,
} from './document-session-contracts.js';

export const DOCUMENT_ENVELOPE_FORMAT = 'archimatrix-document';
export const DOCUMENT_ENVELOPE_VERSION = 1;
export interface DocumentEnvelope {
  readonly format: typeof DOCUMENT_ENVELOPE_FORMAT;
  readonly envelopeVersion: typeof DOCUMENT_ENVELOPE_VERSION;
  readonly checkpoint: DocumentCheckpoint;
}
export interface DocumentCodecLimits {
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxCollection: number;
  readonly maxStringLength: number;
  readonly maxEntities: number;
  readonly maxOccurrences: number;
  readonly maxReceipts: number;
}
/** Initial hard caps; callers may lower them, never silently expand the supported budget. */
export const DOCUMENT_CODEC_LIMITS: DocumentCodecLimits = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxDepth: 64,
  maxNodes: 50000,
  maxCollection: 1000,
  maxStringLength: 65536,
  maxEntities: 1000,
  maxOccurrences: 2000,
  maxReceipts: 256,
});
export interface DocumentCodecDiagnostic {
  readonly code: string;
  readonly path: readonly (string | number)[];
  readonly message: string;
}
export type DocumentCodecFailure = {
  readonly reason: 'corrupt' | 'unsupported-format' | 'resource-limit';
  readonly diagnostics: readonly DocumentCodecDiagnostic[];
};
export type DocumentDecodeResult = (
  | ({ readonly status: 'not-decoded' } & DocumentCodecFailure)
  | {
      readonly status: 'decoded';
      readonly envelopeVersion: typeof DOCUMENT_ENVELOPE_VERSION;
      readonly checkpoint: DocumentCheckpoint;
      readonly classification: 'valid' | 'invalid' | 'unsupported';
      readonly assessment: DocumentAssessment;
    }
) & {
  /** Original caller-owned bytes, untouched, including unsupported/rejected content. */ readonly source: Uint8Array;
};
export type DocumentEncodeResult =
  | ({ readonly status: 'not-encoded' } & DocumentCodecFailure)
  | {
      readonly status: 'encoded';
      readonly bytes: Uint8Array;
      readonly classification: 'valid' | 'invalid' | 'unsupported';
      readonly assessment: DocumentAssessment;
    };
