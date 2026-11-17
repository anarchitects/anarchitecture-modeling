# ADR 0002 — Extensible meta-metamodel, metadata and governance semantics

- **Status:** Proposed
- **Date:** 2026-11-17
- **Scope:** Modeling Foundation's generic definition/extension and validation contracts
- **Decision authority:** Modeling Foundation capability owner (Johan), subject to accepted Meta and affected consumer decisions
- **Related:** [ADR 0001 — Boundaries](0001-modeling-foundation-boundaries.md); [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12); [Archimatrix #8](https://github.com/anarchitects/archimatrix/issues/8); [Blueprint ADR 0017](https://github.com/anarchitects/anarchitecture-blueprint/blob/main/docs/adr/0017-modeling-foundation-contracts-and-reuse.md)

## Context

A model's practical usefulness depends on its ability to carry typed context, including ownership, lifecycle, classification, compliance intent and traceability. These must be expressible **without** making Foundation depend on an enterprise governance product or installing a universal governance ontology.

The current Archimatrix source already provides data-only namespaced pack/property definitions, exact version references, typed local references, member constraints, validation and bounded profile composition. Accepted synthetic proofs include role-playing dimensions and composed method/processing profiles. The present core deliberately supports **within-document** references; no general external resolver, externally verified reference status, complete audit facility or universal provenance model has been demonstrated. Keep proven behavior separate from this proposed expansion.

## Proposed decision

The generic meta-metamodel shall permit **metamodel modules, additive profiles, typed references and declarative constraints**, with distinct provenance and revision contracts.

### 1. Metamodel modules and profiles are different mechanisms

**Metamodel modules** define new named element/relationship/member types, property/constraint definitions, semantic rules and permissible relationships. Packs own and version the meaning of those definitions, rather than a universal Foundation enum.

**Profiles** enrich *existing applicable types* with additional typed properties, references, constraints and optional presentation/default declarations. A profile must not silently redefine a base type's identity, existing property meaning, relationship direction, or mandatory constraints. If new types or changed underlying semantics are necessary, use a separately owned metamodel module (possibly composed with the original), not a disguised profile override.

Composition requires exact, namespaced type/pack/profile/rule identities, explicit applicability and dependencies, deterministic ordering, version pins, collision detection and meaningful compatibility diagnostics. No silent last-wins overrides or implicit downgrades of mandatory constraints. An explicitly compatible refinement mechanism, if later required, needs its own scoped decision and proof.

A reusable governance profile can enrich different method packs through **declared bindings**; it must not presume all packs share the same types. It can describe ownership and classifications, but a business governance ontology remains outside Foundation.

**Current evidence boundary:** Archimatrix's initial composition allows at most one pack per orthogonal dimension (abstraction, method, processing architecture, provenance, target). Cross-pack profile overlays and richer multiple selections remain to be designed and tested; this ADR does not claim they already work or authorize redesign during extraction.

### 2. Typed, reusable metadata and constraints

Pack/profile authors may declare stable qualified property identifiers, type and record/list shape, requiredness, cardinality, allowed values, reference target requirements, applicability, defaults and constraints. The instance contains actual typed values independently from their declarations.

Constraints must have explicit, versioned meanings and supported operators. The Foundation validates the rules it understands, supplies diagnostic codes and locations, and marks unknown/unsupported semantics accordingly. Data-only validation is distinct from evaluating business governance policy. Avoid arbitrary scripts as the default extension mechanism.

The ability to attach a property does not mean all operational context belongs in the semantic model: temporary editor sessions, approval requests and infrastructure audit events ordinarily remain external.

### 3. Internal versus external references

**Internal references** point to an entity/model within a local validated document and must satisfy its identity, target-kind and reference-integrity requirements.

**External references** are a **proposed first-class contract** for links to an entity governed elsewhere, such as an organization registry, catalog, other model repository or system of record. At minimum their descriptive envelope should carry a namespace/authority and stable external identifier, with optional expected target kind/type, version/revision pin and source/provenance context as appropriate. Use stable identifiers rather than names, display labels or URL assumptions. An external reference may be expressed as an attribute value or within a typed relationship, where the defining pack permits it.

Distinguish:
- **Structurally invalid:** identifier/namespace/type envelope violates a declared contract.
- **Unresolved or unavailable:** the envelope is structurally valid but no authorized external resolution result is available.
- **Resolved/verified:** a consumer-provided resolver has established a result under an explicit freshness, authority and type policy.
- **Incompatible/mismatched:** an actual verified target violates the declared contract.

Do **not** treat an unresolved reference as automatically structurally invalid, or as semantically verified. If a rule requires external verification, report an explicit pending/unverified/unsupported outcome rather than a false success. The precise diagnostic vocabulary and serialization need executable proofs before API stabilization.

Foundation may define portable resolver-facing contracts and perform structure checks, but **must not fetch, authenticate to, cache, synchronize or authorize external systems itself**. Consumers handle network access, trust, access controls, reconciliation and staleness. Cross-repository semantic equivalence or automatic merging is not implied.

### 4. Provenance, revisions and audit are independent

| Concept | Purpose | Boundary |
| --- | --- | --- |
| Provenance | Why/how/by which source an assertion, entity or derived change entered the model | Optional typed metadata and change/derivation contract within Foundation; external source meaning is pack/consumer-owned |
| Model revision/change set | Which guarded state changed, and what must be checked for atomic edits and undo/redo | Foundation's portable revision, expected-state and change-plan contracts |
| Durable version history | Historical commits, branches, merges and model-repository snapshots | Host/product/version-control service |
| Audit/approval trail | Who performed/approved an operation, under which authorization and policy, with tamper-resistant retention | Product/security/governance service |

A provenance claim may carry source/system identifiers, actor reference, source revision, derivation rule/pack version, timestamp or confidence where defined. Its capture and trust policy are not implicit Foundation promises. Provenance may be modeled alongside a value or kept in a sidecar linked by stable identity; no mandatory new per-property storage format is selected here.

A Foundation model revision is **not** an immutable audit log. The library must not claim user authentication, timestamp authority, legal nonrepudiation or long-term retention just because a change set contains metadata.

### 5. Governance example and limits

A method pack defines an application-like semantic element. An independently defined governance profile could contribute:
- A lifecycle classification with enumerated permitted values.
- An owner reference to a modeled role, or a typed external authority/role identifier.
- An information classification and source reference.
- Validation that required values and supported relationship targets are correctly represented.

The Foundation may diagnose invalid enum values, missing mandatory fields and broken *local* references. A consumer such as Blueprint decides which user can change ownership, whether approval is required, how policies are inherited, whether a compliance rule passes and what to audit. Model metadata **does not confer permissions**.

This example is illustrative and does not import the normative ArchiMate taxonomy or assert current coverage of any particular governance ontology. Accepted Meta governance proposals about policy inheritance are not adopted by implication.

## Trade-offs and rejected alternatives

- **Store governance as free-form strings:** simple, but ambiguous, poorly validated and vulnerable to drift. Not the preferred mechanism.
- **Hardcode governance/enterprise types in core:** convenient initially but couples the Foundation to particular methods and policies. Rejected.
- **Only internal references, always copy external objects:** simplifies integrity but duplicates authority and weakens traceability. Not the proposed end state.
- **Always resolve external references during validation:** makes offline modeling, reproducibility and security constraints depend on external systems. Rejected.
- **Treat revisions as audit:** conflates concurrency/versioning with authorization and tamper-evident evidence. Rejected.

## Implementation and acceptance boundaries

This is a **proposal**, not a claim of completed runtime features. Preserve the source-compatible, already accepted #8/#9 behavior during extraction; stage new capabilities only as separately scoped, accepted work.

Before accepting:
- [ ] Map proposed metadata/profile semantics to the *actual* extracted model/core and metamodel APIs and evidence, recording supported vs proposed behaviors.
- [ ] Specify and prove one method module plus one independently authored governance profile, including successful attachment and a rejected conflicting extension without weakening mandatory rules.
- [ ] Specify typed external-reference envelope and resolver/verification outcomes, with positive and negative tests, offline and stale/unavailable cases, and no hidden I/O.
- [ ] Demonstrate a local reference versus an external reference, including clear diagnostics when external verification is required but unavailable.
- [ ] Identify the minimal provenance granularity and storage approach; prove it does not conflate optimistic revisions with audit/approval state.
- [ ] Reconcile versioning, unknown-extension preservation, schema evolution and compatibility/migration impact with the existing package contracts.
- [ ] Review all cross-repository implications with the relevant Meta and consumer owners before marking Accepted.

**Decision and delivery status:** None of the unproven external-reference, provenance or richer profile capabilities is required to complete the initial behavior-preserving Foundation extraction. Implement them through later issues only after the applicable decision and acceptance evidence exist. No public API promise, method conformance, release or Blueprint adoption is authorized by this document.
