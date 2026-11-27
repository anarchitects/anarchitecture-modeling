# Bounded incremental authoring — contract and proof

Implements [#84](https://github.com/anarchitects/anarchitecture-modeling/issues/84)
under accepted [ADR 0004](../adr/0004-incremental-authoring-and-admission-policies.md),
merged in PR #88. Contract choices below are recorded before runtime implementation.

## Contract 1

- `AuthoringPolicy` has `contractVersion: '1'`, an exact ID/version, an exact
  profile ID/version and unordered `allowMissing` selectors. Each selector names
  one exact `TypeReference` and one required top-level scalar property. All
  selectors must resolve, including those with no current instances. Unknown
  fields, duplicates, unsupported versions and optional/non-scalar selectors fail.
- `AuthoringBinding` retains the canonical policy and `definitionKey`: canonical
  data for the selected profile/packs and supplied rule/default/notation/theme
  context. This is equality evidence, not a hash, signature or authorization.
  Only explicitly unordered collections are sorted. Definition content changes
  under unchanged pins reject fresh commands. Hosts supply and authorize trusted
  policy/context independently of persisted claims.
- `AuthoringCheckpoint` wraps `document: DocumentCheckpoint`, `binding`, and
  `importCommandId`. Import uses an explicit, guarded empty edit with a fresh
  revision and retains the legacy receipt chain. The import receipt marks the
  first transaction under the immutable binding. No implicit policy switch,
  migration, downgrade or receipt removal is supported.
- `AuthoringSession` wraps this checkpoint and existing bounded live history.
  `AuthoringCommand` contains `command: DocumentCommand` and the exact `binding`.
  `prepareAuthoringCommand` supports existing edits, coordinated views, defaults,
  undo and redo through the shared internal transaction engine. `prepareAuthoringImport`
  is the explicit entry from legacy checkpoints. Reopen has empty live history.
- `assessAuthoringCheckpoint` returns truthful `DocumentAssessment` separately
  from `admission: 'complete' | 'incomplete' | 'blocked'`, with stable
  entity/property deficiencies and policy/type provenance. Completion requires
  ordinary strict validity. It is never product approval.
- Success is `status: 'authoring-prepared'`, with a distinct
  `AuthoringCommitPort`. It cannot satisfy the existing valid-only commit types.
  Hosts atomically recheck expected revision, binding and authorization and persist
  the checkpoint plus receipts together. Library preparation performs no I/O.
  Exact replay returns historical evidence only, even after undo/reopen; it does
  not install a snapshot or authorize an effect. Binding/content changes conflict.
- Defaults reuse the existing reviewed-plan, baseline and manual-value guards.
  The authoring engine alone admits a partially completed candidate; public
  `applyChangePlan` and strict session behavior retain their existing guarantees.

## Wire contract

`format: 'anarchitects-authoring-document'`, `envelopeVersion: 1`, and
`checkpoint: AuthoringCheckpoint` form a separate envelope. Embedded semantic
data remains format 2, with unchanged legacy receipt shapes. Outer unknown fields
are rejected; unknown format/version or unsupported policy remain recoverable.
Decode preserves caller bytes, uses the existing strict JSON and document codec
checks, recomputes assessment using caller-owned context, and grants no permission.
The binding's policy is never installed as a trusted definition. Unknown policy
contracts return an unsupported-format refusal with original bytes retained;
known policies unavailable in the caller context decode as noneditable sessions.

Existing `DOCUMENT_CODEC_LIMITS` apply to the whole authoring envelope, including
binding data: 4 MiB, depth 64, 50,000 nodes, collection 1,000, string 65,536,
1,000 entities, 2,000 occurrences and 256 durable receipts. Callers may lower
limits. Typed preparation retains existing configurable history/receipt limits;
encoding can reject an in-memory result that exceeds the durable budget.

Legacy readers reject the new format and retain original bytes. Complete models
remain authoring documents; no automatic conversion to envelope 1 is provided.
Existing comparison contract 1 remains unchanged, including its incomplete result
for semantically invalid drafts. No new core dependency or runtime dependency.

## Verification and release

The synthetic fixture covers Customer/Order, descriptive definition/owner fields,
members, relationships, strict regressions, repair/completion, negative admission,
revision/replay/history/default guards, codec recovery and host compare-and-swap.
Public exports and independent installed archive runtime/type proofs are required.
Executed results are recorded below. This compatible opt-in feature uses
normal `feat(modeling-metamodel)` intent; Nx determines any later zero-major patch.
Versions are unchanged during implementation. Registry proof follows a separately
authorized publication; source/archive evidence does not claim registry availability.

## Executed local evidence — 27 November 2026

Implementation baseline: merged PR #88, `d1a2a50fc74b073538c2c88e5bdd52c590e1c1b7`.
Evidence was captured on `feature/84-incremental-authoring` before commit.
The implementation PR identifies the final reviewed source revision.

- The two-package Nx build/test/lint/typecheck run passed; core had 24 tests and
  metamodel 1,224, including **14 authoring tests**. Lint completed without warnings.
- The unchanged historical suite passed **1,183 cases** through built public
  exports. No historical fixture expectations were weakened.
- Boundary checks passed **111 cases** and verified the 48-module source/JS/type
  inventory. New modules are original work; core, validation, comparison and the
  legacy codec are unchanged. Public-export expectations include the additive API.
- All **98 release/publishing tooling tests** passed, including staged README,
  offline resources, wrong-package/stale-content and installation checks.
- `authoring-contract-check` passed from fresh private working-tree archives in
  an isolated npm consumer. It used consumer-installed TypeScript with strict
  NodeNext/Node16, repeated after lockfile reinstall, and exercised both staged
  README examples, the authoring example and compile-time legacy-port rejection.
- An independently installed actual registry core/metamodel **0.0.2** reader
  rejected the new authoring envelope and preserved the original byte array.

The retained local report is in the session's `foundation-authoring-proof-NxOjeL`
archive evidence directory: source baseline and runtime-baseline hash, fixture hash,
archive versions/digests, README digests, installed lockfile and old-reader lockfile.
These private test archives retain source manifest versions and are explicitly
**unpublished working-tree artifacts**, not new registry releases or final release
candidates. The first network-isolated attempt failed DNS; the credential-free
network-enabled proof then passed.

The host commit test is a simulation of authorization denial, failure, compare-and-
swap and uncertain-write replay; it is not evidence of a real product database.
Final owner acceptance and an authorized release/actual new-registry repeat remain
separate. No consumer adoption, tag, publication or GitHub state change occurred.

## Governance and documentation review

Meta `main` revalidated at `f025f9e8c3a480de6cecbc5dfe61fc4b550c8e20`.
The complete prior source review was reused for unchanged files, the nontruncated
31-ADR inventory verified, and changed release controls plus ADR-0028 reviewed.
Accepted ownership, contract, versioning, dependency, SDLC and public-consumer
boundaries remain applicable. Local ADRs 0001–0004 govern this implementation.
Johan owns capability outcome/compatibility. PWG's review was pending when this
implementation evidence was recorded; its later architecture-only acceptance is
recorded below. No policy exception,
new runtime dependency or ownership change is introduced.

Archimatrix remains at `32aaaf29cd8414225ce92f861c1510aa5c13d9c2`; accepted
extraction direction was refreshed. Blueprint at
`f2734a1fd13859ec01cd087e106e6fda21325576` changes identity proof material, not
the reviewed consumer boundary. Private context stays outside this repository.

At Johan's request, ADR-0024 was reread and both package READMEs rewritten around
consumer installation and useful examples. Incidental package/tool versions and
contributor archive setup were removed from public usage instructions. Necessary
runtime/format pins and release-specific compatibility records remain. Staged
documentation uses the normal transformation and was verified in installed
archives; future public links for uncommitted files and registry landing-page
updates cannot be certified before commit/publication.

## Subsequent acceptance records — 27 November 2026 UTC

The local evidence above remains a dated pre-publication snapshot. The
[0.0.3 publication and actual-registry verification record](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7224973673)
was posted at `17:57:53Z`, and [Johan's #84 outcome acceptance](https://github.com/anarchitects/anarchitecture-modeling/issues/84#issuecomment-7225638664)
at `18:34:53Z`. Those records retain their separate authority and evidence scope;
the source suite, installed-archive checks and narrower registry example are not
interchangeable. Host authorization/atomic persistence/failure/recovery simulation
still does not prove a real product database or consumer adoption.

PWG's [architecture-only acceptance of #88](https://github.com/anarchitects/anarchitecture-modeling/pull/88#issuecomment-7227170092)
followed at `20:05:47Z` (28 November, 07:05:47 AEDT), after #88's merge at
`16:03:40Z`. [ADR 0004](../adr/0004-incremental-authoring-and-admission-policies.md#pwg-architecture-acceptance--28-november-2026-australiasydney)
records the reviewed/merged tree identity and chronology. This is not a pre-merge
approval or retrospective acceptance of implementation or publication. It leaves
#84's contract/proof requirements, strict defaults, comparator #77/#78 and
ownership boundaries intact. Blueprint DEFER, stopped integration/proof gates,
all exception conditions and the 30 November 2026 23:59:59 AEDT / 12:59:59Z expiry
remain unchanged, without renewal.
