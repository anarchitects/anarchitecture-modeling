declare const identityKind: unique symbol;

/** Opaque, caller-supplied identity. Brands distinguish kinds only at compile time. */
type Identity<Kind extends string> = string & {
  readonly [identityKind]: Kind;
};

export type ModelId = Identity<'model'>;
export type ElementId = Identity<'element'>;
export type RelationshipId = Identity<'relationship'>;
export type MemberId = Identity<'member'>;
export type ViewId = Identity<'view'>;
export type ElementOccurrenceId = Identity<'element-occurrence'>;
export type ConnectorOccurrenceId = Identity<'connector-occurrence'>;
/** Equality token, not a timestamp, counter or pack/document-format version. */
export type ModelRevision = Identity<'revision'>;

function identity<Kind extends string>(
  value: string,
  kind: Kind,
): Identity<Kind> {
  if (value.trim().length === 0) {
    throw new Error(`${kind} identity must be non-empty.`);
  }
  // Preserve the exact identity: normalizing it could invalidate existing references.
  return value as Identity<Kind>;
}

export function createModelId(value: string): ModelId {
  return identity(value, 'model');
}

export function createElementId(value: string): ElementId {
  return identity(value, 'element');
}

export function createRelationshipId(value: string): RelationshipId {
  return identity(value, 'relationship');
}

export function createMemberId(value: string): MemberId {
  return identity(value, 'member');
}

export function createModelRevision(value: string): ModelRevision {
  return identity(value, 'revision');
}

export function createViewId(value: string): ViewId {
  return identity(value, 'view');
}

export function createElementOccurrenceId(value: string): ElementOccurrenceId {
  return identity(value, 'element-occurrence');
}

export function createConnectorOccurrenceId(
  value: string,
): ConnectorOccurrenceId {
  return identity(value, 'connector-occurrence');
}
