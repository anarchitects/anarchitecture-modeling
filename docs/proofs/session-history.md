# Session undo/redo and reviewed default transactions — Archimatrix #35

> Historical contract proof adapted from [Archimatrix #35](https://github.com/anarchitects/archimatrix/issues/35) / [PR #44](https://github.com/anarchitects/archimatrix/pull/44).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/session-history.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

This slice adds portable, conditional **session transaction preparation**, including
executed inverse candidates. It does not commit host state or write files. The base
is main `36913c0` (merged PR #43); Johan accepted #34 by requesting closure on
12 November 2026. Johan accepted these #35 refinements on 12 November 2026.

## Public surface and grouping

All entry points use `@anarchitects/modeling-metamodel` public exports:

- `prepareSessionCommand(session, command, context, policy?)` prepares one grouped
  edit/default/undo/redo transaction and returns a candidate `DocumentSession`, a
  historical receipt or diagnostics. A prepared result includes expected revision
  and complete coordinated assessment. The host must atomically adopt its checkpoint
  **and** live history only after a successful expected-model/revision check.
- `inspectDocumentReversal(session, kind, transactionId)` exposes exact inverse edits,
  baseline transitions and deletion impacts for explicit review. It does not select
  cleanup operations, validate today's semantic registries or authorize a commit.
- `openDocumentSession(checkpoint)` starts empty live stacks around an already trusted
  checkpoint. It performs no file access, decoding or validation; normal preparation
  still assesses the checkpoint before permitting mutation.
- `pruneDocumentHistory(session, keepUndo = 0)` explicitly keeps only the most recent
  eligible undo entries and clears redo. It changes no checkpoint data or revision.
  A negative/non-integer count throws `RangeError`.

One authored `edit` request may group semantic, constraint and view operations.
Both staging halves read the original checkpoint; their disjoint stores are combined
before full validation. This supports, for example, changing a relationship endpoint
and corresponding connectors in one transaction. Repeated/overlapping writes,
identity conversions and stale value guards still fail. A complete new view carries
its initial content; it is not incrementally patched within its creation batch.

The earlier `prepareSemanticCommand` and `prepareViewCommand` remain bounded
checkpoint preparation APIs and do not manage live history. Hosts owning sessions
should use `prepareSessionCommand` for new user transactions so redo invalidation and
history limits occur together with the candidate. The tests also simulate a separately
approved non-history writer to prove touched-value guards preserve unrelated later
content and reject conflicts; no collaborative rebase or automatic merge is provided.

## History policy

| Event or condition                                            | Behavior                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Successful grouped edit or reviewed default batch             | Push its original command ID onto undo; clear redo. One batch is one transaction.                                 |
| Undo                                                          | Require the ID at the top of undo; execute the current guarded inverse; move the original transaction ID to redo. |
| Redo                                                          | Require the ID at the top of redo; execute the last undo receipt's inverse; move the original ID to undo.         |
| Failure, stale request, missing evidence or invalid candidate | Return no candidate; checkpoint and both stacks remain unchanged.                                                 |
| Empty stack or non-top transaction                            | Return `history.empty` or `history.order`; no implicit selection or historical resurrection.                      |
| Exact receipt replay                                          | Return detached historical evidence without a candidate, stack move or revision change.                           |
| Successful empty edit, metadata-only default, undo or redo    | Advance a fresh shared model revision and append a receipt even when no semantic value changes.                   |
| Reopen                                                        | Empty undo and redo stacks; retain all checkpoint receipts, default records and active baselines.                 |

`DEFAULT_DOCUMENT_HISTORY_POLICY` retains at most **100 live transactions** across
undo and redo and permits at most **10,000 document receipts**. Both capacities are
explicitly configurable safe integers; history capacity may be zero and receipt
capacity must be positive. On a successful transaction, oldest undo entries are
removed first to meet the configured history bound, then farthest redo entries if
necessary. This does not erase receipts or generated baselines. Rejected operations
never prune stacks.

At receipt capacity, a new transaction—including undo—fails with an actionable
capacity diagnostic. Exact retries still return existing evidence. No implicit
receipt compaction, baseline retirement or disk-size guarantee is introduced. #36/#37
must enforce encoded-size/resource limits and any future deliberate retention policy.

## Guarded reversal and deletion review

Receipts retain `inverse` intent plus optional `execution` evidence containing the
actual bounded edits and keyed baseline transitions. Undo never installs an old whole
model, view collection or checkpoint. Field edits restore exact prior presence/value;
entity/occurrence replacements conservatively guard their whole touched record. Later
changes to those records conflict; unrelated later content remains untouched.

The full candidate must still satisfy semantic schemas, constraints, view references,
notation and lifecycle evidence. New dependents may make a previously valid inverse
unsafe. Missing inverse data, inconsistent transaction state, stale values, unresolved
deletion dependencies or a reversal that would remove a required property all reject
without moving history.

Every removal produced by an inverse still needs a complete `DeletionReview`, even
when its dependent list is empty. The optional review field on undo/redo requests is
backward-compatible vocabulary; omitting it supplies no deletion approval. Inspect the
reversal first and explicitly choose resolver operation indexes. Existing inverse
operations must resolve every active dependent; the executor never invents a cascade.
A dependency added later cannot be silently erased to make undo succeed.

Reversing generated writes also reverses their exact keyed baseline transitions.
Removing the original transaction's own baseline is explicit stored inverse metadata
intent. Deletion impact is inspected after that proposed metadata transition, so the
baseline being deliberately reversed does not falsely block its own generated-member
removal. Other active baseline references remain dependencies and are not discarded.

Restoration preserves identities, semantic content, ordered property/group/route
values and complete notation bindings. Existing replacements preserve positions;
restored entities/views/occurrences append according to inverse operation order.
Original collection insertion indexes are **not** restored. These collections have
no renderer stacking/order-edit contract in the current product; a future ordered
presentation feature must define its own guarded position edits. This bounded
semantic undo does not promise byte-identical collection ordering or restore a stale
collection over unrelated new content.

## Reviewed defaults and human ownership

Proposal remains the separate `proposeDefaultPlan` API. The caller reviews the plan
and submits `apply-defaults` with matching model, expected/next revisions and source.
Preparation delegates the bounded plan application checks to `applyChangePlan`, then
validates the full coordinated document and appends one document transaction receipt.
It does not run proposals automatically, choose conflict winners or broaden generated
writes beyond the existing member/property vocabulary.

Generated writes cannot replace a current value that diverged from its baseline.
Re-proposal preserves an unchanged human override, or exposes baseline/current/proposed
conflict when the proposed generated value also changed. Explicit authored resolution
remains separate. Repeated generation uses stable member identities; reviewed rule
version updates can change values and baselines atomically. Metadata-only regeneration
also has an inverse and a fresh revision.

Defaults may repair a structurally valid document with complete semantic coverage but
missing required values, provided current views/notation/lifecycle are valid and the
entire proposed result validates. This does not make its inverse automatically valid:
undo that removes a newly required property is rejected, preserving the valid current
state. Partial/unsupported coverage never qualifies for that repair path.

## Receipts, metadata integrity and retries

`assessDocument` now checks recognized coordinated default and reversal evidence:

- Each original default application has one exact retained `AppliedChangeRecord`
  matching its document request, revisions, source and inverse.
- Execution edits match the original request or the preceding reversal's inverse.
  Inverse payloads agree with the explicitly guarded operation data.
- Undo/redo refer to an existing transaction in the correct active/undone state.
- Keyed baseline before/after guards form a consistent sequence. Reconstructing those
  metadata transitions must produce the current active baseline set, without duplicate
  targets. Human values need not equal their last generated baselines.

Earlier authored-only receipts remain representable; missing inverse evidence makes
such a transaction ineligible for executed undo. Uncoordinated legacy plan journals,
standalone baselines or unsupported non-edit receipts remain lifecycle `not-checked`
and cannot be silently adopted for mutation. This is bounded consistency validation,
not authentication of historical authorship or validation of arbitrary imported bytes.
Unknown extension payloads remain unread and unsupported. #36/#37 own decoding and
safe installation/persistence of trusted checkpoints.

An exact original command retry after undo, redo, history pruning or reopen returns its
retained receipt and **no candidate**. It cannot resurrect undone effects, duplicate a
member or replace later human content. Reusing a recorded command ID with changed
content fails. An exact retained default plan submitted under a fresh wrapper ID also
returns the original document receipt; no alias transaction is recorded. Changed content
under a retained plan ID fails. A genuinely new, explicitly reviewed plan at the current
revision may recreate undone generated output; that is a new transaction, not a retry.

Undo/redo append their own document receipts but retain the original default-plan
record. Redo does not add another copy of that original plan. Durable means retained
in the coordinated checkpoint contract here; actual durable file guarantees remain #37.

## Serializable integration example

The public tests construct ordinary data in this shape (abridged values shown):

```ts
const edit = {
  kind: 'edit',
  id: 'rename-1',
  modelId,
  actor: 'author',
  source,
  expectedRevision,
  nextRevision,
  edits: [{ kind: 'rename', target, expected: 'Before', value: 'After' }],
  deletionReviews: [],
};
// A prepared receipt records command, beforeRevision, afterRevision,
// execution: { edits: edit.edits, baselines: [] }, and guarded inverse.
const undo = {
  kind: 'undo',
  id: 'undo-1',
  transactionId: 'rename-1',
  modelId,
  actor: 'author',
  source,
  expectedRevision: nextRevision,
  nextRevision: freshRevision,
  deletionReviews: [],
};
```

The suite serializes a produced default/undo checkpoint to JSON, reconstructs that
known fixture and opens a new session. The stacks are empty, lifecycle metadata checks
pass and an original retry does not recreate the undone member. This is a codec handoff
example, not a general decoder, versioned file envelope or filesystem round-trip claim.

## Acceptance evidence

[The public-entry session suite](../../packages/modeling-metamodel/src/lib/session-commands.spec.ts)
adds **24 cases** using synthetic schema/notation/default registries. It implements no
production modeling standard and is excluded from package output.

| #35 criterion                                                  | Executable evidence                                                                                                                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guarded semantic/view undo/redo with explicit deletion cleanup | Grouped rename/layout changes; complete element/member/relationship/constraint/view removal and restoration; reviewed reversal removals; unrelated later values survive while touched-value conflicts reject.                 |
| Grouping, stack/revision/retention policy                      | One ID per group, LIFO and empty-stack failures, fresh revisions for zero-write transactions, new-edit redo invalidation, bounded/disabled history, explicit pruning and receipt-capacity refusal.                            |
| Separate reviewed defaults and ownership                       | Proposal leaves inputs unchanged; coordinated generated application; human override preservation, three-way conflict and rejected generated overwrite; stable-ID regeneration and baseline-version reversal.                  |
| Exact retries before/after reversal and pruning                | Original command/plan replay without a candidate after undo/redo/pruning/reopen; changed IDs/content conflict; original plan records retained exactly once; new reviewed plans remain possible.                               |
| Full coordinated reversal validation                           | Later constraints/dependents block deletion; later connectors make semantic reversal invalid; required-property undo fails atomically; corrupted baseline/applied/inverse/execution metadata and unsupported coverage reject. |
| Serializable handoff and reopen policy                         | Produced checkpoint JSON example, empty reopened stacks, retained retry metadata, complete lifecycle assessment and no undone-output resurrection.                                                                            |

[The built-package consumer](../../tools/proofs/foundation-smoke.mjs) additionally prepares a
session edit, inspects and executes undo/redo, prunes/reopens and retries through emitted
public exports. Internal VSIX packaging is compatibility evidence, not installed desktop
lifecycle proof. #35 was accepted by Johan on 12 November 2026; #9 still needs codec, persistence
and real Extension Host lifecycle evidence. No CI monitoring, auto-merge or release is
part of this work.
