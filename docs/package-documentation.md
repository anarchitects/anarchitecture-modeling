# Package documentation coverage and verification

Refs [#55](https://github.com/anarchitects/anarchitecture-modeling/issues/55), under
Epic #4. Johan requested this local rollout on 18 November 2026, while Meta
ADR-0024 was proposed. PWG accepted the ecosystem policy on 20 November 2026;
the accepted record is now on Meta main at
`734488ba1bd960dcaa2f61fea899ab49d26c1bd3`, path
`adr/0024-public-package-documentation.md`. The existing local checks implement
the framework-neutral library profile. Policy acceptance and each artifact's
verification remain separate; #21's accepted documentation is the starting point.

## Package profiles and coverage

Both intended public packages are framework-neutral TypeScript/JavaScript
libraries. Metamodel exposes pack definitions/composition and a versioned codec,
so its documentation also covers pack identity, exact pins, registry input, formats,
diagnostics and unsupported data. It does not distribute a method/rule pack or
vendor assets. Nx is build tooling, not a consumer interface. Angular, Nest, CLI,
HTTP-client, renderer and host-loaded adapter profiles do not apply to these
artifacts; no empty profile sections or new runtime dependencies are required.

| Topic                                   | Core evidence                                                         | Metamodel evidence                                                  |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Purpose and limits                      | Own README: structural model/view data, no method engine              | Own README: composition/validation/lifecycle, host responsibilities |
| Availability and install                | Copyable npm install; archive substitution stays in engineering proof | Copyable npm install; declared core dependency                      |
| Prerequisites                           | Node 24 ESM; JS quick start without compiler/Nx                       | Same; both direct imports explained                                 |
| Quick start                             | Create Customer; reject duplicate identity                            | Require Customer definition; show invalid then valid                |
| Workflows and public surface            | Named exports, IDs/revisions, structure/references/views              | Exact pins, diagnostics/coverage, defaults/commands/history/codec   |
| Inputs, side effects and responsibility | Trusted typed input, no mutation/I/O; caller lifetime/host policy     | In-memory candidates, host authorization/atomic commit/recovery     |
| Examples                                | README JavaScript with expected output, API reference                 | README JavaScript plus full TypeScript lifecycle example            |
| Troubleshooting/support                 | Import/deep-path/runtime/identity/structure remedies, contact         | Peer/pin/coverage/stale-command/codec remedies, contact             |
| Lifecycle/versioning                    | Independent 0.x policy, support limits, migration/release notes       | Exact companion version and distinct pack/format axes               |
| License and notices                     | Apache-2.0, NOTICE and separate helper terms                          | Same; synthetic examples carry no standards certification           |
| Packaging/version references            | README and offline resources; source-SHA online links                 | Same, per-package artifact/version footer                           |

Source entry points are [core](../packages/modeling-core/README.md) and
[metamodel](../packages/modeling-metamodel/README.md). Detailed references are the
[consumer guide](consumer/README.md), [API](consumer/api.md),
[migration](consumer/migration.md), [release notes](consumer/release-notes.md) and
[lifecycle example](consumer/examples/lifecycle.mts). Common references identify
which package owns each operation; the core-only quick start requires no metamodel.
No general-purpose cross-method transformation or unimplemented profile extension
is advertised.

## Artifact and executable checks

`tools/publishing/documentation.mjs` constructs a bounded documentation inventory
from reviewed source. Staging copies the guides/example into `docs/`, pins README
online links and manifest homepage to the source commit, and records the committed package
version in the README. It ships consumer comparison/authoring guides and executable examples; engineering proof and publication execution records remain outside consumer documentation. This does not add runtime exports or dependencies. The raw
Yarn workspace pack remains a development packaging proof; the staged npm candidate
is the distribution archive inspected here.

Archive verification, installed-consumer checks and the guarded publisher compare
all expected documentation bytes with the reviewed source and check local links
and supported heading anchors. Regression cases reject missing/wrong-package/stale
READMEs, altered shipped examples, unpinned homepage, missing/escaping local targets,
missing anchors and absent/duplicate executable markers. Link parsing is bounded to
these inline Markdown pages, not a general website crawler or HTTP-access check.

The independent consumer uses the README's `npm init`/installation flow, substituting exact candidate archives for registry package names
with the existing credential-free disposable environment. It first installs core
alone, verifies that only core and tslib are present, extracts the installed
README's JavaScript and compares its output with the README expectation. It then removes the consumer installation/configuration, installs the exact
metamodel pair in a fresh npm project and repeats its quick start. No compiler or Nx is
installed at this stage. The later TypeScript proof uses the lifecycle file shipped
in the installed archive, with the existing strict NodeNext/Node16 checks. Locked
reinstallation repeats both README examples and the existing runtime/type proofs.
Evidence records the exact candidate, toolchain, README/example hashes, commands
and expected/observed output.

Run with this workspace's pinned toolchain:

```sh
node --test tools/publishing/*.test.mjs
NX_NO_CLOUD=true yarn nx run-many -t build test lint typecheck
NX_NO_CLOUD=true node tools/publishing/verify-archives.mjs
NX_NO_CLOUD=true node tools/consumer/check.mjs tmp/docs-consumer-evidence
```

Archive preparation requires a clean commit and a new output directory. CI
checks current-version snapshots that the publisher refuses; release previews
require committed source versions matching Nx's calculation. These are
verification commands, not publication instructions. Existing CI already runs the
publishing tests/archive proof and the fresh consumer proof. Tooling changes are
covered by shared Nx inputs; package READMEs are project inputs and consumer docs
are existing metamodel/package-check inputs. Archive, fresh-install and network
checks remain uncached. Builds/tests retain their existing cache policy. Report
actual affected selection and task results in the PR; no new docs service or
universal target is introduced.

## Review and release handoff

Technical checks do not prove explanatory accuracy or consumer usability. Review
both READMEs and the coverage table against the actual public contract. Update
README/references/examples/migration information in the same PR as consumer-visible
changes, or record why no change is needed. Missing or materially unusable docs
block the affected candidate's readiness.

The repository and both `0.0.1` packages are now public. #22 accepted the exact
candidate; #23's [execution evidence](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7036881404)
records public npm README rendering, version-pinned links, exact registry installs,
quick starts, declarations, runtime/lifecycle checks and provenance verification.
The coverage table above retains the original local-archive preparation evidence;
registry availability and limitations are recorded in the
[0.0.1 release notes](consumer/release-notes.md). The immutable archives retain
some prepublication wording; Johan owns cleanup for the next reviewed candidate.
The tested commands work, but the wording must be reconciled before another release.
Neither these checks nor publication establish consumer adoption or Johan's final
#23 outcome acceptance.

## Documentation revision during #84

Both READMEs now prioritize npm installation and a useful Customer example.
Hardcoded package versions and contributor archive-setup instructions were removed
from usage pages; runtime prerequisites and serialized contract identifiers remain.
Release-specific version numbers remain in release notes. The publication execution
record is retained in [engineering history](proofs/publication-history.md), not
shipped as consumer guidance. The uncached `authoring-contract-check` also renders
the real staged documentation, installs the private local archives, verifies
offline resources and executes both installed README examples. Working-tree
archive evidence does not certify publication or live links for uncommitted files.
