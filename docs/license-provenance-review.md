# Foundation license and provenance review

Evidence for [issue #7](https://github.com/anarchitects/anarchitecture-modeling/issues/7),
17 November 2026. **Review ready for owner acceptance; original-work licensing
authority confirmed. No license-file change or distribution clearance.**
Johan owns the capability decision. The confirmation below is the authority
evidence for original work; repository maintainership alone is not that evidence.

## Reviewed baseline

- Modeling: `6fbbfa6547a3e66706c818ea89af5aefb0c94973`.
- Archimatrix: `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`.
- Meta: authenticated default `main` at
  `4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, revalidated unchanged.
- Local instructions and accepted ADRs 0001/0002 retain Apache-2.0 as the preferred
  direction, subject to rights and dependency review. Archimatrix #12's current
  body/comments retain the same gate. No final license is inferred from them.

The session's complete Meta inventory and mandatory-document review remains
applicable: accepted ownership, public-contract, upstream-reuse and release
decisions govern this work. Proposed governance models remain proposals.
This review changes no package contract, dependency or consumer policy.

## Source and rights inventory

| Candidate material                              | Observed origin and evidence                                                                                             | Remaining review                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Core code/tests/configuration                   | Archimatrix `packages/modeling/core/`: 16 tracked files, including 7 implementation/export files and 2 test files        | Per-file provenance, copied/generated content, grants and notices                                           |
| Metamodel code/tests/configuration              | Archimatrix `packages/modeling/metamodel/`: 55 tracked files, including 32 implementation/export files and 16 test files | Same, including synthetic method fixtures embedded in tests                                                 |
| Foundation proof and architecture docs          | Source handoff/proof documents and ADRs referenced by local ADRs 0001/0002                                               | Select actual excerpts/assets for extraction; inspect each one's rights rather than copying whole documents |
| Modeling scaffold/docs/workflow                 | Six commits through the reviewed baseline; author metadata names Johan Vrolix and `nx-cloud[bot]`                        | Establish original versus Nx-generated material, generator license obligations and any external inputs      |
| Host, method-pack and private consumer material | Outside the two package directories; ownership exclusions in ADR 0001                                                    | Do not import host/product content or licensed standards material merely because it is adjacent             |

The pinned GitHub commit query for `packages/modeling/` returned 17 commits in a
single page below the 100-item limit. All name Johan Vrolix as commit author;
none contains a `Co-authored-by` trailer. Initial scaffold commit:
`b8ae583753c1a503f70566c87b3de5156485abb5`; latest matching commit:
`e5c5728d1192ea668e813203eee9fcd9182c9916`.
Squashed Git history is **not** proof of sole authorship, copyright ownership,
employer/client clearance, contributor permission or absence of copied code.

The [file-level inventory](license-provenance-inventory.md) records all 71 source
package paths, their introduction and latest-change commits, the 18 supporting
proof/tooling paths and all 47 tracked Modeling baseline files. Each of the 17
source commits' changed-file lists fit on one page; all 71 package paths have
identified introduction/latest-change commits. That establishes repository
lineage, not the upstream origin of every idea, snippet or generated template.

A text scan covered every package file for license/copyright headers, copied or
adapted-source markers, external source links and restricted-material terms.
It found no copyright/license headers or copied/adapted-source markers. Flagged
ArchiMate references in the READMEs and two tests describe synthetic seams and
scope exclusions. Customer examples identify synthetic sources/fixtures; no
customer dataset or specification figure was identified. All 71 files are text;
there are no binary image/PDF assets within those package directories. These
bounded checks are not proof of originality, rights ownership or standards
conformance. The owner confirmation and third-party conditions below still apply.

The complete Modeling and Archimatrix trees lack tracked LICENSE/NOTICE files. Both root
manifests declare MIT; neither source package manifest declares a license.
Archimatrix's CONTRIBUTING.md describes engineering/acceptance workflow but no
explicit contributor-rights grant. Its OWNERSHIP.md confirms Johan's capability
role, not title to every asset. No complete per-file rights clearance is claimed.

## Copyright attribution and Anarchitects naming

On 17 November 2026, Johan specified **Optimalist BV and Anarchitects contributors**
for Foundation's copyright attribution and clarified that **Anarchitects is a
working/branding name**. Use the following wording when preparing the later
license/notice change:

> Copyright © 2026 Optimalist BV and Anarchitects contributors.
>
> Anarchitects is used as a working, collaboration and brand name.

Optimalist BV is the named company; do not present Anarchitects as an additional
legal entity. The collective contributor attribution does not establish an
assignment of each contributor's rights to Optimalist BV. Preserve any applicable
individual or third-party attribution.

### Checked repository precedents

Default branches were resolved and reads pinned on 17 November 2026. All four
recursive tree inventories were complete (`truncated: false`). This is a bounded
comparison of checked-in wording, not an organization-wide or published-artifact
license audit.

| Repository and inspected revision                                | Evidence                                                                                                                                                                                                                                                                                                                                                    | Finding                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Community `main`, `3ff3325da7a5eba6dd66b8ffd9d5475000192639`     | [Root NOTICE](https://github.com/anarchitects/anarchitecture-community/blob/3ff3325da7a5eba6dd66b8ffd9d5475000192639/NOTICE), LICENSE, CONTRIBUTING.md, governance-core manifest; [SSR package NOTICE](https://github.com/anarchitects/anarchitecture-community/blob/3ff3325da7a5eba6dd66b8ffd9d5475000192639/packages/nest/angular-ssr/NOTICE) and LICENSE | Root and SSR notices use the selected attribution and describe Anarchitects as a collaboration and brand name. Apache-2.0 is declared; CONTRIBUTING.md states contributions use the repository license.           |
| Plugins `main`, `b8a8b595f0a759dd4797267295859266a0ba4dd3`       | [Root NOTICE](https://github.com/anarchitects/anarchitecture-plugins/blob/b8a8b595f0a759dd4797267295859266a0ba4dd3/NOTICE), LICENSE, CONTRIBUTING.md; [Nest LICENSE](https://github.com/anarchitects/anarchitecture-plugins/blob/b8a8b595f0a759dd4797267295859266a0ba4dd3/packages/nest/LICENSE)                                                            | Root Apache-2.0 attribution/naming matches Community. Nest is an explicit MIT exception, whose package copyright line names Anarchitects alone; do not generalize root wording or licensing across every package. |
| Bricks 3-Tier `main`, `c4437d42f8198559bddfc192206c107a2e62ef87` | [Root manifest](https://github.com/anarchitects/anarchitecture-bricks-3tier/blob/c4437d42f8198559bddfc192206c107a2e62ef87/package.json) and complete tree                                                                                                                                                                                                   | MIT root metadata; no tracked LICENSE/NOTICE file found. Does not supply the Community/Plugins notice precedent.                                                                                                  |
| Bricks DDD `main`, `8000e071639de9333467ec9bcef79542282e419a`    | [Root manifest](https://github.com/anarchitects/anarchitecture-bricks-ddd/blob/8000e071639de9333467ec9bcef79542282e419a/package.json) and complete tree                                                                                                                                                                                                     | MIT root metadata; no tracked LICENSE/NOTICE file found. Does not supply the Community/Plugins notice precedent.                                                                                                  |

Community and Plugins therefore corroborate Johan's requested wording. Their
license files and contribution policies do not grant rights to Foundation assets
originating elsewhere. No files in those repositories were changed.

### Owner confirmation

On 17 November 2026, after reviewing the attribution and provenance findings,
Johan replied **“I confirm”** to the request to confirm authorization to license
Optimalist BV's original Foundation work under Apache-2.0 and identify outside
contributions, employer/client restrictions or copied/generated material. This
records the original-work authority confirmation. No additional restrictions or
outside inputs were identified in that response; it is not an independent audit
of their absence or a grant over third-party work.

Use the confirmed attribution for original Foundation work. Separately owned
code, templates, generated/copied tooling and dependencies retain their applicable
rights and notices. Newly identified rights conflicts must be resolved before
distributing the affected content. Keep confidential grant evidence access-controlled.

## Dependency and shipped-content inventory

The source core manifest declares only `tslib: ^2.3.0`; metamodel declares core
via `workspace:*` and `tslib: ^2.3.0`. Neither declares peer or optional
dependencies. Both source and destination lockfiles resolve that tslib range to
**2.9.1**. The installed 2.9.1 manifest declares **0BSD** and no dependency, peer or
optional edges; its LICENSE.txt and CopyrightNotice.txt identify Microsoft.
This is the manifest-derived external runtime closure, not an audited tarball.

The separate lockfile entry for tslib 2.8.1 must not be mistaken for the package's
resolved `^2.3.0` entry. Recheck the actual final dependency tree at publication.

| Installed direct development dependency | Version | Manifest license |
| --------------------------------------- | ------- | ---------------- |
| `nx`, `@nx/js`                          | 24.0.6  | MIT              |
| `prettier`                              | 3.6.2   | MIT              |
| `typescript`                            | 6.0.3   | Apache-2.0       |
| `@swc/helpers`                          | 0.5.24  | Apache-2.0       |
| `tslib`                                 | 2.9.1   | 0BSD             |

An installed-tree inventory covered **273 distinct name/version pairs** on the
review machine, including nested dependencies: MIT 236, ISC 19, BSD-2-Clause 6,
Apache-2.0 4, BSD-3-Clause 3, 0BSD 2, and one each Python-2.0, BlueOak-1.0.0 and
CC-BY-4.0. No inspected manifest lacked license metadata. This is the installed
development tree, not every platform-optional resolution in the lockfile and not
a claim that those dependencies ship with Foundation.

The non-default metadata cases are `argparse@2.0.1` (Python-2.0),
`minimatch@10.2.5` (BlueOak-1.0.0) and `caniuse-lite@1.0.30001826` (CC-BY-4.0).
Their license files are present. If their code/data enters a distributed artifact,
review the actual terms and retain required attribution instead of relabeling it
Apache-2.0. Nx's LICENSE and `@nx/js/dist/LICENSE` contain the MIT grant and Narwhal
copyright notice; retain applicable upstream notices for copied scaffold/tooling.
Exact origin and notice obligations for checked-in skills/generated files remain
a recorded provenance question, not a blanket grant inferred from Nx's license.

Source import inspection found core/metamodel-relative imports and the inward
metamodel-to-core dependency; the package tooling references `vitest/config` and
`jsonc-eslint-parser`. `tslib` is also a declared runtime dependency used by
TypeScript helper emission. The library configs exclude test files, enable JS
emission, and inherit `importHelpers` and declaration maps. These settings do not
by themselves constrain an npm archive's file list or prove what it bundles.

This is metadata and source-configuration inspection, not complete transitive
license clearance. Nx/tooling is development-only by architecture, but emitted helpers,
bundled dependencies, declaration files, source maps, templates and copied assets
must be inspected in actual outputs. No packages or final artifacts exist in this
repository yet. Do not infer that everything under a development dependency is
shipped, or that everything it generates is free of upstream obligations.

## Proposed license rationale and limits

Apache-2.0 remains a suitable candidate for the stated open-source library and
proprietary-consumer direction: it permits use and redistribution with conditions
and includes an express contributor patent grant. It does not require publishing
a separable consumer's source merely because it links the library. Redistribution
must include the license, retain relevant notices, mark modifications and carry
applicable NOTICE attribution. It grants no general trademark permission.
These conclusions concern the license text, not clearance of these assets.
[Apache-2.0 terms](https://www.apache.org/licenses/LICENSE-2.0) and
[ASF licensing FAQ](https://www.apache.org/foundation/license-faq.html).

Retain third-party licensing independently of the license chosen for original
Foundation work. Where an actual MIT grant applies to copied material, retain
its copyright and permission notice. A manifest label alone does not establish
the complete grant or copyright holder.
[MIT terms](https://opensource.org/license/mit).

Do not introduce The Open Group specification text, figures or other licensed
standards material. Synthetic fixtures must have documented origins and must not
claim standards conformance. Exclude private Meta/Blueprint documents, product
code, customer information and credentials. The separate Archimatrix standards
licensing questions do not prevent private host-neutral Foundation work.

## Review completion and acceptance handoff

- [x] Record owner-selected copyright attribution and the Anarchitects working/brand-name distinction, corroborated against Community and Plugins.
- [x] Record Johan's confirmation of authority to license Optimalist BV's original
      Foundation work under Apache-2.0; distinguish third-party rights.
- [x] Inventory current source package files, tests/fixtures, supporting docs/tooling
      and Modeling files, with exact revisions and known origin limits. #9/#11 still
      own extraction selection and destination mapping.
- [x] Inspect declared runtime dependencies, installed development dependencies,
      shipped-content risks and retained-notice requirements; record unresolved
      copied/generated-origin questions rather than claiming clearance.
- [x] Record remaining copied/generated provenance and notice verification as
      distribution conditions, with the exact-artifact gate below.
- [ ] Owner acceptance of this review and the proposed license decision through
      PR review. Only a later reviewed
      change may replace scaffold MIT metadata and add final LICENSE/NOTICE text.

### Remaining distribution conditions

The original-work authority question is answered by Johan's confirmation. This
review supplies the evidence-backed decision requested by #7; it does not clear
every future artifact. #9/#11 must preserve provenance while selecting and moving
files. #22 must verify exact copied/generated origin, license/notice inclusion and
restricted-content exclusion in the distribution candidate, including checked-in
tooling if the repository itself becomes public. An unresolved third-party right
blocks distribution of the affected content. No new runtime incompatibility was
identified in the bounded manifest review; no final compatibility opinion is
claimed for unknown artifacts. Publication and consumer adoption retain their
separate authorization gates.

## Repeatable final-artifact gate

For each exact package candidate, record the source commit, package version,
lockfile, build environment and archive digest. Inspect the packed file list and
contents, not only source manifests. Resolve runtime/transitive/peer/optional
dependencies and bundled helpers; retain all required license/notice files and
attribution. Inspect docs, fixtures, source maps, declarations and assets for
restricted material. Verify consumer obligations against that exact artifact.
Record rights-review evidence and Johan's acceptance separately from publication
authorization. Recheck this gate under #22 before first distribution; unresolved
rights block distribution, not private development/tests.
