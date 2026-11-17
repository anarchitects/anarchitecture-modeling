import { validateViews } from '@anarchitects/modeling-core';
import { composeModelingProfile } from './composition.js';
import { resolveOccurrenceNotation } from './notation.js';
import { equalData } from './change-data.js';
import { inspectDocumentLifecycle } from './document-lifecycle.js';
import { validateModel } from './validation.js';
import type {
  DocumentAssessment,
  DocumentCheckpoint,
  DocumentContext,
  DocumentDiagnostic,
} from './document-session-contracts.js';

/** Typed, caller-owned checkpoints only; imported outer shapes and authentication are host concerns. */
export function assessDocument(
  checkpoint: DocumentCheckpoint,
  context: DocumentContext,
): DocumentAssessment {
  const s = checkpoint.snapshot;
  const semantics = validateModel({
    model: s.model,
    profile: s.profile,
    registry: context.packs,
    constraints: s.constraints,
    extensions: s.extensions,
    rules: context.validationRules,
  });
  const views = validateViews(s.model, s.views);
  const composition = composeModelingProfile(s.profile, context.packs);
  const diagnostics: DocumentDiagnostic[] = [];
  const report = (
    code: string,
    section: DocumentDiagnostic['location']['section'],
    path: readonly (string | number)[],
    message: string,
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      message,
      location: { modelId: s.model.id, section, path },
    });
  s.constraints.forEach((constraint, i) => {
    if (s.constraints.slice(0, i).some((prior) => equalData(prior, constraint)))
      report(
        'document.ambiguous-constraint',
        'constraints',
        [i],
        'Keep constraint bindings distinguishable before editing them.',
      );
  });
  const notation: DocumentAssessment['notation'][number][] = [];
  for (const [vi, view] of s.views.entries())
    for (const occurrence of [...view.elements, ...view.connectors]) {
      const matches = s.notationBindings.filter(
        (b) =>
          b.view.modelId === view.modelId &&
          b.view.id === view.id &&
          b.occurrence.kind === occurrence.kind &&
          b.occurrence.id === occurrence.id,
      );
      if (matches.length !== 1) {
        report(
          'document.notation-coverage',
          'views',
          [vi, occurrence.kind, occurrence.id],
          'Supply exactly one explicit notation binding for this occurrence.',
        );
        continue;
      }
      if (composition.ok)
        notation.push({
          binding: matches[0],
          result: resolveOccurrenceNotation({
            model: s.model,
            view,
            occurrence,
            notation: matches[0].notation,
            registry: context.notations,
            composition: composition.value,
            theme: context.theme,
          }),
        });
    }
  s.notationBindings.forEach((binding, i) => {
    const matches = s.views
      .filter(
        (view) =>
          view.id === binding.view.id && view.modelId === binding.view.modelId,
      )
      .flatMap((view) =>
        [...view.elements, ...view.connectors].filter(
          (o) =>
            o.kind === binding.occurrence.kind &&
            o.id === binding.occurrence.id,
        ),
      );
    if (matches.length !== 1)
      report(
        'document.dangling-notation',
        'notationBindings',
        [i],
        'Bind exactly one existing occurrence in the current model/view.',
      );
  });
  const commandIds = new Set<string>();
  const afterRevisions = new Set<string>();
  checkpoint.commands.forEach((receipt, i) => {
    const c = receipt.command;
    if (
      !c.id.trim() ||
      commandIds.has(c.id) ||
      c.modelId !== s.model.id ||
      !c.actor.trim() ||
      !c.source.id.trim() ||
      !c.source.revision.trim() ||
      !receipt.beforeRevision.trim() ||
      !receipt.afterRevision.trim() ||
      receipt.beforeRevision === receipt.afterRevision ||
      receipt.beforeRevision !== c.expectedRevision ||
      receipt.afterRevision !== c.nextRevision ||
      afterRevisions.has(receipt.afterRevision) ||
      receipt.afterRevision === checkpoint.commands[0].beforeRevision
    )
      report(
        'document.invalid-receipt',
        'command',
        ['receipts', i],
        'Retain unique, internally consistent same-model command receipts; do not infer trust from their shape.',
      );
    if (
      i > 0 &&
      checkpoint.commands[i - 1].afterRevision !== receipt.beforeRevision
    )
      report(
        'document.receipt-chain',
        'command',
        ['receipts', i],
        'Retain the complete coordinated command revision chain.',
      );
    commandIds.add(c.id);
    afterRevisions.add(receipt.afterRevision);
  });
  if (
    checkpoint.commands.length &&
    checkpoint.commands.at(-1)?.afterRevision !== s.model.revision
  )
    report(
      'document.receipt-head',
      'command',
      ['receipts'],
      'The current coordinated revision must agree with the latest receipt.',
    );
  const metadata = inspectDocumentLifecycle(checkpoint);
  diagnostics.push(...metadata.diagnostics);
  const lifecycle = diagnostics.some(
    (d) =>
      d.code.startsWith('document.receipt') ||
      d.code === 'document.invalid-receipt',
  )
    ? 'invalid'
    : metadata.status;
  const invalid =
    semantics.status === 'invalid' ||
    views.length > 0 ||
    diagnostics.length > 0 ||
    notation.some((n) => !n.result.ok);
  return {
    status: invalid
      ? 'invalid'
      : lifecycle !== 'valid'
        ? 'unsupported'
        : semantics.status,
    semantics,
    views,
    notation,
    diagnostics,
    lifecycle,
  };
}
