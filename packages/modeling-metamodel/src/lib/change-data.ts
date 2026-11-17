import type { ModelDocument, ModelChange } from '@anarchitects/modeling-core';
import type { ChangeSnapshot, ChangeTarget } from './change-contracts.js';

/** Plain typed data only. Pair tracking also makes malformed cyclic comparisons terminate. */
export function equalData(
  a: unknown,
  b: unknown,
  pairs = new Map<object, Set<object>>(),
): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  if (pairs.get(a)?.has(b)) return true;
  const seen = pairs.get(a) ?? new Set<object>();
  seen.add(b);
  pairs.set(a, seen);
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length)
    return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        equalData(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          pairs,
        ),
    )
  );
}

export function copyData<T>(value: T, seen = new Map<object, unknown>()): T {
  if (typeof value !== 'object' || value === null) return value;
  // Preserve unsupported shapes so validation can reject them rather than normalizing them.
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return value;
  if (seen.has(value)) return seen.get(value) as T;
  const result: unknown[] | Record<string, unknown> = Array.isArray(value)
    ? new Array(value.length)
    : Object.create(null);
  seen.set(value, result);
  for (const key of Object.keys(value))
    Object.defineProperty(result, key, {
      value: copyData((value as Record<string, unknown>)[key], seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return result as T;
}

export function targetKey(target: ChangeTarget): string {
  return target.kind === 'member'
    ? JSON.stringify(['member', target.id])
    : JSON.stringify([
        'property',
        target.subject.modelId,
        target.subject.kind,
        target.subject.id,
        target.property,
      ]);
}
export function changeTarget(change: ModelChange): ChangeTarget {
  return change.kind === 'set-property'
    ? { kind: 'property', subject: change.subject, property: change.property }
    : { kind: 'member', id: change.member.id };
}
export function currentSnapshot(
  model: ModelDocument,
  target: ChangeTarget,
): ChangeSnapshot {
  if (target.kind === 'member') {
    const member = model.members.find((member) => member.id === target.id);
    return member ? { present: true, value: member } : { present: false };
  }
  if (target.subject.modelId !== model.id) return { present: false };
  const entities =
    target.subject.kind === 'element' ? model.elements : model.members;
  const entity = entities.find((entity) => entity.id === target.subject.id);
  return entity && Object.hasOwn(entity.properties, target.property)
    ? { present: true, value: entity.properties[target.property] }
    : { present: false };
}
