# Integrated Foundation parity gate

Accepted evidence for [#19](https://github.com/anarchitects/anarchitecture-modeling/issues/19)
and extraction [epic #3](https://github.com/anarchitects/anarchitecture-modeling/issues/3),
17 November 2026. Modeling base: `7fe8bda4c93856da47ee4544cac6728b4eb27a13`.
**[Johan explicitly accepted #19](https://github.com/anarchitects/anarchitecture-modeling/issues/19#issuecomment-6951810221)**
after PR #41 merged at `36fef74de1d2bdf6fd53ca7ab3809b6b4c5a8e13`.
All direct prerequisites (#13 and #17) are accepted. This records #19's outcome;
the parent epic's aggregate acceptance remains separate.

## Baseline and proof method

Source: Archimatrix `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`, with accepted #8/#22
and #9/#40 evidence. Later extraction direction supersedes historical
application-local placement. The [file manifest](extraction-files.md),
[public surface](extraction-public-surface.md), [portable/host seam](extraction-boundary.md)
and [proof map](proofs/README.md) account for original modules, tests, exports,
source issues/PRs and intentional host exclusions.

The new [built-proof runner](../tools/parity/check-built-proofs.mjs) executes all
**18 original portable specs / 1,183 cases** through the ordinary built public
package entries. It hashes original fixture bytes against the
[pinned corpus](../tools/parity/portable-proofs.json), then creates temporary
copies changing only each spec’s own-package import specifier:

- `../index.js` becomes the corresponding `@anarchitects/modeling-*` public entry.
- The three-case metamodel descriptor spec’s `./modeling-metamodel.js` import
  becomes the public metamodel entry; both imported symbols are already exported.
- Existing public core imports, fixture data, assertions, diagnostic expectations,
  parameterization and unsupported outcomes remain unchanged.

Node entry resolution must end in `dist/index.js`; the test loader rejects runtime
source fallback. The runner requires the exact per-file case counts, all cases
passing, no skipped cases and no exclusive tests. It validates runtime source and
emitted JavaScript hashes before running. The temporary files and test-only links
are removed afterward and never enter library output or package artifacts.

This is an additional execution mode for the **same historical cases**, not 1,183
new behaviors. The normal 1,198 package cases (1,183 original + 15 destination
built-entry/boundary cases) remain in their ordinary Nx test targets. TypeScript
public declaration resolution is separately verified by #16’s strict NodeNext
archive consumer, including negative deep imports.

## All seven original ADR 0002 proof pressures

These numbers refer to the original Archimatrix ADR 0002 pressure cases, not a new
Foundation feature contract. Each linked spec ran successfully against both sets
of built public entries. Detailed supported/unsupported limits remain in the
[portable handoff](proofs/foundation-handoff.md).

| Pressure                                   | Executable evidence                                                                                                                                       | Preserved supported outcome                                                                                                 | Explicit unsupported / negative outcome                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. One semantic model in two views         | [integration](../packages/modeling-metamodel/src/lib/foundation-integration.spec.ts), [notation](../packages/modeling-metamodel/src/lib/notation.spec.ts) | Stable semantic references; independent layouts, routes and permitted appearance; staged semantic/view/notation diagnostics | Invalid endpoint pairs reject even with valid rendering bindings; unknown coverage is not validation; no production ArchiMate or rendered-accessibility claim |
| 2. Composite key and functional dependency | [relational](../packages/modeling-metamodel/src/lib/relational-proof.spec.ts)                                                                             | One ordered composite group, explicit determinant/dependent member sets and complete dependent locations                    | Invalid members/ownership/constraints fail; declared intent is not row-data validation or normalization certification                                         |
| 3. Joint multi-source mapping              | [mapping](../packages/modeling-metamodel/src/lib/mapping-proof.spec.ts)                                                                                   | Versioned sources, named joint inputs/output, expression tags, precedence, trace and omitted-field reporting                | Ambiguous/lossy or invalid mappings remain visible; no expression execution or general transformation engine                                                  |
| 4. Role-playing dimension                  | [dimensional](../packages/modeling-metamodel/src/lib/dimensional-proof.spec.ts)                                                                           | One Date dimension with two independently addressable roles, fact grain, measure/history metadata                           | Bad role/group references diagnose; no Kimball certification, query aggregation or history execution                                                          |
| 5. Hub defaults and human divergence       | [vault](../packages/modeling-metamodel/src/lib/vault-proof.spec.ts), [plans](../packages/modeling-metamodel/src/lib/change-plans.spec.ts)                 | Deterministic member definitions, exact retry, authored preservation and baseline/current/proposed conflicts                | Stale/overlapping/invalid plans reject atomically; no hashing/loading or implicit trigger                                                                     |
| 6. Method + processing architecture        | [Medallion](../packages/modeling-metamodel/src/lib/medallion-proof.spec.ts), [composition](../packages/modeling-metamodel/src/lib/composition.spec.ts)    | Independent five-dimension selection, normalized method alongside Silver processing intent, exact pins/provenance           | Mandatory collisions reject; opaque extensions stay unsupported and preserved; no pipeline/policy execution                                                   |
| 7. Versioned upgrade/conversion seam       | [vault upgrade preview](../packages/modeling-metamodel/src/lib/vault-proof.spec.ts)                                                                       | Known v1→v2 identity/impact preview retains retirement loss and derivation ambiguity                                        | Review-required, non-applicable preview; stale/incompatible/dangling content fails; no implicit conversion or general converter                               |

## Integrated lifecycle and equivalence matrix

All rows below use the same fixture bytes and expectations at the source and new
locations. Counts and detailed original issue/PR links remain in the
[complete proof map](proofs/README.md#executable-proof-map).

| Acceptance concern                      | Source → new evidence                                                     | Observed equivalence                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic identity and references        | Archimatrix #14/PR #23 → core `identity.spec.ts`, `modeling-core.spec.ts` | 16 cases: identities survive renames/reordering; scoped references and ownership remain explicit; format/revision roles distinct                                  |
| Diagnostics and exact profile conflicts | #15/#17, PR #24/#26 → composition/validation specs                        | Same provenance, locations, invalid/unsupported distinctions and fail-closed pin/conflict behavior                                                                |
| Layout independence                     | #16/#22, PR #25/#31 → notation/integration specs                          | Independent occurrences and presentation preserve semantic identity; semantic invalidity cannot disappear behind valid views                                      |
| Guarded plans and commands              | #18/#33/#34, PR #27/#42/#43 → plans/semantic/view specs                   | Same atomic rejection, expected-revision guards, deletion impact/review, authored overrides and exact receipt replay                                              |
| Session history and retry               | #32/#35, PR #41/#44 → document-session/session-command specs              | Same grouped transactions, guarded undo/redo, bounded history, durable receipts and empty live history after reopen                                               |
| Document round trips and recovery       | #36/PR #45 plus later source hardening → 913-case codec spec              | Same envelope 1/model format 2, nested shape/metadata/limit checks, corrupt/future refusal and meaningful opaque JSON preservation                                |
| Architecture and production contents    | Accepted #16/#17 → boundary and real archive checks                       | Inward core dependency only; helper remains a reviewed leaf; forbidden paths/metadata/vendor changes reject; fixtures/tests/tools absent from 16/66-file archives |

The source and destination each passed **1,183/1,183 cases across 18 files** with
zero skips using the built-entry runner. Source comparison used the verified
pinned archive/build from the extraction review; current authenticated source
revision and checkout cleanliness were reconfirmed. Runtime source and all 39
emitted JS modules match the accepted baseline. Declaration bodies remain equal
apart from #16’s deliberate source-map-footer removal; public surfaces remain
54 core names and 116 metamodel names.

A separate replay of the original 42-assertion smoke against both builds compared
**13 complete JSON result objects**: composition, bounded plan, semantic command,
view command, resolved appearance, session edit, undo, redo, reopened state,
encoded document, decoded document, loaded session and corrupt-input result.
They are equal; canonical result SHA-256:
`b158796031b59007bf506689a0c632013315fa806f52426f97aac92b3542afd9`.
The temporary comparison adapted import locations and appended result capture;
it did not replace the original fixture assertions. JSON equality is bounded data
comparison, not callback/prototype identity or a native-host test.

## Repeatable verification and clean cache evidence

```sh
yarn install --immutable
yarn nx sync:check
yarn nx run modeling-metamodel:built-proof-check
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
node --test tools/ci/*.test.mjs
```

The uncached `built-proof-check` depends on both builds through metamodel → core
and is required by metamodel tests. The existing uncached `boundary-check` and
`package-check` remain required. All other relevant build/test/lint/typecheck and
smoke caching is retained. A parity-tool-only affected probe selects metamodel.

An optional historical comparison uses a separately verified source archive with
its built packages and installed dependencies:

```sh
FOUNDATION_PARITY_SOURCE_ROOT=/path/to/verified/source \
  yarn nx run modeling-metamodel:built-proof-check
```

That mode checks the pinned runtime/fixture hashes before consuming the source
builds; it never trusts the directory name or a presumed branch. The variable is
an explicit Nx input and the target is uncached. Default CI/local execution
requires only this repository; the optional comparison does not add a sibling
checkout dependency or persistent source alias. The source checkout is not edited.

Local Node 24.22.3 / Yarn 4.18.1 / Nx 24.0.6 / TypeScript 6.0.3 / Vitest 5.0.5,
macOS arm64:

| Run                                                            | Observed result                                                                                                              | Nx cache / duration                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Clean outputs, new isolated local cache, remote cache disabled | All 12 tasks passed; 1,198 package cases, 1,183 built-entry replays, 111 policy cases and original 42-assertion smoke passed | 0/12 hits; 6.8s; 6.0s five-task critical path |
| Warm outputs/cache                                             | Same checks passed; built-proof/boundary/archive checks still executed                                                       | 9/12 hits; 3.3s                               |
| Delete generated outputs, restore from cache                   | Same checks passed; all output hashes restored exactly                                                                       | 9/12 hits; 3.2s                               |

Only ignored generated package `dist`, `out-tsc` and root build-info paths were
removed. **130 generated files** have identical SHA-256 values across cold, warm
and restored runs, including **80 runtime build artifacts** (39 JS, 39 declarations,
two library build-info files). The other 50 files are test/typecheck outputs and
build metadata; they are not shipped. No old declaration maps survive the clean
runtime build. The three uncached checks were not counted as cache failures.

Immutable installation, sync, graph admission, five fresh infrastructure
regressions, formatting and links passed. Existing Nx peer-provision warnings
remain. Hosted CI is recorded in the PR. These local cold/warm observations do not
establish remote cache transfer, DTE economics or complete #10’s remaining gates.

## Deviations, ownership and separate outcomes

- No original runtime implementation, fixture assertion, public symbol or
  document format changed. Temporary import redirection is the only fixture
  execution adaptation; the metamodel descriptor spec uses its existing barrel.
- Nx/tooling and package configuration adaptations are documented in #12/#15/#16:
  private `0.0.0` packages, built exports, local workspace dependency with exact
  packed rewriting, restricted allowlists and no broken declaration maps.
- Archimatrix #37–#40 persistence/lifecycle/native evidence stays upstream as linked
  in [the host exclusions](proofs/README.md#host-evidence-and-exclusions). Those
  observations were not rerun here. Method packs and Blueprint implementation
  remain with their owners; synthetic fixtures are not standards certification.
- #20 retains fresh independent package-manager installation. #14/#18 release
  controls, #22/#23 disclosure/distribution and Archimatrix adoption remain separate.
  Package parity does not approve a version tag, publication or visibility change.
- Johan explicitly accepted #19’s assembled bounded behavior preservation in the
  linked acceptance record. This does not infer acceptance of epic #3 from tests
  or PR merge.

## Governance

The complete session content review was reused after authenticated unchanged
Meta `main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd` validation. Applicable accepted
paths/proposal status remain in the [governance record](extraction-inventory.md#governance-record).
Root AGENTS, ownership and accepted local ADR 0001/0002 apply at the Modeling base
above. Archimatrix ADR 0001/0002 and current #12 direction / #8/#22 / #9/#40
acceptance apply at the source pin. Blueprint ADR 0001/0016/0017 at
`af4f88517302937dc23c0da4763579d0cca83604` remain consumer-boundary context only.
No new architecture exception, runtime dependency or private content transfer is
introduced. Foundation owns the gate; Johan owns outcome acceptance.
