# Modeling Foundation Architecture Decision Records

Repository-local ADRs for the generic, intended open-source Modeling Foundation. Each record distinguishes accepted architecture from proposed mechanisms and outstanding delivery evidence. Local acceptance does not imply ecosystem registration, implementation, publication or consumer adoption.

| ADR                                                               | Status   | Topic                                                                                          |
| ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| [0001](0001-modeling-foundation-boundaries.md)                    | Accepted | Modeling Foundation scope, boundaries and responsibilities; delivery gates remain open         |
| [0002](0002-extensible-meta-metamodel-and-governance-metadata.md) | Accepted | Extensible meta-metamodel, metadata and governance semantics; implementation gates remain open |

## Authority and evidence

- Accepted ecosystem-wide decisions and cross-repository ownership remain with [Anarchitecture Meta](https://github.com/anarchitects/anarchitecture-meta), especially ADR-0004 and the accepted reuse, release and ownership policies. These local records do not supersede them. [Meta #56](https://github.com/anarchitects/anarchitecture-meta/issues/56) tracks reconciliation of the dedicated Foundation repository in the canonical records.
- [Archimatrix #12](https://github.com/anarchitects/archimatrix/issues/12) and its [maintainer-direction comment](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576) record the decision to prepare a separate Foundation repository and public reuse route.
- The existing [Archimatrix Foundation #8](https://github.com/anarchitects/archimatrix/issues/8) and [model lifecycle #9](https://github.com/anarchitects/archimatrix/issues/9) evidence establish only their bounded accepted behaviors.
- Extraction and review work is tracked by [Modeling #3](https://github.com/anarchitects/anarchitecture-modeling/issues/3), with source/host ownership classification in [Modeling #11](https://github.com/anarchitects/anarchitecture-modeling/issues/11).
- Blueprint product and governance responsibilities remain separately governed by its own ADRs and authorized owners.

**Before implementation or accepting an ADR:** perform the mandatory current-source governance preflight in the repository root [AGENTS.md](../../AGENTS.md). Review the complete ADR status and relevant implementation proofs; document conflicts and unresolved obligations. Draft PR review alone does not accept a decision.
