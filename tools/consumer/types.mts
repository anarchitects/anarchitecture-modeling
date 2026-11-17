import {
  createModelId,
  createElementId,
  type ModelId,
  type ElementId,
} from '@anarchitects/modeling-core';
import {
  type DocumentCheckpoint,
  composeModelingProfile,
} from '@anarchitects/modeling-metamodel';
export const model: ModelId = createModelId('model');
export const element: ElementId = createElementId('element');
export const compose = composeModelingProfile;
export type Checkpoint = DocumentCheckpoint;
// @ts-expect-error Identity brands remain distinct across installed declarations.
export const wrongKind: ModelId = element;
// @ts-expect-error Bare strings do not satisfy branded identity contracts.
export const unbranded: ElementId = 'element';
// @ts-expect-error Source paths are not exported.
import type { ModelDocument } from '@anarchitects/modeling-core/src/index.ts';
// @ts-expect-error Built implementation paths are not exported.
import type { DocumentContext } from '@anarchitects/modeling-metamodel/dist/index.js';
