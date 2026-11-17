# Coordinated document sessions — Archimatrix #32

> Historical contract proof adapted from [Archimatrix #32](https://github.com/anarchitects/archimatrix/issues/32) / [PR #41](https://github.com/anarchitects/archimatrix/pull/41).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/document-sessions.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

This slice defines the portable session and command protocol that #33–#40 will
implement. It exports **types only** from `modeling-metamodel` and supplies an
excluded test-only adapter. It does not export a command executor, decoder,
combined validator, undo engine or commit implementation. Johan accepted these concrete #32 refinements on 12 November 2026.
The subsequent [#33 semantic implementation](semantic-commands.md) implements a
bounded subset and records its remaining limits; this document retains the original
#32 contract/proof boundary.

Input evidence is the accepted #8/#22 Foundation handoff, merged in PR #31 at
`1d0d6b0`. Johan accepted those outcomes on 12 November 2026; older pending wording
in their implementation snapshots is historical. Original governance evidence remains in the source PR; the current Foundation
review is recorded in the [migration record](README.md).

## Placement and existing APIs

The [public session contracts](../../packages/modeling-metamodel/src/lib/document-session-contracts.ts)
live in `modeling-metamodel` because they coordinate pack-owned constraints,
notations and generation metadata with core models/views. Placing them in core
would reverse the dependency. There is no new package or dependency. Foundation
imports no host, filesystem, persistence engine or framework; the later VS Code
adapter implements the host port through public package entries.

| Accepted API/type                                                            | Role in the coordinated session                                                          | Limit retained                                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Core `ModelDocument`, identities, references, `DiagramView`, `validateViews` | Semantic content and separately stored occurrences; structural/view checks               | Format `2` is an in-memory semantic shape, not the file-envelope version or a decoder.                |
| `composeModelingProfile`, `validateModel`                                    | Exact selection/definition composition and supported semantic checks                     | Typed outer input; unknown payloads/operators remain unsupported.                                     |
| `resolveOccurrenceNotation`                                                  | Explicit per-occurrence notation pins against local definitions and host tokens          | Rendered accessibility remains pending host verification.                                             |
| `ChangeState`, `ChangePlan`, `proposeDefaultPlan`, `applyChangePlan`         | Existing bounded generated member/property operations, baselines and exact plan receipts | No general command vocabulary, deletion, durable transaction or executed undo is added to these APIs. |
| `InverseModelChange`                                                         | Existing guarded inverse data for the earlier bounded plan proof                         | Not an executable undo stack; #35 supplies the broader inverse implementation.                        |

`DocumentSnapshot` extends `ChangeState`: one `model`, `applied` default-plan
receipts and `baselines`, plus the full pinned `profile`, `views`, `constraints`,
`extensions` and `notationBindings`. The model's profile reference must agree with
the pinned profile definition. The full selection is data, not executable pack
code. The existing `applyChangePlan` still returns the narrower `ChangeState`;
an adapter must reunite and validate all coordinated fields before accepting its
output as a document checkpoint. There must be exactly one notation binding for every occurrence, and no
unresolved or duplicate binding. Each identifies model, view, occurrence kind/ID
and exact notation/pack versions. Registry order never picks a notation.

`DocumentCheckpoint` adds complete document-command receipts. These complement
`applied`, which remains the existing default-plan receipt format; they are not
two competing current models. `DocumentSession` adds session-only undo/redo
transaction indexes. The runtime registry/theme, URI, saved-file fingerprint,
dirty-state UI and storage handles stay outside the checkpoint.

## One revision and conditional preparation

`checkpoint.snapshot.model.revision` is the single equality token guarding the
whole checkpoint. There is no independent view/receipt revision. Accepted edits
to semantic data, views, constraints, notation bindings, generated baselines or
receipts must advance it, including an accepted zero-write plan that records new
metadata. Load, validation, proposal, exact replay and failed/cancelled preparation
must not advance it. A host-only theme change or moving the active save location
without changing checkpoint content does not advance it either.

A command includes model ID, command ID, expected revision, fresh next revision,
actor attribution and source decision ID/revision. The host issues revision tokens
that are never reused within that model's lineage, including after undo, reopen or
history eviction. Retained receipts provide local reuse checks but do not alone
prove global uniqueness. Attribution is data, not authorization.

The required protocol is:

1. Decode and classify outer input before calling typed APIs. Validate lifecycle
   metadata as well as current semantic/view content; never trust a persisted
   receipt solely because its TypeScript shape is plausible.
2. Recognize exact, trusted receipt-backed replay by complete command content.
   Changed content under a reused ID is a conflict. Replay returns receipt evidence
   without a replacement candidate; it cannot restore an old model or certify the
   validity of today's state.
3. Check model identity, expected revision and all operation preconditions against
   the original snapshot. Reject overlapping writes, incomplete operations and
   stale/ambiguous identities; a previous operation cannot satisfy another's guard.
4. Stage all changes privately. Validate the complete candidate, including references
   to entities created later in the same batch, views, constraints, notation,
   generation metadata and receipts. No partial state escapes on failure.
5. Return `prepared` with the guarded revision and candidate checkpoint only when
   semantic coverage and lifecycle checks are complete and valid. Preparation is
   conditional intent, not a committed mutation.
6. The host owns the current checkpoint and rechecks expected model/revision at
   commit. Its `DocumentCommitPort` returns committed, conflict or failed. #37 must
   coordinate persistent replacement and storage-version checks before claiming
   durability. #32's in-memory fixture proves only the interface boundary.

Readonly types describe caller ownership; they do not deep-freeze objects, prevent
malicious proxies or authenticate prepared objects. A host must retain immutable
inputs and must not accept a forged `prepared` object from an untrusted boundary.
No persisted file can declare itself a valid preparation.

## Bounded command meanings

`DocumentCommand` has edit, apply-defaults, undo and redo variants. `DocumentEdit`
is the finite vocabulary for #33/#34, not a generic patch/script language.

| Intent                             | Required semantics for the later executor                                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create element/member/relationship | Explicit absent identity and caller-supplied typed content; complete-candidate validation includes required constraints and reference targets. `add-constraint` allows required bindings in the same batch.                                                                                         |
| Rename element/member or view      | Exact expected name; preserve identity and references. A name is not an identity.                                                                                                                                                                                                                   |
| Set/remove property                | Guard explicit presence/value, including relationships. `present:false` is deliberate removal; requiredness/type rules still apply.                                                                                                                                                                 |
| Replace entity                     | Exact expected entity; retain identity and type, and member owner. Element containment and relationship endpoints may change only under explicit valid intent. This is not implicit type/owner/profile conversion. Prefer a narrower property/rename operation where available.                     |
| Create/remove view                 | View IDs are model-qualified. Creating a populated view supplies every notation binding; removal must explicitly account for its occurrences/connectors/bindings without deleting semantic targets.                                                                                                 |
| Add/replace/remove occurrence      | Guard the view and occurrence; replacement retains occurrence kind/ID and semantic target. Change geometry, labels, route and allowed presentation only. Retargeting requires explicit removal/addition. Removal is not semantic deletion.                                                          |
| Constraint replacement/removal     | Exact expected binding, explicit intent and complete validation; required constraints cannot be silently weakened or dropped.                                                                                                                                                                       |
| Apply defaults                     | Reviewed existing `ChangePlan`, exact locally registered rules and valid complete candidate. Require wrapper ID, model/revisions and source to match the plan. Record both the command receipt and existing default-plan receipt in the same checkpoint; no implicit trigger or cascading rule run. |
| Undo/redo                          | Target a transaction from the appropriate live session stack; #35 supplies guarded inverses and metadata transitions. Restoring an entire previous checkpoint is prohibited.                                                                                                                        |

Every removal needs a `DeletionReview` linked to its operation index. The executor
must recompute all dependents from the guarded original snapshot and compare the
review, even when its declared list is empty. Dependents include semantic
containment, member ownership, nested value references, relationships, active
constraints, occurrences, connectors, notation bindings and active generation
baselines. Each reference must be resolved by explicit operations in the same
transaction; listed operation indexes are not evidence that resolution is valid.
Reject omitted, stale, duplicate or unresolved impact rather than cascading.

Historical receipt contents are evidence about prior snapshots, not active
references to validate against today's model. Retirement of generated targets
still needs an explicit baseline/history policy in #35; a deletion command cannot
silently adopt or erase generated ownership. Opaque unsupported extensions cannot
be inspected to assert deletion safety, so unsupported coverage blocks mutation.
No runtime deletion or impact scanner is implemented here.

## Classification, exact registries and coverage

`DocumentLoadResult` distinguishes not-decoded input (corrupt, unsupported format
or resource limit) from a decoded typed checkpoint, including replay receipts. The original bytes/recovery
material stay host-owned. #36 implements shape and size/depth checks; this type is
not itself a decoder.

`DocumentContext` supplies local exact packs, validation rules, default rules,
notations and theme. Stored pins must resolve without fetching or executing code
named by the file. `DocumentAssessment` retains semantic status/structure/coverage,
original diagnostics and provenance, view diagnostics, per-binding notation
results, aggregate diagnostics and separate lifecycle metadata assessment.

| Observation                                                      | Treatment                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Shape decoded, semantic structure invalid                        | Diagnostic/read-only recovery; not editable.                                                                                   |
| Structure valid, schema/profile/reference or view/notation error | Invalid; retain actionable locations, do not prepare mutations.                                                                |
| Unknown operator/extension or unassessed lifecycle metadata      | Unsupported; preserve data and explicit partial/not-checked status. No defaulting or authored mutation.                        |
| All required checks valid and lifecycle metadata valid           | Eligible for command preparation under the supplied registries; not proof of authorization, rendering or business conformance. |

Aggregate precedence is known error → invalid, otherwise missing/unsupported
coverage → unsupported, otherwise valid. Missing/duplicate/dangling notation
bindings are errors. Extension registration does not establish payload semantics.
A missing exact registry must not be replaced by `latest` or inferred from names.

## History, receipts and save-as policy

One accepted edit/default batch is one user transaction. Undo and redo are new
commands with new IDs and revisions, targeting guarded inverse/forward effects
and coordinated metadata transitions. A new authored transaction clears redo.
Failed operations do not move either stack. #35 must define inverses that retain
unrelated later edits and reject conflicting current values.

**Undo/redo stacks are session-only in the initial contract.** Reopening starts
with empty stacks; persisted command/default receipts are retry evidence, not
permission to reconstruct executable undo from an arbitrary file. This deliberately
limits undo across restart while preserving promised retry behavior. #35 chooses
and tests a finite session history limit; evicting undo entries does not erase
receipts, baselines or permit ID/revision reuse.

**Durable receipt pruning is not supported initially.** Retain complete accepted
command content and default-plan receipts with baselines so exact replay remains
decidable. Undo does not remove the original receipt: retrying that original command
must not resurrect its undone effect. #36/#37 must enforce resource limits and
report capacity failure without silently pruning replay evidence. Later compaction
needs an explicit compatibility/retention design, not a hidden optimization.

Save-as initially means **relocate the active session**, preserving model identity,
revision, views, baselines and receipts. The old file remains untouched; the host
moves URI ownership only after a successful write and prevents two independently
writable sessions for the same model identity. Opening the old copy while the new
location is active requires an explicit conflict/read-only choice. Cancellation
or failure retains the original binding and dirty content. An independent fork
with new model/reference identities is a separate command and is not inferred from
save-as. File overwrite/atomicity details remain #37/#38.

The file-envelope version is deliberately unassigned until #36; it is distinct
from `ModelDocument.formatVersion === 2`, model revision and pack/profile versions.
The codec must carry the complete checkpoint and preserve supported opaque JSON
extension data. It must not serialize executable registries, host handles, theme
objects or live undo stacks. Old scaffold documents require an explicit supported
transition or a visible unsupported result, never an implicit reinterpretation.

## Executable evidence and exact limits

[document-session.spec.ts](../../packages/modeling-metamodel/src/lib/document-session.spec.ts)
consumes both public Foundation entries and contains a small synthetic two-view
session plus a test-only prepare/commit adapter. Eleven cases cover:

- A decoded outer shape with duplicate semantic IDs remaining invalid and non-editable.
- Existing `ChangeState` compatibility and explicit per-view notation bindings.
- Detached rename preparation and host-owned commit.
- A view-only revision invalidating an already prepared semantic edit.
- Receipt-only revision advancement and retry metadata surviving a simulated
  reopen with empty undo stacks. This is not file round-trip evidence.
- Exact replay after later human edits, without a candidate or stale replacement.
- A late invalid view operation preventing an earlier staged rename from escaping.
- Opaque extension getters remaining unread while mutation is refused.
- Invalid semantics, incomplete notation and unassessed generation metadata.
- Stale/foreign/blank requests, reused revisions, failed guards and overlap.
- Explicit rejection of deletion, defaults and undo that the adapter does not implement.

The fixture supports only element rename, element-occurrence replacement and a
reviewed zero-edit receipt. It starts from trusted typed, fixture-owned checkpoints;
its simple command comparison is not a canonical persisted equality algorithm.
It assesses only empty generation metadata, and marks other generation records
not checked. It does not authenticate or comprehensively validate imported command
journals. The memory port is not a hostile-input or concurrent-process boundary.
These limits are intentional evidence boundaries, not exported production behavior.

#33 implements semantic command execution/impact checks; #34 view commands;
#35 guarded inverse/defaulting integration; #36 safe codec and version policy;
#37 persistence and lifecycle-metadata integrity; #38/#39 host behavior and external
changes; #40 real Extension Host proof. Contract refinements uncovered there must
be recorded and tested. #10 supplies production ArchiMate rules, #11 the graphical
editor. No new package, public stability, distribution or standards claim follows
from this slice.

[Issue #35 session history](session-history.md) implements the bounded undo/defaulting
policy, including finite live history, retained receipts and empty reopened stacks.
The type-only/protocol-only statements above describe the original accepted #32 slice.
