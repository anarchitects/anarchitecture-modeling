import {
  validateModelReference,
  validateModelStructure,
  type InverseModelChange,
  type ModelDocument,
} from '@anarchitects/modeling-core';
import {
  changeTarget,
  copyData,
  currentSnapshot,
  equalData,
  targetKey,
} from './change-data.js';
import { inspectChangeRules } from './change-rules.js';
import { samePack } from './definition-checks.js';
import { validateModel } from './validation.js';
import type {
  AppliedChangeRecord,
  ApplyPlanResult,
  ChangeContext,
  ChangeDiagnostic,
  ChangeOrigin,
  ChangePlan,
  ChangeState,
} from './change-contracts.js';

/** In-memory atomic proof. Hosts must compare-and-swap the returned snapshot when persisting. */
export function applyChangePlanInternal(
  state: ChangeState,
  plan: ChangePlan,
  context: ChangeContext,
  admit?: (candidate: ChangeState) => boolean,
): ApplyPlanResult {
  const diagnostics: ChangeDiagnostic[] = [];
  const report = (
    code: string,
    path: readonly (string | number)[],
    message: string,
    origin?: ChangeOrigin,
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      planId: plan.id,
      location: { modelId: state.model.id, path },
      message,
      ...(origin && { origin }),
    });
  if (!plan.id.trim() || plan.modelId !== state.model.id) {
    report(
      'plan.identity',
      ['id'],
      'Use a nonblank plan identity scoped to the current model.',
    );
    return { ok: false, diagnostics };
  }
  const receipts = state.applied.filter((record) => record.plan.id === plan.id);
  if (receipts.length) {
    if (receipts.length === 1 && equalData(receipts[0].plan, plan))
      return { ok: true, status: 'replayed', state, record: receipts[0] };
    report(
      'plan.identity-conflict',
      ['id'],
      'This plan ID already identifies different or ambiguous content; do not reuse it.',
    );
    return { ok: false, diagnostics };
  }
  if (state.model.revision !== plan.expectedRevision)
    report(
      'plan.stale-revision',
      ['expectedRevision'],
      'Re-propose against the current revision; this unrecorded plan is stale.',
    );
  if (
    !plan.nextRevision.trim() ||
    plan.nextRevision === state.model.revision ||
    state.applied.some(
      (record) =>
        record.beforeRevision === plan.nextRevision ||
        record.afterRevision === plan.nextRevision,
    )
  )
    report(
      'plan.reused-revision',
      ['nextRevision'],
      'Supply a fresh, nonblank revision token; never reuse a recorded revision.',
    );
  if (!plan.source.id.trim() || !plan.source.revision.trim())
    report(
      'plan.source',
      ['source'],
      'Record a nonblank source decision ID and revision.',
    );
  for (const diagnostic of validateModelStructure(state.model).diagnostics)
    diagnostics.push({ ...diagnostic, planId: plan.id });
  diagnostics.push(
    ...inspectChangeRules(plan.rules, context, state.model.id, plan.id)
      .diagnostics,
  );
  if (diagnostics.length) return { ok: false, diagnostics };
  let candidate: ModelDocument = copyData(state.model);
  const inverse: InverseModelChange[] = [];
  const touched = new Set<string>();
  const memberWrites = new Set<string>();
  const memberProperties = new Set<string>();
  function checkOrigin(
    origin: ChangeOrigin,
    path: readonly (string | number)[],
  ) {
    if (origin.kind === 'authored') {
      if (!origin.actor.trim())
        report(
          'plan.origin',
          path,
          'Identify the author of the reviewed operation.',
          origin,
        );
    } else if (
      origin.kind !== 'generated' ||
      !plan.rules.some(
        (rule) =>
          samePack(rule.pack, origin.pack) && equalData(rule.rule, origin.rule),
      )
    )
      report(
        'plan.origin',
        path,
        'Pin generated provenance to an exact rule in the reviewed registered batch.',
        origin,
      );
  }
  plan.operations.forEach(({ change, origin }, index) => {
    const path = ['operations', index];
    checkOrigin(origin, [...path, 'origin']);
    if (
      !['add-member', 'update-member', 'set-property'].includes(change.kind)
    ) {
      report(
        'plan.unsupported-operation',
        path,
        'Only bounded member additions/updates and property writes are supported.',
        origin,
      );
      return;
    }
    const target = changeTarget(change);
    const key = targetKey(target);
    const memberId =
      target.kind === 'member'
        ? target.id
        : target.subject.kind === 'member'
          ? target.subject.id
          : undefined;
    if (
      touched.has(key) ||
      (memberId &&
        (target.kind === 'member'
          ? memberProperties.has(memberId) || memberWrites.has(memberId)
          : memberWrites.has(memberId)))
    ) {
      report(
        'plan.overlapping-write',
        path,
        'Use one unambiguous write per target; whole-member and member-property writes cannot overlap.',
        origin,
      );
      return;
    }
    touched.add(key);
    if (memberId)
      (target.kind === 'member' ? memberWrites : memberProperties).add(
        memberId,
      );
    const current = currentSnapshot(state.model, target);
    if (change.kind === 'add-member') {
      if (current.present) {
        report(
          'plan.precondition',
          path,
          'The proposed member identity must be absent; never overwrite an existing member.',
          origin,
        );
        return;
      }
      candidate = {
        ...candidate,
        members: [...candidate.members, copyData(change.member)],
      };
      inverse.push({
        kind: 'remove-added-member',
        id: change.member.id,
        expected: copyData(change.member),
      });
    } else if (change.kind === 'update-member') {
      if (!current.present || !equalData(current.value, change.expected)) {
        report(
          'plan.precondition',
          path,
          'The member changed after review; preserve it and resolve the conflict.',
          origin,
        );
        return;
      }
      if (
        change.member.id !== change.expected.id ||
        change.member.type !== change.expected.type ||
        !equalData(change.member.owner, change.expected.owner)
      ) {
        report(
          'plan.incompatible-change',
          path,
          'Changing member identity, type or owner requires a separate conversion contract.',
          origin,
        );
        return;
      }
      if (
        Object.keys(change.expected.properties).some(
          (key) => !Object.hasOwn(change.member.properties, key),
        )
      ) {
        report(
          'plan.destructive-change',
          path,
          'Removing member properties is outside this bounded contract.',
          origin,
        );
        return;
      }
      candidate = {
        ...candidate,
        members: candidate.members.map((member) =>
          member.id === change.member.id ? copyData(change.member) : member,
        ),
      };
      inverse.push({
        kind: 'restore-member',
        expected: copyData(change.member),
        value: copyData(change.expected),
      });
    } else {
      const referenceErrors = validateModelReference(
        state.model,
        change.subject,
        { modelId: state.model.id, path: [...path, 'subject'] },
        ['element', 'member'],
      );
      if (referenceErrors.length) {
        diagnostics.push(
          ...referenceErrors.map((diagnostic) => ({
            ...diagnostic,
            planId: plan.id,
            origin,
          })),
        );
        return;
      }
      if (!equalData(current, change.expected)) {
        report(
          'plan.precondition',
          path,
          'The property no longer matches its reviewed presence/value precondition.',
          origin,
        );
        return;
      }
      if (!change.property.trim()) {
        report('plan.property', path, 'Supply a nonblank property identifier.');
        return;
      }
      if (change.subject.kind === 'element')
        candidate = {
          ...candidate,
          elements: candidate.elements.map((entity) =>
            entity.id === change.subject.id
              ? {
                  ...entity,
                  properties: {
                    ...entity.properties,
                    [change.property]: copyData(change.value),
                  },
                }
              : entity,
          ),
        };
      else
        candidate = {
          ...candidate,
          members: candidate.members.map((entity) =>
            entity.id === change.subject.id
              ? {
                  ...entity,
                  properties: {
                    ...entity.properties,
                    [change.property]: copyData(change.value),
                  },
                }
              : entity,
          ),
        };
      inverse.push({
        kind: 'restore-property',
        subject: copyData(change.subject),
        property: change.property,
        expected: copyData(change.value),
        value: copyData(change.expected),
      });
    }
  });
  const baselines = [...state.baselines];
  plan.operations.forEach(({ change, origin }, index) => {
    if (
      origin.kind === 'generated' &&
      ['add-member', 'update-member', 'set-property'].includes(change.kind) &&
      !plan.baselineUpdates.some(
        (update) =>
          targetKey(update.next.target) === targetKey(changeTarget(change)) &&
          equalData(update.next.origin, origin),
      )
    )
      report(
        'plan.missing-baseline',
        ['operations', index],
        'Every generated write must record its reviewed generated baseline.',
        origin,
      );
  });
  const baselineKeys = new Set<string>();
  plan.baselineUpdates.forEach((update, index) => {
    const key = targetKey(update.next.target);
    const path = ['baselineUpdates', index];
    checkOrigin(update.next.origin, [...path, 'origin']);
    if (!update.next.snapshot.present) {
      report(
        'plan.baseline-output',
        path,
        'Generated baselines must describe present output; deletion is not supported.',
      );
      return;
    }
    if (baselineKeys.has(key)) {
      report(
        'plan.baseline-conflict',
        path,
        'Update each generated baseline once.',
      );
      return;
    }
    baselineKeys.add(key);
    const previous = state.baselines.filter(
      (baseline) => targetKey(baseline.target) === key,
    );
    if (previous.length > 1 || !equalData(previous[0], update.expected)) {
      report(
        'plan.baseline-conflict',
        path,
        'The generated baseline changed after review.',
      );
      return;
    }
    if (
      !update.expected &&
      currentSnapshot(state.model, update.next.target).present
    ) {
      report(
        'plan.baseline-adoption',
        path,
        'Existing authored content cannot silently become generated ownership.',
      );
      return;
    }
    if (
      update.expected &&
      (update.expected.origin.pack.id !== update.next.origin.pack.id ||
        update.expected.origin.rule.id !== update.next.origin.rule.id)
    ) {
      report(
        'plan.baseline-owner',
        path,
        'A different rule cannot take over an existing generated baseline.',
      );
      return;
    }
    if (
      !equalData(update.next.source, plan.source) ||
      !equalData(
        currentSnapshot(candidate, update.next.target),
        update.next.snapshot,
      )
    ) {
      report(
        'plan.baseline-output',
        path,
        'Record the actual complete candidate output and exact plan source.',
      );
      return;
    }
    const existing = baselines.findIndex(
      (baseline) => targetKey(baseline.target) === key,
    );
    if (existing < 0) baselines.push(copyData(update.next));
    else baselines[existing] = copyData(update.next);
  });
  if (diagnostics.length) return { ok: false, diagnostics };
  candidate = { ...candidate, revision: plan.nextRevision };
  const validation = validateModel({ ...context.validation, model: candidate });
  if (
    admit
      ? !admit({ model: candidate, baselines, applied: state.applied })
      : validation.status !== 'valid'
  ) {
    report(
      'plan.invalid-candidate',
      ['candidate'],
      'The complete candidate must be valid with complete semantic coverage; no operations were applied.',
    );
    return { ok: false, diagnostics, validation };
  }
  const record: AppliedChangeRecord = {
    plan: copyData(plan),
    inverse: copyData(inverse.reverse()),
    beforeRevision: state.model.revision,
    afterRevision: candidate.revision,
  };
  return {
    ok: true,
    status: 'applied',
    state: { model: candidate, baselines, applied: [...state.applied, record] },
    record,
  };
}
