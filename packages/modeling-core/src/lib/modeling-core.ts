import {
  createModelId,
  createModelRevision,
  type ElementId,
  type MemberId,
  type ModelId,
  type ModelRevision,
  type RelationshipId,
} from './identity.js';

/** A versioned modeling language reference, independent of any host or standard. */
export interface ModelProfile {
  readonly id: string;
  readonly version: string;
}

export interface ModelReference {
  readonly kind: 'model';
  readonly id: ModelId;
}

export interface ElementReference {
  readonly kind: 'element';
  readonly modelId: ModelId;
  readonly id: ElementId;
}

export interface RelationshipReference {
  readonly kind: 'relationship';
  readonly modelId: ModelId;
  readonly id: RelationshipId;
}

export interface MemberReference {
  readonly kind: 'member';
  readonly modelId: ModelId;
  readonly id: MemberId;
}

export type ModelEntityReference =
  | ModelReference
  | ElementReference
  | RelationshipReference
  | MemberReference;

/** Explicit tags distinguish semantic references from ordinary record-shaped data. */
export type ModelValue =
  | {
      readonly kind: 'scalar';
      readonly value: string | number | boolean | null;
    }
  | { readonly kind: 'reference'; readonly value: ModelEntityReference }
  | { readonly kind: 'list'; readonly items: readonly ModelValue[] }
  | {
      readonly kind: 'record';
      readonly fields: Readonly<Record<string, ModelValue>>;
    };

/** Definitions and method-specific meaning belong to metamodel packs. */
export type ModelProperties = Readonly<Record<string, ModelValue>>;

/** An ordered group of member references, not independent flags on each member. */
export interface MemberReferenceGroup {
  readonly members: readonly MemberReference[];
}

export interface ModelElement {
  readonly id: ElementId;
  /** Opaque type identifier interpreted by the selected pack. */
  readonly type: string;
  readonly name: string;
  /** Semantic parent: this model's root or another element, never a view occurrence. */
  readonly container: ModelReference | ElementReference;
  readonly properties: ModelProperties;
}

/** Independently addressable member, stored once in the document's member collection. */
export interface ModelMember {
  readonly id: MemberId;
  readonly type: string;
  readonly name: string;
  readonly owner: ElementReference;
  readonly properties: ModelProperties;
}

export interface ModelRelationship {
  readonly id: RelationshipId;
  readonly type: string;
  readonly source: ElementReference;
  readonly target: ElementReference;
  readonly properties: ModelProperties;
}

export interface ModelDocument {
  /** Internal shape version; unrelated to the profile or model revision. */
  readonly formatVersion: 2;
  readonly id: ModelId;
  readonly revision: ModelRevision;
  readonly name: string;
  readonly profile: ModelProfile;
  readonly elements: readonly ModelElement[];
  readonly relationships: readonly ModelRelationship[];
  readonly members: readonly ModelMember[];
}

/** Creates an empty format-2 document; does not parse, migrate or validate model files. */
export function createModel(
  id: string,
  name: string,
  profile: ModelProfile,
): ModelDocument {
  if (
    ![id, name, profile.id, profile.version].every(
      (value) => value.trim().length > 0,
    )
  ) {
    throw new Error('Model identity, name and profile must be non-empty.');
  }
  return {
    formatVersion: 2,
    id: createModelId(id),
    revision: createModelRevision('0'),
    name,
    profile: { ...profile },
    elements: [],
    relationships: [],
    members: [],
  };
}
