import { equalData, targetKey } from './change-data.js';
import {
  invertDocumentEdits,
  legacyInverse,
  planExecution,
  reverseBaselines,
  transitionBaselines,
} from './document-execution.js';
import type { GeneratedBaseline } from './change-contracts.js';
import type {
  DocumentCheckpoint,
  DocumentCommandReceipt,
  DocumentDiagnostic,
  DocumentExecution,
} from './document-session-contracts.js';

/** Reconstruct keyed metadata and reversal transitions, never historical whole-model snapshots. */
export function inspectDocumentLifecycle(checkpoint: DocumentCheckpoint) {
  const diagnostics: DocumentDiagnostic[] = [];
  const heads = new Map<
    string,
    { receipt: DocumentCommandReceipt; active: boolean }
  >();
  const defaults = checkpoint.commands.filter(
    (r) => r.command.kind === 'apply-defaults',
  );
  const legacy =
    checkpoint.commands.some(
      (r) => r.command.kind !== 'edit' && !r.execution,
    ) ||
    checkpoint.snapshot.applied.some(
      (r) =>
        !defaults.some(
          (d) =>
            d.command.kind === 'apply-defaults' &&
            d.command.plan.id === r.plan.id &&
            d.execution,
        ),
    ) ||
    (checkpoint.snapshot.baselines.length > 0 && defaults.length === 0);
  if (legacy) return { status: 'not-checked' as const, diagnostics, heads };
  let baselines: readonly GeneratedBaseline[] = [];
  const planIds = new Set<string>();
  const report = (i: number, message: string) =>
    diagnostics.push({
      code: 'document.lifecycle',
      severity: 'error',
      message,
      location: {
        modelId: checkpoint.snapshot.model.id,
        section: 'command',
        path: ['receipts', i],
      },
    });
  checkpoint.commands.forEach((receipt, i) => {
    const c = receipt.command;
    let expected: DocumentExecution | undefined;
    if (c.kind === 'edit') {
      expected = { edits: c.edits, baselines: [] };
      heads.set(c.id, { receipt, active: true });
    } else if (c.kind === 'apply-defaults') {
      expected = planExecution(c.plan);
      const matches = checkpoint.snapshot.applied.filter(
        (r) => r.plan.id === c.plan.id,
      );
      if (
        planIds.has(c.plan.id) ||
        matches.length !== 1 ||
        !equalData(matches[0]?.plan, c.plan) ||
        c.plan.modelId !== c.modelId ||
        c.plan.expectedRevision !== c.expectedRevision ||
        c.plan.nextRevision !== c.nextRevision ||
        !equalData(c.plan.source, c.source) ||
        matches[0]?.beforeRevision !== c.expectedRevision ||
        matches[0]?.afterRevision !== c.nextRevision ||
        !equalData(
          legacyInverse(matches[0]?.inverse ?? []),
          invertDocumentEdits(expected.edits),
        ) ||
        matches[0]?.inverse.some(
          (change) =>
            change.kind === 'remove-added-member' &&
            change.id !== change.expected.id,
        )
      )
        report(
          i,
          'Retain one exact coordinated default-plan receipt with matching revisions, attribution and inverse data.',
        );
      planIds.add(c.plan.id);
      heads.set(c.id, { receipt, active: true });
    } else {
      const prior = heads.get(c.transactionId);
      if (
        !prior ||
        prior.active !== (c.kind === 'undo') ||
        !prior.receipt.inverse
      ) {
        report(
          i,
          'Reverse an existing transaction in the correct active/undone state with complete inverse evidence.',
        );
      } else {
        expected = {
          edits: prior.receipt.inverse,
          baselines: reverseBaselines(prior.receipt.execution?.baselines ?? []),
        };
        heads.set(c.transactionId, { receipt, active: c.kind === 'redo' });
      }
    }
    // Earlier authored receipts remain readable. Their inverse is optional until used for undo.
    if (receipt.execution) {
      if (
        !expected ||
        !equalData(receipt.execution, expected) ||
        !equalData(
          receipt.inverse,
          invertDocumentEdits(receipt.execution.edits),
        )
      )
        report(
          i,
          'Execution and inverse evidence must agree with the exact request or preceding reversal.',
        );
      const next = transitionBaselines(baselines, receipt.execution.baselines);
      if (!next.ok)
        report(
          i,
          'Generated metadata transitions must match the preceding keyed baselines exactly.',
        );
      else baselines = next.baselines;
    } else if (
      receipt.inverse &&
      c.kind === 'edit' &&
      !equalData(receipt.inverse, invertDocumentEdits(c.edits))
    ) {
      report(
        i,
        'Authored inverse evidence must match the guarded original command.',
      );
    }
  });
  const actual = checkpoint.snapshot.baselines;
  if (
    actual.length !== baselines.length ||
    new Set(actual.map((b) => targetKey(b.target))).size !== actual.length ||
    baselines.some((b) => !actual.some((a) => equalData(a, b)))
  )
    report(
      checkpoint.commands.length,
      'Active generated baselines must equal the retained coordinated metadata transitions, including undo/redo.',
    );
  return {
    status: diagnostics.length ? ('invalid' as const) : ('valid' as const),
    diagnostics,
    heads,
  };
}
