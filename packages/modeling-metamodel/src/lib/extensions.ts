import type {
  ComposedModelingProfile,
  ExtensionEnvelope,
} from './contracts.js';
import { samePack } from './definition-checks.js';

export type ExtensionSupport = {
  readonly status: 'supported' | 'unsupported';
  readonly semanticValidation: 'not-performed';
  readonly envelope: ExtensionEnvelope;
};

/** Registration support only. The opaque payload is never read, changed or executed. */
export function inspectExtensionSupport(
  envelope: ExtensionEnvelope,
  composition: ComposedModelingProfile,
): ExtensionSupport {
  const packs = composition.packs.filter((pack) =>
    samePack(pack, envelope.pack),
  );
  const matches = packs.flatMap((pack) =>
    pack.extensions.filter(
      (extension) =>
        extension.id === envelope.extension.id &&
        extension.version === envelope.extension.version,
    ),
  );
  return {
    status:
      packs.length === 1 && matches.length === 1 ? 'supported' : 'unsupported',
    semanticValidation: 'not-performed',
    envelope,
  };
}
