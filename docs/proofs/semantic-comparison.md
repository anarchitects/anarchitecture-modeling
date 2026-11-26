# Bounded semantic snapshot comparison — issue #77

Implementation scope for [#77](https://github.com/anarchitects/anarchitecture-modeling/issues/77),
under [#75](https://github.com/anarchitects/anarchitecture-modeling/issues/75).
[Johan accepted ADR 0003 on 24 November 2026](https://github.com/anarchitects/anarchitecture-modeling/pull/74#issuecomment-7124370246)
at `b48e837e20117bb5771d9970ab8528514fe3aa2d`; PR #74 landed as
`5b6e164f469c0b0a7be886623680581a36a8bcfa`. Proposal wording predates that decision.
Implementation landed through PR #82 and was published in 0.0.2. Johan requested
closure of #77 after the verified release; the [acceptance record](https://github.com/anarchitects/anarchitecture-modeling/issues/77#issuecomment-7205059020)
binds that decision to the bounded evidence. Earlier pending-review text below
describes the initial local review. The separate [#78 proof](https://github.com/anarchitects/anarchitecture-modeling/issues/78)
remains in progress.

## Contract selected before implementation

`compareDocumentSnapshots` is an additive metamodel root export. It accepts
`contractVersion: '1'`, `scope: 'semantic-model'`, and two independently supplied
inputs containing a trusted `DocumentSnapshot`, exact pack registry and validation
rule registrations. No executable callbacks, ambient registry or I/O are involved.
This is not an untrusted-data decoder; callers decode external documents first.

The result separates `equivalent`, `different`, `incomplete` and `incompatible`,
with coverage, deterministic differences/diagnostics and both inputs' model,
revision, format, profile, pack, contract and rule/operator identities. Equality
means equivalence only for this supported scope. Incomplete results may retain
supported differences; a caller must inspect status and coverage, not just an empty
differences array. Cross-model comparisons are incompatible: reconciliation and
automatic identity matching are outside this version.

| Data                                                                                                | Comparison semantics                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model name, element/member names and types, containment/ownership, relationship types/endpoints     | Semantic; entities matched by kind and stable ID within the same model                                                                              |
| Declared properties, including provenance/governance intent                                         | Semantic; exact scalar/reference values, unordered record keys, ordered lists; no case or string normalization                                      |
| Entity collections, profile selections, definition collections and rule registrations               | Enumeration order is non-semantic; preserve duplicates and reject invalid/ambiguous definitions                                                     |
| Constraint bindings                                                                                 | Group by subject and exact constraint definition; compare a multiset of bindings because the existing contract supplies no binding ID               |
| Constraint roles/member groups                                                                      | Role enumeration is non-semantic; member order is semantic exactly when the pinned role says `ordered: true`; multiplicity is always preserved      |
| Selected definitions                                                                                | Require identical normalized definitions as well as exact pins; changed definitions under the same version are incompatible, never silently trusted |
| Extension payloads, unsupported rules/parameters, unknown fields/properties and missing definitions | Incomplete coverage, even for identical payloads; extensions are never inspected                                                                    |
| Revision                                                                                            | Excluded from semantic equivalence, retained in evidence; ordinary nonblank structural admission still applies                                      |
| Views, notation bindings, applied-plan receipts and generated baselines                             | Explicitly excluded; neither validated nor authenticated by comparison                                                                              |

Model format remains **2**, metamodel contract **1**, document envelope **1**.
There is no schema, persistence, dependency or existing-export change. Property
lists have no unordered declaration in contract 1 and remain ordered. Unsupported
profile/pack/contract versions are not coerced. Pack upgrades need a separate
compatible migration/comparison rule. Generic structural comparison does not prove
method conformance, external data truth or provenance authenticity.

## Compatibility and handoff

Published compatibility baseline: both packages **0.0.1**. At the initial local
review, development manifests were private **0.0.0**; release-tooling alignment
subsequently reconciled source versions to **0.0.1**. This additive API is compatible feature intent
(`feat(modeling-metamodel)` after review), a patch increment under the accepted
zero-major Nx policy. No version is selected or manifest changed here. Existing
readers retain identical envelope/model data and unknown-extension handling;
0.0.1 does not expose this new function. New consumers must require a release
that actually contains it. No comparison result is persisted into old envelopes.

Comparison never produces a command or commit authorization. A layout-only or
zero-write revision advance still invalidates an old expected revision. Hosts own
current-state adoption, concurrency, persistence and any business impact decision.

[#78](https://github.com/anarchitects/anarchitecture-modeling/issues/78) owns the
separate installed-package conceptual/logical handoff and exact artifact versions,
consumer mapping and acceptance. This local slice supplies focused and packed
public-entry proofs, not publication or consumer adoption. Initial local-review
evidence below predates the implementation commit; it claims no release identity
or owner acceptance. The implementation PR binds the changes to its source commit.

## Local verification — 26 November 2026

On Node **24.22.3**, Yarn **4.18.1**, using the installed workspace toolchain:

```sh
NX_DAEMON=false NX_ISOLATE_PLUGINS=false NX_NO_CLOUD=true CI=true \
  yarn nx run-many -t build test lint typecheck -p modeling-core modeling-metamodel
NX_DAEMON=false NX_ISOLATE_PLUGINS=false NX_NO_CLOUD=true yarn nx sync:check
```

- All 12 tasks passed, with four local cache hits. Core: **24 tests**;
  metamodel: **1,210 tests**, including **36** comparison cases.
- Fresh boundary verification: **111 checks** passed; 42 runtime modules and
  their emitted JavaScript/declarations matched the explicit candidate baseline.
  Only metamodel's index and three new runtime modules change that baseline.
- **1,183 cases in 18 unchanged historical specs** passed through built public
  entries, with zero skipped. The optional external historical source checkout
  comparison was not rerun; its original source/JavaScript hashes are preserved
  separately instead of being overwritten by the candidate additions.
- Fresh packed-package verification passed: exact archive inventories, public
  Node ESM imports, strict TypeScript NodeNext declarations, complete export
  inventory, existing lifecycle example and the new
  [comparison example](../consumer/examples/semantic-comparison.mts).
- Nx project synchronization, changed-code Prettier checks and `git diff --check`
  passed. No runtime dependency, package version or document-format changes.

The tests exercise stable identities, names/types/references/properties,
constraint multiplicity and declared ordering, enumeration independence,
immutability, detached reports, opaque/unknown data and incompatible inputs.
Actual zero-edit and view commands advance revisions; subsequent stale writes
still reject even though comparison reports scoped equivalence.

Retained local development archives are based on
`5b6e164f469c0b0a7be886623680581a36a8bcfa` **plus the uncommitted #77 changes**.
Both carry private development version `0.0.0`; these are not publishable release
candidates or evidence of installed-registry adoption. SHA-256:

| Archive                  | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `modeling-core.tgz`      | `cf6beef71b53f281f7c0fc5d7bbe764702ab47824ad66c5588fc7fd41a14e712` |
| `modeling-metamodel.tgz` | `0a13ef471c528c4b6245bbe465bb29a94b0986d0ad0022bddfe6009d8152c2cb` |

Johan's implementation evidence acceptance remains pending. #78 must bind its
separate consumer proof to an accepted source/artifact pair; these local hashes
do not select a version, authorize publication or close the epic. Release staging
and the fresh npm-consumer release workflow require a clean source commit and
were intentionally not run for this uncommitted review.
