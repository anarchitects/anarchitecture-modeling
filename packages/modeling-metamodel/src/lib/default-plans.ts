import {
  createMemberId,
  validateModelReference,
  validateModelStructure,
  type ModelChange,
  type ModelMember,
  type ModelValue,
  type PropertyState,
} from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  resolveTypeDefinition,
} from './composition.js';
import {
  copyData,
  currentSnapshot,
  equalData,
  targetKey,
} from './change-data.js';
import { inspectChangeRules } from './change-rules.js';
import type {
  ChangeDiagnostic,
  ChangePlan,
  ChangeSnapshot,
  ChangeTarget,
  DefaultProposalInput,
  GenerationComparison,
  GenerationOrigin,
  ProposalResult,
} from './change-contracts.js';

/** Stable across retries/revisions and explicitly reviewed rule-version upgrades. */
export function generatedMemberIdentity(
  modelId: string,
  subjectId: string,
  packId: string,
  ruleId: string,
  outputKey: string,
) {
  return createMemberId(
    `generated:${JSON.stringify([modelId, subjectId, packId, ruleId, outputKey])}`,
  );
}

/** One pass over the original snapshot: dependencies order rules but do not trigger new rules. */
export function proposeDefaultPlan(
  input: DefaultProposalInput,
): ProposalResult {
  const { state, context, subject, planId, nextRevision, source, rules } =
    input;
  const inspected = inspectChangeRules(rules, context, state.model.id, planId);
  const diagnostics: ChangeDiagnostic[] = [...inspected.diagnostics];
  const comparisons: GenerationComparison[] = [];
  const operations: ChangePlan['operations'][number][] = [];
  const baselineUpdates: ChangePlan['baselineUpdates'][number][] = [];
  const report = (
    code: string,
    path: readonly (string | number)[],
    message: string,
    origin?: GenerationOrigin,
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      planId,
      location: { modelId: state.model.id, entity: subject, path },
      message,
      ...(origin && { origin }),
    });
  if (
    !planId.trim() ||
    !source.id.trim() ||
    !source.revision.trim() ||
    !nextRevision.trim() ||
    nextRevision === state.model.revision
  )
    report(
      'plan.identity',
      ['planId'],
      'Supply nonblank plan/source identities and a fresh next revision.',
    );
  for (const diagnostic of [
    ...validateModelStructure(state.model).diagnostics,
    ...validateModelReference(
      state.model,
      subject,
      { modelId: state.model.id, path: ['subject'] },
      ['element'],
    ),
  ])
    diagnostics.push({ ...diagnostic, planId });
  if (diagnostics.length) return { ok: false, diagnostics, comparisons };
  const composition = composeModelingProfile(
    context.validation.profile,
    context.validation.registry,
  );
  if (!composition.ok) return { ok: false, diagnostics, comparisons }; // Already diagnosed by inspectChangeRules.
  const element = state.model.elements.find(
    (element) => element.id === subject.id,
  );
  if (!element) return { ok: false, diagnostics, comparisons };
  const claimed = new Set<string>();
  function propose(
    target: ChangeTarget,
    proposed: ChangeSnapshot,
    origin: GenerationOrigin,
  ) {
    const key = targetKey(target);
    if (claimed.has(key)) {
      report(
        'plan.overlapping-output',
        ['outputs', key],
        'Two rules claim the same target; resolve ownership explicitly.',
        origin,
      );
      return;
    }
    claimed.add(key);
    const baselines = state.baselines.filter(
      (baseline) => targetKey(baseline.target) === key,
    );
    const baseline = baselines[0];
    const current = currentSnapshot(state.model, target);
    let decision: GenerationComparison['decision'];
    if (
      baselines.length > 1 ||
      (baseline &&
        (baseline.origin.pack.id !== origin.pack.id ||
          baseline.origin.rule.id !== origin.rule.id))
    )
      decision = 'conflict';
    else if (!baseline)
      decision = current.present
        ? target.kind === 'property'
          ? 'preserve-authored'
          : 'conflict'
        : 'add';
    else if (equalData(current, proposed))
      decision = equalData(current, baseline.snapshot)
        ? 'unchanged'
        : 'converged';
    else if (equalData(current, baseline.snapshot))
      decision = current.present ? 'update' : 'add';
    else
      decision =
        equalData(proposed, baseline.snapshot) && current.present
          ? 'preserve-override'
          : 'conflict';
    comparisons.push({
      target,
      ...(baseline && { baseline: baseline.snapshot }),
      current,
      proposed,
      decision,
    });
    if (decision === 'conflict') {
      report(
        'plan.manual-conflict',
        ['outputs', key],
        'Current state diverges from the generated baseline. Keep it or create a separately reviewed resolution; no overwrite is proposed.',
        origin,
      );
      return;
    }
    if (decision === 'preserve-authored' || decision === 'preserve-override')
      return;
    if (!proposed.present) {
      report(
        'plan.destructive-change',
        ['outputs', key],
        'Removal is outside this bounded defaulting contract.',
        origin,
      );
      return;
    }
    if (decision === 'add' || decision === 'update') {
      let change: ModelChange;
      if (target.kind === 'member')
        change = current.present
          ? {
              kind: 'update-member',
              expected: current.value as ModelMember,
              member: proposed.value as ModelMember,
            }
          : { kind: 'add-member', member: proposed.value as ModelMember };
      else
        change = {
          kind: 'set-property',
          subject: target.subject,
          property: target.property,
          expected: current as PropertyState,
          value: proposed.value as ModelValue,
        };
      operations.push({ change, origin });
    }
    baselineUpdates.push({
      ...(baseline && { expected: baseline }),
      next: { target, snapshot: proposed, origin, source },
    });
  }
  for (const rule of inspected.ordered) {
    const origin: GenerationOrigin = {
      kind: 'generated',
      pack: rule.pack,
      rule: rule.rule,
    };
    if (element.type !== rule.subjectType.id) {
      report(
        'plan.inapplicable-rule',
        ['rules', rule.rule.id],
        'Apply the rule only to its exact declared subject type.',
        origin,
      );
      continue;
    }
    if (rule.propertyDefaults) {
      const definition = resolveTypeDefinition(
        composition.value,
        rule.subjectType,
      );
      if (definition.ok)
        for (const property of definition.value.properties) {
          if (property.defaultValue !== undefined)
            propose(
              { kind: 'property', subject, property: property.id },
              { present: true, value: property.defaultValue },
              origin,
            );
        }
    }
    for (const member of rule.members) {
      const id = generatedMemberIdentity(
        state.model.id,
        subject.id,
        rule.pack.id,
        rule.rule.id,
        member.key,
      );
      const value: ModelMember = {
        id,
        type: member.type.id,
        name: member.name,
        owner: subject,
        properties: member.properties,
      };
      propose({ kind: 'member', id }, { present: true, value }, origin);
    }
  }
  for (const baseline of state.baselines) {
    const selected = rules.some(
      (rule) =>
        rule.pack.id === baseline.origin.pack.id &&
        rule.rule.id === baseline.origin.rule.id,
    );
    const belongs =
      baseline.target.kind === 'property'
        ? baseline.target.subject.kind === subject.kind &&
          baseline.target.subject.id === subject.id &&
          baseline.target.subject.modelId === subject.modelId
        : baseline.snapshot.present &&
          'owner' in baseline.snapshot.value &&
          equalData(baseline.snapshot.value.owner, subject);
    if (selected && belongs && !claimed.has(targetKey(baseline.target))) {
      comparisons.push({
        target: baseline.target,
        baseline: baseline.snapshot,
        current: currentSnapshot(state.model, baseline.target),
        proposed: { present: false },
        decision: 'conflict',
      });
      report(
        'plan.retired-output',
        ['outputs', targetKey(baseline.target)],
        'A selected rule no longer proposes this prior output. Keep or retire it through a separately reviewed change; no automatic deletion is allowed.',
        baseline.origin,
      );
    }
  }
  if (diagnostics.length)
    return { ok: false, diagnostics, comparisons: copyData(comparisons) };
  const plan: ChangePlan = {
    id: planId,
    modelId: state.model.id,
    expectedRevision: state.model.revision,
    nextRevision,
    source,
    rules: inspected.ordered,
    operations,
    baselineUpdates,
  };
  return { ok: true, plan: copyData(plan), comparisons: copyData(comparisons) };
}
