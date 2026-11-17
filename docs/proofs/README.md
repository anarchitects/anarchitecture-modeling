# Proof migration and historical traceability

Implementation record for [Modeling #13](https://github.com/anarchitects/anarchitecture-modeling/issues/13),
17 November 2026. Source: **Archimatrix `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`**.
This follows the accepted [#11 boundary](../extraction-boundary.md),
[#12 core parity](../core-extraction.md) and [#15 metamodel parity](../metamodel-extraction.md).
[Johan explicitly accepted #13 proof-parity](https://github.com/anarchitects/anarchitecture-modeling/issues/13#issuecomment-6950414736)
after PR #38 merged at `e41ae08cc4375710d4ff1554c6394c67239592ac`.

All 18 original package specs already moved **byte-for-byte** in Modeling
[PR #36](https://github.com/anarchitects/anarchitecture-modeling/pull/36) and
[PR #37](https://github.com/anarchitects/anarchitecture-modeling/pull/37).
This change completes their supporting proof notes and source-to-destination map;
it does not duplicate fixtures or change runtime behavior, exports or versions.
The [file manifest](../extraction-files.md) records every introducing/later source
PR; the table below identifies the originating workstream rather than claiming
each later PR re-proved every case. Archimatrix #8/#22 and #9/#40 acceptance covers
the assembled source; earlier “pending” or future-work prose is historical.

## Executable proof map

Each row retains its source-relative `src/lib/<name>.spec.ts` path beneath
`packages/modeling/{core,metamodel}/`, relocated to the destination linked below.
“Cases” is the executed pinned-source **and** destination count, including
parameterized tests. Original source links for every file and subsequent PR
lineage are in the [complete manifest](../extraction-files.md).

| Archimatrix issue / original PR                                                                                              | Destination spec                                                                                           | Cases (source = destination) | Preserved evidence                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------: | ------------------------------------------------------------------------------------ |
| [#14](https://github.com/anarchitects/archimatrix/issues/14) / [PR #23](https://github.com/anarchitects/archimatrix/pull/23) | [identity.spec.ts](../../packages/modeling-core/src/lib/identity.spec.ts)                                  |                           12 | Branded identity, scoped references, rename/reorder and containment                  |
| [#14](https://github.com/anarchitects/archimatrix/issues/14) / [PR #23](https://github.com/anarchitects/archimatrix/pull/23) | [modeling-core.spec.ts](../../packages/modeling-core/src/lib/modeling-core.spec.ts)                        |                            4 | Creation; format version separate from revision                                      |
| [#15](https://github.com/anarchitects/archimatrix/issues/15) / [PR #24](https://github.com/anarchitects/archimatrix/pull/24) | [modeling-metamodel.spec.ts](../../packages/modeling-metamodel/src/lib/modeling-metamodel.spec.ts)         |                            3 | Pack/profile descriptors                                                             |
| [#15](https://github.com/anarchitects/archimatrix/issues/15) / [PR #24](https://github.com/anarchitects/archimatrix/pull/24) | [composition.spec.ts](../../packages/modeling-metamodel/src/lib/composition.spec.ts)                       |                           25 | Exact pins, additive composition, missing/duplicate/conflicting definitions          |
| [#16](https://github.com/anarchitects/archimatrix/issues/16) / [PR #25](https://github.com/anarchitects/archimatrix/pull/25) | [notation.spec.ts](../../packages/modeling-metamodel/src/lib/notation.spec.ts)                             |                           22 | One semantic model in two independent views; notation and overrides                  |
| [#17](https://github.com/anarchitects/archimatrix/issues/17) / [PR #26](https://github.com/anarchitects/archimatrix/pull/26) | [validation.spec.ts](../../packages/modeling-metamodel/src/lib/validation.spec.ts)                         |                           25 | Locations/provenance, unsupported operators and opaque payload preservation          |
| [#18](https://github.com/anarchitects/archimatrix/issues/18) / [PR #27](https://github.com/anarchitects/archimatrix/pull/27) | [change-plans.spec.ts](../../packages/modeling-metamodel/src/lib/change-plans.spec.ts)                     |                           19 | Defaults, atomic rejection, guarded baselines and exact replay                       |
| [#19](https://github.com/anarchitects/archimatrix/issues/19) / [PR #28](https://github.com/anarchitects/archimatrix/pull/28) | [relational-proof.spec.ts](../../packages/modeling-metamodel/src/lib/relational-proof.spec.ts)             |                            9 | One ordered composite key and functional-dependency sets                             |
| [#19](https://github.com/anarchitects/archimatrix/issues/19) / [PR #28](https://github.com/anarchitects/archimatrix/pull/28) | [mapping-proof.spec.ts](../../packages/modeling-metamodel/src/lib/mapping-proof.spec.ts)                   |                           16 | Joint named inputs, expressions, precedence, ambiguity and unmapped fields           |
| [#20](https://github.com/anarchitects/archimatrix/issues/20) / [PR #29](https://github.com/anarchitects/archimatrix/pull/29) | [dimensional-proof.spec.ts](../../packages/modeling-metamodel/src/lib/dimensional-proof.spec.ts)           |                           12 | One Date dimension with independent role-playing references                          |
| [#20](https://github.com/anarchitects/archimatrix/issues/20) / [PR #29](https://github.com/anarchitects/archimatrix/pull/29) | [medallion-proof.spec.ts](../../packages/modeling-metamodel/src/lib/medallion-proof.spec.ts)               |                           16 | Five orthogonal selections, mandatory collisions and opaque extensions               |
| [#21](https://github.com/anarchitects/archimatrix/issues/21) / [PR #30](https://github.com/anarchitects/archimatrix/pull/30) | [vault-proof.spec.ts](../../packages/modeling-metamodel/src/lib/vault-proof.spec.ts)                       |                           17 | Hub defaults/manual conflicts; versioned impact and non-applicable upgrade preview   |
| [#22](https://github.com/anarchitects/archimatrix/issues/22) / [PR #31](https://github.com/anarchitects/archimatrix/pull/31) | [foundation-integration.spec.ts](../../packages/modeling-metamodel/src/lib/foundation-integration.spec.ts) |                            6 | Composition/semantic/view/notation orchestration, staged negative coverage           |
| [#32](https://github.com/anarchitects/archimatrix/issues/32) / [PR #41](https://github.com/anarchitects/archimatrix/pull/41) | [document-session.spec.ts](../../packages/modeling-metamodel/src/lib/document-session.spec.ts)             |                           11 | Coordinated checkpoint and test-owned protocol adapter                               |
| [#33](https://github.com/anarchitects/archimatrix/issues/33) / [PR #42](https://github.com/anarchitects/archimatrix/pull/42) | [semantic-commands.spec.ts](../../packages/modeling-metamodel/src/lib/semantic-commands.spec.ts)           |                           25 | Atomic edits, exact replay and deletion review; negative candidates                  |
| [#34](https://github.com/anarchitects/archimatrix/issues/34) / [PR #43](https://github.com/anarchitects/archimatrix/pull/43) | [view-commands.spec.ts](../../packages/modeling-metamodel/src/lib/view-commands.spec.ts)                   |                           24 | View-only edits, occurrence cleanup, notation/geometry and inverses                  |
| [#35](https://github.com/anarchitects/archimatrix/issues/35) / [PR #44](https://github.com/anarchitects/archimatrix/pull/44) | [session-commands.spec.ts](../../packages/modeling-metamodel/src/lib/session-commands.spec.ts)             |                           24 | Grouped transactions, undo/redo, default review, retry/pruning/reopen                |
| [#36](https://github.com/anarchitects/archimatrix/issues/36) / [PR #45](https://github.com/anarchitects/archimatrix/pull/45) | [document-codec.spec.ts](../../packages/modeling-metamodel/src/lib/document-codec.spec.ts)                 |                          913 | Positive round-trips and negative shapes, versions, references, metadata and budgets |

Original baseline: **16 core + 1,167 metamodel = 1,183 cases** in 18 files.
Destination: **24 core + 1,174 metamodel = 1,198 cases** in 22 files. The additional
15 cases are the built-entry and boundary checks introduced in #12/#15, not extra
historical fixtures. No original spec, assertion or synthetic registry is omitted
or rewritten. There are no separate fixture assets to relocate from these packages.
The 913-case codec suite includes later source hardening beyond the 80 cases
reported in its original #36 note.

## Supporting proof notes and tools

Eight portable notes retain their contract narratives with local paths and an
explicit historical banner. Bare issue/PR references in those notes refer to
Archimatrix. Historical slice limits/counts do not supersede later accepted work.
The mixed Foundation handoff is rewritten around the portable seven-case table
and current lifecycle boundary; source host/product plans remain upstream.

| Pinned source `docs/proofs/` file                                                                                                                                          | Foundation disposition                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [relational-and-mapping.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/relational-and-mapping.md)               | [Adapted note](relational-and-mapping.md)        |
| [dimensions-and-medallion.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/dimensions-and-medallion.md)           | [Adapted note](dimensions-and-medallion.md)      |
| [vault-defaulting-and-upgrades.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/vault-defaulting-and-upgrades.md) | [Adapted note](vault-defaulting-and-upgrades.md) |
| [document-sessions.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/document-sessions.md)                         | [Adapted note](document-sessions.md)             |
| [semantic-commands.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/semantic-commands.md)                         | [Adapted note](semantic-commands.md)             |
| [view-commands.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/view-commands.md)                                 | [Adapted note](view-commands.md)                 |
| [session-history.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/session-history.md)                             | [Adapted note](session-history.md)               |
| [document-codec.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/document-codec.md)                               | [Adapted note](document-codec.md)                |
| [foundation-handoff.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/foundation-handoff.md)                       | [Adapted note](foundation-handoff.md)            |

The original [`tools/foundation-smoke.mjs`](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/tools/foundation-smoke.mjs)
is copied unchanged to [tools/proofs/foundation-smoke.mjs](../../tools/proofs/foundation-smoke.mjs).
Its **42 assertions** exercise both built public entries together. These are
assertions in one Node script, not 42 additional Vitest cases. The cacheable Nx
`modeling-metamodel:foundation-smoke` target depends on metamodel build (and thus
core build); `modeling-metamodel:test` depends on that target. Both targets hash
`tools/proofs/**/*`, package/dependency inputs and existing shared toolchain inputs.
The smoke has no output artifacts or external mutations. CI’s existing affected
test invocation therefore includes it without a new workflow or worker policy.

The source [`tools/foundation-boundaries.spec.mjs`](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/tools/foundation-boundaries.spec.mjs)
is adapted into the existing three cases in each package’s
[core](../../packages/modeling-core/tests/runtime-boundaries.spec.ts) and
[metamodel](../../packages/modeling-metamodel/tests/runtime-boundaries.spec.ts)
boundary suite. Its five original workspace checks map as follows:

| Original check                                  | Destination evidence / intentional adaptation                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nx dependency direction                         | Core → metamodel fails the actual Nx rule; the absent ArchiMate project is rejected by explicit import policy instead of pretending it is an installed graph edge. |
| Host/framework/tooling/persistence/deep imports | Both packages test forbidden static imports against real lint configuration.                                                                                       |
| Re-exports and dynamic loading                  | Both test wildcard/named re-exports, literal/computed dynamic imports, require and inline type imports.                                                            |
| Allowed inward/local imports                    | Metamodel’s public core import and both packages’ local relative imports pass.                                                                                     |
| Runtime manifests                               | Both assert private status, exact dependency declarations and absent peers/optional dependencies.                                                                  |

This issue adds the named re-export, private-status and installed core → metamodel
Nx assertions to existing cases; it does not inflate case counts. The original
workspace test wrapper and host-specific title/release policy tests are not copied.
Foundation’s five infrastructure regressions remain a separate count.

## Host evidence and exclusions

The remaining **seven of the 16 source proof files** stay upstream. Pinned links
retain their provenance without claiming new native runs or Foundation ownership.
These complement the [accepted host-module disposition](../extraction-boundary.md).

| Archimatrix issue / PR                                                                                                       | Pinned proof document and event record                                                                                                                                                                                                                                                                                    | Responsibility retained by Archimatrix                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [#37](https://github.com/anarchitects/archimatrix/issues/37) / [PR #46](https://github.com/anarchitects/archimatrix/pull/46) | [document-persistence.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/document-persistence.md)                                                                                                                                                                  | Host file I/O, expected-state installation and safe persistence |
| [#38](https://github.com/anarchitects/archimatrix/issues/38) / [PR #47](https://github.com/anarchitects/archimatrix/pull/47) | [vscode-document-lifecycle.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/vscode-document-lifecycle.md); [events](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/vscode-document-lifecycle-events.json) | VS Code lifecycle, commands and desktop observations            |
| [#39](https://github.com/anarchitects/archimatrix/issues/39) / [PR #48](https://github.com/anarchitects/archimatrix/pull/48) | [external-file-recovery.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/external-file-recovery.md); [events](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/external-file-recovery-events.json)          | Dirty/external changes, recovery and cancellation               |
| [#40](https://github.com/anarchitects/archimatrix/issues/40) / [PR #49](https://github.com/anarchitects/archimatrix/pull/49) | [model-lifecycle-handoff.md](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/model-lifecycle-handoff.md); [events](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/model-lifecycle-handoff-events.json)       | Assembled host acceptance and native lifecycle handoff          |

Excluded evidence is explicit scope, not lost portable behavior: native event JSON,
VS Code/filesystem tests, method-pack fixtures and application policy/packaging
checks cannot establish host-neutral package parity. The source workspace’s 1,275
cases include 92 cases outside these two packages; only the 1,183 package cases
above are the direct migration denominator. Boundary obligations from five
workspace checks are preserved through the adapted suites.
No installed VSIX/desktop run is claimed here.

Synthetic definitions, registries, mapping inspectors and upgrade adapters remain
in excluded specs or `tools/proofs/`; they are not runtime exports. Both library
builds emit only the same **39 JavaScript modules and 39 declarations** as the
source. Specs, test registries and the smoke are absent from `dist`.
Package tarball allowlists/independent installation remain #16/#17: this verifies
runtime build contents, not final packed-artifact clearance.

## Repeatable verification

Use Node 24 and this workspace’s pinned Yarn/Nx versions. For local checks without
cloud credentials, set `NX_NO_CLOUD=true NX_DAEMON=false NX_ISOLATE_PLUGINS=false`.

```sh
yarn install --immutable
yarn nx sync:check
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
yarn nx run modeling-metamodel:foundation-smoke
node --test tools/ci/*.test.mjs
```

Local validation (Node 24.22.3, Yarn 4.18.1, Nx 24.0.6, macOS arm64):

- All nine Nx tasks passed, including the smoke prerequisite: 1,198 package
  cases and 42 smoke assertions. Initial run had 0/9 cache hits, about 3.7 seconds
  total and a 2.5-second/four-task critical path. Five fresh infrastructure
  regressions also passed; these timings are local, not hosted/DTE evidence.
- Synchronization and graph policy passed with exactly metamodel → core.
  A proof-script-only affected probe selects metamodel. A temporary script edit
  reran smoke and metamodel tests while both builds replayed (2/4 hits);
  restoring the original input replayed all four tasks. The probe was reverted.
- Byte comparison confirmed all 18 source specs and the smoke unchanged. Build
  inspection found seven core and 32 metamodel JS/declaration modules, with no
  specs/proof registries in either runtime output. Local proof links resolve.

The PR records hosted verification separately. Reproduce byte equality
with a verified checkout/archive at the source pin: compare the 18 matching spec
files and `tools/foundation-smoke.mjs` against the paths above. This optional
historical comparison requires source access; all destination tests and the smoke
run using only this repository and its installed dependencies. There is no sibling
checkout dependency, source alias, copied private governance or proprietary code.

The [seven-case handoff](foundation-handoff.md) and detailed notes state the
limits: declared relational/dimensional intent is not normalization/Kimball
certification; hub defaults do not hash/load data; Medallion composition does not
execute pipelines; the versioned upgrade preview is non-applicable and is not a
general-purpose converter. Opaque data preservation is not semantic validation.

## Governance and acceptance

The complete session content review was reused after authenticated unchanged
revision validation: Meta `main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, with
accepted paths and proposal status in the [governance record](../extraction-inventory.md#governance-record).
Local AGENTS and accepted ADR 0001/0002 apply at Modeling base
`bb6290db203ed1345253d6ddece4e5631838c5ef`. Archimatrix ADR 0001/0002 and current
#12/#8/#22/#9/#40 direction/acceptance were reconciled at the source pin.
Blueprint `af4f88517302937dc23c0da4763579d0cca83604` remains consumer-boundary
context only; no content or dependency moves from it.

Johan accepted the bounded proof-parity outcome of #13 separately from merge. This does not
complete release controls (#14), packaging (#16), independent artifacts (#17),
integrated parity (#19), consumer adoption or public clearance/publication (#22/#23).
