# ADR 0001 — Modeling Foundation scope, boundaries and responsibilities

- **Status:** Proposed
- **Date:** 2026-11-17
- **Scope:** Repository-local architecture of the reusable Modeling Foundation
- **Decision authority:** Modeling Foundation capability owner (Johan), subject to applicable accepted Meta decisions and cross-repository ownership review
- **Related:** [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12) and its [maintainer direction](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576); [Foundation extraction epic](https://github.com/anarchitects/anarchitecture-modeling/issues/3); [Archimatrix ADR 0002](https://github.com/anarchitects/archimatrix/blob/main/docs/adr/0002-modeling-foundation-contracts-and-evolution.md); [Blueprint ADR 0017](https://github.com/anarchitects/anarchitecture-blueprint/blob/main/docs/adr/0017-modeling-foundation-contracts-and-reuse.md)
- **Companion:** [ADR 0002 — Extensible meta-metamodel, metadata and governance semantics](0002-extensible-meta-metamodel-and-governance-metadata.md)

## Context

Modeling Foundation is being extracted from Archimatrix into an independent, intended open-source TypeScript capability for Archimatrix, Blueprint and other future modeling consumers. Archimatrix #8/#22 accepted bounded cross-method Foundation proofs; #9/#40 accepted portable model lifecycle and desktop host evidence. Neither outcome establishes a universal modeling platform, a public stable API, methodology conformance, or a public package release.

The Foundation must remain useful without a model editor or a database. Without explicit boundaries, shared semantics can gradually absorb methodology definitions, presentation engines, repositories, collaboration, governance execution and product workflows. The initial extraction should preserve proven behavior rather than turn into a speculative redesign.

## Proposed decision

The Foundation has **two foundational responsibilities**:

1. **Meta-modeling:** offer a small, methodology-neutral *meta-metamodel*: the constructs with which versioned, independent method packs define their own metamodels, properties, relationship rules, constraints and extensions. It is **not** a universal, prepopulated enterprise metamodel.
2. **Modeling engine:** offer portable, deterministic primitives for creating, inspecting, validating and changing *instances* of those metamodels, including bounded transactions and explicit semantic integrity outcomes.

There are three conceptual levels: the generic meta-metamodel (definition mechanisms), method-specific metamodels (definitions supplied by packs), and concrete models (instances). A metamodel's completeness and the Foundation's support for it must be evidenced separately.

### Responsibility matrix

| Responsibility | Proposed owner |
| --- | --- |
| Stable model/element/relationship/member identities, typed values, local references, semantic containment | Foundation core |
| Versioned pack/profile/constraint contracts, composition, coverage and diagnostics | Foundation metamodel layer |
| Bounded commands/change plans, optimistic revision guards, deterministic defaults, explicit conflicts and semantic undo/redo | Foundation modeling engine |
| Portable model/view-occurrence envelopes and safe, bounded codecs where truly host neutral | Foundation |
| Method-specific element/relation meanings, allowed connections, constraint semantics, defaults and notation definitions | Independently versioned method packs |
| Concrete canvas, layout, renderer, palette, keyboard/interaction UX and graphical notation rendering | Editor and host |
| Textual grammar, parser, language server and DSL authoring UX | Language/editor adapter |
| Filesystem access, URI sessions, save/backup/conflict coordination, database implementation | Host/infrastructure |
| Identity, access control, governance policy decisions, approvals, compliance workflows and immutable audit | Product or specialized governance service |
| Collaboration, multi-user synchronization, branching/merge infrastructure, shared repository history and deployment | Product or specialized service |
| Executable conversion recipes, SQL/code generation and external processing | Method/target packages and products; Foundation may supply bounded contracts |

### Modeling contracts and integrity

The portable runtime supports stable identities; typed elements, relationships and independently addressable members; declared properties and constraints; structural/reference checks; metamodel-aware validation with explicit coverage; diagnostics; and atomic guarded changes. Exposed APIs should support small navigation and inspection needs. A general graph-query language, arbitrary script interpreter and full transformation engine are **not** prerequisites.

Separate model identity, document-format version, model revision, exact pack/profile/rule version and persisted history. A revision is an opaque optimistic-concurrency token, not durable version control. Semantic undo/redo is guarded inverse/change behavior; it must not restore stale whole-document state or imply distributed merge support.

Unknown extensions may be preserved without semantic reinterpretation. *Preserved* must never be reported as *validated* or *supported*. Invalid, unsupported and unverified conditions must not be conflated.

### Semantic model versus representation

The semantic model has no dependency on a diagram. Multiple view occurrences may refer to one semantic element with independent geometry and permitted styling; moving or removing an occurrence does not change or delete the underlying meaning. Generic view and notation **contracts** may live in Foundation; drawing, routing, layout, canvas interaction and rendered accessibility remain host responsibilities.

A diagram view is not the same as a modeled SQL view. Products own their visual design systems, while method packs own method-specific notation definitions.

### Persistence and history boundary

Portable document, checkpoint, codec, change-plan and assessment contracts may be extracted where actual imports prove independence from the host. VS Code persistence, file saves, dirty state, URI coordination, filesystem atomicity and recovery orchestration remain with Archimatrix. Blueprint owns its own server persistence, authorization, collaboration and approval/audit services.

Do not impose a database, CRDT, message bus, renderer or runtime framework on library consumers. Interfaces do not require an adapter implementation within the Foundation.

### Governance and external extensions

The meta-metamodel must **permit** typed governance-relevant metadata, references, extension profiles and declarative validation. The Foundation verifies supported structural/model rules; it does not authorize users, approve exceptions, execute governance workflows or assess enterprise compliance. [ADR 0002](0002-extensible-meta-metamodel-and-governance-metadata.md) proposes the narrower extension/reference/provenance contracts.

### Dependencies, distribution and ownership

- Runtime dependency direction: **consumers/adapters/method packs → metamodel → core**. Core must not depend on metamodel; the Foundation must not import any specific pack or host.
- No required runtime coupling to ArchiMate, VS Code, Blueprint, Angular, Nest, Nx, GLSP, Langium or a particular database. Nx and @nx/js are workspace tools, not shipped runtime dependencies.
- Public packages are independently versioned/consumed; no shared private cross-repository libraries or sibling source links. First publication, license clearance and consumer migration remain separately gated.
- The repository owns its **local** package architecture and APIs. Meta owns ecosystem role, cross-repository interaction and dependency policy under its accepted ADR-0004. A local proposal does not silently amend Meta or Blueprint policy.

## Alternatives considered

- **Universal method/enterprise metamodel:** easier superficial integration, but introduces method-specific conditionals and unverifiable equivalence. Rejected.
- **Full graphical modeling platform in Foundation:** convenient sharing at first, but couples semantic integrity to one editor and multiplies dependencies. Rejected.
- **Host-local implementations only:** avoids public contracts but duplicates behavior and drifts across Archimatrix/Blueprint. Not preferred for genuinely reusable semantics.
- **Portable semantic engine plus independent method packs and adapters:** selected proposal; requires disciplined API/compatibility and consumer proof.

## Consequences and verification

The proposed split permits reuse in a VS Code extension, backend or CLI without a UI/storage dependency. It also puts responsibility on pack authors and consumers to show what semantics are actually supported; registration does not equal conformance.

Before accepting this ADR:
- [ ] Review the complete current Archimatrix core/metamodel source and accepted #8/#9 fixture evidence against the responsibility matrix.
- [ ] Classify each ambiguous document/session/codec operation with a concrete owner, especially the boundary tracked by [Modeling #11](https://github.com/anarchitects/anarchitecture-modeling/issues/11).
- [ ] Verify package dependency direction and built-artifact consumption without Archimatrix-specific source export conditions.
- [ ] Reconcile any cross-repository ownership changes through Meta; obtain the relevant owner's approval.
- [ ] Record explicit out-of-scope capabilities and compatibility consequences without claiming they are already implemented.

**Decision and delivery status:** This is an architectural proposal. Drafting/merging documentation does not by itself accept the decision, implement missing contracts, authorize publication, change visibility or prove Blueprint adoption. The behavior-preserving extraction in Modeling #3 remains independently tracked.
