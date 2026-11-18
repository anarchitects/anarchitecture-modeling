# Foundation license reconciliation

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22),
following the initial review merged in PR #52. This change applies the recorded
original-work authority and attribution from [#7's rights review](license-provenance-review.md).
It is a license and packaging change for review, not final candidate acceptance.

## License and attribution

The root [LICENSE](../LICENSE) contains the unmodified
[Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0.txt).
[NOTICE](../NOTICE) names Optimalist BV and Anarchitects contributors and identifies
Anarchitects as a working, collaboration and brand name, not another legal entity.
The collective attribution does not assign contributors' rights to Optimalist BV.

Root scaffold MIT metadata is replaced by Apache-2.0 for original Foundation work.
Copied Nx tooling keeps its MIT grant in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md);
third-party rights are not relabeled. The reviewed external runtime dependency
`tslib@2.9.1` remains separately installed under its own 0BSD license and copyright
notice. Its code is not bundled into these package archives.

Apache-2.0 permits separable proprietary consumers without requiring disclosure
of their source merely for linking the library. Its redistribution, attribution,
modification-notice, patent and trademark terms still apply; the license is not
permission to disclose private material or use a third party's licensed standard.
No new API, dependency, model format or consumer migration is introduced here.

## Candidate preparation and gates

The existing preview wrapper stages `license: Apache-2.0` and exact root LICENSE
and NOTICE copies into both archives. Development manifests remain private at
`0.0.0`; release metadata continues to be derived in the staging directory, without
changing workspace dependencies. The Nx first-version preview remains `0.0.1`.

The configuration's `license.status: pending` records unresolved **final candidate
clearance**, not missing license text. Prepared archives remain `private: true`.
`enabled: false` still rejects publication before network access, and the manual
workflow's independent disabled guard remains unchanged. No tag, release,
environment, registry permission or visibility setting is changed.

Archive verification, installed-consumer verification and the publisher compare
LICENSE/NOTICE bytes with this checkout and require matching license metadata.
Tests reject stale SPDX metadata, empty/missing files, old placeholders and
modified legal text. This verifies file agreement, not legal sufficiency or owner
acceptance. The current preparation tests deliberately require the pending/private
state; a later reviewed clearance/activation change must update those assertions.

The previous [review hashes](readiness-review-status.md) identify placeholder
archives and remain historical evidence. New exact archives must be reviewed
after this change, and again after merge or any later source/configuration change.
Private references and repository links, disclosure coverage, central registration,
#44 evidence, security dispositions and execution controls remain open under #22.
Owner readiness acceptance and #23 publication authorization are separate.
