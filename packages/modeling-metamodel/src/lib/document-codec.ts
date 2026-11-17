import {
  validateModelReference,
  validateModelStructure,
  validateViews,
  type ModelValue,
} from '@anarchitects/modeling-core';
import { assessDocument } from './document-assessment.js';
import { equalData, targetKey } from './change-data.js';
import {
  invertDocumentEdits,
  legacyInverse,
  planExecution,
} from './document-execution.js';
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
import { checkpointShape, record } from './document-codec-shape.js';
import {
  DOCUMENT_ENVELOPE_FORMAT,
  DOCUMENT_ENVELOPE_VERSION,
} from './document-codec-contracts.js';
import type { Json, Path } from './codec-json.js';
import type {
  DocumentCodecFailure,
  DocumentCodecLimits,
  DocumentDecodeResult,
  DocumentEncodeResult,
} from './document-codec-contracts.js';
import type {
  DocumentAssessment,
  DocumentCheckpoint,
  DocumentContext,
} from './document-session-contracts.js';

function failure(error: CodecError): DocumentCodecFailure {
  return {
    reason: error.reason,
    diagnostics: [
      { code: error.code, path: error.path, message: error.message },
    ],
  };
}
function unsupported(path: Path, message: string): never {
  throw new CodecError(
    'unsupported-format',
    'codec.unsupported-format',
    path,
    message,
  );
}
function envelope(
  value: Json,
  bounds: DocumentCodecLimits,
): DocumentCheckpoint {
  const root = record(value, []);
  if (
    Object.hasOwn(root, 'formatVersion') &&
    !Object.hasOwn(root, 'envelopeVersion')
  )
    unsupported(
      ['formatVersion'],
      'Bare scaffold format-1/format-2 models require a separately reviewed migration; none is implicit.',
    );
  if (root.format !== DOCUMENT_ENVELOPE_FORMAT) {
    if (typeof root.format === 'string')
      unsupported(['format'], 'Unsupported document format identifier.');
    fail(
      'codec.shape',
      ['format'],
      'Missing internal document format identifier.',
    );
  }
  if (
    typeof root.envelopeVersion !== 'number' ||
    !Number.isSafeInteger(root.envelopeVersion) ||
    root.envelopeVersion < 1
  )
    fail(
      'codec.shape',
      ['envelopeVersion'],
      'Envelope version must be a positive integer.',
    );
  if (root.envelopeVersion !== DOCUMENT_ENVELOPE_VERSION)
    unsupported(
      ['envelopeVersion'],
      'Unknown envelope version; preserve the original bytes and do not migrate implicitly.',
    );
  for (const key of Object.keys(root))
    if (!['format', 'envelopeVersion', 'checkpoint'].includes(key))
      fail(
        'codec.unknown-field',
        [key],
        'Unknown envelope field; no field is silently discarded.',
      );
  const cp = record(root.checkpoint, ['checkpoint']);
  const snapshot = record(cp.snapshot, ['checkpoint', 'snapshot']);
  const model = record(snapshot.model, ['checkpoint', 'snapshot', 'model']);
  if (
    typeof model.formatVersion === 'number' &&
    Number.isSafeInteger(model.formatVersion) &&
    model.formatVersion !== 2
  )
    unsupported(
      ['checkpoint', 'snapshot', 'model', 'formatVersion'],
      'Only semantic format 2 is supported inside envelope 1; no upgrade is performed.',
    );
  const checkpoint = checkpointShape(root.checkpoint, ['checkpoint']);
  const s = checkpoint.snapshot;
  if (
    s.model.elements.length +
      s.model.members.length +
      s.model.relationships.length >
    bounds.maxEntities
  )
    limit(
      ['checkpoint', 'snapshot', 'model'],
      'Total semantic entity count exceeds the configured limit.',
    );
  if (
    s.views.reduce((n, v) => n + v.elements.length + v.connectors.length, 0) >
    bounds.maxOccurrences
  )
    limit(
      ['checkpoint', 'snapshot', 'views'],
      'Total occurrence count exceeds the configured limit.',
    );
  if (
    checkpoint.commands.length > bounds.maxReceipts ||
    s.applied.length > bounds.maxReceipts
  )
    limit(
      ['checkpoint', 'commands'],
      'Receipt count exceeds the configured limit.',
    );
  if (
    !equalData(s.model.profile, {
      id: s.profile.id,
      version: s.profile.version,
    })
  )
    fail(
      'codec.profile',
      ['checkpoint', 'snapshot', 'profile'],
      'Model/profile identity pins must agree.',
    );
  return checkpoint;
}
function references(checkpoint: DocumentCheckpoint) {
  const s = checkpoint.snapshot;
  // Check intrinsic metadata even when an uncoordinated legacy journal cannot be reconstructed.
  if (
    new Set(s.baselines.map((b) => targetKey(b.target))).size !==
    s.baselines.length
  )
    fail(
      'codec.metadata',
      ['checkpoint', 'snapshot', 'baselines'],
      'Generated baseline targets must be unique.',
    );
  const planIds = new Set<string>();
  s.applied.forEach((r, i) => {
    if (
      planIds.has(r.plan.id) ||
      r.beforeRevision === r.afterRevision ||
      r.beforeRevision !== r.plan.expectedRevision ||
      r.afterRevision !== r.plan.nextRevision ||
      !equalData(
        legacyInverse(r.inverse),
        invertDocumentEdits(planExecution(r.plan).edits),
      ) ||
      r.inverse.some(
        (v) => v.kind === 'remove-added-member' && v.id !== v.expected.id,
      )
    )
      fail(
        'codec.metadata',
        ['checkpoint', 'snapshot', 'applied', i],
        'Applied plans need unique identities, matching revisions and exact inverse evidence.',
      );
    planIds.add(r.plan.id);
  });
  const structure = validateModelStructure(s.model);
  if (structure.diagnostics.length) {
    const d = structure.diagnostics[0];
    fail(
      d.code,
      ['checkpoint', 'snapshot', 'model', ...d.location.path],
      d.message,
    );
  }
  const structuralViewCodes = new Set([
    'view.duplicate-id',
    'view.invalid-identity',
    'view.foreign-model',
    'view.missing-semantic-target',
    'view.ambiguous-semantic-target',
    'view.invalid-endpoint',
  ]);
  const invalidView = validateViews(s.model, s.views).find((d) =>
    structuralViewCodes.has(d.code),
  );
  if (invalidView)
    fail(
      invalidView.code,
      [
        'checkpoint',
        'snapshot',
        'views',
        invalidView.location.viewIndex ?? 0,
        ...invalidView.location.path,
      ],
      invalidView.message,
    );
  const check = (
    ref: Parameters<typeof validateModelReference>[1],
    path: Path,
  ) => {
    const errors = validateModelReference(
      s.model,
      ref,
      { modelId: s.model.id, path },
      ['model', 'element', 'member', 'relationship'],
    );
    if (errors.length) fail(errors[0].code, path, errors[0].message);
  };
  const value = (v: ModelValue, p: Path): void => {
    if (v.kind === 'reference') check(v.value, [...p, 'value']);
    else if (v.kind === 'list')
      v.items.forEach((v, i) => value(v, [...p, 'items', i]));
    else if (v.kind === 'record')
      Object.entries(v.fields).forEach(([k, v]) =>
        value(v, [...p, 'fields', k]),
      );
  };
  s.constraints.forEach((c, i) => {
    const p = ['checkpoint', 'snapshot', 'constraints', i];
    check(c.subject, [...p, 'subject']);
    c.instance.roles.forEach((r, ri) =>
      r.group.members.forEach((m, mi) =>
        check(m, [...p, 'instance', 'roles', ri, 'group', 'members', mi]),
      ),
    );
    Object.entries(c.instance.parameters).forEach(([k, v]) =>
      value(v, [...p, 'instance', 'parameters', k]),
    );
  });
  // Historical request/baseline values may describe removed content; never resolve them against today's model.
  checkpoint.commands.forEach((r, i) => {
    const c = r.command;
    const edits = c.kind === 'edit' ? c.edits : r.execution?.edits;
    if (!edits || c.kind === 'apply-defaults') return;
    const reviews = c.deletionReviews ?? [];
    const removals = edits.flatMap((e, i) =>
      e.kind.startsWith('remove-') ? [i] : [],
    );
    if (
      reviews.length !== removals.length ||
      removals.some(
        (i) => reviews.filter((r) => r.operationIndex === i).length !== 1,
      )
    )
      fail(
        'codec.deletion-review',
        ['checkpoint', 'commands', i, 'command', 'deletionReviews'],
        'Retain exactly one review per historical removal.',
      );
    for (const [ri, review] of reviews.entries()) {
      const locations = review.dependents.map((d) => d.location);
      if (
        locations.some((l, i) =>
          locations.slice(0, i).some((other) => equalData(l, other)),
        ) ||
        review.dependents.some(
          (d) =>
            !d.resolvedBy.length ||
            new Set(d.resolvedBy).size !== d.resolvedBy.length ||
            d.resolvedBy.some((index) => index >= edits.length),
        )
      )
        fail(
          'codec.deletion-review',
          ['checkpoint', 'commands', i, 'command', 'deletionReviews', ri],
          'Historical reviews need unique dependent locations and valid resolver operation indexes.',
        );
    }
  });
}
function inspect(checkpoint: DocumentCheckpoint, context: DocumentContext) {
  references(checkpoint);
  const assessment = assessDocument(checkpoint, context);
  if (assessment.lifecycle === 'invalid' || assessment.diagnostics.length) {
    const d = assessment.diagnostics[0];
    const path: Path = !d
      ? ['checkpoint']
      : d.location.section === 'command'
        ? typeof d.location.path[1] === 'number' &&
          d.location.path[1] >= checkpoint.commands.length
          ? ['checkpoint', 'snapshot', 'baselines']
          : ['checkpoint', 'commands', ...d.location.path.slice(1)]
        : ['checkpoint', 'snapshot', d.location.section, ...d.location.path];
    fail(
      d?.code ?? 'codec.metadata',
      path,
      d?.message ?? 'Invalid coordinated metadata.',
    );
  }
  const unavailableNotation = new Set([
    'notation.missing-definition',
    'notation.duplicate-definition',
    'notation.invalid-definition',
    'notation.missing-theme-token',
  ]);
  const notationErrors = assessment.notation.flatMap((n) =>
    n.result.ok ? [] : n.result.diagnostics,
  );
  const invalidMeaning =
    assessment.views.length > 0 ||
    notationErrors.some((d) => !unavailableNotation.has(d.code)) ||
    (assessment.semantics.status === 'invalid' &&
      assessment.semantics.semantics !== 'not-run');
  const classification: DocumentAssessment['status'] = invalidMeaning
    ? 'invalid'
    : assessment.lifecycle !== 'valid' ||
        assessment.semantics.status !== 'valid' ||
        notationErrors.length
      ? 'unsupported'
      : 'valid';
  return { assessment, classification };
}
/** Decode untrusted UTF-8 JSON bytes; no registries, themes, callbacks or live undo stacks come from the file. */
export function decodeDocument(
  source: Uint8Array,
  context: DocumentContext,
  overrides: Partial<DocumentCodecLimits> = {},
): DocumentDecodeResult {
  try {
    const bounds = codecLimits(overrides);
    if (source.byteLength > bounds.maxBytes)
      limit([], 'Document byte length exceeds the configured limit.');
    const checkpoint = envelope(parseJson(decodeUtf8(source), bounds), bounds);
    const checked = inspect(checkpoint, context);
    return {
      status: 'decoded',
      envelopeVersion: DOCUMENT_ENVELOPE_VERSION,
      checkpoint,
      ...checked,
      source,
    };
  } catch (error) {
    if (!(error instanceof CodecError)) throw error;
    return { status: 'not-decoded', ...failure(error), source };
  }
}
/** Serialize representable data only; invalid/unsupported meaning may be preserved without granting edit permission. */
export function encodeDocument(
  checkpoint: unknown,
  context: DocumentContext,
  overrides: Partial<DocumentCodecLimits> = {},
): DocumentEncodeResult {
  try {
    const bounds = codecLimits(overrides);
    const data = jsonData(
      {
        format: DOCUMENT_ENVELOPE_FORMAT,
        envelopeVersion: DOCUMENT_ENVELOPE_VERSION,
        checkpoint,
      },
      bounds,
    );
    const checked = inspect(envelope(data, bounds), context);
    const bytes = encodeUtf8(JSON.stringify(data));
    if (bytes.byteLength > bounds.maxBytes)
      limit([], 'Encoded document exceeds the configured byte limit.');
    return { status: 'encoded', bytes, ...checked };
  } catch (error) {
    if (!(error instanceof CodecError)) throw error;
    return { status: 'not-encoded', ...failure(error) };
  }
}
