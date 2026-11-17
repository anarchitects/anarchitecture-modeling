# Modeling Foundation ownership

Confirmed by Johan on 17 November 2026 for this dedicated repository.

| Role                                  | Owner                                               | Responsibility                                                                       |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Modeling Foundation capability owner  | Johan Vrolix ([@vrxj81](https://github.com/vrxj81)) | Capability scope, compatibility, outcome acceptance and release authorization        |
| Repository technical maintainer       | Johan Vrolix ([@vrxj81](https://github.com/vrxj81)) | Technical quality, CI, dependency maintenance, security triage and release readiness |
| Ecosystem architecture and SDLC owner | PWG                                                 | Cross-repository architecture and SDLC decisions through Meta                        |

Technical maintenance does not independently confer release authority. A person
may hold both roles; no backup owner or automatic delegation is assigned here.
The relevant owners resolve cross-capability priorities together.

## Source of authority and boundaries

The [central ownership register](https://github.com/anarchitects/anarchitecture-meta/blob/main/docs/ownership.md)
and accepted Meta decisions govern ecosystem assignments. Maintainers review
current revisions as required by [AGENTS.md](AGENTS.md). The register already
confirms Johan's Foundation capability role; registration of this dedicated
repository and technical maintainership remains tracked in
[Meta #56](https://github.com/anarchitects/anarchitecture-meta/issues/56).
This local confirmation does not claim central reconciliation is complete.

Foundation owns host-neutral modeling semantics and the two package contracts in
[ADR 0001](docs/adr/0001-modeling-foundation-boundaries.md). Consumers retain their
application concerns. Public HTTP contract ownership and other ecosystem
capabilities are not transferred into this repository.

Johan authorizes Foundation releases for exact candidates; an owner or controlled
automation may create a capability release tag only under that authorization.
Merge access, a successful pipeline and self-healing suggestions are not release
authorization. [#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14)
implements release controls; [#8](https://github.com/anarchitects/anarchitecture-modeling/issues/8)
defines disclosure/distribution readiness.

## Reporting and changes

Use the owning issue and PR for ordinary work. Follow [SECURITY.md](SECURITY.md)
for private reports. Ownership changes must update this file and the central
register explicitly; do not infer assignments from permissions or commit history.

Optimalist BV and Anarchitects contributors are the recorded original-work
attribution. Anarchitects is a working/branding name, not an additional legal
copyright holder. See the [rights review](docs/license-provenance-review.md).
