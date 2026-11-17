# Relational and multi-source contract proofs — Archimatrix #19

> Historical contract proof adapted from [Archimatrix #19](https://github.com/anarchitects/archimatrix/issues/19) / [PR #28](https://github.com/anarchitects/archimatrix/pull/28).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/relational-and-mapping.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

These original synthetic fixtures exercise ADR 0002 proof cases **2 and 3** through
Foundation public entry points. They live entirely in `*.spec.ts`, which the
library build excludes. They introduce no production method pack, public export,
model-format change, dependency or extension command.

| ADR case                  | Executable source                                                                              | Bounded evidence                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2 — composite constraints | [relational-proof.spec.ts](../../packages/modeling-metamodel/src/lib/relational-proof.spec.ts) | Stable member identities; one ordered composite candidate-key group; one functional-dependency declaration with determinant/dependent sets; all dependent constraint locations survive deletion. |
| 3 — joint mapping         | [mapping-proof.spec.ts](../../packages/modeling-metamodel/src/lib/mapping-proof.spec.ts)       | Two explicitly versioned source observations; one transformation with named inputs/output, joint expressions, precedence, trace mappings, assumptions, provenance and an omitted-field report.   |

## Relational intent

The synthetic Customer table has Tenant, Customer number, Display name and Email
members. The candidate key is the **single ordered group** `[Tenant, Customer
number]`. The declared functional dependency is the **pair of sets**
`{Tenant, Customer number} -> {Display name, Email}`. It is not stored as independent
key flags or flattened field-to-field edges.

The test-owned pack pins separate key-group and dependency-group rules to
`foundation:member-group@1`. That operator checks role cardinality, distinctness,
member types and ownership. Both constraints are mandatory on the table. Renaming
Customer number and reordering the member collection retain all references.
Deleting that member leaves both constraints intact and reports each dependent
reference with its constraint/rule provenance and exact role/member path.

Key order is preserved as authored. Dependency roles declare unordered semantics;
the stored arrays are retained rather than silently canonicalized. The fixture
compares their member sets explicitly. Duplicate, empty and foreign-owner groups,
as well as silently omitting the required dependency, fail.

This is **3NF-style modeled intent**, not proof of 3NF. No row data establishes
uniqueness, key minimality, functional-dependency truth, dependency closure,
decomposition, lossless joins or normalization. A hypothetical normalization
operator stays `unsupported` even if the member groups have valid shapes.

## One transformation with joint meaning

The sources are local representations of two synthetic observations:

| Role      | Stable source identity      | Snapshot     | Precedence |
| --------- | --------------------------- | ------------ | ---------- |
| primary   | `synthetic:crm/customer`    | `crm-7`      | 1          |
| secondary | `synthetic:support/account` | `support-12` | 2          |

Each source element records its external identity and revision; its fields carry
separate stable source-field identifiers. Model revision, source snapshot revision
and review-decision revision are distinct. References remain local to the model;
there is no external loader or cross-model reference resolution.

A single `map:transformation` element owns a schema-defined `map:intent` record:

- Named input structures with exact source identities/revisions and precedence;
  one `business-concept` output structure.
- One joint `equal` expression over the primary and secondary identifier fields,
  declaring `null-does-not-match`.
- Two stable trace mappings (`trace:customer-id` and `trace:customer-name`) to
  output members. Each records a `first-non-null` expression with role-labeled
  ordered operands and `all-null-is-error` policy.
- Assumptions about a shared identifier namespace and source-side uniqueness;
  author, decision identity, decision revision and fixture rule version.
- The unmapped Support email member, retained in the source with an explicit
  reason: it is not approved as a customer address.
- A name-disagreement ambiguity tied to the target member. The declared policy
  prefers CRM and requires a future executor to retain the disagreement.

These finite expression tags and references are **data only**. There is no SQL,
script, expression evaluator, connector or load job. The example contains no
binary mapping edges: splitting the two inputs into unrelated edges would lose
the shared join, operand ordering, assumptions and target decision.

## Validation boundary and negative evidence

`validateModel` checks the encoded intent using the test-owned schemas and public
Foundation reference validation. It rejects dangling nested references, wrong
member types, unsupported expression/null-policy values and a one-source shape.
Deleting the CRM identifier exposes both its join and mapping references.

The **fixture-only inspector** first requires a valid Foundation result, then checks
cross-field obligations for this specific example: source pins match observations,
input identities/roles are distinct, precedence is explicit and untied, operands
belong to their named sources and retain both roles, operand order matches
precedence, targets belong to the output, trace IDs/targets are unique, and every
source/output field has a disposition. It emits locatable `fixture.*` diagnostics
with exact test pack/rule/operator provenance. It is not registered as a production
Foundation validator and is not a reusable mapping engine.

Negative examples deliberately remain schema-valid while failing that inspector:
stale source revisions/identities, duplicate roles or precedence, reversed operands,
wrong output ownership and unaccounted fields. This demonstrates why schema
validity alone must not be presented as mapping approval. Unmapped information and
name ambiguity remain explicit **warnings**, including in the positive fixture;
no absence-of-errors result resolves their business meaning.

Renaming/reordering source entities and members preserves the encoded intent,
source IDs, trace IDs and references. Input collection order does not override
explicit precedence. The data-only JSON round trip checks preservation of this
fixture, not a supported storage codec or migration path.

## Refinements and handoff

No kernel or public contract refinement was needed: addressable members, grouped
constraint bindings, structured values and pack-owned schemas preserve these
examples. The transformation is an ordinary pack-defined element; a general
hyperedge or runtime transformation type is not selected.

A future production method needs its own reviewed validators, expression contracts
and compatibility tests. In particular, Foundation `status: valid` for this pack
covers its declared schemas and supported group rules, not inferred relational or
mapping correctness. Fixture inspection does not prove join cardinality, data
quality, actual null/coalescing behavior, preservation of disagreements, ETL
correctness or source freshness beyond the supplied observations. No real data or
external system was queried.

#22 consumes these fixtures for the integrated acceptance gate. #9 still owns
safe file decoding, sidecar serialization, persistence and undo. Any public API,
Blueprint adoption, method support or execution capability remains a separate
owner-reviewed outcome. Johan accepted the bounded #19 choices on 11 November 2026
when closing the issue.
