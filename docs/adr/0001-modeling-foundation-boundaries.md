# ADR 0001 — Modeling Foundation scope, boundaries and responsibilities

- **Status:** Accepted — repository-local scope and responsibility boundaries; delivery gates below remain open
- **Date:** 2026-11-17
- **Decision maker:** Johan, Modeling Foundation capability owner
- **Scope:** Repository-local architecture of the reusable Modeling Foundation
- **Decision authority:** Modeling Foundation capability owner (Johan), subject to applicable accepted Meta decisions and cross-repository ownership review
- **Related:** [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12) and its [maintainer direction](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576); [Foundation extraction epic](https://github.com/anarchitects/anarchitecture-modeling/issues/3); [Archimatrix ADR 0002](https://github.com/anarchitects/archimatrix/blob/main/docs/adr/0002-modeling-foundation-contracts-and-evolution.md); [Blueprint ADR 0017](https://github.com/anarchitects/anarchitecture-blueprint/blob/main/docs/adr/0017-modeling-foundation-contracts-and-reuse.md)
- **Companion:** [ADR 0002 — Extensible meta-metamodel, metadata and governance semantics](0002-extensible-meta-metamodel-and-governance-metadata.md)

## Context

Modeling Foundation is being extracted from Archimatrix into an independent, intended open-source TypeScript capability for Archimatrix, Blueprint and other future modeling consumers. Archimatrix #8/#22 accepted bounded cross-method Foundation proofs; #9/#40 accepted portable model lifecycle and desktop host evidence. Neither outcome establishes a universal modeling platform, a public stable API, methodology conformance, or a public package release.

The Foundation must remain useful without a model editor or a database. Without explicit boundaries, shared semantics can gradually absorb methodology definitions, presentation engines, repositories, collaboration, governance execution and product workflows. The initial extraction should preserve proven behavior rather than turn into a speculative redesign.

## Acceptance and authority

Accepted on 17 November 2026 in response to Johan's request to accept this ADR and explicit confirmation: “Separate Foundation repo is accepted”. This records the local architecture for the dedicated `anarchitecture-modeling` capability and the extraction direction already recorded in [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576).

Acceptance selects the responsibilities and compatibility obligations below. The draft's source inventory, module classification and built-artifact checks are retained as **delivery gates**, with named owning issues; they are not marked complete by this architectural decision. [ADR 0002](0002-extensible-meta-metamodel-and-governance-metadata.md) separately accepts the architectural direction for richer profiles, external references and provenance, with concrete contracts and implementation proofs still gated. Those additions remain outside the initial extraction.

The current Meta catalog still describes the initial Archimatrix-local placement. [Meta #56](https://github.com/anarchitects/anarchitecture-meta/issues/56) owns reconciliation of the canonical ADR/catalog/interaction/ownership records and the ecosystem acceptance record. This local ADR records Johan's confirmation; it does not claim a separate PWG review or completion of #56. Canonical registration remains a prerequisite for public distribution/adoption. Blueprint's reuse choice and product authority remain separate.

## Decision

The Foundation has **two foundational responsibilities**:

1. **Meta-modeling:** offer a small, methodology-neutral _meta-metamodel_: the constructs with which versioned, independent method packs define their own metamodels, properties, relationship rules, constraints and extensions. It is **not** a universal, prepopulated enterprise metamodel.
2. **Modeling engine:** offer portable, deterministic primitives for creating, inspecting, validating and changing _instances_ of those metamodels, including bounded transactions and explicit semantic integrity outcomes.

There are three conceptual levels: the generic meta-metamodel (definition mechanisms), method-specific metamodels (definitions supplied by packs), and concrete models (instances). A metamodel's completeness and the Foundation's support for it must be evidenced separately.

### Responsibility matrix

| Responsibility                                                                                                               | Owner                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Stable model/element/relationship/member identities, typed values, local references, semantic containment                    | Foundation core                                                              |
| Versioned pack/profile/constraint contracts, composition, coverage and diagnostics                                           | Foundation metamodel layer                                                   |
| Bounded commands/change plans, optimistic revision guards, deterministic defaults, explicit conflicts and semantic undo/redo | Foundation metamodel layer, using core change contracts                      |
| Model/view-occurrence primitives and structural checks                                                                       | Foundation core                                                              |
| Coordinated checkpoints, session candidates and safe, bounded document codecs                                                | Foundation metamodel layer                                                   |
| Method-specific element/relation meanings, allowed connections, constraint semantics, defaults and notation definitions      | Independently versioned method packs                                         |
| Concrete canvas, layout, renderer, palette, keyboard/interaction UX and graphical notation rendering                         | Editor and host                                                              |
| Textual grammar, parser, language server and DSL authoring UX                                                                | Language/editor adapter                                                      |
| Filesystem access, URI sessions, save/backup/conflict coordination, database implementation                                  | Host/infrastructure                                                          |
| Identity, access control, governance policy decisions, approvals, compliance workflows and immutable audit                   | Product or specialized governance service                                    |
| Collaboration, multi-user synchronization, branching/merge infrastructure, shared repository history and deployment          | Product or specialized service                                               |
| Executable conversion recipes, SQL/code generation and external processing                                                   | Method/target packages and products; Foundation may supply bounded contracts |

### Modeling contracts and integrity

The accepted source baseline supports stable identities; typed elements, relationships and independently addressable members; declared properties and constraints; structural/reference checks; metamodel-aware validation with explicit coverage; diagnostics; and atomic guarded change preparation. Extraction must preserve those behaviors. Exposed APIs should support small navigation and inspection needs. A general graph-query language, arbitrary script interpreter and full transformation engine are **not** prerequisites.

Separate model identity, document-format version, model revision, exact pack/profile/rule version and persisted history. A revision is an opaque optimistic-concurrency token, not durable version control. Semantic undo/redo is guarded inverse/change behavior; it must not restore stale whole-document state or imply distributed merge support.

The coordinated checkpoint uses one revision for semantic data, views, baselines and receipts. A view-only command can therefore advance that revision without changing semantic content. Reopening restores durable retry receipts and generated baselines with empty live undo/redo stacks. A repeated exact request returns its historical receipt; it must not reinstall an old candidate or recreate an undone effect. Deletion and inverse deletion require explicit dependency review and resolving operations, without implicit cascading.

Unknown extensions may be preserved without semantic reinterpretation. _Preserved_ must never be reported as _validated_ or _supported_. Invalid, unsupported and unverified conditions must not be conflated.

### Semantic model versus representation

The semantic model has no dependency on a diagram. Multiple view occurrences may refer to one semantic element with independent geometry and permitted styling; moving or removing an occurrence does not change or delete the underlying meaning. Generic view and notation **contracts** may live in Foundation; drawing, routing, layout, canvas interaction and rendered accessibility remain host responsibilities.

A diagram view is not the same as a modeled SQL view. Products own their visual design systems, while method packs own method-specific notation definitions.

### Persistence and history boundary

Portable document, checkpoint, codec, change-plan and assessment contracts belong in Foundation; their extraction must prove independence from the host. VS Code persistence, file saves, dirty state, URI coordination, filesystem atomicity and recovery orchestration remain with Archimatrix. Blueprint owns its own server persistence, authorization, collaboration and approval/audit services.

The concrete boundary is:

| Operation or contract                                                                                                       | Extraction destination and obligation                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DocumentSnapshot`, `DocumentCheckpoint`, `DocumentSession`, command/receipt/history contracts                              | `@anarchitects/modeling-metamodel`; retain one coordinated model and revision                                                                                            |
| Assessment, deletion/reversal inspection, semantic/view/session command preparation and bounded defaults                    | `@anarchitects/modeling-metamodel`; return a candidate, replay receipt or rejection without taking ownership of the host's current state                                 |
| `DocumentContext` and `DocumentCommitPort`                                                                                  | Portable contracts in metamodel; the consumer supplies exact registries, rules, notation, theme and the commit implementation; documents never supply executable context |
| `decodeDocument` / `encodeDocument` and bounded JSON/UTF-8 helpers                                                          | `@anarchitects/modeling-metamodel`; operate on supplied data/bytes with explicit limits and coverage; perform no file I/O                                                |
| Current-checkpoint adoption and revision recheck; live/save capacity coordination                                           | Host; Archimatrix's `ManagedDocument` retains this responsibility even though it consumes portable APIs                                                                  |
| `DocumentStorage`, disk versions, local locks/staging/fsync/rename, URI/model ownership, dirty/save/save-as/backup/recovery | Archimatrix host; an interface alone does not make provider-specific guarantees a Foundation responsibility                                                              |

Preserve the existing `archimatrix-document` envelope identifier, envelope version **1**, semantic format **2**, exact pins and unsupported-data behavior during extraction. Its historical name is serialized compatibility data, not a runtime dependency on Archimatrix. Renaming it, wrapping bare legacy documents or changing formats requires a separate versioned migration decision. Decode success does not authorize editing or verify imported provenance; original source bytes remain caller-owned.

The codec's receipt limit is **256**; the general in-memory history policy has a different capacity. The host must keep adopted candidates encodable and fail explicitly at capacity, without silently pruning durable retry evidence. The accepted Archimatrix host uses at most 100 live history entries by default. These are existing bounded behaviors to preserve, not promises of unlimited history or universal filesystem compare-and-swap.

Do not impose a database, CRDT, message bus, renderer or runtime framework on library consumers. Interfaces do not require an adapter implementation within the Foundation.

### Governance and external extensions

The meta-metamodel permits method-owned typed metadata, local references, bounded profile composition and declarative validation. This allows governance-relevant data without assigning governance execution to Foundation. The current composition selects at most one exact pack per orthogonal dimension and rejects collisions; a general overlay/override mechanism is not accepted here. The Foundation verifies supported structural/model rules; it does not authorize users, approve exceptions, execute governance workflows or assess enterprise compliance. [ADR 0002](0002-extensible-meta-metamodel-and-governance-metadata.md) records the separately accepted extension, external-reference and provenance direction and its implementation gates; this ADR does not require those additions for extraction.

### Dependencies, distribution and ownership

- Runtime dependency direction: **consumers/adapters/method packs → metamodel → core**. Core must not depend on metamodel; the Foundation must not import any specific pack or host.
- Retain exactly the two initial package identities, `@anarchitects/modeling-core` and `@anarchitects/modeling-metamodel`. The modeling engine is a responsibility within these packages, not a third package or an editor framework. Consumers may use core directly when metamodel services are unnecessary.
- No required runtime coupling to ArchiMate, VS Code, Blueprint, Angular, Nest, Nx, GLSP, Langium or a particular database. Nx and @nx/js are workspace tools, not shipped runtime dependencies.
- Public packages are independently versioned/consumed; no shared private cross-repository libraries or sibling source links. First publication, license clearance and consumer migration remain separately gated.
- Internal workspace linking remains allowed. Published consumers must use built public entry points without `@archimatrix/source`, sibling paths or unpublished workspace references. Preserve accepted exports and behavior; any unavoidable incompatibility needs a reviewed version/migration decision.
- The repository owns its **local** package architecture and APIs. Meta owns ecosystem role, cross-repository interaction and dependency policy under its accepted ADR-0004. This decision does not amend Blueprint policy or transfer Community Governance, Plugins tooling or Contracts shared HTTP ownership. Modeling types do not become canonical HTTP schemas.
- Apache-2.0 remains the preferred licensing direction, subject to provenance, contributor-rights and dependency review. Scaffold license metadata is not clearance. Licensed method material and private consumer/governance content must not enter public artifacts.

## Alternatives considered

- **Universal method/enterprise metamodel:** easier superficial integration, but introduces method-specific conditionals and unverifiable equivalence. Rejected.
- **Full graphical modeling platform in Foundation:** convenient sharing at first, but couples semantic integrity to one editor and multiplies dependencies. Rejected.
- **Host-local implementations only:** avoids public contracts but duplicates behavior and drifts across Archimatrix/Blueprint. Not preferred for genuinely reusable semantics.
- **Portable semantic engine plus independent method packs and adapters:** selected; requires disciplined API/compatibility and consumer proof.

## Consequences and verification

The split permits reuse in a VS Code extension, backend or CLI without a UI/storage dependency. It also puts responsibility on pack authors and consumers to show what semantics are actually supported; registration does not equal conformance.

### Evidence reviewed for this decision

Review date: 17 November 2026. Archimatrix `main` was inspected at `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`.

- [Foundation handoff](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/foundation-handoff.md), [#22](https://github.com/anarchitects/archimatrix/issues/22) and merged [PR #31](https://github.com/anarchitects/archimatrix/pull/31) establish the bounded #8 contracts, synthetic cross-method fixtures and source-workspace built-entry/boundary evidence.
- [Lifecycle handoff](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/model-lifecycle-handoff.md), [#40](https://github.com/anarchitects/archimatrix/issues/40) and merged [PR #49](https://github.com/anarchitects/archimatrix/pull/49) establish the bounded #9 command/codec and desktop lifecycle evidence. Current #8/#9/#22/#40 records explicitly record Johan's 12 November acceptance; older pending-acceptance prose in PRs and handoffs is historical.
- Both package manifests and public indexes, core identity/model contracts, metamodel definitions, the two-view integration fixture, document/session/commit and codec contracts, codec implementation and host `ManagedDocument`/storage contracts were inspected. They support the responsibility split above; they do not substitute for the complete extraction inventory in #9 or module-level parity acceptance in #11/#19.
- Both source manifests remain private `0.0.0` packages with an `@archimatrix/source` condition; metamodel depends on core via `workspace:*`. Historical source-workspace smoke results do not prove independent package consumption after extraction.

The local review baseline is `4d2a0f004fea0cac9d908b8f4b89967a9a4bf1e3`. Nx 24.0.6 with Yarn 4.18.1 resolves an empty project graph: there are no extracted packages or package verification targets yet. No upstream tests were rerun for this documentation decision.

### Outstanding delivery gates

These retain the draft's verification obligations. Acceptance of this ADR does not close them or authorize skipping them.

| Gate                                            | Owning work and required evidence                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete source accounting                      | [Modeling #9](https://github.com/anarchitects/anarchitecture-modeling/issues/9): inventory every module, export, test and fixture against an exact source revision                                                                                                                                                                    |
| Module-level portable/host boundary acceptance  | [Modeling #11](https://github.com/anarchitects/anarchitecture-modeling/issues/11): apply this responsibility split to every ambiguity, preserve behavior and record Johan's acceptance of the file-level result                                                                                                                       |
| Independent artifacts and dependency direction  | [Modeling #16](https://github.com/anarchitects/anarchitecture-modeling/issues/16) and [#17](https://github.com/anarchitects/anarchitecture-modeling/issues/17): prove built-entry consumption and negative runtime-boundary checks without source conditions                                                                          |
| Extracted behavior and compatibility acceptance | [Modeling #19](https://github.com/anarchitects/anarchitecture-modeling/issues/19), under [#3](https://github.com/anarchitects/anarchitecture-modeling/issues/3): rerun migrated positive/negative fixtures and obtain Johan's acceptance of the independent packages                                                                  |
| Canonical ecosystem records                     | [Meta #56](https://github.com/anarchitects/anarchitecture-meta/issues/56): reconcile the accepted separate-repository direction and ownership/acceptance records before public distribution/adoption                                                                                                                                  |
| Repository, CI and release readiness            | [Modeling #6](https://github.com/anarchitects/anarchitecture-modeling/issues/6), [#10](https://github.com/anarchitects/anarchitecture-modeling/issues/10) and [#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14): establish and verify the separately owned controls; their absence is not resolved by this ADR |

### Governance record

Meta's current default branch `main` was reviewed at `4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, with a complete, non-truncated ADR inventory. Applicable accepted records include `adr/0004-meta-owns-landscape-contracts.md`, `adr/0012-canonical-public-api-contract-ownership.md`, `adr/0013-package-initial-release-and-nx-versioning.md`, `adr/0014-renovate-and-dependabot-dependency-management.md`, `adr/0015-nx-task-caching-and-distributed-execution.md`, `adr/0016-sdlc-ownership-and-architecture-authority.md`, `adr/0017-release-cadence-and-owner-authority.md`, `adr/0018-upstream-first-exceptions-and-cutover.md`, `adr/0019-repository-projects-and-organization-overview.md` and `adr/0021-consumer-applications-and-public-upstream-reuse.md`. Cooperative enrichment (`adr/0001-cooperative-governance-enrichment.md`) and governance hierarchy/reference/layering ADRs 0005–0007 remain Proposed.

Local `AGENTS.md`, both local ADRs and the actual workspace/CI configuration were reviewed. Archimatrix ADRs 0001/0002 retain historical initial-placement wording; the later #12 direction and this acceptance require reconciliation in the owning records. Blueprint was consulted at `af4f88517302937dc23c0da4763579d0cca83604`, including `docs/adr/0001-standalone-and-local-contracts.md`, `docs/adr/0016-proprietary-license-and-dependency-policy.md` and `docs/adr/0017-modeling-foundation-contracts-and-reuse.md`. Its standalone/proprietary boundary and separate reuse decision remain intact. No policy exception, consumer dependency or new API is introduced.

**Decision and delivery status:** Architecture accepted; extraction, legal clearance, public distribution and consumer adoption remain separate outcomes. No external-reference resolver, richer profile overlay, general conversion engine, method conformance, release, visibility change or Blueprint adoption is authorized by this decision.
