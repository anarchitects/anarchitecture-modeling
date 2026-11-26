import type { SemanticComparisonValue } from './semantic-comparison-contracts.js';

/** These are explicit contract-1 classifications, not heuristic array sorting. */
type Shape =
  | 'atom'
  | { fields: Record<string, Shape> }
  | { items: Shape; unordered: boolean }
  | { dictionary: Shape }
  | { tag: string; variants: Record<string, Shape> }
  | (() => Shape);
const object = (fields: Record<string, Shape>): Shape => ({ fields });
const list = (items: Shape, unordered = true): Shape => ({ items, unordered });
const dictionary = (value: Shape): Shape => ({ dictionary: value });
const tagged = (tag: string, variants: Record<string, Shape>): Shape => ({
  tag,
  variants,
});
const atom = 'atom';
const pin = object({ id: atom, version: atom, contractVersion: atom });
const profilePin = object({ id: atom, version: atom });
const typePin = object({ pack: pin, kind: atom, id: atom });
const constraintPin = object({ pack: pin, id: atom });
const entityReference = object({ kind: atom, modelId: atom, id: atom });
const reference = tagged('kind', {
  model: object({ kind: atom, id: atom }),
  element: entityReference,
  member: entityReference,
  relationship: entityReference,
});
const cardinality = object({ min: atom, max: atom });
const value: Shape = tagged('kind', {
  scalar: object({ kind: atom, value: atom }),
  reference: object({ kind: atom, value: reference }),
  list: object({ kind: atom, items: list(() => value, false) }),
  record: object({ kind: atom, fields: dictionary(() => value) }),
});
const property: Shape = object({
  id: atom,
  required: atom,
  value: () => definition,
  defaultValue: value,
});
const definition: Shape = tagged('kind', {
  scalar: object({ kind: atom, valueType: atom, permittedValues: list(atom) }),
  reference: object({
    kind: atom,
    target: tagged('kind', {
      model: object({ kind: atom }),
      element: object({ kind: atom, types: list(typePin) }),
      member: object({ kind: atom, types: list(typePin) }),
      relationship: object({ kind: atom, types: list(typePin) }),
    }),
  }),
  list: object({ kind: atom, items: () => definition, cardinality }),
  record: object({ kind: atom, fields: list(property) }),
});
const baseType = {
  id: atom,
  kind: atom,
  properties: list(property),
  constraints: list(constraintPin),
} as const;
const endpoint = object({ role: atom, types: list(typePin) });
const rule = object({ id: atom, version: atom, operator: profilePin });
const type = tagged('kind', {
  element: object(baseType),
  member: object({ ...baseType, owners: list(typePin) }),
  relationship: object({
    ...baseType,
    endpointPairs: list(object({ source: endpoint, target: endpoint })),
  }),
});

export const comparisonShapes = {
  profile: object({
    id: atom,
    version: atom,
    selections: list(object({ dimension: atom, pack: pin })),
  }),
  pack: object({
    id: atom,
    version: atom,
    contractVersion: atom,
    displayName: atom,
    implementation: atom,
    dimensions: list(atom),
    requires: list(pin),
    conflicts: list(pin),
    types: list(type),
    extensions: list(profilePin),
    constraints: list(
      object({
        id: atom,
        mandatory: atom,
        rule,
        roles: list(
          object({
            id: atom,
            memberTypes: list(typePin),
            cardinality,
            ordered: atom,
            distinct: atom,
          }),
        ),
      }),
    ),
  }),
  rules: list(object({ pack: pin, rule })),
  model: object({
    formatVersion: atom,
    id: atom,
    revision: atom,
    name: atom,
    profile: profilePin,
    elements: list(
      object({
        id: atom,
        type: atom,
        name: atom,
        container: reference,
        properties: dictionary(value),
      }),
    ),
    members: list(
      object({
        id: atom,
        type: atom,
        name: atom,
        owner: reference,
        properties: dictionary(value),
      }),
    ),
    relationships: list(
      object({
        id: atom,
        type: atom,
        source: reference,
        target: reference,
        properties: dictionary(value),
      }),
    ),
  }),
  constraints: list(
    object({
      subject: reference,
      instance: object({
        definition: constraintPin,
        parameters: dictionary(value),
        roles: list(
          object({
            role: atom,
            group: object({ members: list(reference, false) }),
          }),
        ),
      }),
    }),
  ),
};

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
/** Code-unit ordering; no locale, clock, hashing or normalization of string values. */
export function dataKey(value: unknown): string {
  if (typeof value === 'number' && Object.is(value, -0)) return '-0';
  if (Array.isArray(value)) return `[${value.map(dataKey).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value)
      .sort(compareText)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${dataKey((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
export function ordered<T>(values: readonly T[]): T[] {
  return [...values].sort((a, b) => compareText(dataKey(a), dataKey(b)));
}

/** Trusted typed input only; unknown fields/discriminants cannot silently compare equal. */
export function normalizeComparisonData<T>(
  input: T,
  shape: Shape,
  unsupported: (path: readonly (string | number)[]) => void,
  path: readonly (string | number)[] = [],
): T {
  function visit(
    current: unknown,
    schema: Shape,
    at: readonly (string | number)[],
    report = unsupported,
  ): SemanticComparisonValue {
    if (typeof schema === 'function')
      return visit(current, schema(), at, report);
    if (schema === 'atom') return current as SemanticComparisonValue;
    const record = current as Record<string, unknown>;
    if ('tag' in schema) {
      const tag = record[schema.tag];
      if (typeof tag !== 'string' || !Object.hasOwn(schema.variants, tag)) {
        report([...at, schema.tag]);
        return null;
      }
      return visit(current, schema.variants[tag], at, report);
    }
    if ('items' in schema) {
      // Classify before sorting: never inspect the values of unknown fields.
      // Diagnostics without an intrinsic ID use canonical positions, so an
      // unordered input permutation cannot change the report.
      const entries = (current as unknown[]).map((item) => {
        const issues: (readonly (string | number)[])[] = [];
        const value = visit(item, schema.items, [], (path) =>
          issues.push(path),
        );
        return { value, issues };
      });
      if (schema.unordered)
        entries.sort((a, b) => compareText(dataKey(a), dataKey(b)));
      return entries.map(({ value, issues }, index) => {
        const identity =
          value !== null && typeof value === 'object'
            ? ((value as Record<string, unknown>).id ??
              (value as Record<string, unknown>).role)
            : undefined;
        for (const issue of issues)
          report([
            ...at,
            typeof identity === 'string' ? identity : index,
            ...issue,
          ]);
        return value;
      });
    }
    const result: Record<string, SemanticComparisonValue> = Object.create(null);
    for (const key of Object.keys(record).sort(compareText)) {
      if ('dictionary' in schema)
        result[key] = visit(
          record[key],
          schema.dictionary,
          [...at, key],
          report,
        );
      else if (Object.hasOwn(schema.fields, key)) {
        if (record[key] !== undefined)
          result[key] = visit(
            record[key],
            schema.fields[key],
            [...at, key],
            report,
          );
      } else report([...at, key]);
    }
    return result;
  }
  return visit(input, shape, path) as T;
}
