import { applyChangePlanInternal } from './plan-preparation.js';
import type {
  ChangeState,
  ChangePlan,
  ChangeContext,
  ApplyPlanResult,
} from './change-contracts.js';
/** Strict atomic plan application. Hosts own compare-and-swap and persistence. */
export function applyChangePlan(
  state: ChangeState,
  plan: ChangePlan,
  context: ChangeContext,
): ApplyPlanResult {
  return applyChangePlanInternal(state, plan, context);
}
