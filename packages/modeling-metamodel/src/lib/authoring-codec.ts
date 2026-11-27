import {
  CodecError,
  codecLimits,
  decodeUtf8,
  encodeUtf8,
  fail,
  jsonData,
  limit,
  parseJson,
} from './codec-json.js';
import { record } from './document-codec-shape.js';
import { decodeDocument, encodeDocument } from './document-codec.js';
import {
  DOCUMENT_ENVELOPE_FORMAT,
  DOCUMENT_ENVELOPE_VERSION,
} from './document-codec-contracts.js';
import {
  AUTHORING_ENVELOPE_FORMAT,
  AUTHORING_ENVELOPE_VERSION,
} from './authoring-contracts.js';
import {
  assessAuthoringCheckpoint,
  canonicalAuthoringPolicy,
  validAuthoringOrigin,
} from './authoring-assessment.js';
import type {
  AuthoringAssessment,
  AuthoringCheckpoint,
  AuthoringContext,
  AuthoringSession,
} from './authoring-contracts.js';
import type {
  DocumentCodecFailure,
  DocumentCodecLimits,
} from './document-codec-contracts.js';
import type { Json } from './codec-json.js';

export type AuthoringDecodeResult = (
  | ({ readonly status: 'not-decoded' } & DocumentCodecFailure)
  | {
      readonly status: 'decoded';
      readonly session: AuthoringSession;
      readonly assessment: AuthoringAssessment;
    }
) & { readonly source: Uint8Array };
export type AuthoringEncodeResult =
  | ({ readonly status: 'not-encoded' } & DocumentCodecFailure)
  | {
      readonly status: 'encoded';
      readonly bytes: Uint8Array;
      readonly assessment: AuthoringAssessment;
    };
function failure(error: CodecError): DocumentCodecFailure {
  return {
    reason: error.reason,
    diagnostics: [
      { code: error.code, path: error.path, message: error.message },
    ],
  };
}
function exact(value: Json, fields: string[], path: string[]) {
  const result = record(value, path);
  if (
    Object.keys(result).length !== fields.length ||
    fields.some((k) => !Object.hasOwn(result, k))
  )
    fail(
      'authoring.shape',
      path,
      'Unknown or missing authoring envelope field.',
    );
  return result;
}
function inspect(
  value: Json,
  context: AuthoringContext,
  limits: Partial<DocumentCodecLimits>,
): AuthoringCheckpoint {
  const outer = record(value, []);
  if (
    outer.format !== AUTHORING_ENVELOPE_FORMAT ||
    outer.envelopeVersion !== AUTHORING_ENVELOPE_VERSION
  )
    throw new CodecError(
      'unsupported-format',
      'authoring.format',
      [],
      'Unknown authoring format/version; preserve original bytes.',
    );
  exact(value, ['format', 'envelopeVersion', 'checkpoint'], []);
  const cp = exact(
    outer.checkpoint,
    ['document', 'binding', 'importCommandId'],
    ['checkpoint'],
  );
  const binding = exact(
    cp.binding,
    ['policy', 'definitionKey'],
    ['checkpoint', 'binding'],
  );
  // Do not expose an unknown policy as a typed contract-1 session. Recovery
  // retains the caller's original bytes without installing document definitions.
  if (!canonicalAuthoringPolicy(binding.policy))
    throw new CodecError(
      'unsupported-format',
      'authoring.policy',
      ['checkpoint', 'binding', 'policy'],
      'Unsupported policy definition; preserve original bytes.',
    );
  if (
    typeof binding.definitionKey !== 'string' ||
    !binding.definitionKey ||
    typeof cp.importCommandId !== 'string' ||
    !cp.importCommandId.trim()
  )
    fail(
      'authoring.shape',
      ['checkpoint'],
      'Supply binding equality evidence and the explicit import identity.',
    );
  const legacy = decodeDocument(
    encodeUtf8(
      JSON.stringify({
        format: DOCUMENT_ENVELOPE_FORMAT,
        envelopeVersion: DOCUMENT_ENVELOPE_VERSION,
        checkpoint: cp.document,
      }),
    ),
    context.document,
    limits,
  );
  if (legacy.status !== 'decoded') {
    const d = legacy.diagnostics[0];
    throw new CodecError(legacy.reason, d.code, d.path, d.message);
  }
  const checkpoint = {
    document: legacy.checkpoint,
    binding,
    importCommandId: cp.importCommandId,
  } as unknown as AuthoringCheckpoint;
  if (!validAuthoringOrigin(checkpoint))
    fail(
      'authoring.import',
      ['checkpoint', 'importCommandId'],
      'Missing or invalid guarded import receipt.',
    );
  return checkpoint;
}
export function decodeAuthoringDocument(
  source: Uint8Array,
  context: AuthoringContext,
  overrides: Partial<DocumentCodecLimits> = {},
): AuthoringDecodeResult {
  try {
    const bounds = codecLimits(overrides);
    if (source.byteLength > bounds.maxBytes)
      limit([], 'Authoring document exceeds the byte limit.');
    const checkpoint = inspect(
      parseJson(decodeUtf8(source), bounds),
      context,
      overrides,
    );
    return {
      status: 'decoded',
      session: { checkpoint, history: { undo: [], redo: [] } },
      assessment: assessAuthoringCheckpoint(checkpoint, context),
      source,
    };
  } catch (e) {
    if (!(e instanceof CodecError)) throw e;
    return { status: 'not-decoded', ...failure(e), source };
  }
}
export function encodeAuthoringDocument(
  checkpoint: AuthoringCheckpoint,
  context: AuthoringContext,
  overrides: Partial<DocumentCodecLimits> = {},
): AuthoringEncodeResult {
  try {
    const bounds = codecLimits(overrides);
    const value = jsonData(
      {
        format: AUTHORING_ENVELOPE_FORMAT,
        envelopeVersion: AUTHORING_ENVELOPE_VERSION,
        checkpoint,
      },
      bounds,
    );
    const checked = inspect(value, context, overrides);
    // Reuse every legacy shape/reference/receipt check without emitting legacy bytes.
    const document = encodeDocument(
      checked.document,
      context.document,
      overrides,
    );
    if (document.status !== 'encoded') return document;
    const bytes = encodeUtf8(JSON.stringify(value));
    if (bytes.byteLength > bounds.maxBytes)
      limit([], 'Authoring document exceeds the byte limit.');
    return {
      status: 'encoded',
      bytes,
      assessment: assessAuthoringCheckpoint(checked, context),
    };
  } catch (e) {
    if (!(e instanceof CodecError)) throw e;
    return { status: 'not-encoded', ...failure(e) };
  }
}
