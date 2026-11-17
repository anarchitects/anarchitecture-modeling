# ADR 0002 — Extensible meta-metamodel, metadata and governance semantics

- **Status:** Accepted — architectural direction and constraints; implementation contracts and proof gates remain open
- **Date:** 2026-11-17
- **Decision maker:** Johan, Modeling Foundation capability owner
- **Scope:** Modeling Foundation's generic definition/extension and validation contracts
- **Decision authority:** Modeling Foundation capability owner (Johan), subject to accepted Meta and affected consumer decisions
- **Related:** [ADR 0001 — Boundaries](0001-modeling-foundation-boundaries.md); [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12); [Archimatrix #8](https://github.com/anarchitects/archimatrix/issues/8); [Blueprint ADR 0017](https://github.com/anarchitects/anarchitecture-blueprint/blob/main/docs/adr/0017-modeling-foundation-contracts-and-reuse.md)

## Context

A model's practical usefulness depends on its ability to carry typed context, including ownership, lifecycle, classification, compliance intent and traceability. These must be expressible **without** making Foundation depend on an enterprise governance product or installing a universal governance ontology.

The current Archimatrix source already provides data-only namespaced pack/property definitions, exact version references, typed local references, member constraints, validation and bounded profile composition. Accepted synthetic proofs include role-playing dimensions and composed method/processing profiles. The present core deliberately supports **within-document** references; no general external resolver, externally verified reference status, complete audit facility or universal provenance model has been demonstrated. The accepted direction below extends that architecture; it does not claim those extensions are implemented.

## Acceptance and authority

Accepted on 17 November 2026 by Johan's instruction to accept this ADR, following acceptance of [ADR 0001](0001-modeling-foundation-boundaries.md). This decision selects additive extension semantics, the separation of local and external references, and the provenance/revision/audit boundaries. It accepts no concrete new wire schema, exported API, resolver implementation or governance ontology.

The draft's executable-proof checklist is retained below as **implementation and stabilization gates**, not completed acceptance evidence. Exact contract shapes and migration choices must be reviewed in the bounded implementation work before they become runtime or public API commitments. The initial extraction remains behavior-preserving; these additions neither block it nor expand its scope.

Foundation owns its generic mechanisms. Method/profile authors own declared meanings; consumers own authority, external integration and governance execution. Meta's existing ownership rules and Blueprint's standalone/proprietary boundary remain unchanged. Any later change to those responsibilities requires the affected owners' decision; this acceptance does not make that decision for them.

## Decision

The generic meta-metamodel shall permit **metamodel modules, additive profiles, typed references and declarative constraints**, with distinct provenance and revision contracts.

### 1. Metamodel modules and profiles are different mechanisms

**Metamodel modules** define new named element/relationship/member types, property/constraint definitions, semantic rules and permissible relationships. Packs own and version the meaning of those definitions, rather than a universal Foundation enum.

**Profiles** enrich _existing applicable types_ with additional typed properties, references, constraints and optional presentation/default declarations. A profile must not silently redefine a base type's identity, existing property meaning, relationship direction, or mandatory constraints. If new types or changed underlying semantics are necessary, use a separately owned metamodel module (possibly composed with the original), not a disguised profile override.

Here, an **extension profile** means that additive enrichment mechanism. The current `ModelingProfileDefinition` instead selects exact packs by orthogonal dimension; it is not already an extension-profile API. A metamodel module is a definition/ownership unit, not a requirement to create another npm package. Preserve the current exported types during extraction and introduce any new mechanism explicitly.

Composition requires exact, namespaced type/pack/profile/rule identities, explicit applicability and dependencies, deterministic ordering, version pins, collision detection and meaningful compatibility diagnostics. No silent last-wins overrides or implicit downgrades of mandatory constraints. An explicitly compatible refinement mechanism, if later required, needs its own scoped decision and proof.

A reusable governance profile can enrich different method packs through **declared bindings**; it must not presume all packs share the same types. It can describe ownership and classifications, but a business governance ontology remains outside Foundation.

**Current evidence boundary:** Archimatrix's initial composition allows at most one pack per orthogonal dimension (abstraction, method, processing architecture, provenance, target). It rejects duplicate definitions, including attempts to weaken mandatory constraints. Additive bindings to existing types need a separately specified composition mechanism; duplicating a base type in another pack is not a shortcut. Cross-pack extension profiles and richer multiple selections remain to be designed and tested under this decision's constraints; extraction retains the current behavior.

### 2. Typed, reusable metadata and constraints

Pack/profile authors may declare stable qualified property identifiers, type and record/list shape, requiredness, cardinality, allowed values, reference target requirements, applicability, defaults and constraints. The instance contains actual typed values independently from their declarations.

Constraints must have explicit, versioned meanings and supported operators. The Foundation validates the rules it understands, supplies diagnostic codes and locations, and marks unknown/unsupported semantics accordingly. Data-only validation is distinct from evaluating business governance policy. Avoid arbitrary scripts as the default extension mechanism.

Keep structural validity, semantic coverage and extension registration distinct. An extension can be registered while its payload semantics remain unvalidated. Unknown data must remain opaque and must not acquire a successful validation result merely because it survives serialization. A declared default is a proposal; applying it remains a reviewed, guarded change under ADR 0001.

The ability to attach a property does not mean all operational context belongs in the semantic model: temporary editor sessions, approval requests and infrastructure audit events ordinarily remain external.

### 3. Internal versus external references

**Internal references** point to an entity/model within a local validated document and must satisfy its identity, target-kind and reference-integrity requirements.

**External references** are a distinct first-class concept for links to an entity governed elsewhere, such as an organization registry, catalog, other model repository or system of record. Their eventual descriptive contract must carry a namespace/authority and stable external identifier, with optional expected target kind/type, version/revision pin and source/provenance context as appropriate. Use stable identifiers rather than names, display labels or URL assumptions. The architecture permits an external reference as an attribute value or within a typed relationship where its contract explicitly allows it; exact encoding and relationship support remain implementation decisions.

Do not reinterpret an existing local reference with a foreign `modelId` as an external reference. The current validator correctly rejects that input. The new contract must distinguish the two reference kinds explicitly and preserve existing local integrity and relationship-endpoint rules until a separately reviewed compatibility change is implemented.

Distinguish:

- **Structurally invalid:** identifier/namespace/type envelope violates a declared contract.
- **Unresolved or unavailable:** the envelope is structurally valid but no authorized external resolution result is available.
- **Resolved/verified:** consumer-supplied evidence establishes a result for the identified reference under an explicit freshness, authority and type policy; this is not permanent or universal verification.
- **Incompatible/mismatched:** an actual verified target violates the declared contract.

Do **not** treat an unresolved reference as automatically structurally invalid, or as semantically verified. If a rule requires external verification, report an explicit pending/unverified/unsupported outcome rather than a false success. The precise diagnostic vocabulary and serialization need executable proofs before API stabilization.

Foundation may define portable resolver-facing contracts and perform structure checks, but **must not fetch, authenticate to, cache, synchronize or authorize external systems itself**. Consumers handle network access, trust, access controls, reconciliation and staleness. Validation consumes an explicitly supplied evidence context so that the same model, definitions and evidence produce the same result; it must not consult a live resolver or the clock implicitly. A persisted claim of verification is not trusted evidence by itself. Missing, stale or inaccessible evidence leaves verification unavailable under the consumer's policy. Cross-repository semantic equivalence or automatic merging is not implied.

### 4. Provenance, revisions and audit are independent

| Concept                   | Purpose                                                                                                    | Boundary                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Provenance                | Why/how/by which source an assertion, entity or derived change entered the model                           | Optional typed metadata and change/derivation contract within Foundation; external source meaning is pack/consumer-owned |
| Model revision/change set | Which guarded state changed, and what must be checked for atomic edits and undo/redo                       | Foundation's portable revision, expected-state and change-plan contracts                                                 |
| Durable version history   | Historical commits, branches, merges and model-repository snapshots                                        | Host/product/version-control service                                                                                     |
| Audit/approval trail      | Who performed/approved an operation, under which authorization and policy, with tamper-resistant retention | Product/security/governance service                                                                                      |

A provenance claim may carry source/system identifiers, actor reference, source revision, derivation rule/pack version, timestamp or confidence where defined. Its capture and trust policy are not implicit Foundation promises. Provenance may be modeled alongside a value or kept in a sidecar linked by stable identity; no mandatory new per-property storage format is selected here.

Preserve the demonstrated baseline: `ChangeSource` identifies a source and revision; `ChangeOrigin` distinguishes authored actors from generated pack/rule origins; `GeneratedBaseline` associates generated evidence with a member or property target. These contracts support bounded change/regeneration behavior. They do not provide an authenticated actor identity or a universal assertion history. Additional assertion-level or per-value provenance requires an explicit granularity, retention and serialization decision before implementation.

A Foundation model revision is **not** an immutable audit log. The library must not claim user authentication, timestamp authority, legal nonrepudiation or long-term retention just because a change set contains metadata.

### 5. Governance example and limits

A method pack defines an application-like semantic element. An independently defined governance profile could contribute:

- A lifecycle classification with enumerated permitted values.
- An owner reference to a modeled role, or a typed external authority/role identifier.
- An information classification and source reference.
- Validation that required values and supported relationship targets are correctly represented.

The Foundation may diagnose invalid enum values, missing mandatory fields and broken _local_ references. A consumer such as Blueprint decides which user can change ownership, whether approval is required, how policies are inherited, whether a compliance rule passes and what to audit. Model metadata **does not confer permissions**.

This example illustrates the accepted direction, not a working extension-profile or external-reference API. It does not import the normative ArchiMate taxonomy or assert current coverage of any particular governance ontology. Meta's proposed governance hierarchy, policy inheritance and cooperative enrichment models remain proposals; they are not adopted by implication.

## Trade-offs and rejected alternatives

- **Store governance as free-form strings:** simple, but ambiguous, poorly validated and vulnerable to drift. Not the preferred mechanism.
- **Hardcode governance/enterprise types in core:** convenient initially but couples the Foundation to particular methods and policies. Rejected.
- **Only internal references, always copy external objects:** simplifies integrity but duplicates authority and weakens traceability. Retained as the current reference implementation limit, not the selected architectural end state.
- **Always resolve external references during validation:** makes offline modeling, reproducibility and security constraints depend on external systems. Rejected.
- **Treat revisions as audit:** conflates concurrency/versioning with authorization and tamper-evident evidence. Rejected.

## Compatibility and delivery boundaries

Preserve the source-compatible, already accepted Archimatrix #8/#9 behavior during [Modeling #3](https://github.com/anarchitects/anarchitecture-modeling/issues/3). Keep the two package identities, inward dependency direction, exact pins, envelope 1/model format 2 and honest unsupported-data handling required by ADR 0001. Acceptance of this direction does not change a package version, model format or consumer dependency.

Any new exported type, serialized field, validation outcome or composition behavior needs a compatibility assessment against the then-current extracted packages. Specify how older readers handle new content, preserve recoverable unsupported data and require deliberate migration for incompatible formats. Do not smuggle a new reference through an existing local-reference shape, make an unknown payload editable by registering its name, or silently relax collision checks.

### Implementation and stabilization gates

Johan owns Foundation implementation acceptance. Before implementing each extension, record its bounded scope, concrete contract choices and relevant proof criteria in a Modeling issue. The current extraction issues retain their existing scope; no dedicated implementation issue for these extensions was identified in the reviewed repository issue inventory. The unchecked gates below are retained work, not a claim of completed tests.

- [ ] Map metadata, extension-profile, reference and provenance requirements to the actual extracted APIs and fixtures. Distinguish preserved behavior from each new capability.
- [ ] Specify and prove one method module plus one independently authored extension profile with explicit type/version bindings. Show successful attachment, deterministic composition in either input order, collision rejection and preservation of mandatory base rules. No silent type redefinition or override.
- [ ] Specify the external-reference encoding and supplied-evidence contract, including target identity/type/version matching, freshness and authority inputs. Prove valid, structurally invalid, mismatched, offline, stale and inaccessible cases with no hidden I/O.
- [ ] Demonstrate both a valid local reference and an external reference, preserve rejection of dangling/foreign local references, and report unavailable required verification without false success. Prove that imported verification claims do not authenticate themselves.
- [ ] Choose the minimal additional provenance granularity and storage approach for the concrete use case. Preserve existing change/baseline evidence and prove that neither provenance nor revisions grant permissions or imply an audit trail.
- [ ] Verify old/new serialization and validation compatibility, unknown-extension preservation and migration impact. Apply the package version/release controls and obtain acceptance of the implementation evidence before making support claims.
- [ ] Obtain the relevant Meta and consumer decisions before any change to cross-repository ownership, dependency adoption or product governance policy. Keep publication and consumer adoption separately tracked.

### Evidence and governance record

On 17 November 2026, the authoritative default branches and revisions were rechecked unchanged from the [ADR 0001 governance review](0001-modeling-foundation-boundaries.md#governance-record): Meta `main` at `4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, Archimatrix `main` at `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`, and Blueprint `main` at `af4f88517302937dc23c0da4763579d0cca83604`. That review's complete Meta inventory, accepted ownership/API/versioning/dependency/CI/SDLC/reuse decisions, local instructions and Blueprint ADRs 0001/0016/0017 remain applicable. No new policy exception or transfer of governance authority is introduced.

Archimatrix #8/#9/#22/#40 acceptance records and #12's body/comments were refreshed. Accepted source evidence remains bounded; historical pending-acceptance wording does not negate the recorded owner acceptance. Additional source review for this decision covered core local-reference validation and metamodel composition, extension support, validation and change/provenance contracts.

| Concern                           | Inspected source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Limit for this decision                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Types, properties and composition | [Metamodel contracts](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/contracts.ts), [composition](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/composition.ts) and [dimensional/processing proofs](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/dimensions-and-medallion.md)         | Exact pack selection and collision rejection exist; enrichment of another pack's existing types is unproven                      |
| References and coverage           | [Core validation](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/core/src/lib/validation.ts), [validation contracts](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/validation-contracts.ts) and [extension support](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/extensions.ts) | Local references are checked; external references/evidence outcomes are new work; registration does not validate opaque payloads |
| Provenance and guarded changes    | [Change contracts](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/packages/modeling/metamodel/src/lib/change-contracts.ts) and [defaulting/upgrade proofs](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/vault-defaulting-and-upgrades.md)                                                                                                                                                                 | Source/origin/baseline metadata exists; generalized provenance, authenticated evidence and audit do not follow from it           |

The local baseline remains `4d2a0f004fea0cac9d908b8f4b89967a9a4bf1e3` plus the ADR edits. The resolved Nx graph is still empty. This documentation review ran no new runtime proofs and makes no claim of extracted implementation. Licensing/disclosure, Meta registration and release controls remain governed by ADR 0001 and their owning work.

**Decision and delivery status:** Architectural direction accepted; concrete new contracts, implementation proofs, stabilization, publication and adoption remain gated. None of the unimplemented external-reference, additional provenance or extension-profile capabilities is required to complete the initial behavior-preserving Foundation extraction. No method conformance, release or Blueprint adoption is authorized by this document.
