# ADR 0004 — Incremental authoring and explicit admission policies

- **Status:** Accepted by the Foundation capability owner and by PWG for architecture direction only; PWG acceptance was recorded after merge.
- **Capability-owner decision date:** 2026-11-27.
- **PWG decision date:** 2026-11-28 (Australia/Sydney); comment posted at `2026-11-27T20:05:47Z`.
- **Decision authority:** Johan, Foundation capability owner; PWG (`pwgconsulting`), ecosystem architecture and SDLC owner.
- **PWG acceptance evidence:** [Post-merge architecture acceptance](https://github.com/anarchitects/anarchitecture-modeling/pull/88#issuecomment-7227170092), reviewed head `b5f69a91d152b60126896b9dcb1962d3f643b30f`.
- **Owning work:** [#83](https://github.com/anarchitects/anarchitecture-modeling/issues/83); dependent implementation/proof [#84](https://github.com/anarchitects/anarchitecture-modeling/issues/84).
- **Relationship:** Refines the admission boundary in accepted [ADR 0001](0001-modeling-foundation-boundaries.md), preserving [ADR 0002](0002-extensible-meta-metamodel-and-governance-metadata.md) and [ADR 0003](0003-semantic-change-comparison.md). No accepted decision is superseded by this decision.

## Problem and verified baseline

Incremental CRUD already exists. `DocumentEdit` and semantic/session preparation
support creation, replacement, removal, rename, properties and constraints. The
missing capability is admitting a bounded incomplete intermediate checkpoint,
then repairing it through the same guarded edit mechanisms.

Research source: `29cb23c8710d79510bf06c26f90c276507b2b7a0`; published baseline:
core/metamodel **0.0.2**, release source `fa82048545613c7f3dcc8b367af9bfc30ef6e448`.
The [baseline reproduction](../../tools/consumer/authoring-baseline.mjs) imports
only installed public roots and package metadata. A fresh isolated registry
consumer on Node 24.22.3 produced these nine observations:

| Operation                                              | Semantic command            | Session command             |
| ------------------------------------------------------ | --------------------------- | --------------------------- |
| Create Customer without its required definition        | `command.invalid-candidate` | `command.invalid-candidate` |
| Add the missing definition to an incomplete original   | `command.not-editable`      | `command.not-editable`      |
| Create Customer with its definition in one atomic edit | `prepared`                  | `prepared`                  |

Additionally, the incomplete model has valid structure and **complete validation
coverage**, but an invalid semantic result; envelope 1 encodes/reopens it as
`invalid`; comparing that snapshot with itself reports `incomplete`.
Encoding recoverable content is already possible and is not edit authorization.

The source also permits a specifically guarded `apply-defaults` session path
from some invalid originals with complete semantic coverage. Its candidate must
still be valid. This is not a general authored-repair path. Exact retry receipts
are checked before ordinary fresh-command admission; replay returns history,
not a newly authorized candidate. Preserve these distinctions.

Relevant current contracts:

- `document-edit-preparation.ts`: original and candidate admission, expected
  revision, exact replay, deletion review and immutable staging.
- `session-commands.ts`: defaults repair, coordinated history and valid-only
  candidates; `document-session-contracts.ts`: `PrepareDocumentResult` explicitly
  promises `assessment.status: 'valid'` for `prepared`.
- `value-validation.ts`: missing required properties are errors; nested required
  fields can use the same diagnostic code. A diagnostic-code allowlist alone is
  therefore not a safe policy classifier.
- `document-codec.ts` and `document-codec-shape.ts`: strict shape/version checks,
  preservation of invalid/unsupported content, and explicit future-version refusal.
- `semantic-comparison.ts`: invalid semantic inputs cannot establish equivalence.

No runtime behavior has been changed or new admission policy tested by this ADR.

## Alternatives

| Option                                                                                | Benefit                                                             | Decision / disposition                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Keep strict commands; prepare fully populated atomic batches or consumer-owned drafts | No Foundation compatibility change; current behavior already works  | Retain as the default and an available consumer choice; does not provide portable partial-checkpoint repair/history |
| Explicit opt-in bounded admission policy using existing staging and guards            | Supports incremental portable authoring with explained deficiencies | **Selected:** an additive authoring contract; requires distinct result, replay and codec treatment                  |
| General staged authoring/workflow engine with arbitrary validation gates              | Could represent broad product workflows                             | Defer; unnecessary for the demonstrated missing-property case and risks absorbing consumer governance               |

The accepted direction admits only a defined class of absent information.
It does not switch off method constraints or substitute a second CRUD engine.
Consumers may add their own lifecycle gates around the bounded mechanism.

## Assessment and admission direction

Keep these facts independent. Terms below describe semantics, not final exported
type names or a selected API signature; #84 must specify those before coding.

| Dimension                     | Required distinction                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Structural integrity          | Valid identities, value shapes, ownership, containment, references and endpoints, versus invalid structure                |
| Assessment coverage           | All applicable pinned definitions/operators understood, versus partial/unavailable coverage                               |
| Semantic satisfaction         | Satisfied; specifically missing but repairable information; actual violations; or unknown because coverage is unavailable |
| Edit admission                | Rejected, or conditionally prepared under the exact selected policy with deficiencies retained                            |
| Consumer lifecycle acceptance | Consumer-authorized review/completion/publication transition; never inferred from preparation or comparison               |

Do not reinterpret existing `semantics: 'complete'`: it means complete assessment
coverage, not a semantically complete or approved model. Existing diagnostics,
their severities and the strict validator's invalid result remain truthful.
The new assessment adds an independently explained admission classification.
An error may be nonblocking for an explicitly permitted draft while remaining
blocking for completion. Never downgrade all errors to warnings.

### Minimum admissible incomplete state

For the first bounded policy version, permit only **absence of a declared,
required, top-level scalar property** on an existing typed element, member or
relationship, explicitly selected by exact type and property identity. Descriptive
definition/owner fields in the synthetic fixture are strings, not principals or
authorization grants. No new governance ontology is installed.

The classifier must inspect the exact definition and actual absence, not just
message text, severity or a diagnostic code. Optional properties need no waiver.
Present null, an empty string or another value is assessed using its definition;
none is silently converted into absence or filled with a placeholder. All supplied
values must satisfy their declared rules. Nested missing fields, list cardinality,
missing mandatory constraint bindings/roles and arbitrary operator failures are
outside the initial allowance and continue to block admission. Expansion requires
a demonstrated use case and a separately reviewed classifier/compatibility change.

Admission requires valid structure, complete supported coverage and valid view,
notation and lifecycle metadata. Every remaining semantic error must be one of
the specifically permitted absences. Block duplicate IDs, malformed values,
dangling/foreign references, invalid endpoints/containment, violated constraints,
missing/incompatible definitions, ambiguous selection, unknown properties and
opaque/unsupported semantics. Do not infer unknown content is harmless because
it was preserved, registered or identical in both snapshots.

Apply this rule to both the original and candidate. It permits repair of a
known incomplete original and incremental edits while explicitly allowed gaps
remain. It does not permit arbitrary repair from structurally invalid, unsupported
or contradictory originals. Such content stays recoverable/read-only until an
independently defined repair/migration path applies. Consumers can still use the
existing defaults-repair path within its established contract.

### Policy identity, applicability and precedence

Supply one trusted, data-only policy definition explicitly. It has an ID,
exact version and policy-contract version; selectors name exact profile,
pack/contract, type kind/type ID and top-level property IDs. No version ranges,
wildcards, ambient registries, arbitrary scripts, callbacks, network or clock input.
Validate the policy and every selector before evaluating a command. Reject
unknown fields, unresolved selectors, contradictory/duplicate entries and changed
definition content under the same selected pin. Registry enumeration cannot choose
a winner. Canonicalize only declared unordered collections and report stable
entity/property locations with the matched policy/definition provenance.

Precedence is fixed: hard invariants and supported coverage first; applicable
method constraints next; the exact allowlist may defer only the classified absence
for draft admission. Unlisted absence rejects. Completion always evaluates all
mandatory requirements without the draft allowance. No layered policy merging,
priority numbers, overrides or conditional constraint language is proposed.
Existing exact pack/type constraint applicability remains authoritative.

The host authorizes policy selection. A policy pin read from a document is a claim
to resolve and authorize, not a permission. Missing/unavailable policy means no
draft admission, not silent strict fallback or an empty allowlist. Policy changes
must be explicit guarded transitions with a fresh coordinated revision; automatic
policy upgrade or an implicit switch on reopen is excluded from the first slice.

## Compatibility and lifecycle consequences

**Use additive entry points and a distinct prepared-result family.** Keep
the signatures, discriminants and valid-only guarantees of existing strict
`DocumentAssessment`, `PrepareDocumentResult`, session APIs and `DocumentCommitPort`
unchanged. An incomplete prepared result must not be assignable to the legacy
valid-only commit port or share an ambiguous success discriminator. Its assessment
retains semantic deficiencies and exact admission evidence. Public root declarations
must prove this separation with compile-time negative cases.

Reuse existing staging, ownership checks, expected-value guards, deletion review,
default plans and history machinery internally. New paths must not append raw
arrays or independently reimplement CRUD. Choose exact public names and structural
types in #84 after architecture acceptance. If a safe additive separation proves
impossible, stop and request an explicit breaking API/migration decision; do not
weaken existing types and call it additive.

### Commands, history and actual commits

- Validate and stage atomically; rejected commands leave input, receipts, baselines
  and live history unchanged. Prepare is not a commit or an authorization check.
- Bind command identity, receipt and prepared evidence to exact policy/definition
  selection. A reused command ID with changed policy or command content conflicts.
  Known replay returns the historical receipt only; never reinstall its checkpoint,
  recreate an undone effect or treat replay as current admission/authorization.
- Retain receipt integrity/capacity rules and replay ordering. New commands require
  current policy availability/authorization and a fresh expected revision, including
  after presentation-only and zero-write changes. A historical receipt may be
  inspected without re-authorizing its effect; it cannot authorize a new write.
- Undo/redo must re-assess the current original and inverse candidate under the
  selected authoring policy. Undoing a completion edit may restore an admitted
  deficiency, not an invalid reference or unsupported state. Review deletions and
  generated/manual conflicts exactly as today; never restore stale whole snapshots.
- Defaults may fill allowed gaps only through existing reviewed plans and origin/
  generated-baseline semantics. No placeholder values, silent defaults or overwrite
  of manual values. Completion remains a fresh assessment, not successful defaulting.
- A distinct host commit adapter atomically rechecks current revision and exact
  admission context with server authorization, then persists candidate plus replay
  evidence together. The host owns failure/rollback, idempotent retry after uncertain
  writes, recovery and audit. A policy match or actor string authenticates nobody.

### Durable draft representation and old readers

The current codec can preserve invalid envelope-1 data, but it cannot express
new policy-bound command/receipt meaning without changing its strict shape.
Use a **separately versioned opt-in authoring envelope**, containing the
existing model-format-2 data plus exact admission context and replay evidence.
Do not add ignored policy fields to envelope 1 or encode a draft as legacy
`prepared` evidence. #84 must settle the exact envelope discriminator, version,
field inventory and bounded resource limits before runtime implementation; this
decision does not allocate a wire version by implication.

Legacy codec and strict command behavior remain unchanged. Old readers must
reject the new envelope as unsupported and retain original bytes; they must not
silently discard admission context. New readers distinguish decode/preservation
from authorized editing, resolve policies from trusted caller input, recompute
assessment and open with empty live undo/redo stacks while retaining receipts.
Unknown policy versions or opaque payloads stay noneditable and recoverable.

No automatic downgrade to envelope 1, stripping of receipts or reinterpretation
of an old invalid checkpoint as an authorized draft. #84 must specify explicit
import of an existing checkpoint, including history continuity, before supporting
it. Completion can be assessed within the new authoring envelope; it does not
implicitly convert its durable format or grant a product lifecycle transition.
A bridge into legacy strict hosts needs a separately reviewed loss/replay analysis.

An additive API can have compatible feature intent under the zero-major policy
while its new opt-in document format is unreadable by old clients. Document both
facts. Nx determines the eventual package version; no version, release or migration
is authorized here. Existing strict consumers must retain their tested behavior.

## Comparator and consumer boundaries

Comparison contract 1 remains read-only and independent of admission policies.
The baseline returns `incomplete` for semantically invalid snapshots, including
identical ones. The authoring path must not make those inputs equivalent
by hiding diagnostics or treating admission as semantic satisfaction. Do not add
policy evaluation to the comparator or alter #77/#78's accepted scope. Any later
comparison of partial models requires its own explicit coverage/version decision.

Foundation owns these generic mechanisms. Method packs own meaning; hosts own
authorized policy selection, approval transitions, persistence, transformation,
collaboration and audit. Blueprint's current evaluation remains separate, as do
Archimatrix host adoption and the installed comparator handoff in #78. No evidence
here requires #79/#80/#81. Do not turn this into a profile-enrichment, external
resolver or assertion-history project.

## Proof requirements for #84 after owner decision

Use an original synthetic Customer/Order pack with exact definitions, profiles,
policies and rules. Definition and descriptive owner properties must actually be
required, not made optional to make the fixture pass.

1. Under the default strict path, reproduce the baseline failures and successful
   fully populated atomic batch. Preserve all historical command/default/replay
   behavior, including the existing bounded defaults repair.
2. Under the explicitly selected draft policy: create Customer without selected
   required metadata; add its definition and owner; create/enrich Order; create a
   valid relationship. Include an addressable member and rename with stable IDs.
   Record every revision, admitted deficiency and completion assessment.
3. Show repair from an admitted incomplete original, deliberate permitted removal
   of a previously supplied property, and successful strict completion only after
   every mandatory requirement is satisfied. A denied lifecycle transition changes
   no state; complete semantics alone never means owner approval.
4. Reject all hard-invariant, unsupported and non-allowlisted cases above, including
   nested required fields sharing the same diagnostic code, wrong present values,
   missing mandatory constraints, unavailable policy, altered same-pin definitions,
   unauthorized host selection, ambiguous policy and stale revision.
5. Prove deterministic results under input enumeration, no mutation, overlapping
   edit guards, reviewed deletion, coordinated views, zero-write revisions, bounded
   defaults, undo/redo across incomplete/complete states and manual-value protection.
6. Exercise exact retry before/after reopen, changed-policy/content ID conflicts,
   receipt/history capacity, host conflict/failure/recovery without partial adoption,
   unsupported bytes and no silent policy migration. Separate library proofs from
   any simulated adapter versus actual product persistence evidence.
7. Prove codec/new-old reader behavior and compile-time rejection by the legacy
   commit port. Record the exact API/serialization compatibility decision before
   implementation, then public-root runtime/type/negative archive proofs. After
   separate publication authorization, repeat on exact registry versions.

## Research reproduction and decision gate

Copy the baseline script into a new directory outside the workspace and run it
with Node 24 after installing the exact published pair and `tslib@2.9.1` there:

```sh
npm install --ignore-scripts --save-exact @anarchitects/modeling-core@0.0.2 @anarchitects/modeling-metamodel@0.0.2 tslib@2.9.1
node authoring-baseline.mjs
```

The executed research used empty npm configuration, a disposable home/cache and
no workspace resolution. It proves the nine current-behavior observations above,
not the unimplemented authoring policy. Existing release integrity/provenance evidence is in
the [0.0.2 release record](../consumer/release-notes.md).

Governance was revalidated at Meta `main`
`2c3be7d9a0e1a80cd840b3644962cb23f0a69184`, reusing the session's unchanged complete
review. Accepted ownership/contracts, independent versioning, SDLC/owner authority,
upstream-first reuse and public-consumer boundaries apply; proposed governance
additions remain proposed. Local ADRs 0001–0003 and resolved two-package Nx graph
were reviewed. Archimatrix source/accepted extraction evidence was refreshed at
`32aaaf29cd8414225ce92f861c1510aa5c13d9c2`; Blueprint policy/consumer context at
`55aa059946d7d1a5b31f23c3e106e36f3dc14c2d` preserves its standalone/proprietary boundary.
The consumer revision update concerns tooling/security; ADRs 0001/0016/0017 and
the relevant adoption-evaluation requirements remain unchanged.
No confidential source is copied, new runtime dependency introduced or ownership
transferred. The source assessment found no prerequisite blocking this bounded architecture decision.

## Capability-owner acceptance — 27 November 2026

Johan explicitly accepted this ADR in the working session: “as Capability owner
I accept ADR-0004.” This accepts the bounded direction, exclusions and proof
requirements above, including strict behavior by default and additive opt-in
admission of specifically allowed missing information.

At the time of Johan's decision, PWG's ecosystem architecture review was pending.
That historical status is superseded by the later acceptance below, not backdated.
Neither Johan's architecture acceptance nor the nine baseline observations is
implementation acceptance, release authorization or consumer adoption.

## PWG architecture acceptance — 28 November 2026 (Australia/Sydney)

PWG (`pwgconsulting`) accepted **architecture direction only** in the
[post-merge comment on #88](https://github.com/anarchitects/anarchitecture-modeling/pull/88#issuecomment-7227170092).
The sequence is:

| Event                               | Recorded time / evidence                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Johan's capability-owner acceptance | 27 November 2026; [#83 decision record](https://github.com/anarchitects/anarchitecture-modeling/issues/83#issuecomment-7211500965) |
| Johan merged #88                    | `2026-11-27T16:03:40Z` / 28 November, 03:03:40 AEDT; merge `d1a2a50fc74b073538c2c88e5bdd52c590e1c1b7`                              |
| PWG posted architecture acceptance  | `2026-11-27T20:05:47Z` / 28 November, 07:05:47 AEDT; reviewed head `b5f69a91d152b60126896b9dcb1962d3f643b30f`                      |

Reviewed head and merge have the same Git tree,
`da8ad4a253e932dfd75edf666923bc92db84d0dd`. This is a post-merge acceptance
comment, not a pre-merge APPROVED review. PWG performed no merge. #83 retains
the architecture decision and chronology; earlier pending-review comments remain
historical evidence.

Strict editing remains the default. Draft admission permits only explicitly
selected absent required top-level scalar properties. Structural, reference and
lifecycle integrity, complete supported coverage, present-value rules and violated
constraints remain blocking. Admission does not establish semantic validity,
authentication or lifecycle approval. Foundation, method and host responsibilities
and comparison contract 1 / #77/#78 remain unchanged.

All #84 gates above remain requirements: settle concrete API/result, exact policy
and versioned-envelope/compatibility/resource-limit contracts before coding; then
prove strict regressions, negative classifier and type cases, legacy commit-port
separation, old/new readers, replay/reopen/undo, and atomic host revision/context
checks, persistence, failure and recovery. The nine baseline observations prove
only the earlier behavior. A simulated host proof does not establish actual
product persistence. If additive compatibility cannot be maintained, stop for an
explicit breaking API/migration decision.

The separate [#84 outcome acceptance](https://github.com/anarchitects/anarchitecture-modeling/issues/84#issuecomment-7225638664)
and [0.0.3 publication record](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7224973673)
retain their own authority, dates, candidate and evidence limits. They are not
accepted or authorized by PWG's architecture comment. Implementation acceptance,
exact-candidate release/publication authorization, actual distribution verification
and consumer adoption remain separate outcomes.

This acceptance authorizes no publication, release or Archimatrix/Blueprint
adoption. Blueprint Foundation **DEFER**, stopped integration/proof gates, all
existing exception conditions and the **30 November 2026 23:59:59 AEDT /
12:59:59Z** expiry remain unchanged, without renewal.
