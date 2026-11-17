# Portable Foundation proof handoff

Adapted from [Archimatrix #22](https://github.com/anarchitects/archimatrix/issues/22)
and [PR #31](https://github.com/anarchitects/archimatrix/pull/31),
whose [pinned handoff](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/foundation-handoff.md)
records the accepted assembled #8 outcome. The seven pressure cases below retain
that source ADR 0002 numbering; they are synthetic bounded proofs, not standards
certification. Current lifecycle contracts extend that earlier handoff through
Archimatrix #32–#36. Foundation’s accepted [boundary](../extraction-boundary.md)
and [migration record](README.md) govern placement and verification here.

## Original pressure cases

| Case                                       | Destination evidence                                                                                                                                                                                                                             | Proven scope and limits                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Two views and invalid relationship      | [foundation-integration.spec.ts](../../packages/modeling-metamodel/src/lib/foundation-integration.spec.ts), `rejects a synthetic relationship endpoint pair even when all views and notation resolve`                                            | Two views contain actor/role occurrences and an assignment. Reversing semantic endpoints and corresponding connectors leaves view/notation checks valid while semantic validation rejects the pack's endpoint pair. Layout/routing/allowed styling preserve semantic content and revision. This is an ArchiMate-shaped synthetic seam, not actual ArchiMate conformance; #10 must supply its legitimate versioned rules. |
| 2. Composite key and functional dependency | [relational-proof.spec.ts](../../packages/modeling-metamodel/src/lib/relational-proof.spec.ts), `preserves one composite key and one dependency over two field sets`, rename/reorder and dependent deletion cases                                | One ordered key group and distinct determinant/dependent sets retain member identities. Empty/duplicate/foreign-owner groups and missing mandatory bindings fail. No uniqueness, dependency truth, normal-form or decomposition proof.                                                                                                                                                                                   |
| 3. Joint multi-source transformation       | [mapping-proof.spec.ts](../../packages/modeling-metamodel/src/lib/mapping-proof.spec.ts), suite `ADR 0002 proof 3: one joint multi-source transformation`                                                                                        | Explicit source identities/revisions, joint expressions, precedence, trace mappings, assumptions, unmapped field and ambiguity survive. A fixture inspector checks cross-field obligations beyond schemas. Expressions are data; no ETL, source loader, null evaluation or real data correctness.                                                                                                                        |
| 4. Role-playing dimension                  | [dimensional-proof.spec.ts](../../packages/modeling-metamodel/src/lib/dimensional-proof.spec.ts), `preserves explicit grain, independently addressable roles, measures and history intent`, separate role deletion and shared-dimension deletion | One Date element supports two independently identified roles. Grain, aggregation and history policies are declared and schema-checked. No grain uniqueness, query aggregation or history execution.                                                                                                                                                                                                                      |
| 5. Hub defaults/retry/manual divergence    | [vault-proof.spec.ts](../../packages/modeling-metamodel/src/lib/vault-proof.spec.ts), suite `ADR 0002 proof 5: synthetic hub defaulting`                                                                                                         | Exact configured rules propose business-key/hash-key/load-date member definitions. Receipt replay avoids duplicates; authored changes survive or yield baseline/current/proposed conflicts; reviewed resolution converges. Type assignment is fixture setup, not a command or trigger. No hashing or loading.                                                                                                            |
| 6. Method plus processing architecture     | [medallion-proof.spec.ts](../../packages/modeling-metamodel/src/lib/medallion-proof.spec.ts), `composes all five dimensions deterministically and leaves normalized method intent intact`, mandatory-rule collision and unknown-extension cases  | Logical abstraction, normalized method, Silver processing, provenance and target remain independent. Quality/promotion/retention/replay are explicit intent. No inferred method conformity, infrastructure probing or policy execution.                                                                                                                                                                                  |
| 7. Versioned upgrade/conversion seam       | [vault-proof.spec.ts](../../packages/modeling-metamodel/src/lib/vault-proof.spec.ts), suite `ADR 0002 proof 7: pinned hub upgrade preview`                                                                                                       | A known v1-to-v2 preview traces identities and reports retirement loss and derivation ambiguity; stale/incompatible/dangling/unaccounted content fails. No applicable migration plan, general converter or implicit DataObject-to-Blueprint equivalence.                                                                                                                                                                 |

## Current contract and consumer boundary

- Core owns kind-branded identity, model-qualified references, stable member
  ownership, tagged values and separate semantic/view structures. Names,
  collection order and view layout do not define semantic identity.
- Metamodel owns exact pack/profile composition, registered bounded operators,
  semantic diagnostics, notation resolution, guarded plans, command/session
  preparation and the versioned codec. Mandatory constraints cannot be weakened
  through load order; unknown operators remain unsupported.
- Prepared candidates and inverse evidence do not commit a host. The consumer
  must atomically adopt the complete checkpoint and live session after checking
  expected model/revision. Retry returns exact prior evidence; it must not apply
  changes twice. Deletion and reversal retain explicit review requirements.
- Current semantic model format 2 is distinct from `archimatrix-document`
  envelope 1. No implicit upgrade or converter is supplied. Decode preserves the
  same caller-owned source bytes; a decoded result is not edit authorization.
- The integration fixture’s `inspect` function is test-owned orchestration,
  not an exported validator. It preserves semantic/view/notation diagnostics;
  missing or duplicate notation bindings cannot disappear. Unknown coverage is
  not successful validation. Accessibility remains pending host verification.

The [core barrel](../../packages/modeling-core/src/index.ts) and
[metamodel barrel](../../packages/modeling-metamodel/src/index.ts) remain the
public contracts. The [unchanged built consumer](../../tools/proofs/foundation-smoke.mjs)
uses ordinary package exports for composition, validation, plans, commands,
session edit/undo/redo/reopen and codec/retry. Method definitions and registries in
these proofs are test-owned and do not become runtime exports.

## Verification and ownership

Run the commands and inspect the counts in the [migration record](README.md).
`modeling-metamodel:test` includes `foundation-smoke`, which builds both libraries
before running the original Node consumer. Runtime boundary probes exercise the
actual lint configuration without writing forbidden imports into runtime files.
These checks are not a security sandbox or evidence of native desktop behavior.

Johan owns Foundation capability acceptance and maintenance. Archimatrix retains
file access, lifecycle, renderer/accessibility, supported method packs and desktop
adoption. Its [#37–#40 evidence](README.md#host-evidence-and-exclusions) is linked,
not copied into Foundation. Blueprint remains a consumer with its own proprietary
boundary. Packaging, independent installation, publication and consumer adoption
remain separately owned gates; see [public readiness](../public-readiness.md).
