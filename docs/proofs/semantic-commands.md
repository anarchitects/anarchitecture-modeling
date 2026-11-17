# Atomic semantic commands and deletion impact — Archimatrix #33

> Historical contract proof adapted from [Archimatrix #33](https://github.com/anarchitects/archimatrix/issues/33) / [PR #42](https://github.com/anarchitects/archimatrix/pull/42).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/semantic-commands.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

This slice implements bounded **authored command preparation** over the coordinated
#32 checkpoint. It does not commit host state, execute undo, apply default rules or
write files. The base is main `93502ad` (merged PR #41); Johan accepted #32 on
12 November 2026. Johan accepted these #33 refinements by requesting closure on 12 November 2026.

## Public APIs and boundaries

All three entry points are exported by `@anarchitects/modeling-metamodel`:

- `assessDocument(checkpoint, context)` combines exact semantic/schema checks, view
  checks, complete notation binding coverage and bounded command-receipt checks.
  It retains original diagnostic paths/provenance and extension envelope identity.
- `inspectDocumentDeletion(snapshot, edit)` returns the exact dependent locations
  for a removal. Unknown extension content remains unread and makes coverage
  `partial`. Non-removal intent returns `not-applicable`, not a clean deletion
  verdict. Inspection consumes typed records; it neither edits nor proves the
  validity of arbitrary imported files.
- `prepareSemanticCommand(checkpoint, command, context)` returns `prepared`,
  `replayed` or `rejected`. Only preparation returns a private candidate checkpoint.
  The host must still compare expected model/revision before committing it.

Core remains independent of metamodel, packs and hosts. The earlier
`applyChangePlan` API and its restricted generated member/property operations are
unchanged. This authored vocabulary does not silently broaden generated writes.
No dependency, format version, public placement or product UI is introduced.

## Supported operations

| Intent                                                 | Guard and effect                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create element/member/relationship                     | The kind-scoped identity must be absent in the original snapshot. Caller supplies typed content; the complete candidate must satisfy ownership, references, type/schema, constraints and endpoint-pair rules.                                   |
| Replace element/member/relationship                    | Exact expected entity, unchanged ID/type and unchanged member owner. Element containment and relationship endpoints can change only under explicit valid intent. No identity/type/owner conversion.                                             |
| Rename element/member                                  | Exact previous name and a nonblank replacement; references retain stable IDs.                                                                                                                                                                   |
| Set/remove property on element/member/relationship     | Exact previous presence/value; explicit `present:false` means removal. Requiredness, value types and nested references still apply.                                                                                                             |
| Add/replace/remove constraint binding                  | Add an absent binding or guard one exact current binding; validate rule registration, subject, role groups and parameters. Exact duplicate bindings are ambiguous for this editing surface and fail assessment.                                 |
| Remove occurrence or view as explicit semantic cleanup | Guard the complete occurrence/view and its expected notation binding(s). Remove only the selected records. Connectors depending on a removed occurrence need their own explicit cleanup. Semantic targets are never deleted by removing layout. |

General view creation, moving/restyling/retargeting occurrences, default application
and undo/redo requests are explicitly unsupported by this executor. #34/#35 own
those behaviors. View creation and occurrence addition can appear in inverse data
for later execution without becoming supported forward commands here.

All guards read the **original** checkpoint. Separate fields on one entity can be
edited together, but repeated writes to one field and whole-entity/field overlap
fail; operation order is not precedence. Remove-and-recreate of an existing identity
is not a conversion workaround. A newly created entity must carry its complete
initial content rather than relying on a later property write guarded against an
entity that did not exist originally.

Constraint replacements/removals likewise target their original reviewed slots.
Exchanging two existing binding values cannot redirect a later operation to an
earlier operation's output; both declaration orders produce the same candidate.

## Atomic candidate and exact replay

After checking command/model/source identities, fresh revisions and current editing
eligibility, preparation stages changes in private data. The entire candidate is
validated once all operations have been applied: a relationship, member or
constraint may refer to an entity created later in the declaration order. A late
invalid operation returns diagnostics and no candidate, journal update or baseline
change. Inputs remain untouched.

The candidate copies authored entity/value data, constraints, views, profile pins,
notation bindings, command content and inverse records. Caller mutation of an
operation payload cannot change the prepared entity or receipt. The API still
requires caller-owned immutable typed input; it is not a hostile-object sandbox.
Opaque unsupported extensions are never copied by traversing their payloads.

Successful preparation appends the full authored command, actor/source attribution,
before/after revision and guarded inverse intent. Even a reviewed empty edit batch
advances revision because its new receipt is coordinated metadata. Rejected
commands do not advance it. Attribution records are not authorization grants.

Exact recorded command content returns detached receipt evidence without a
candidate. Reusing an ID for changed content fails. Replay does not reapply an
undone command, replace later human edits or certify today's semantic coverage;
it can return historical evidence when the current registry is unavailable.
Malformed/ambiguous receipt identities or a broken coordinated revision chain
cannot produce accepted replay evidence.

## Deletion review and explicit resolution

The scanner enumerates active references in:

- Element containment and member ownership.
- Relationship source/target endpoints and nested tagged reference/list/record
  properties on elements, members and relationships.
- Constraint subjects, member groups and structured parameters.
- Semantic occurrence targets, connector endpoints, view-owned occurrences and
  their explicit notation bindings.
- Active generated-baseline targets and their structured stored values. These can
  be reported, but this executor does not retire or rewrite a baseline.

Historical receipt contents describe prior snapshots and are not reinterpreted as
active references against today's model. Unknown extension payloads cannot be
inspected to claim deletion safety.

Every removal, including constraint/view/occurrence removal, must have exactly one
`DeletionReview`. Empty impact still requires an explicit empty review. The executor
recomputes locations against the guarded original checkpoint and rejects missing,
extra, duplicate or stale review entries. Each dependent must name real operations
in the same batch that edit/remove that owner or reference field. A rename or
unrelated property edit cannot stand in for reference cleanup. Review data is not
an authorization token.

The final full-candidate validation proves the selected cleanup actually leaves no
dangling current references; a claimed resolution alone cannot bypass it. There
is no implicit cascade and no executor-generated cleanup batch. The full-removal
fixture supplies every entity, constraint and view removal explicitly. Another
fixture changes a relationship's endpoint only after explicitly removing the
connectors that would otherwise describe the old endpoints.

## Inverse data and lifecycle limits

New authored receipts carry optional `inverse: readonly DocumentEdit[]` for
compatibility with #32's existing receipt shape. Every supported forward operation
emits a detached inverse in reverse transaction order: field writes restore exact
prior presence/value, replacements guard the written entity, additions invert to
removal with an exact expected record, and removals invert to explicit creation.
Removed views/occurrences retain notation pins in their inverse payloads.

This is **guarded inverse intent**, not executed undo. #35 must enforce fresh
revisions, impact review, metadata transitions and conflicts when executing it.
Inverse entity/binding additions do not encode original collection insertion
positions; preserving semantic identity and grouped-value order does not promise
restoration of collection order or renderer stacking. #34/#35 must refine ordering
contracts if visual ordering requires it. Session undo/reopen policy from #32 is
unchanged.

The initial editing subset requires empty legacy `applied` default-plan records and
empty generated `baselines`. Nonempty generation metadata or non-edit command
history yields lifecycle `not-checked` and blocks new mutation. Its integrity and
coordination with authored commands remain #35/#37; no authored command silently
adopts generated ownership or retires a baseline. The existing bounded defaulting
API remains usable on its separate supported state.

Current command-receipt checks cover identity uniqueness, attribution fields,
matching request/before/after revisions, a contiguous retained chain, no revision
reuse and agreement with the current head. They do not authenticate historical
content, prove it came from this process, decode untrusted bytes or implement
retention/compaction. #36/#37 must validate imported outer shapes and lifecycle
integrity before installing a trusted checkpoint. Host uniqueness, locking,
concurrent disk writes and durable replay remain downstream responsibilities.

## Acceptance evidence

The synthetic [semantic command suite](../../packages/modeling-metamodel/src/lib/semantic-commands.spec.ts)
uses the public entry points with two elements, independently addressable members,
a relationship, grouped constraint, nested references and two fully bound views.
It defines no production language support.

| #33 criterion                                                   | Executable evidence                                                                                                                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded semantic CRUD, stable identity and explicit conversions | Same-batch creation, element/member rename, relationship property update/removal, replacements, isolated member deletion and full explicit removal; incompatible IDs/types/owners fail.                                                            |
| Atomic expected-revision application and complete validation    | Relationship/member/constraint declarations before their targets; invalid endpoint pairs, containment cycles, duplicate IDs, late dangling references and required-property removal reject without partial mutation.                               |
| Deletion impact and reviewed cleanup                            | Exact expected paths across containment, ownership, nested values, constraints and two views; empty/missing/extra/duplicate/stale/incorrect-resolver reviews; explicit connector cleanup and whole-model removal.                                  |
| Diagnostics, provenance and guarded inverses                    | Semantic rule/constraint provenance and view paths retained; command locations identify operation indexes; receipts contain authored attribution and detached guarded inverse intent.                                                              |
| Positive and negative proof                                     | 25 cases cover success, value guards, overlapping writes, exchanged constraint values, immutable failure, receipt-only revisions, exact replay after human edits, malformed receipts, missing registries, opaque payloads and lifecycle rejection. |
| Portable placement and compatibility                            | Existing bounded-plan tests remain unchanged; negative boundary checks still run; [built consumer](../../tools/proofs/foundation-smoke.mjs) now assesses and prepares/replays an authored rename through built package exports.                    |

The PR records actual local checks. No CI monitoring, release, standards
certification, graphical editor or file persistence is claimed. #33 is accepted and closed; #9 remains the larger lifecycle
outcome and #4 remains a separate tooling advisory.

[Issue #34 view commands](view-commands.md) now prepare general view-only edits through
a separate executor, sharing the revision/replay lifecycle and complete assessment.
The semantic executor retains its bounded operations.

[Issue #35](session-history.md) now supplies grouped session transactions, executed
guarded reversals and recognized generation-metadata validation. The empty-generation
restriction above describes the original #33 slice; uncoordinated legacy metadata
continues to block new mutation.
