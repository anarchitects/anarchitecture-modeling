# Hub defaulting and upgrade conflict proofs — Archimatrix #21

> Historical contract proof adapted from [Archimatrix #21](https://github.com/anarchitects/archimatrix/issues/21) / [PR #30](https://github.com/anarchitects/archimatrix/pull/30).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/vault-defaulting-and-upgrades.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

The original synthetic [vault fixture](../../packages/modeling-metamodel/src/lib/vault-proof.spec.ts)
exercises ADR 0002 proof cases **5 and 7** through Foundation public entry points.
Its method definitions and upgrade-report adapter live entirely in an excluded
`*.spec.ts` file. No runtime/public API, model-format, dependency or product feature
changes were required.

## Configured hub definitions, not data execution

An explicitly selected `hub-proof@1` profile selects `vault-fixture@1`, contract
`1`. Its `dv:hub-defaults@1` rule uses `foundation:defaults@1` to propose:

| Stable output key | Definition            | Fixture-owned intent                                                                                                       |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `dv:business-key` | Customer business key | Text field carrying a reviewed business identifier.                                                                        |
| `dv:hash-key`     | Customer hash key     | A structured derivation referring to the business-key member, with `sha256-intent`, `trim` and `definition-only` metadata. |
| `dv:load-date`    | Loaded at             | An `external-load-time` timestamp definition.                                                                              |

The hub type is already assigned in the input snapshot. Assignment/profile
selection is an explicit fixture setup step, not an automatic trigger or new
editing command. The rule's exact subject type controls applicability: applying
it to the synthetic satellite type is rejected. A separately registered rule
variation changes the business-key field name while retaining the same output
identity. Core contains no hub/satellite switch or universal Data Vault field set.

Generated member IDs depend on model, subject, pack, rule and stable output key;
versions remain in provenance. Model, source-decision, pack, profile, rule and
operator versions are distinct. A hash definition references another proposed
member, so application must validate the complete candidate, including when the
referenced member is added later in operation order.

Initial application returns three member definitions and generated baselines.
Repeated identical proposals are equal; receipt-backed retry preserves the current
state and adds no duplicates. Fresh regeneration over unchanged definitions makes
no member writes, while advancing the snapshot revision and recording its receipt.
No business data, hash bytes, load timestamp or external artifact is produced.

## Human edits and explicit conflict resolution

The fixture makes a manual hash-description edit through a separate authored
`set-property` plan with an expected value and fresh revision. Regenerating the
unchanged template yields `preserve-override`; replaying the original generation
receipt also preserves the edit.

A new rule version `1.1` proposes a different hash description under the same pack
and profile. The generated baseline, current human description and proposed
replacement are returned as explicit conflict evidence. No plan is returned for
that conflicting proposal. The test then simulates a separately reviewed authored
`update-member` resolution, guarded by the current member value. Regeneration
reports convergence, performs no further member write and updates the baseline to
the reviewed rule version. Other resolutions are possible; the engine does not
choose business intent or silently reset a whole model.

Negative evidence includes stale unrecorded plans, plan-ID reuse with a changed
source decision, invalid derivation references, two-rule cycles, declared
incompatible rules and an unsupported executable hash operator. Invalid candidates
leave the model, revision, baselines and receipts unchanged. Both proposal and
application reject cyclic/incompatible rule batches.

## One pinned upgrade preview

The fixture-only report adapter examines this bounded source/target pair:

| Identity                | Source                          | Proposed target                 |
| ----------------------- | ------------------------------- | ------------------------------- |
| Profile                 | `hub-proof@1`                   | `hub-proof@2`                   |
| Pack                    | `vault-fixture@1`, contract `1` | `vault-fixture@2`, contract `1` |
| Rule                    | `dv:hub-defaults@1`             | `dv:hub-defaults@2`             |
| Operator                | `foundation:defaults@1`         | `foundation:defaults@1`         |
| Expected model revision | Exact current source revision   | No target revision is applied.  |

Version 2 keeps business-key identity, changes hash normalization from `trim` to
`trim-uppercase`, and stops proposing the load-date output. The adapter uses the
public proposal comparison results to retain source/target member traces and full
baseline/current/proposed evidence. It reports:

- Potential information loss: retiring the load-date member would lose its modeled
  definition and load-time intent. The source member remains present.
- Ambiguity: changed normalization may merge previously distinct identifiers or
  change derived-hash meaning. No data is evaluated and no collision is measured.
- Conflicts: retiring prior generated output produces `plan.retired-output`;
  an intervening manual hash edit additionally produces `plan.manual-conflict`.

The report is deterministic, `review-required` and **not applicable**. It contains
no application plan and does not rewrite the source profile, members or baselines.
Source and target member IDs are equal only for explicitly retained outputs; the
retired load-date trace has no target. There is no inferred conversion between
unrelated languages or an ArchiMate DataObject and a Blueprint entity.

The adapter is deliberately limited to the known v1 hub and its three generated
member baselines. It rejects stale revisions, incompatible profile/version inputs,
invalid source references, missing target packs and extra/unaccounted source
content or baselines rather than reporting a deceptively complete impact analysis.
It is test code, not an imported-data parser or general upgrade planner.

Proposal can compare target templates against source state without claiming the
result is an applicable migration. A separate non-destructive v2 variant retains
the load-date output; attempting to apply its member writes to the original v1
profile fails with `validation.profile-mismatch`, leaving everything unchanged.
The bounded change contract has no profile-switch operation. A future migration
contract must separately cover source/target validation, review, persistence and
loss decisions; relabeling an existing model is not implemented migration support.

## Proven operators and limits

The only defaulting operator used is `foundation:defaults@1`. This proof exercises
`add-member`, `set-property` and `update-member` through complete-candidate
validation, receipt replay and baseline comparisons. Deletion, profile switching,
type/owner conversion, arbitrary scripts and hash execution remain unsupported.
Inverse records are change metadata for future semantic undo, not a working undo
stack or an instruction to restore an old document.

Schema validity does not establish Data Vault conformance, hash correctness,
business-key uniqueness, canonicalization safety, load behavior, or the presence
of every field a real method needs. The empty configured hub is representable
before default application; these schemas do not install production mandatory-field
method rules. The example is one chosen hub variation, not a prescription for all
hubs, links or satellites. Whole-member conflict comparison remains conservative.

Atomicity is in-memory only. #9 owns decoding, persisted sidecars/receipts, durable
compare-and-swap and semantic undo. #22 consumes this evidence for the integrated
gate. No Blueprint dependency, ETL engine, hash implementation or production
method support is added. Johan accepted the bounded #21 choices when requesting closure on 11 November
2026; the assembled #8 outcome still awaits acceptance.
