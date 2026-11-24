# ADR 0003 — Bounded semantic model comparison

- Status: Proposed; no implementation or API acceptance.
- Date: 2026-11-23.
- Decision authority: Johan, Modeling Foundation capability owner; PWG requested as architecture reviewer.
- Principles: [AP-07 and AP-08](../architecture-principles.md).
- Refines: [ADR 0001](0001-modeling-foundation-boundaries.md); preserves [ADR 0002](0002-extensible-meta-metamodel-and-governance-metadata.md). Supersedes none.

## Existing decision and precise gap

ADR 0001 already accepts stable identities, guarded changes, semantic/view separation, and one coordinated revision for semantic content, views, baselines and receipts. View-only and even successful zero-write transactions may advance that revision. Existing generated-baseline comparison is bounded to supported regeneration operations. ADR 0002 distinguishes provenance, concurrency revisions, durable history and audit.

Neither accepted record defines a general, coverage-aware comparison of two model snapshots. The [public API inventory](../consumer/api.md) at `721620c172e3fbb2fd1edc0699e483a310c296f6` lists no general snapshot comparator. A textual export diff or unequal revision tokens cannot fill that semantic contract gap. AP-08 needs no replacement identity decision.

## Proposed addition

1. Compare two explicitly supplied, trusted model snapshots using exact definition/profile/rule versions and an explicit comparison scope. The operation is deterministic, read-only and free of file, Git, network, clock and product-policy dependencies.
2. Match supported entities by existing stable, scoped identities. A supported rename is a change to the same entity; deletion and creation are not silently treated as a rename based on a display name. Different model identities require an explicit, caller-supplied reconciliation contract before claiming equivalence; automatic matching is outside this ADR.
3. Report supported additions, removals and changes with model/entity/member locations, before/after meaning and comparison coverage. Compare constraints, types, references and ordered values according to their declared semantics. Normalize only representations whose order/encoding is explicitly non-semantic; do not sort every list or normalize case indiscriminately.
4. Separate semantic changes from view geometry, formatting, serialization order and operational receipt/history changes. A semantic result does not suppress those changes in a caller's separate presentation or concurrency record. Definitions and governance metadata that carry model meaning remain in semantic scope; classify fields explicitly rather than discarding all metadata.
5. Distinguish **equivalent for the declared supported scope**, **semantic differences**, and **incomplete/incompatible comparison**. Unsupported extensions, missing definitions and incompatible profile/schema versions must not produce a false no-change result. Preserved opaque content is not semantically verified. A profile upgrade requires an explicit compatible comparison/migration rule, not silent coercion.
6. Keep model identity and optimistic concurrency independent from semantic equality. Preserve the accepted coordinated revision contract; a semantic digest must never replace its expected-revision guard. A non-semantic edit can still make a pending write stale.
7. Products decide business impact, approvals, regeneration and deployment. Foundation returns explained generic evidence; it does not decide that a change is safe to release or execute.

## Alternatives and consequences

Textual diffs are useful diagnostics but confuse formatting with meaning. Revision equality is a concurrency fact, not a complete semantic definition. A universal comparator that claims to understand opaque or future methods would overstate coverage. A bounded, explicitly incomplete result is the proposed approach.

The cost is maintaining semantic field classification and version compatibility. No new exported type, hashing algorithm, wire format, database, Git workflow or XML codec is selected. Existing package behavior, identity constructors and document formats remain unchanged.

## Evidence required before implementation acceptance

- Reordered non-semantic serialization and layout-only edits yield no semantic difference within the declared scope.
- Rename retains identity; changed keys, types, relationships, constraint groups and semantically ordered values are reported.
- Unknown extensions, absent registries, changed profile semantics and unrelated model identities do not yield false equivalence.
- A view-only revision change still rejects a stale write even when semantic content compares equal.
- Inputs remain unchanged; equivalent pinned inputs produce deterministic ordered diagnostics.
- Review concrete API/version compatibility against the then-current published packages before adopting new exports.

Use synthetic public fixtures. These are future proof obligations, not tests executed by this documentation PR. Human acceptance, implementation, package publication and consumer adoption remain separate.
