# Public-readiness review status

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22).
Review `MF22-2026-11-18-r1` applies the [readiness gate](public-readiness.md) to
source `dbad7c21985e23303511c3a0320137c534260eb0`. **Result: blocked; no readiness,
visibility or release authorization.** This is a sanitized progress summary.
Johan is the custodian of the restricted working record held outside this
repository. Raw inventories, findings, logs and provider snapshots stay there.

Follow-up [disclosure classification](disclosure-classification.md) refreshes the
identified F02 findings after PR #53 and records scoped owner decisions. It does
not replace this initial snapshot or grant final disclosure clearance.

Repository disclosure and package distribution are reviewed separately. Technical
checks below do not resolve rights, confidential-content decisions or authority.
The working record uses the [review template](templates/public-readiness-review.md)
and records gaps rather than treating unavailable evidence as an empty result.

## Pinned private test artifacts

Node 24.22.3, npm 11.19.1, Yarn 4.18.1 and Nx 24.0.6 were used on macOS arm64.
Lockfile SHA-256:
`10196c9de0d536f88a86b829e58bdd69ad515063263d9013968d2e365d3d1792`.

| Artifact           | Version | Files | Packed / unpacked bytes | SHA-256                                                            |
| ------------------ | ------- | ----- | ----------------------- | ------------------------------------------------------------------ |
| modeling-core      | 0.0.1   | 18    | 9115 / 32943            | `4cca6c1ca8e7ae3f8e0ce66e492075f2704eca50bdf54f8a42bcee1bd2f2d868` |
| modeling-metamodel | 0.0.1   | 68    | 53839 / 234251          | `ff1a84a8324aaa2f324d5bccc243e1257d5305207adb606b34a4f65238229605` |

These are **historical private test archives**, prepared through the existing preview-only
wrapper. Both retain `private: true`, `license: UNLICENSED` and pending legal
files. Their hashes must not be used as authorization for a later licensed build.
No tag or versioned registry artifact was created. The subsequent
[license reconciliation](license-reconciliation.md) replaces their legal
placeholders in new candidates; it does not change these recorded bytes or clear
them retroactively.

Both builds and the fresh [independent-consumer proof](independent-consumer.md)
passed against these exact bytes. The proof verified runtime-only installation,
tarball/installed-file agreement, ordinary exports, negative dependency/import
cases, TypeScript 6.0.3 strict NodeNext and Node16 resolution, lifecycle examples
and locked reinstallation. Runtime closure is exactly core, metamodel and
`tslib@2.9.1`; the external helper has no dependency/peer/optional edges and its
inspected license is 0BSD. Nx, TypeScript and test tools are not shipped runtime
dependencies. No maps, symlinks or links to the reviewed private upstream/consumer
sources were found in the 86 archive entries. The archives' own repository links
still point to this private repository. This does not clear the legal placeholders
or establish public availability.

The current `.yarn/` exclusion remains effective, but an older
`.yarn/install-state.gz` is still reachable in history. It was decompressed and
decoded for the restricted scan along with all 317 collected Git blobs. No
credential detection resulted. Removal from the current tree is not historical
erasure; no history rewrite was performed or authorized.

## Review evidence and limits

| Surface                            | Evidence at this snapshot                                                                                                                                                                                                                                      | Disposition                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| History and refs                   | Restricted mirror: 28 advertised refs, including 27 PR heads; 58 reachable commits; 211 historical paths; 209 current tracked files, all text; no discovered submodule/LFS metadata                                                                            | Reachable inventory collected and scanned; disclosure classification and unadvertised/deleted provider-retained objects remain open |
| Hosted discussion                  | 51 issue/PR records, 27 PRs, 101 issue comments; PR reviews/timelines retrieved; 152 unique editable objects and 88 returned edits, without additional edit pages                                                                                              | Private-reference and identity disclosure decisions remain open; available text is not proof of all deleted content                 |
| Attachments and ancillary surfaces | No attachment URLs identified in the current inventoried bodies/comments; Pages/discussions/downloads disabled; no releases or deployments listed                                                                                                              | Wiki is enabled but its Git endpoint was unavailable; deleted attachments and inaccessible retained surfaces are not cleared        |
| GitHub Actions                     | All 62 listed run logs and 16 non-expired artifacts downloaded; five cache entries inventoried                                                                                                                                                                 | Retrieved contents scanned; cache metadata is not cache-byte or job-summary review                                                  |
| Credential scan                    | Gitleaks 8.30.1 with redaction, default rules, ignored inline allow directives and no repository ignore file; history, retrieved hosted content and edit text returned zero detections                                                                         | Bounded detector result, not proof of secret absence or general disclosure clearance; GitHub secret scanning is disabled            |
| Copied tooling                     | All 23 skill files traced to a pinned public upstream; Codex adaptations inspected                                                                                                                                                                             | Verified upstream MIT notice added in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md); other rights conditions remain separate  |
| Public package docs                | Accepted #21 evidence retained; current README/API/migration material and tested examples available                                                                                                                                                            | Release-facing README/version wording must be reconciled for the final licensed candidate                                           |
| npm scope/history                  | Authenticated `vrxj81` is an `@anarchitects` owner; target names absent from accessible package listing, both version queries returned 404; Johan confirmed no prior registry/deleted/prerelease/private shared-package distribution, excluding internal tests | Bounded first-distribution evidence recorded; repeat fresh checks before execution                                                  |
| Repository controls                | Strict required `main` check, PRs, resolved conversations and admin enforcement; no force push/deletion; active tag freeze; read-only workflow default; main-only cache-write environment; empty PR environment secret list                                    | Observed controls pass the reviewed private-development baseline; no publication controls activated                                 |

Public visibility would expose Actions history and logs, so repository disclosure
cannot be established by reviewing only source or package tarballs.
[GitHub visibility consequences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).

The bounded Nx Cloud inventory for 1–18 November returned 54 CI pipeline
executions, 53 completed runs and 260 tasks, with no remaining pagination cursor.
All 369 advertised assets (260 logs and 109 cache artifacts) were downloaded and
decoded successfully. Their credential scan returned zero detections. Selected
private-source URL/workstation-path checks also found no matches in the decoded
files; those checks are not exhaustive content classification. The subsequent
[D4 access review](nx-report-disclosure.md) records current repository-linked
visibility and two anonymous report-page denials. Audience disposition and relevant
content review remain pending. Under the subsequent proportionate review direction,
unknown retention terms alone are a conditional follow-up, not an automatic
publication blocker while reports stay restricted. Other F07 gaps remain separate. No remote
cache policy or credential was changed for this review.

## Outstanding dispositions

| Finding                         | Required next action                                                                                                                                                                                                | Accountable owner                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| F01 — Final licensing           | LICENSE/NOTICE and root/staged manifest reconciliation implemented in the [follow-up](license-reconciliation.md); owner review and exact final-candidate clearance remain pending, with third-party grants retained | Johan and maintainer                  |
| F02 — Disclosure classification | [D1–D6 classification](disclosure-classification.md) prepared; Johan approved scoped D1/D3 retention. D2 source-owner review and D4 report access evidence remain pending; coverage gaps are not waived             | Relevant source/security owners       |
| F03 — Fork-window deviation     | Review the exceeded deadline and unavailable transient-fork audit evidence recorded in the [fork report](private-fork-ci-evidence.md)                                                                               | Organization administrator            |
| F04 — Central registration      | Obtain the required ecosystem placement/ownership acceptance                                                                                                                                                        | Ecosystem architecture owner          |
| F05 — Genuine bot event         | Complete #44's real Dependabot PR verification; its closed GitHub state does not replace the missing evidence recorded in its comments                                                                              | Johan and maintainer                  |
| F06 — Security findings         | Record explicit triage/disposition of the two development-dependency alerts; distinguish those paths from the shipped runtime closure                                                                               | Johan, security maintainer            |
| F07 — Coverage and access       | Resolve provider-retained/deleted-content, wiki, job-summary/cache-content and external report access/retention gaps                                                                                                | Maintainer and provider/account owner |
| F08 — Execution controls        | Review the proposed release environment, first-publication authentication and narrow tag-creation transition before activation                                                                                      | Johan and organization administrator  |
| F09 — Final candidate           | Prepare and review new licensed archives and their documentation; repeat affected checks and record exact candidate acceptance                                                                                      | Johan                                 |

F10, the identified copied-tooling notice omission at the baseline, is addressed
by this review PR. It does not retroactively clear historical copies or select
the original-work license. No issue body, history, hosted content, credential,
visibility, release setting or dependency was changed to remove a finding.

There is no blanket approval to disclose private sources. There is no new
two-person approval rule. The existing named authorities resolve their own
findings; publication remains separately authorized through #23.

## Revalidation and handoff

Meta default `main` remains at `4f0339d86f0ebfa073173ad307cb67c8d6042bdd`; the
complete previously examined eight-document/25-ADR source set was revalidated.
Applicable accepted ownership, public-contract, independent-versioning,
dependency-maintenance, caching, SDLC/release and public-reuse decisions remain
operative. Local accepted ADR0001/0002 and current ownership/release instructions
apply. Existing upstream revisions and source-direction evidence were refreshed;
no runtime/API change, source extraction, consumer adoption or policy exception
is introduced by this review.

This PR itself adds a source/disclosure delta. Before final sign-off, re-pin the
candidate, review new refs/comments/logs, reconcile each open finding and prepare
fresh exact archives after legal changes. Do not reuse the test hashes above as
final clearance or infer acceptance from merge or green CI.
