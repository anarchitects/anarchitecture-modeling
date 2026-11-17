import type {
  MemberReferenceGroup,
  ModelProfile,
  ModelProperties,
  ModelValue,
} from '@anarchitects/modeling-core';
import type { ModelingPack } from './modeling-metamodel.js';

/** The contract understood by this implementation, not a model-format version. */
export const METAMODEL_CONTRACT_VERSION = '1';
export type NamespacedId = `${string}:${string}`;
export type TypeKind = 'element' | 'relationship' | 'member';

export interface PackReference extends ModelProfile {
  readonly contractVersion: string;
}

export interface TypeReference<Kind extends TypeKind = TypeKind> {
  readonly pack: PackReference;
  readonly kind: Kind;
  readonly id: NamespacedId;
}

/** Inclusive bounds. null means unbounded; zero is a real bound. */
export interface Cardinality {
  readonly min: number;
  readonly max: number | null;
}

export type ReferenceTarget =
  | { readonly kind: 'model' }
  | {
      [Kind in TypeKind]: {
        readonly kind: Kind;
        readonly types: readonly TypeReference<Kind>[];
      };
    }[TypeKind];

interface ScalarTypes {
  string: string;
  number: number;
  boolean: boolean;
  null: null;
}

export type ValueDefinition =
  | {
      [Kind in keyof ScalarTypes]: {
        readonly kind: 'scalar';
        readonly valueType: Kind;
        readonly permittedValues?: readonly ScalarTypes[Kind][];
      };
    }[keyof ScalarTypes]
  | { readonly kind: 'reference'; readonly target: ReferenceTarget }
  | {
      readonly kind: 'list';
      readonly items: ValueDefinition;
      readonly cardinality: Cardinality;
    }
  | {
      readonly kind: 'record';
      readonly fields: readonly PropertyDefinition[];
    };

export interface PropertyDefinition {
  readonly id: NamespacedId;
  /** Presence is separate from the size of a present list (its cardinality). */
  readonly required: boolean;
  readonly value: ValueDefinition;
  /** A proposal for later defaulting, never an instruction to mutate a model. */
  readonly defaultValue?: ModelValue;
}

export interface ConstraintReference {
  readonly pack: PackReference;
  readonly id: NamespacedId;
}

export interface RuleReference {
  readonly id: NamespacedId;
  readonly version: string;
  readonly operator: { readonly id: NamespacedId; readonly version: string };
}

export interface MemberRoleDefinition {
  readonly id: NamespacedId;
  readonly memberTypes: readonly TypeReference<'member'>[];
  readonly cardinality: Cardinality;
  readonly ordered: boolean;
  readonly distinct: boolean;
}

export interface ConstraintDefinition {
  readonly id: NamespacedId;
  readonly mandatory: boolean;
  readonly roles: readonly MemberRoleDefinition[];
  readonly rule: RuleReference;
}

/** Method meaning belongs to the referenced definition, not flags on members. */
export interface ConstraintInstance {
  readonly definition: ConstraintReference;
  readonly roles: readonly {
    readonly role: NamespacedId;
    readonly group: MemberReferenceGroup;
  }[];
  readonly parameters: ModelProperties;
}

interface TypeDefinitionBase {
  readonly id: NamespacedId;
  readonly properties: readonly PropertyDefinition[];
  readonly constraints: readonly ConstraintReference[];
}

export interface EndpointRoleDefinition {
  readonly role: NamespacedId;
  readonly types: readonly TypeReference<'element'>[];
}

export type TypeDefinition = TypeDefinitionBase &
  (
    | { readonly kind: 'element' }
    | {
        readonly kind: 'member';
        readonly owners: readonly TypeReference<'element'>[];
      }
    | {
        readonly kind: 'relationship';
        /** Alternatives are pairs, not a Cartesian product of allowed endpoints. */
        readonly endpointPairs: readonly {
          readonly source: EndpointRoleDefinition;
          readonly target: EndpointRoleDefinition;
        }[];
      }
  );

export const PROFILE_DIMENSIONS = [
  'abstraction',
  'method',
  'processing-architecture',
  'provenance',
  'target',
] as const;
export type ProfileDimension = (typeof PROFILE_DIMENSIONS)[number];

/** Data-only manifest; no dynamic loading or executable validators/operators. */
export interface ModelingPackDefinition extends ModelingPack {
  readonly contractVersion: string;
  readonly dimensions: readonly ProfileDimension[];
  readonly requires: readonly PackReference[];
  readonly conflicts: readonly PackReference[];
  readonly types: readonly TypeDefinition[];
  readonly constraints: readonly ConstraintDefinition[];
  readonly extensions: readonly ExtensionDefinition[];
}

export interface ModelingProfileDefinition extends ModelProfile {
  /** At most one exact selection per dimension in the initial composition contract. */
  readonly selections: readonly {
    readonly dimension: ProfileDimension;
    readonly pack: PackReference;
  }[];
}

export interface ExtensionDefinition {
  readonly id: NamespacedId;
  /** Extension payload schema version, separate from the enclosing pack version. */
  readonly version: string;
}

export interface ExtensionEnvelope {
  readonly pack: PackReference;
  readonly extension: ExtensionDefinition;
  readonly payload: unknown;
}

export interface ComposedModelingProfile {
  readonly profile: ModelingProfileDefinition;
  /** Unique packs in canonical dimension order; no override precedence. */
  readonly packs: readonly ModelingPackDefinition[];
}

export interface MetamodelDiagnostic {
  readonly code:
    | 'invalid-definition'
    | 'missing-pack'
    | 'duplicate-pack'
    | 'incompatible-contract'
    | 'incompatible-profile'
    | 'duplicate-definition'
    | 'missing-definition';
  readonly path: string;
  readonly message: string;
}

export type MetamodelResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly diagnostics: readonly MetamodelDiagnostic[];
    };
