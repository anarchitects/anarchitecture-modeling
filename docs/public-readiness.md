# Public repository and distribution readiness gate

This is the gate definition for [#8](https://github.com/anarchitects/anarchitecture-modeling/issues/8).
It approves no candidate or public operation. Johan is accountable for accepting
this local gate as capability owner; technical completion and acceptance remain separate.

[#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22) applies
the gate to the final repository and package candidates.
[#23](https://github.com/anarchitects/anarchitecture-modeling/issues/23) records
later, explicitly authorized visibility and publication operations. Private
inventory, extraction, builds and local pack/install tests can proceed meanwhile.

## Review unit and evidence record

Use the [candidate review template](templates/public-readiness-review.md).
Keep the working review and sensitive evidence in an access-controlled location
**outside this repository**, which is itself intended for disclosure. Publish
only a separately reviewed, sanitized outcome summary. A private GitHub issue in
this repository is not permanent private storage after a visibility change.

Identify the repository, exact source commit, all reviewed refs and their object
IDs, review timestamp, package names/versions, lockfile digest, build environment
and commands. Inventory every proposed archive and release asset, its SHA-256,
file list and matching source revision. Record tools/versions, queries, pagination,
counts, reviewer, findings and limitations for each review surface. Git commits
do not pin mutable issue content, logs, settings or registry ownership: snapshot
those separately with retrieval time, IDs and inventory digests.

Review both operations independently:

- **Repository disclosure:** everything the visibility operation could expose,
  including history and hosted metadata, not just the chosen commit's tree.
- **Package distribution:** exact archive contents and associated registry,
  documentation, release and provenance metadata. A clean repository does not
  establish that a build archive is clean, or vice versa.

## Required review surfaces

Every row needs evidence and a disposition. Use **pass**, **blocked**,
**not reviewed**, or **not applicable with reason**. Empty lists require a
complete inventory result; an inaccessible or truncated result is not an empty
list. An unexplained gap prevents readiness for the affected operation.

| Surface                            | Required evidence and review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository history and refs        | Enumerate all branches/tags and reachable history, including deleted/renamed files and author/committer metadata. Include PR refs, server-retained content, releases/source archives, LFS objects and submodule references where present. Check listing pagination and tree truncation. A default-branch clone or `git log --all` alone cannot establish complete hosted coverage. Identify provider-retained surfaces that cannot be enumerated and resolve their exposure before approval.                                                                                                        |
| Issues and pull requests           | Inventory open/closed issues, open/closed/merged/draft PRs, bodies, titles, labels, reviews, review threads, comments, attachments and cross-references. Include edited or deleted material still accessible through platform history/retention. Review linked content, filenames, images and embedded metadata; deleting a current reference is not proof that its attachment or older text is inaccessible.                                                                                                                                                                                       |
| Docs, fixtures and other assets    | Review READMEs, ADRs, guides, generated docs, screenshots, binaries and fixture origins. Identify licensed standards material, confidential architecture, customer/personal information and proprietary consumer assets. Synthetic fixtures must be identified as synthetic and must not imply method conformance. Include wiki, discussions, Pages, downloads or other enabled publication surfaces, or evidence of their absence.                                                                                                                                                                 |
| Logs, artifacts and caches         | Inventory retained Actions runs, logs, job summaries, artifacts, release assets and relevant Nx Cloud logs/cache outputs; record access settings and retention/exposure. Inspect content, not only masked console previews. Separate expired/unavailable records from reviewed records and establish whether they can be disclosed. Include externally linked build reports.                                                                                                                                                                                                                        |
| Package archives                   | Inspect the actual packed files, declarations, source maps (including embedded source), generated output, examples, README, manifest URLs, licenses/notices and bundled helpers/assets. Check for absolute/private paths, hidden files, credentials and source-export conditions. Record what ships rather than assuming source excludes or manifest labels constrain the archive.                                                                                                                                                                                                                  |
| Rights and dependencies            | Close the [rights review](license-provenance-review.md)'s candidate findings. Map original, contributed, copied/generated and third-party material to grants and required notices. Reconcile scaffold MIT metadata with the accepted final license and actual LICENSE/NOTICE files. Resolve exact direct/transitive/runtime/peer/optional/bundled dependency versions and licenses, distinguishing shipped content from development-only tooling. Confirm intended proprietary-consumer use against those exact grants and obligations; unknown rights block distribution of the affected material. |
| Security and disclosure            | Review current secret/security findings, scanner scope/configuration and manual findings across the above surfaces. Record triage and remaining findings; a green scan or zero visible alerts is not proof of absence. Resolve exposed credentials through the security owner, including revocation/rotation and exposure review; deleting text alone is insufficient. Do not copy secret values into evidence. Unresolved disclosure or security blockers prevent the affected operation.                                                                                                          |
| Ownership, controls and public use | Verify accepted central placement/ownership, current branch/tag/environment/cache protections and the release controls from #14. Verify scope/package ownership, authorized publishing identity, workflow/environment binding, credential permissions and provenance readiness. Review public contribution/security/API/compatibility/migration docs and #20's independent packed-consumer proof. External contributors must have safe public instructions; authorized maintainers retain private governance review.                                                                                |

GitHub documents that making a repository public exposes Actions history and
logs, including private workflow repository names in some cases. Review the
current platform consequences and organization restrictions when executing this
gate; do not rely on old settings evidence.
[GitHub visibility documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).

Scanning and inventory are review work. Removing history, deleting hosted
content, rotating credentials or changing controls requires its own scoped,
authorized remediation. This gate does not authorize those mutations. If history
cannot safely be exposed, stop that visibility operation and obtain an explicit
decision on a bounded alternative; do not silently rewrite history or publish a
replacement repository.

## Safe public traceability

Classify references as approved public, restricted, or unresolved. Review not
only linked text, but repository names, URLs, issue titles/numbers, commit IDs,
author details, screenshots and generated provenance metadata where they reveal
private context. Existing links in this repository are review inputs, not
standing disclosure approval. This includes this gate's supporting records and
the older license/governance documentation.

Retain exact private origins, decisions and grants in the restricted record.
Use minimal public-facing rules, reviewed local explanations and opaque evidence
IDs in the public summary when a source cannot be exposed. Do not copy private
Meta or Blueprint content to make a public link work. Do not promise anonymous
access to a private reference or erase required third-party attribution; resolve
conflicts with the relevant rights/architecture owner before distribution.

Meta #56's accepted registration is a prerequisite for final public readiness;
PWG's review proceeds in parallel with private work. Meta #48's broader visibility
proposal is related, **not a blanket prerequisite**. This repository's gate
neither accepts that proposal nor authorizes disclosure of another repository.
Blueprint adoption and Archimatrix's method-specification questions do not block
private host-neutral extraction. Any restricted material actually included in
this candidate must still be excluded or properly cleared.

## Decisions and authority

Record the person, role/authority evidence, timestamp, candidate/inventory IDs,
exact scope, conditions and decision reference for each row. One person may hold
several roles, but record the decisions separately. There is no new universal
two-person approval rule, sprint gate or external audit requirement.

| Decision                                      | Accountable authority and boundary                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical review complete                     | Repository maintainer supplies reproducible evidence and unresolved findings. This establishes neither acceptance nor permission to release.                                                                                                                                                                                                                                          |
| Rights/disclosure findings resolved           | The relevant rights holder or accountable source/security owner supplies the required clearance or remediation evidence. Johan's original-work confirmation does not grant rights over third-party material.                                                                                                                                                                          |
| Candidate readiness accepted (#22)            | Johan, Modeling Foundation capability owner, accepts the exact bounded technical/legal/disclosure result. No unresolved distribution blocker may be waived by calling it ready.                                                                                                                                                                                                       |
| Repository visibility approved                | Identify the repository/organization decision maker under the then-current ownership and organization policy, and obtain an explicit decision for this repository and exposure inventory. Verify the executor's platform permission separately. Merge/admin access and capability release approval do not establish this decision. Unknown authority blocks the visibility operation. |
| Capability release authorized                 | Johan authorizes the exact package versions, source, artifact digests and release/tag scope under the accepted release controls. The owner or controlled automation may tag only within that authorization.                                                                                                                                                                           |
| Operations executed and verified (#23)        | The named authorized executor performs only the approved visibility/tag/publication operations and records actual results. Execution evidence is not its own authorization.                                                                                                                                                                                                           |
| Public artifacts / consumer adoption accepted | Johan accepts usable published artifacts; each consumer owner separately accepts adoption. Neither closes the other's outcome automatically.                                                                                                                                                                                                                                          |

## Readiness result and execution handoff

For #22, require complete evidence for applicable surfaces, closed blockers,
accepted final licensing/notices, accepted central registration, verified release
controls, the exact #20 package/consumer evidence and #21 public documentation.
Record nonblocking findings only with an accountable disposition, rationale,
scope and follow-up; do not relabel unknown rights, leaked confidential content
or missing required approvals as accepted residual risk.

The result is **ready for explicit operation authorization**, **blocked**, or
**incomplete**. Acceptance of a ready candidate is not permission to execute.
Visibility approval and release authorization may be captured in the same review
record only when each decision and scope is explicit. #22 performs neither.

#23 must revalidate that record immediately before each operation, confirm actual
registry/tag history and scope control, and apply #14's first-version and tagging
rules. First official distribution of each new package is `0.0.1`, with matching
manifest/tag/artifact identity; publish core before its dependent metamodel.
The current pre-release tag freeze must be deliberately replaced through #14's
authorized controls, not bypassed because this document exists.

Provenance readiness before publication is distinct from an actual registry
attestation afterward. Current npm guidance requires a public repository for
provenance and describes the public transparency record. Review that metadata
before disclosure and plan the authorized visibility/publishing sequence; do not
publish a probe merely to satisfy #22. After publication, #23 verifies registry
integrity/provenance and fresh public installation against the approved candidate.
Recheck the then-supported publishing mechanism and platform prerequisites.
[npm provenance](https://docs.npmjs.com/generating-provenance-statements/),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

If only part of an operation succeeds, stop the remaining unauthorized or unsafe
steps, record the exact exposed/published state and obtain the owner's decision
on recovery. Do not invent rollback/unpublish authority or assume disclosure can
be undone. A replacement archive or version is a new candidate.

## Drift and re-review

At handoff and immediately before execution, compare source SHA, refs/history,
archive digests/file lists, dependency resolution, build inputs/workflow,
license/provenance evidence, mutable hosted content, controls, ownership and
publishing identities with the reviewed record. Include newly generated review
comments, CI logs/artifacts and attestations in the disclosure delta.

Any change invalidates approval for the changed scope until a reviewer assesses
and records the delta. Unchanged evidence may be retained with its exact baseline;
rerun affected checks and renew affected owner decisions. A new source commit,
archive, history rewrite, dependency/license change, sensitive reference or
authority/control change cannot inherit candidate approval silently. Unknown
scope or incomplete snapshots require a broader review. Do not freeze all private
development: freeze or re-review only the candidate and proposed operation.

## Definition verification and current limits

At definition time (17 November 2026), main is
`b80f0f04cb2c9d6ec3246c74863f3e4e28c96b26`; the workspace graph has no packages.
#7 supplies the rights-review baseline and original-work confirmation; it does
not close the exact-artifact conditions. #6 supplies governance evidence and #10
the CI baseline. Final licensing/artifact review, central registration and release
controls remain with #22, Meta #56 and #14. Historical “pending acceptance” prose
in earlier reports must be reconciled with current owning-issue decisions rather
than treated as fresh candidate clearance.

The following desk checks validate this definition and its template, not an
actual disclosure review:

| Scenario                                                                            | Required outcome                                                                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Clean current tree, secret in an older branch or retained log                       | Repository disclosure blocked; historical/hosted coverage cannot be replaced by a current-tree scan.                 |
| Core and metamodel pass local tests but archive includes private source-map content | Package distribution blocked pending remediation and a new reviewed archive.                                         |
| Green CI and merged PR, no explicit visibility or release decision                  | Technical evidence only; neither public operation is authorized.                                                     |
| Approved commit, changed tarball or new sensitive PR attachment                     | Re-review the affected candidate/disclosure delta before execution.                                                  |
| Public summary cites an inaccessible private decision                               | Provide an approved local summary and restricted evidence mapping; do not disclose the private source automatically. |
| Rights or visibility authority unknown; inventory truncated                         | Incomplete/blocked for the affected operation, never pass by omission.                                               |
| Meta #48 unresolved, private extraction ready                                       | Private work proceeds; final candidate still needs its own disclosure review and accepted registration.              |

#8 is complete only when Johan accepts the gate definition and review format.
This document contains no completed candidate sign-off.

## Package documentation evidence

Before final candidate acceptance, include the accepted #55
[package documentation coverage/checks](package-documentation.md), alongside #21's
accepted baseline. Revalidate the exact README, bundled references, license/notices,
version metadata and independent quick starts against the final archives. Review
consumer usability and limitations, not only check success. Public links must work
for their intended audience before claiming public documentation readiness; local
link checks do not settle repository disclosure. The separately authorized #23
execution verifies actual registry README rendering, links and install instructions.
