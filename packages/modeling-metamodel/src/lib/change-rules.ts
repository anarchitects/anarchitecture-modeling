import type { ModelId } from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  resolveTypeDefinition,
} from './composition.js';
import {
  DEFAULTS_OPERATOR,
  type ChangeContext,
  type ChangeDiagnostic,
  type DefaultRule,
} from './change-contracts.js';
import { equalData } from './change-data.js';
import { isExactVersion, samePack } from './definition-checks.js';

export function inspectChangeRules(
  rules: readonly DefaultRule[],
  context: ChangeContext,
  modelId: ModelId,
  planId: string,
): { ordered: readonly DefaultRule[]; diagnostics: ChangeDiagnostic[] } {
  const diagnostics: ChangeDiagnostic[] = [];
  const report = (
    code: string,
    path: readonly (string | number)[],
    message: string,
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      location: { modelId, path },
      planId,
      message,
    });
  const composition = composeModelingProfile(
    context.validation.profile,
    context.validation.registry,
  );
  if (!composition.ok) {
    for (const diagnostic of composition.diagnostics)
      report(
        `plan.${diagnostic.code}`,
        ['rules', diagnostic.path],
        diagnostic.message,
      );
    return { ordered: [], diagnostics };
  }
  const byId = new Map<string, DefaultRule>();
  rules.forEach((rule, index) => {
    const path = ['rules', index];
    if (byId.has(rule.rule.id))
      report(
        'plan.duplicate-rule',
        path,
        'Select each rule ID once in this bounded batch.',
      );
    byId.set(rule.rule.id, rule);
    const registered = context.defaultRules.filter(
      (candidate) =>
        samePack(candidate.pack, rule.pack) &&
        equalData(candidate.rule, rule.rule),
    );
    if (registered.length !== 1 || !equalData(registered[0], rule))
      report(
        'plan.unregistered-rule',
        path,
        'Use one exact, unchanged declarative rule from the host registry.',
      );
    if (
      !rule.rule.id.includes(':') ||
      !isExactVersion(rule.rule.version) ||
      !equalData(rule.rule.operator, DEFAULTS_OPERATOR)
    )
      report(
        'plan.unsupported-operator',
        path,
        'Use a namespaced, versioned rule with the supported defaults operator.',
      );
    if (
      !samePack(rule.pack, rule.subjectType.pack) ||
      !resolveTypeDefinition(composition.value, rule.subjectType).ok
    )
      report(
        'plan.incompatible-rule',
        path,
        'The rule must target a defined element type owned by its selected pack.',
      );
    const keys = new Set<string>();
    rule.members.forEach((member, memberIndex) => {
      if (!member.key.trim() || keys.has(member.key))
        report(
          'plan.duplicate-output',
          [...path, 'members', memberIndex],
          'Use a nonblank, unique stable output key within the rule.',
        );
      keys.add(member.key);
      if (
        !samePack(member.type.pack, rule.pack) ||
        !resolveTypeDefinition(composition.value, member.type).ok
      )
        report(
          'plan.incompatible-rule',
          [...path, 'members', memberIndex],
          'Generate a defined member type owned by the rule pack.',
        );
    });
  });
  const ordered: DefaultRule[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      report(
        'plan.rule-cycle',
        ['rules', id, 'dependsOn'],
        'Break the rule dependency cycle; no recursive triggering is allowed.',
      );
      return;
    }
    const rule = byId.get(id);
    if (!rule) {
      report(
        'plan.missing-rule',
        ['rules', id],
        'Select the exact required rule explicitly.',
      );
      return;
    }
    visiting.add(id);
    for (const dependency of [...rule.dependsOn].sort()) visit(dependency);
    for (const conflict of rule.conflicts)
      if (byId.has(conflict))
        report(
          'plan.rule-conflict',
          ['rules', id, 'conflicts'],
          'Resolve the declared incompatible rule selection.',
        );
    visiting.delete(id);
    visited.add(id);
    ordered.push(rule);
  }
  for (const id of [...byId.keys()].sort()) visit(id);
  return { ordered, diagnostics };
}
