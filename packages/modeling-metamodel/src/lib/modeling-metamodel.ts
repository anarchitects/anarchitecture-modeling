import type { ModelProfile } from '@anarchitects/modeling-core';
/** A descriptor is not evidence of a complete metamodel or standards conformance. */
export interface ModelingPack extends ModelProfile {
  readonly displayName: string;
  readonly implementation: 'scaffold' | 'complete';
}
export function resolveModelingPack(
  packs: readonly ModelingPack[],
  profile: ModelProfile,
): ModelingPack {
  const matches = packs.filter(
    (pack) => pack.id === profile.id && pack.version === profile.version,
  );
  if (matches.length !== 1)
    throw new Error(
      `Expected one modeling pack for ${profile.id}@${profile.version}; found ${matches.length}.`,
    );
  return { ...matches[0] } as ModelingPack;
}
