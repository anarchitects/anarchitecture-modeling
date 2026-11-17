import type { InverseModelChange } from '@anarchitects/modeling-core';
import { copyData, equalData, targetKey } from './change-data.js';
import type { ChangePlan, GeneratedBaseline } from './change-contracts.js';
import type {
  DocumentBaselineChange,
  DocumentEdit,
  DocumentExecution,
} from './document-session-contracts.js';

/** Inverse intent is completely determined by the explicitly guarded operation payloads. */
export function invertDocumentEdits(
  edits: readonly DocumentEdit[],
): DocumentEdit[] {
  return copyData(
    edits
      .map((edit): DocumentEdit => {
        switch (edit.kind) {
          case 'create-element':
            return { kind: 'remove-element', expected: edit.value };
          case 'remove-element':
            return { kind: 'create-element', value: edit.expected };
          case 'create-member':
            return { kind: 'remove-member', expected: edit.value };
          case 'remove-member':
            return { kind: 'create-member', value: edit.expected };
          case 'create-relationship':
            return { kind: 'remove-relationship', expected: edit.value };
          case 'remove-relationship':
            return { kind: 'create-relationship', value: edit.expected };
          case 'replace-element':
          case 'replace-member':
          case 'replace-relationship':
          case 'replace-occurrence':
          case 'replace-constraint':
          case 'rename':
          case 'rename-view':
          case 'set-property':
            return {
              ...edit,
              expected: edit.value,
              value: edit.expected,
            } as DocumentEdit;
          case 'add-constraint':
            return { kind: 'remove-constraint', expected: edit.value };
          case 'remove-constraint':
            return { kind: 'add-constraint', value: edit.expected };
          case 'create-view':
            return {
              kind: 'remove-view',
              expected: edit.value,
              expectedNotations: edit.notationBindings,
            };
          case 'remove-view':
            return {
              kind: 'create-view',
              value: edit.expected,
              notationBindings: edit.expectedNotations,
            };
          case 'add-occurrence':
            return {
              kind: 'remove-occurrence',
              view: edit.view,
              expected: edit.value,
              expectedNotation: edit.notation,
            };
          case 'remove-occurrence':
            return {
              kind: 'add-occurrence',
              view: edit.view,
              value: edit.expected,
              notation: edit.expectedNotation,
            };
        }
      })
      .reverse(),
  );
}

export function planExecution(plan: ChangePlan): DocumentExecution {
  return copyData({
    edits: plan.operations.map(({ change }): DocumentEdit => {
      switch (change.kind) {
        case 'add-member':
          return { kind: 'create-member', value: change.member };
        case 'update-member':
          return {
            kind: 'replace-member',
            expected: change.expected,
            value: change.member,
          };
        case 'set-property':
          return {
            kind: 'set-property',
            target: change.subject,
            property: change.property,
            expected: change.expected,
            value: { present: true, value: change.value },
          };
      }
    }),
    baselines: plan.baselineUpdates.map((u) => ({
      target: u.next.target,
      ...(u.expected && { before: u.expected }),
      after: u.next,
    })),
  });
}
export function legacyInverse(
  inverse: readonly InverseModelChange[],
): DocumentEdit[] {
  return inverse.map((change): DocumentEdit => {
    switch (change.kind) {
      case 'remove-added-member':
        return { kind: 'remove-member', expected: change.expected };
      case 'restore-member':
        return {
          kind: 'replace-member',
          expected: change.expected,
          value: change.value,
        };
      case 'restore-property':
        return {
          kind: 'set-property',
          target: change.subject,
          property: change.property,
          expected: { present: true, value: change.expected },
          value: change.value,
        };
    }
  });
}
export function reverseBaselines(
  changes: readonly DocumentBaselineChange[],
): DocumentBaselineChange[] {
  return copyData(
    [...changes].reverse().map((c) => ({
      target: c.target,
      ...(c.after && { before: c.after }),
      ...(c.before && { after: c.before }),
    })),
  );
}

/** Apply only exact guarded keyed transitions; unrelated baselines are preserved. */
export function transitionBaselines(
  baselines: readonly GeneratedBaseline[],
  changes: readonly DocumentBaselineChange[],
) {
  const result = [...baselines];
  const touched = new Set<string>();
  for (const change of changes) {
    const key = targetKey(change.target);
    const matches = baselines.filter((b) => targetKey(b.target) === key);
    if (
      touched.has(key) ||
      matches.length > 1 ||
      !equalData(matches[0], change.before) ||
      (!change.before && !change.after) ||
      [change.before, change.after].some(
        (b) =>
          b &&
          (targetKey(b.target) !== key ||
            !b.snapshot.present ||
            b.origin.kind !== 'generated' ||
            !b.source.id.trim() ||
            !b.source.revision.trim()),
      )
    )
      return { ok: false as const, target: change.target };
    touched.add(key);
    const at = result.findIndex((b) => targetKey(b.target) === key);
    if (change.after) {
      if (at < 0) result.push(copyData(change.after));
      else result[at] = copyData(change.after);
    } else if (at >= 0) result.splice(at, 1);
  }
  return { ok: true as const, baselines: result };
}
