# Coordinated view and occurrence commands — Archimatrix #34

> Historical contract proof adapted from [Archimatrix #34](https://github.com/anarchitects/archimatrix/issues/34) / [PR #43](https://github.com/anarchitects/archimatrix/pull/43).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/view-commands.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

This slice prepares bounded view-only transactions over the accepted #32/#33
checkpoint. The base is main `ca29c95` (merged PR #42). Johan accepted #33 by
requesting closure on 12 November 2026. Johan accepted these #34 refinements by requesting closure on 12 November 2026.

## Public surface

`prepareViewCommand(checkpoint, command, context)` is exported through
`@anarchitects/modeling-metamodel`. Like `prepareSemanticCommand`, it returns a fully
assessed private candidate, exact prior receipt evidence, or rejection diagnostics.
The two executors share the internal preparation lifecycle: command identity/source,
expected and fresh next revision, receipt integrity, current editing eligibility,
original guards, deletion review and complete candidate validation. The host still
owns commit and must recheck expected model/revision. No input is mutated.

| Operation            | Guard and supported effect                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-view`        | Absent view ID, current model, nonblank name and complete initial occurrences with explicit notation bindings belonging to that view.                                         |
| `rename-view`        | Exact original name; nonblank replacement. View identity stays stable.                                                                                                        |
| `remove-view`        | Exact complete view and all notation bindings, plus a complete deletion review. This explicit whole-view operation includes its contained connectors.                         |
| `add-occurrence`     | Absent kind-scoped ID in an existing view; caller supplies the occurrence and exact notation pin.                                                                             |
| `replace-occurrence` | Exact original occurrence; unchanged kind, ID and semantic target. Geometry, label/description, permitted overrides, route and corresponding endpoint occurrences may change. |
| `remove-occurrence`  | Exact occurrence and notation pin, complete impact review, and explicit same-batch cleanup of dependent connectors. Its semantic entity remains.                              |

A newly created view carries its complete initial content; subsequent operations in
the same batch cannot assume it existed in the original checkpoint. For an existing
view, new connectors may appear before their new endpoint occurrences in declaration
order: validation examines the whole candidate. Repeated writes to one occurrence,
repeated rename, duplicate creation and whole-view/field overlap fail. View rename
and changes to distinct occurrences may coexist. Identical occurrence IDs in different
views remain independent; IDs are scoped by view and occurrence kind.

Replacement cannot retarget a semantic element or relationship or convert an
occurrence kind. There is no notation-pin replacement operation. A future conversion
needs explicit reviewed semantics; this API does not infer it. Semantic operations
remain outside this executor, and general view additions remain outside the semantic
executor. Mixed semantic/view transactions beyond #33's removal cleanup are not a
new promise of this slice. Later lifecycle work can deliberately compose executors.

## Validation and explicit cleanup

The coordinated assessment checks semantic coverage as well as views and notation.
Finite positions, positive finite dimensions, finite route waypoints and nonblank
accessible labels are required. Connector endpoints must exist in the same view
and match the source/destination of the existing semantic relationship. Even valid
layout cannot bypass an invalid or unsupported semantic checkpoint.

`inspectDocumentDeletion` exposes active dependent locations. A removal needs exactly
one complete review, including notation bindings. A dependent connector can be
removed explicitly or replaced to reference another occurrence of the same semantic
endpoint, including one added in this batch. The review identifies a real operation;
complete validation proves it actually resolves the dangling reference. Merely
changing a connector's route is insufficient. No executor-generated cascade or
implicit semantic deletion occurs.

Guard/precondition diagnostics include command operation indexes plus view and
occurrence identity when available. Full assessment retains view/occurrence paths,
semantic provenance and exact notation references. Invalid late operations yield no
candidate or appended receipt, even after earlier valid edits were staged.

## Notation and host theme separation

`validateOccurrenceNotation` checks pack-owned notation independently of theme
values: exact selected pack/version, semantic type correspondence, permitted override
keys/values, default token names, non-color cues and declared accessibility needs.
It returns an appearance with token identifiers and requirements, not resolved colors.
It is not a substitute for `validateViews` geometry/reference validation.

The existing `resolveOccurrenceNotation` first runs that validation, then resolves
its token identifiers against the supplied host theme. Invalid notation returns
before theme lookup. Missing theme tokens produce separate locatable diagnostics.
Command preparation retains the existing policy of requiring both stages to succeed.
Both successful APIs explicitly retain `pending-host-verification`; text labels,
contrast thresholds and tokens alone do not establish rendered accessibility.

## Revision, inverse and lifecycle boundaries

View-only changes advance the shared model revision while leaving semantic entities,
properties, relationships, constraints and profile pins unchanged. New receipts retain
full authored requests, source/actor attribution and detached guarded inverse intent.
Exact replay after later semantic edits returns historical receipt evidence without
returning a stale candidate or replacing current human edits.

Replacements retain existing collection positions and additions append in operation
order. A complete new view preserves the caller's supplied occurrence order. Removal
inverses capture complete prior occurrences/views and notation pins, but do not encode
original collection insertion positions. No stacking-order semantics or order-edit
API is introduced. #35 must refine restoration ordering if needed before claiming
executed undo/rendering behavior; this slice does not execute inverse records.

The #33 lifecycle limits remain: nonempty generated baselines, legacy applied-plan
receipts or non-edit command history are not checked sufficiently to permit new
mutation. Unknown extension payloads remain unread and unsupported. Inputs are trusted
caller-owned immutable typed records, not parsed arbitrary files. Codec validation,
concurrent host commits, durable storage, undo/default integration and desktop evidence
remain #35–#40. The original bounded generated-plan API stays unchanged.

## Acceptance evidence

The [public-entry suite](../../packages/modeling-metamodel/src/lib/view-commands.spec.ts)
contains **24 cases** using a synthetic two-view model with exact schema and notation
registries. It is excluded from production output and adds no supported modeling
standard. The original semantic, notation and session suites continue to pass.

| #34 criterion                                 | Evidence                                                                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| View/occurrence lifecycle and scoped identity | Complete view create/rename/remove, element/connector addition before endpoint declarations, guarded replacement/removal and duplicate/overlap rejection.                                                                      |
| Geometry, labels, endpoints and notation      | Negative NaN/infinite/negative geometry, blank label, invalid route, cross-view/reversed endpoint, missing target, wrong/missing notation pin and forbidden override cases; independent notation/theme validation.             |
| Atomic shared revision and locatable failure  | View-only revision advance, stale/value guards, late-invalid batches preserving the entire input, view/occurrence/path diagnostics and no rejected candidate.                                                                  |
| Explicit removal semantics                    | Exact dependent paths; occurrence deletion with explicit connector removal or rewiring; guarded whole-view cleanup; missing reviews, incorrect resolvers and unresolved dependencies reject.                                   |
| Independent views and preserved meaning       | Move/style/label/route changes preserve the second view, semantic targets/entities/relationships, constraints and notation pins; retarget/kind/identity conversions fail.                                                      |
| Guarded inverse and later host use            | Exact inverse payloads for create/rename/replace/remove, detached submitted values, replay after a later semantic edit, unsupported lifecycle operations and opaque payloads; pending rendered accessibility remains explicit. |

The [built-package consumer](../../tools/proofs/foundation-smoke.mjs) additionally prepares
and replays a view move after a semantic rename, checks inverse intent and calls the
standalone notation validator through emitted public exports. Internal VSIX packaging
is a compatibility check, not an installed Extension Host or rendered-accessibility
proof. #34 is accepted and closed and #9 remains the broader lifecycle
outcome. No CI monitoring, automatic merge or release is part of this work.

[Issue #35](session-history.md) now executes guarded session reversal candidates and
validates coordinated generation metadata. It supersedes the initial lifecycle limits
above while retaining the bounded view executor and pending rendered accessibility.
