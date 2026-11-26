# Published conceptual/logical contract proof — issue #78

Work in progress under [#78](https://github.com/anarchitects/anarchitecture-modeling/issues/78).
This is an original synthetic public fixture and an executable installed-package
proof. It is not a production method pack, conversion implementation or consumer
adoption decision. Johan owns Foundation evidence acceptance.

## Baseline and reproducible execution

The fixture pins public core and metamodel **0.0.2**, with metamodel depending on
exact core **0.0.2** and the disposable consumer pinning `tslib` **2.9.1**.
The release source is `fa82048545613c7f3dcc8b367af9bfc30ef6e448`.
[The release record](../consumer/release-notes.md) and
[verified publication](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7204975899)
bind archive hashes and provenance to publication run `45905753413`.
The runner rejects registry archives whose SHA-256 or lockfile SHA-512 differs.

From the Foundation workspace with Node 24 and its pinned Yarn:

```sh
NX_DAEMON=false NX_ISOLATE_PLUGINS=false NX_NO_CLOUD=true \
  yarn nx run modeling-metamodel:registry-contract-check --output-style=static
```

This fresh-state target is deliberately uncached and has no workspace build
prerequisite. It installs exact public registry packages outside the workspace,
with empty npm configuration, a disposable home/cache and no inherited auth,
`NODE_PATH` or `NODE_OPTIONS`. It copies only the public-API fixture and verification
scripts into that consumer. No sibling checkout or private consumer code is used.
The existing runtime/declaration checks reject deep imports, ambient workspace
resolution and host/framework dependencies.

The runner compiles and executes the same fixture with consumer-installed
TypeScript 6.0.3 in strict NodeNext and Node16 modes, checks every compiler source
stays inside the consumer, and repeats after deleting dependencies/cache and
performing `npm ci`. Node16 denotes compiler resolution, not Node 16 support.
A separate exact **0.0.1** consumer reopens the produced envelopes and confirms
that it does not export the comparator. npm verifies registry signatures and
attestations. The printed evidence directory retains JSON reports, both lockfiles,
the fixture source hash and signature output; temporary consumers are deleted.

## Local execution evidence

The first local run passed **56 fixture assertions** in each module-resolution
mode, both before and after a clean lockfile reinstall, on Node **24.22.3**,
TypeScript **6.0.3**, macOS arm64. The separate 0.0.1 reader preserved all four
envelopes (conceptual/logical, valid/opaque). npm verified **four registry
signatures and two Foundation attestations**.

The existing package-check target and its three prerequisites passed, including
public exports, strict declarations, packed lifecycle/comparison examples and
boundary checks. All six publishing-documentation tests passed. These are local
results for the initial fixture; no hosted CI result or #78 acceptance is
claimed here. The implementation PR records the source commit. The runner's
evidence binds its result to the fixture SHA-256 and exact
installed artifacts.

## Selected fixture and exact definition closure

Two independently identified models contain Customer and Order entities, their
addressable fields, a relationship and mandatory member-group key bindings.
All names, IDs, definitions and data are synthetic and independently authored here.
The conceptual and logical packs deliberately use a small common structural
vocabulary; this does not prove conceptual-to-logical derivation or 3NF conformance.

| Identity           | Exact value / meaning                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Models             | `fixture-conceptual`, `fixture-logical`; distinct IDs, initial revision `0`                                          |
| Profiles           | `synthetic-conceptual-profile@1.0.0`, `synthetic-logical-profile@1.0.0`                                              |
| Packs              | `synthetic-conceptual@1.0.0`, `synthetic-logical@1.0.0`; contract `1`, abstraction dimension                         |
| Dependency closure | Each profile selects its one pack; pack `requires` and `conflicts` are empty; no ambient packs                       |
| Definitions        | `proof:entity`, `proof:field`, `proof:places`, `proof:key`, `proof:key-fields`; versioned by their exact owning pack |
| Rules              | Each pack registers `proof:key-shape@1.0.0`, operator `foundation:member-group@1`                                    |
| Scope              | Member-group shape/ownership/cardinality; no claim of key uniqueness over real data                                  |
| Opaque extension   | `proof:opaque@1.0.0`; preserved but never semantically supported                                                     |
| Other registries   | No default rules, notation definitions or external resolver                                                          |
| Data formats       | Model `2`, document envelope `1`, comparison contract `1`                                                            |

Entities and fields have explicit IDs independent of display names. A test-owned
correspondence table names source/target IDs and revisions. It uses existing
`ChangeSource`/authored `ChangeOrigin` shapes for its source evidence; it introduces
no exported contract or serialized Foundation field. There is no generated output
in this fixture, so no fabricated generated baseline. Source provenance is not
archive/build provenance, and neither authenticates the synthetic actor.

## Contract matrix

| Must-have pressure          | Executable observation in this slice                                                                                                         | Limit / remaining evidence                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Types and exact composition | Both fully populated models validate; required definition properties and key roles are enforced                                              | Synthetic vocabulary, not a complete method                                                 |
| Stable identity             | Rename reports one stable entity path; same-label replacement yields a distinct identity; explicit cross-layer entity/member correspondences | Cross-layer mapping is caller evidence, not automatic matching                              |
| Semantic change             | Datatype, descriptive intent and key-member changes report differences                                                                       | No business impact or transformation inference                                              |
| Ordering                    | Entity/member/definition order and declared unordered key order do not change meaning; repeated reports match                                | Ordered collections are covered by #77; this fixture selects unordered keys                 |
| Presentation and revision   | Added view metadata and revision-only changes compare equivalent                                                                             | Comparison does not validate presentation or authorize stale commits                        |
| Coverage                    | Registered opaque payload and unsupported operator yield incomplete comparison; absent definitions never yield equality                      | Supported structural checks do not establish unknown method semantics                       |
| Compatibility               | Changed profile versions and changed definitions under an unchanged pin are incompatible; distinct model IDs are incompatible                | No cross-layer equivalence or implicit migration                                            |
| Serialization               | Both valid and opaque envelopes reopen with their classification/content preserved                                                           | No durable storage, recovery service or product approval                                    |
| Old reader                  | Actual 0.0.1 reader retains envelope 1/model 2 content and unsupported classification; comparator absent                                     | No comparison report is persisted in an old envelope                                        |
| Public package boundary     | Registry hashes, exact core dependency, root exports, negative imports, declarations and lockfile reinstall                                  | Local proof, not browser/Windows/production certification                                   |
| Mandatory completion        | Removing required descriptive information makes the model invalid                                                                            | Incomplete draft authoring is the separate #83/#84 path, not masked by an all-optional pack |

## Host obligations and remaining acceptance

`DocumentCommitPort` is an interface, not an installed transaction adapter. A host
must recheck the expected current state atomically with committing the prepared
checkpoint, apply server-side authorization, and preserve coordinated semantic,
view, baseline and receipt changes together. A comparison result cannot replace
the expected revision. A view-only or zero-write advance can make a pending edit
stale; #77 and existing lifecycle proofs preserve that distinction.

Retries must compare full command content, preserve durable receipts and return
the historical result without reinstalling an old checkpoint. Conflicts and failed
commits must not partially adopt candidates. After uncertainty or restart, the
host must reconcile durable state before retrying, reopen with empty live history,
and retain durable replay evidence. Authorization, persistence transactions,
failure recovery and tamper-resistant audit are host responsibilities; this slice
does not implement or certify them.

Keep model revision, semantic equality, source provenance, durable version
history and audit separate. Cross-layer derivation additionally needs a
consumer-owned transformation/run identity, exact configuration, loss/ambiguity
and stale/missing-trace handling. The explicit synthetic correspondence here
does not satisfy those product obligations. No demonstrated need in this bounded
fixture adds #79, #80 or #81 as a dependency.

The historical consumer evaluation in Blueprint #52 remains closed with its
0.0.1 DEFER outcome. Its recorded successor, Blueprint #87, owns the next adoption
evaluation. Reuse its requirements and preserve proprietary/standalone boundaries;
no private fixture or source is copied into this public proof. A consumer-specific
matrix comparison, host integration evidence and separate acceptance remain to be
completed in their owning scope. #78 stays open for review and Johan's Foundation
acceptance; PWG's consumer decision does not follow from a passing test.

The immutable 0.0.1 and 0.0.2 README limitations remain recorded in the release
notes. This branch corrects current source wording without changing published
artifacts, package versions or runtime APIs.
