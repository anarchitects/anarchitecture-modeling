# Dimensional and Medallion contract proofs — Archimatrix #20

> Historical contract proof adapted from [Archimatrix #20](https://github.com/anarchitects/archimatrix/issues/20) / [PR #29](https://github.com/anarchitects/archimatrix/pull/29).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/dimensions-and-medallion.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

These original synthetic fixtures exercise ADR 0002 proof cases **4 and 6** through
Foundation public entry points. Both method definitions and policy choices are
test-owned. The `*.spec.ts` files are excluded from library output; no runtime API,
method pack, dependency, model-format change or editor command is introduced.

| ADR case                               | Executable source                                                                                | Bounded evidence                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 — role-playing dimension             | [dimensional-proof.spec.ts](../../packages/modeling-metamodel/src/lib/dimensional-proof.spec.ts) | Explicit fact grain; separate stable role/member and constraint identities for Order date and Ship date, both referring to one Date dimension; measure and history policy metadata. |
| 6 — composable processing architecture | [medallion-proof.spec.ts](../../packages/modeling-metamodel/src/lib/medallion-proof.spec.ts)     | A normalized-style dataset in a Silver layer with five independent profile selections, mandatory method/quality groups, policy intent and unsupported opaque extension data.        |

## One Date dimension, two independently addressable roles

The fixture fact represents **one row per order line**. Its required grain group
contains the stable Order ID and Line ID members. Two further fact-owned members,
`role:ordered-on` and `role:shipped-on`, reference the same Date element. They have
separate names, IDs, pack-owned role types and mandatory constraint definitions.
A role is not a cloned dimension, scalar label or diagram occurrence.

The finite test pack uses distinct Order-date and Ship-date member types so one
cannot satisfy the other's required constraint. Each constraint binds its role
member through `foundation:member-group@1`, preserving the existing operator's
ownership boundary: roles belong to the constrained fact; the dimension reference
is a schema-checked property on each role. This proves one representation for the
example, not a general role-inheritance or dynamic role-definition API.

Renaming/reordering fact members or the Date element preserves references and
constraint identities. Removing Order date reports its specific constraint and
leaves Ship date intact. Deleting the shared Date element reports both role
references. Omitting either constraint, substituting a role of the wrong type,
referencing a fact instead of a dimension, omitting the grain statement or
repeating a grain member fails visibly.

A Net amount member records `sum`, unit `EUR`, and an
`immutable-transaction-amount` history policy. Date records
`overwrite-calendar-labels`; both roles declare `reject-row` for a missing date.
These are representative, explicitly selected **fixture policies**, not universal
Kimball requirements. Missing or unsupported policy metadata is diagnosed. No
amounts, aggregate queries, dates, dimension history or reject-row logic are
executed. Group shape and ownership do not establish grain uniqueness, dimensional
conformance, additivity, currency correctness or historical behavior.

## Five dimensions remain separate

All pack/contract versions are pinned to `1` in this synthetic example:

| Profile dimension       | Selected pack          | Responsibility                                                                                   |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| abstraction             | `logical-abstraction`  | Declares the logical perspective; does not install method rules.                                 |
| method                  | `normalized-method`    | Defines a table, independently addressable key field and required key-member group.              |
| processing-architecture | `medallion-processing` | Defines the Silver layer, dataset membership, quality-check member and processing policy intent. |
| provenance              | `observed-provenance`  | Records a source identity and `snapshot-7` for the dataset as an unapproved observation.         |
| target                  | `declared-target`      | Describes required snapshot-read/atomic-write capabilities with `declared-not-probed` status.    |

The table remains `norm:table`; selecting Silver does not transform its method or
imply normalized correctness. Layer membership is an explicit dataset reference,
separate from semantic containment. The logical abstraction pack is a profile
selection, not an extra domain object. Provenance and target declarations occupy
their own schemas and records, rather than an overloaded `modelType` enum.

The processing/provenance packs explicitly require the exact normalized pack used
by their references. This demonstrates compatible composition for this fixture;
it does not promise that this Silver definition can consume every normalized or
vault pack. Missing or incompatible versions fail rather than falling back to
another method. Assigning the layer pack to the method dimension also fails.

Reversing both selection and registry order yields the same canonical composition
and leaves method definitions unchanged. Canonical order is not override priority.
The existing one-selection-per-dimension, exact dependency and collision-rejection
policies are sufficient; no inheritance, multiple-method selection or implicit
policy merge was needed.

## Policy intent is not execution

The Silver layer declares:

- Responsibility: validated/conformed observations.
- Quality: a required, independently addressable check referring to the dataset
  and its key field, with `required-field-present` and `quarantine` intent.
- Promotion: `owner-review-required`.
- Retention: 90 days, an original fixture choice.
- Replay: `pinned-source-snapshot`.
- Execution status: `intent-only`.

The method's key group and processing pack's quality group remain independently
mandatory. Omission of either binding fails. A processing definition that attempts
to redefine the mandatory method constraint as optional fails with a
`duplicate-definition` diagnostic naming the constraint, in either input order.
An explicitly declared target/processing conflict also fails; no winning pack is
chosen. These are manifest-level composition checks, not an inference engine for
arbitrary contradictory business policies.

Missing promotion/retention/replay properties, unknown policy values, dangling
dataset/quality references and missing required groups are negative evidence.
Validation leaves the model and revision untouched. It does not run quality checks,
quarantine rows, grant approval, promote data, expire records, replay a snapshot,
probe infrastructure or establish that target capabilities actually exist.

## Unknown extensions remain unsupported

A synthetic vendor evidence envelope accompanies the otherwise valid model. Its
unknown payload is retained by object identity and remains unchanged; validation
reports `status: unsupported`, valid structure and partial semantic coverage. A
payload getter that throws is never invoked. Even registering the envelope's
exact extension ID/version reports only registration availability; payload
semantics remain unvalidated and the model verdict remains unsupported.

This proves in-memory preservation and honest coverage reporting. It does not
supply a safe import parser, persistence codec, payload validator or vendor
integration. #9 still owns safe decoding, sidecar storage and migration.

## Decisions and limits

No kernel or public-contract refinement was required. Fixture-owned member types,
constraint bindings, structured properties and exact additive profiles preserve
these examples. Shape/schema validation is deliberately distinguished from method
meaning and processing execution. The core member-group operator remains generic;
no dimensional, Medallion, normalization or policy runtime code was added.

The fixtures do not certify Kimball or Medallion, implement a dimensional
warehouse, prove normalization, or validate real source data. Cross-field policy
relationships beyond declared schemas/groups (for example, that a quality field
belongs to the exact dataset named alongside it) still require a future reviewed
method validator. Naming a policy or a source revision does not enforce its
semantics. These proofs establish representation and the specific rejection cases
above, not universal method conformance.

#22 consumes this evidence for the integrated acceptance gate. Product method
support, richer role composition, public extraction and Blueprint adoption remain
separate owner-reviewed outcomes. Johan accepted the bounded #20 choices on
11 November 2026 when closing the issue.
