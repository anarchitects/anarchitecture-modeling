import type { MemberId } from './identity.js';
import type {
  ElementReference,
  MemberReference,
  ModelMember,
  ModelValue,
} from './modeling-core.js';

export type PropertyState =
  | { readonly present: false }
  | { readonly present: true; readonly value: ModelValue };
export type PropertySubject = ElementReference | MemberReference;

/** Bounded semantic writes; no deletion, type conversion or arbitrary executable operation. */
export type ModelChange =
  | { readonly kind: 'add-member'; readonly member: ModelMember }
  | {
      readonly kind: 'update-member';
      readonly expected: ModelMember;
      readonly member: ModelMember;
    }
  | {
      readonly kind: 'set-property';
      readonly subject: PropertySubject;
      readonly property: string;
      readonly expected: PropertyState;
      readonly value: ModelValue;
    };

/** Guarded data for a later semantic undo implementation, not operations accepted by apply. */
export type InverseModelChange =
  | {
      readonly kind: 'remove-added-member';
      readonly id: MemberId;
      readonly expected: ModelMember;
    }
  | {
      readonly kind: 'restore-member';
      readonly expected: ModelMember;
      readonly value: ModelMember;
    }
  | {
      readonly kind: 'restore-property';
      readonly subject: PropertySubject;
      readonly property: string;
      readonly expected: ModelValue;
      readonly value: PropertyState;
    };
