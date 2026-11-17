# Portable document/session and host persistence boundary

**Status: ready for Johan’s review; #11 outcome acceptance pending.**
Prepared 17 November 2026 for [Modeling #11][issue11], under [epic #3][epic3].
This applies accepted [ADR 0001](adr/0001-modeling-foundation-boundaries.md) to
actual files. It selects no new API, persistence abstraction, format or package.

The [#9 inventory](extraction-inventory.md) was accepted after [PR #34][pr34]
merged at `cb94bae49311542a40d2ff1b8042ce5e0e51c8e4`. Every source path below is
pinned to Archimatrix `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`, reverified
unchanged. The [file/fixture manifest](extraction-files.md) and
[170-name public surface](extraction-public-surface.md) remain the complete
accounting baseline. No code moves in this review.

## Disposition for owner acceptance

Keep all existing core and metamodel runtime source in their respective packages.
Document/session coordination belongs in metamodel because it combines core data
with profiles, constraints, notation and generated metadata. Moving it to core
would reverse the dependency. Keep the existing internal helpers internal; their
use by a public function does not add a public export or a deep-import contract.

Keep all nine production TypeScript modules under the VS Code app’s `src/` in
Archimatrix, including its storage interfaces and per-document coordinator.
Ownership of the current state, durable replacement and recovery determines that
boundary; absence of a `vscode` import alone does not make a module portable.
Method-specific packs stay with their owners. Blueprint continues to own its
application, persistence, authorization and collaboration services.

This is a classification of the accepted behavior, not a redesign. Source tests
and helpers do not become production APIs. No additional package or new ADR is
needed to apply the existing accepted responsibility split. Johan’s acceptance
of this file-level result is still required by #11.

## Portable files and rationale

Paths in this table are under `packages/modeling/metamodel/src/lib/` in the pinned
source. Each file remains in `@anarchitects/modeling-metamodel`; **internal** means
it is not re-exported by `src/index.ts`. Evidence keys resolve to tests below.

| File                                                   | Reason to retain in Foundation / preserved boundary                                                                                                                                   | Evidence   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [document-session-contracts.ts][session-contracts]     | Typed snapshot, checkpoint, context, command, receipt, session and commit-port contracts. No current-state owner or commit implementation.                                            | T1, T4, T5 |
| [document-assessment.ts][assessment]                   | Combines structural/semantic, view, notation and lifecycle coverage on supplied data. Does not load context or grant authorization.                                                   | T1–T5      |
| [document-deletion.ts][deletion]                       | Inspects active dependents and checks explicit cleanup reviews; does not cascade or choose a resolution.                                                                              | T2–T4      |
| [document-edit-preparation.ts][edit-preparation]       | **Internal** common identity/revision/replay/assessment and candidate preparation. The local staging callback is implementation code, never document-supplied code.                   | T2, T3     |
| [semantic-commands.ts][semantic]                       | Public semantic preparation returns a candidate, receipt or rejection; no adoption.                                                                                                   | T2         |
| [semantic-edit-staging.ts][semantic-staging]           | **Internal** guarded semantic edits against the original snapshot; no host state.                                                                                                     | T2, T4     |
| [view-commands.ts][view]                               | Public occurrence/view preparation; geometry and notation data do not imply rendering.                                                                                                | T3         |
| [view-edit-staging.ts][view-staging]                   | **Internal** view/occurrence staging with exact original guards and explicit connector/binding cleanup.                                                                               | T3, T4     |
| [document-transaction-staging.ts][transaction-staging] | **Internal** combination of semantic and view candidates before complete validation. Not a storage transaction.                                                                       | T4         |
| [document-execution.ts][execution]                     | **Internal** bounded execution/inverse data and baseline transitions. Does not execute I/O, scripts or a general transformation language.                                             | T4, T5     |
| [document-lifecycle.ts][lifecycle]                     | **Internal** consistency checks for coordinated receipts and baselines, not native editor lifecycle or an authenticated audit log.                                                    | T4, T5     |
| [document-history.ts][history]                         | Open a trusted checkpoint with empty live stacks; inspect reversals and prune live eligibility. No file open, decode, validation or durable receipt pruning in `openDocumentSession`. | T4, T5     |
| [session-commands.ts][session]                         | Grouped edit/default/undo/redo preparation and finite history policy. Host still adopts checkpoint and history together.                                                              | T4, T6     |
| [document-codec-contracts.ts][codec-contracts]         | Envelope/version/limit/result vocabulary, including caller-owned recovery bytes. Historical format name remains compatibility data.                                                   | T5         |
| [document-codec.ts][codec]                             | Bounded encode/decode on supplied bytes/data plus context; no file access, registry installation or migration.                                                                        | T5, T6, T9 |
| [document-codec-shape.ts][codec-shape]                 | **Internal** nested checkpoint/receipt shape checks. Format parsing belongs with the portable codec.                                                                                  | T5         |
| [codec-json.ts][codec-json]                            | **Internal** bounded JSON/UTF-8 and representability checks using portable language primitives; no Node file or Buffer dependency.                                                    | T5         |
| [change-contracts.ts][change-contracts]                | Plan, source, rule, baseline and receipt data remain the earlier bounded change contract.                                                                                             | T4, T9     |
| [default-plans.ts][defaults]                           | Deterministic proposal/identity generation and explicit conflicts; no automatic application or data processing.                                                                       | T4, T9     |
| [apply-plan.ts][apply]                                 | Validates and produces a narrower `ChangeState`; session preparation must reunite and assess the full document before host adoption.                                                  | T4, T9     |
| [change-data.ts][change-data]                          | **Internal** copy/equality/target/snapshot helpers shared by preparation and codec checks. No persistent store.                                                                       | T2–T5      |
| [change-rules.ts][change-rules]                        | **Internal** rule validation against locally supplied definitions; no dynamic operator loading.                                                                                       | T4, T9     |

The remaining 17 runtime/barrel files retain their existing destinations and
public/internal status from #9:

- Core `src/index.ts` and `src/lib/{identity,modeling-core,views,view-checks,validation,changes}.ts`
  remain core. In particular, inverse/change **data** in `changes.ts` does not
  import metamodel or implement a host undo service.
- Metamodel `src/index.ts` and
  `src/lib/{modeling-metamodel,contracts,composition,definition-checks,extensions,notation,validation-contracts,validation,value-validation}.ts`
  remain metamodel. Host-supplied theme tokens and method-owned notation
  definitions are inputs to portable checks; rendering, executable registration
  and product support are not transferred with them.

A TypeScript AST scan covered all **39 runtime/barrel files** (7 core, 32
metamodel), including type imports and re-exports: **154 import/export edges**,
all relative within the package except metamodel’s public core imports. Every
relative edge resolved within that 39-file set; no dynamic import or `require`
call was present. This supports the existing dependency direction. It does not
replace the extracted-artifact checks in #16/#17 or establish browser support.

## Host files that remain in Archimatrix

All paths here are under `apps/archimate-vscode/src/`. None is an extraction
candidate, even if some types or algorithms could be generalized later.

| File                                                   | Host responsibility and concrete evidence                                                                                                                                                                                                 | Evidence |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [persistence/storage.ts][storage]                      | `DocumentStorage`, `DiskVersion` and storage results promise staged local replacement/cooperative observation. Type-only and import-free, but specific to this provider protocol; no new Foundation storage interface.                    | T6       |
| [persistence/managed-document.ts][managed]             | Owns current session, copied context/source, model/revision recheck, codec-aligned capacity, adoption, save queue, disk observation, relocation and recovery interlock. Consuming portable APIs does not transfer these responsibilities. | T6, T7   |
| [persistence/local-document-storage.ts][local-storage] | Node filesystem/crypto/path/URL operations, lock and staging files, bounded reads, fsync/rename, disk fingerprints and uncertain outcomes.                                                                                                | T6       |
| [local-storage-policy.ts][storage-policy]              | VS Code/local-directory consent, supported host/provider selection and canonical resource keys. A `file:` URI is not proof of local-mount suitability.                                                                                    | T7       |
| [backup-storage.ts][backup]                            | Bounded Node file reads for host backups, including filesystem identity/mode checks. Reusing codec limits does not make file access portable.                                                                                             | T7       |
| [model-context.ts][context]                            | Supplies the product registry/theme and ArchiMate seed. The shipped pack remains unsupported/read-only; synthetic test registrations must not replace it in production.                                                                   | T7, T8   |
| [model-editor.ts][editor]                              | VS Code CustomDocument/provider state, URI/model exclusivity, dirty/save/save-as events, backup/reload/overwrite/recovery choices and command identity generation.                                                                        | T7       |
| [model-host.ts][host]                                  | Native command/provider registration and UI/error handling.                                                                                                                                                                               | T7, T8   |
| [extension.ts][extension]                              | VS Code activation and product composition of the editor, storage policy and commands.                                                                                                                                                    | T8       |

Host specs, `persistence/fixture.spec-helper.ts`, `testing/vscode.spec-helper.ts`,
`test/lifecycle-integration.mjs`, `test/extension-host.mjs` and the desktop harness
stay in Archimatrix. The [supporting-proof manifest](extraction-files.md#supporting-proofs-and-executable-boundary-evidence)
classifies every proof/event record: portable explanations may be adapted in #13;
native event JSON and storage/desktop evidence remain historical host evidence.
No UI mock, synthetic method fixture or filesystem adapter enters a package tarball.

## Ownership at each handoff

| Handoff        | Foundation obligation                                                                                                                           | Consumer obligation                                                                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context        | Resolve exact supplied pack/profile/rule/notation versions; retain explicit unsupported coverage.                                               | Install trusted definitions/implementations, supply theme tokens, decide permissions and product support. Never install or execute context named by imported data.                                                                                                                                 |
| Load           | Decode bounded bytes and return classification, diagnostics and original source.                                                                | Read the chosen resource, retain recovery material, select context and decide read-only/diagnostic handling. Decode success is not authorization.                                                                                                                                                  |
| Open a session | `openDocumentSession` returns empty live stacks around the supplied trusted checkpoint.                                                         | Decode/assess first and retain immutable ownership. This function retains the checkpoint reference; it is not a defensive-copy or validation boundary.                                                                                                                                             |
| Prepare        | Check identity, expected/fresh revision, original-value guards, coverage and complete candidate; exact replay returns only historical evidence. | Issue fresh command/revision identities for the model lineage and retain immutable inputs; review deletion/default intent. Retained receipts alone cannot prove global token uniqueness.                                                                                                           |
| Adopt          | `DocumentCommitPort` describes recheck and committed/conflict/failed outcomes; preparation installs no state.                                   | Own the current checkpoint and recheck model/revision at adoption. Archimatrix’s `ManagedDocument.commit(command)` prepares synchronously, codec-checks and adopts checkpoint/history together; it does not accept a caller-forged prepared snapshot or implement a new public Foundation service. |
| Save           | Encode the complete checkpoint under the configured finite budgets.                                                                             | Serialize saves, check disk observations, perform replacement, and mark only the written revision saved. Edits during I/O remain dirty. In-memory commit and durable save are distinct outcomes.                                                                                                   |
| Recovery       | Preserve meaningful unsupported JSON and expose classified failures without migration or truncation.                                            | Retain bytes/session/last-good file, present explicit recovery decisions and handle uncertain disk outcomes. No auto-reload, overwrite, stale-lock removal or implicit winner.                                                                                                                     |

### Compatibility invariants

1. Preserve `archimatrix-document`, envelope **1**, semantic model format **2**,
   exact dependency pins, all 170 public names and their signatures/behavior.
   The historical format identifier is not a host dependency. Bare scaffold
   models, unknown identifiers or future formats remain visibly unsupported;
   no wrapping, renaming or implicit migration is included.
2. One model revision guards semantic content, views, baselines and receipts.
   Accepted view-only or receipt-only commands advance it; exact replay returns
   no replacement candidate and cannot reinstall an undone effect. Failed
   preparation leaves checkpoint and live history unchanged.
3. Deletion and reversal require recomputed, complete explicit cleanup reviews.
   Undo preserves unrelated later edits and may reject unsafe reversal; restored
   collections do not promise original insertion positions or byte-identical order.
   `pruneDocumentHistory` changes live eligibility, not durable receipts/baselines.
   Reopen starts empty undo/redo stacks while retaining retry evidence.
4. Preserve the distinction between `not-decoded` failures and decoded
   valid/invalid/unsupported meaning. The codec’s `classification` is its handoff
   verdict; its detailed `assessment` may label missing composition context
   differently. Do not flatten either to an “editable” boolean. Opaque extension
   JSON may be preserved within safety/budget rules without semantic support;
   a known structural/metadata contradiction still rejects. Provenance fields
   and consistent receipts do not authenticate authorship or confer permissions.
5. Preserve both finite policies: portable session defaults are **100 live
   transactions / 10,000 retained command receipts**; the codec caps command and
   applied-plan receipts at **256 each**. Archimatrix aligns adoption to the codec
   cap, including lower caller limits, and checks the whole encoded candidate
   before adoption. Byte, depth, collection and other budgets can fail first.
   No automatic compaction, raised hard cap or receipt pruning makes a save fit.
6. Every decode result’s `source` is the **same caller-owned Uint8Array**, not a
   copy. The caller keeps it immutable; Archimatrix copies it into its coordinator
   and returns detached recovery views. Encoding can change lexical JSON spelling;
   explicit read-only preservation writes the retained original bytes instead.
   Readonly types are not deep freezing, a hostile-proxy sandbox or authentication.

### B1 ambiguity resolution map

These rows discharge the six ambiguity groups identified in the accepted inventory
at the design-review level. File placement and behavior are specified above;
**Johan’s acceptance remains pending for all six**.

| Inventory ambiguity                                      | Selected disposition                                                                                                                                                  | Evidence                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Checkpoint/context, assessment and candidate preparation | Keep portable contracts and preparation in metamodel; consumer supplies context and owns adoption.                                                                    | Portable rows + T1–T4, T6 |
| Deletion, execution, lifecycle, history and transactions | Keep guarded data operations in metamodel; native lifecycle remains host-owned.                                                                                       | Portable rows + T2–T5     |
| Codec, nested shape and UTF-8/JSON helpers               | Keep all four codec files in metamodel, including historical envelope identity and explicit unsupported/resource results.                                             | T5, T6, T9                |
| Session/codec capacity and `ManagedDocument`             | Preserve separate caps and host pre-adoption encoding; do not move or generalize the coordinator.                                                                     | T4–T6                     |
| Recovery bytes and backup/storage/recovery orchestration | Caller-owned byte contract stays portable; all storage, copying/retention policy and recovery UI remain consumer-owned.                                               | T5–T7                     |
| Entry points, tests and bundle/source-condition coupling | Preserve public surface and private helpers; #12/#15 extract, #13 adapts proofs, #16 removes the source condition with built/packed tests, #17 enforces independence. | #9 inventory + T9, T10    |

No behavioral redesign is required for this split. Future format renaming,
receipt compaction, broader storage providers, durable undo, new public helpers
or strengthened filesystem guarantees need separate owned work and compatibility
decisions; they are not hidden extraction changes.

## Evidence and verification

Tests below are at the pinned source revision. Their original source issue/PR
lineage is in the [manifest](extraction-files.md); Archimatrix #8/#22 and #9/#40
acceptance records were refreshed and unchanged. Earlier “not yet implemented”
wording in slice-specific proofs describes that slice, not today’s assembled code.
For example, the codec proof’s original 80 cases became 913 enumerated cases later;
the current inventory records the executable count.

| Key | Source test / proof                                                                            | Relevant assertion                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | [document-session.spec.ts][test-session] — 11 cases, source #32/PR41                           | Detached candidate, same revision for view edits, stale commit rejection, replay without replacement. Its in-memory host is test-only and intentionally limited.                         |
| T2  | [semantic-commands.spec.ts][test-semantic] — 25 cases, #33/PR42                                | Original guards, explicit deletion review, full-candidate rejection, no partial state and unsupported coverage.                                                                          |
| T3  | [view-commands.spec.ts][test-view] — 24 cases, #34/PR43                                        | Semantic/view separation, exact notation pins, host-theme distinction and coordinated revision.                                                                                          |
| T4  | [session-commands.spec.ts][test-history] — 24 cases, #35/PR44                                  | Grouped changes, guarded reversal, human overrides, finite capacity, no receipt pruning and reopen/retry without resurrection.                                                           |
| T5  | [document-codec.spec.ts][test-codec] — 913 current cases, #36/PR45 plus #38/PR47 corpus split  | Complete checkpoint round-trip, exact pins, opaque JSON, source-byte identity, malformed/corrupt/unsupported/resource limits and explicit no-migration behavior.                         |
| T6  | [persistence/persistence.spec.ts][test-persistence], #37/PR46 with later lifecycle refinements | Real temporary-file I/O: owned state/context/bytes, codec capacity before adoption, stale/queued saves, edits during I/O, exact reopen retry, locks/faults/cancellation and uncertainty. |
| T7  | [model-editor.spec.ts][test-editor], #38–40/PR47–49                                            | Mocked VS Code lifecycle: one URI/model owner, save-as/history, backup/reload/overwrite decisions, unsupported original-byte preservation and recovery interlocks.                       |
| T8  | [extension.spec.ts][test-extension]                                                            | Product activation and command composition with unsupported pack coverage.                                                                                                               |
| T9  | [foundation-smoke.mjs][smoke]                                                                  | Ordinary Node built public entries exercise portable semantic/view/default/session behavior and codec/reopen retry.                                                                      |
| T10 | [foundation-boundaries.spec.mjs][boundary-tests] — five checks                                 | Reject reverse core dependency, method/host/framework/persistence/deep imports, re-exports and dynamic loading; permit supported imports and enforce manifest dependency allowlist.      |

For #9 in this same session, both package test targets passed **1,183 cases across
18 files**, and T9 passed against built exports. That unchanged-source result is
reused, not claimed as a new run for #11. All 44 runtime export names also matched
the TypeScript public surface. No signature or semantic change is made here.

For #11, the previously resolved source targets were run in the same isolated
pinned archive with `NX_DAEMON=false NX_ISOLATE_PLUGINS=false NX_NO_CLOUD=true CI=true`:

```sh
yarn nx run-many -t test --projects=archimate-vscode,workspace-tools --output-style=static
```

**Passed:** 83 host tests in three files and seven workspace tests (the five
boundary checks plus two policy tests); all five scheduled tasks succeeded.
The two Foundation dependency builds were local cache hits; the ArchiMate build
and both selected test targets ran. These tests verify the existing consumer
boundary; they do not prove extraction, real desktop interaction or a supported
ArchiMate taxonomy. No native desktop, Linux/Windows, VSIX, release or new
whole-workspace run is claimed. The earlier 1,275 total is historical evidence.

Environment: Node 24.22.3, Yarn 4.18.1, source Nx 24.0.4, TypeScript 6.0.3,
Vitest 5.0.5, darwin/arm64. Dependencies were reused from the installed source
tree with temporary local links, not freshly installed. Source stayed unchanged;
no runtime dependency on a sibling checkout is added to Modeling. Modeling still
resolves an empty project graph under its own Nx 24.0.6.

Coverage checks match the 39 runtime files and nine host production files to the
placements above; the 71-file inventory and 170-name surface remain unchanged.
Extraction must rerun migrated positive/negative fixtures and artifact-consumer
checks under Modeling’s toolchain. Those remain #12/#15/#13/#16/#17/#19 work.

## Authority, remaining gates and acceptance

The owner for this bounded result is Johan, per [OWNERSHIP.md](../OWNERSHIP.md).
Record his explicit acceptance on #11 separately from PR merge. Once accepted,
#12 and #15 can use this disposition subject to their own direct prerequisites;
#11 does not itself move source or establish extracted parity.

Preflight reused the complete session Meta source/ADR review after confirming
current default branch `main` remains
`4f0339d86f0ebfa073173ad307cb67c8d6042bdd`. Applicable accepted paths and proposal
status are recorded in the [inventory governance record](extraction-inventory.md#governance-record)
and remain unchanged. Local AGENTS, accepted ADR 0001/0002 and ownership apply at
Modeling `cb94bae49311542a40d2ff1b8042ce5e0e51c8e4`. Archimatrix ADR 0001/0002
and current #12 body/comments were reconciled with its later dedicated-repository
direction. Blueprint ADR 0001/0016/0017 at
`af4f88517302937dc23c0da4763579d0cca83604` retain standalone/proprietary boundaries;
no Blueprint source or dependency is introduced. No policy exception is required.

#10 retains destination graph/cache evidence, #14 release controls, Meta #56
canonical registration, and #22/#23 final public-readiness and authorized execution.
The rights review and attribution remain applicable; this classification clears
no future tarball, disclosure inventory or licensed method content. Owner
acceptance here is not publication, visibility approval or consumer adoption.

[session-contracts]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-session-contracts.ts
[assessment]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-assessment.ts
[deletion]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-deletion.ts
[edit-preparation]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-edit-preparation.ts
[semantic]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/semantic-commands.ts
[semantic-staging]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/semantic-edit-staging.ts
[view]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/view-commands.ts
[view-staging]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/view-edit-staging.ts
[transaction-staging]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-transaction-staging.ts
[execution]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-execution.ts
[lifecycle]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-lifecycle.ts
[history]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-history.ts
[session]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/session-commands.ts
[codec-contracts]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-codec-contracts.ts
[codec]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-codec.ts
[codec-shape]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-codec-shape.ts
[codec-json]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/codec-json.ts
[change-contracts]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/change-contracts.ts
[defaults]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/default-plans.ts
[apply]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/apply-plan.ts
[change-data]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/change-data.ts
[change-rules]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/change-rules.ts
[storage]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/persistence/storage.ts
[managed]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/persistence/managed-document.ts
[local-storage]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/persistence/local-document-storage.ts
[storage-policy]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/local-storage-policy.ts
[backup]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/backup-storage.ts
[context]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/model-context.ts
[editor]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/model-editor.ts
[host]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/model-host.ts
[extension]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/extension.ts
[test-session]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-session.spec.ts
[test-semantic]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/semantic-commands.spec.ts
[test-view]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/view-commands.spec.ts
[test-history]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/session-commands.spec.ts
[test-codec]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/document-codec.spec.ts
[test-persistence]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/persistence/persistence.spec.ts
[test-editor]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/model-editor.spec.ts
[test-extension]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/apps/archimate-vscode/src/extension.spec.ts
[smoke]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/tools/foundation-smoke.mjs
[boundary-tests]: https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/tools/foundation-boundaries.spec.mjs
[issue11]: https://github.com/anarchitects/anarchitecture-modeling/issues/11
[epic3]: https://github.com/anarchitects/anarchitecture-modeling/issues/3
[pr34]: https://github.com/anarchitects/anarchitecture-modeling/pull/34
