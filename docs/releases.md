# Package version policy and release controls

This is the #14 policy/configuration baseline. It does not authorize a release.
Johan accepts these controls as capability owner; #18 wires the publishing
workflow, #20 proves installed archives, #22 accepts the exact disclosure and
distribution candidate, and #23 records separately authorized publication.

## Independent lifecycles

`modeling-core` and `modeling-metamodel` retain their existing npm identities.
Nx Release computes their versions independently from Conventional Commits.
There are no version plans or fixed release groups. Tags use the exact pattern
`{projectName}@{version}`. The first official distribution of **each** new package
is exactly `0.0.1`, with no earlier official prerelease. Development manifests remain
private `0.0.0`; reviewed distribution manifests are staged separately.

Every allowed type has an explicit mapping in `nx.json`:

| Type                                                   | Nx intent                                 |
| ------------------------------------------------------ | ----------------------------------------- |
| `init`                                                 | None; unreleased project development only |
| `feat`                                                 | Minor before zero-major adjustment        |
| `fix`, `perf`, `refactor`, `revert`                    | Patch                                     |
| `docs`, `chore`, `style`, `test`, `e2e`, `build`, `ci` | None unless breaking                      |

Unknown types and scopes fail CI. Scoped commits must use exact active Nx project
names. A repository-wide tooling/docs change may be unscoped. Any change inside
an unreleased package uses `init(modeling-core): ...` or
`init(modeling-metamodel): ...`; split changes across packages into separate
commits and PRs when needed to preserve valid squash intent. `init` may never
carry `!` or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` trailer. A released package
cannot return to `init`, even while its version is `0.x`.

CI validates new non-merge commits and the proposed PR squash message against
the resolved graph and changed package paths. PR title/body edits rerun CI.
Enforcement starts after `db8b76f81144e2e1e3f9c36dca59ffc8dfcd0594`; historical
messages are preserved. Lifecycle tags plus fetched package tags govern commit
checks; they are not a substitute for fresh registry/channel checks at release.
After the verified 20 November 2026 publication, both projects carry
`lifecycle:released`. Subsequent changes use ordinary Conventional Commit intent;
`init` is no longer valid. Release tags supply the version baseline even though
development manifests remain private `0.0.0`. See the
[0.0.1 release record](consumer/release-notes.md).

`adjustSemverBumpsForZeroMajorVersion: true` gives fixes and compatible features
a patch increment on `0.x`; breaking changes increment minor. For `1.x` and
later, features increment minor and breaking changes increment major. A separate
candidate-specific Johan decision is required for transition to exactly `1.0.0`.

Nx uses changed files/affected projects, not commit scopes as a boundary around
compatibility impact (`useCommitScope: false`). `updateDependents: always`
includes the metamodel when core changes even if the preview selected only core;
versions need not match. A dependent patch is only Nx's proposed version: if the
core change breaks the metamodel's public behavior, its compatibility review
must reject that patch and supply correct Conventional Commit intent. Do not
hide a required dependent release by narrowing a project filter.

## Preview and verification

Use the installed toolchain (Node 24, Yarn 4.18.1, Nx/@nx/js 24.0.6). The wrapper
always invokes the public Nx `releaseVersion` API with dry-run enabled and Git
commit, stage, tag and push disabled. It writes only the requested evidence JSON.

```sh
# Exact first-version preview; neither package is published by this command.
NX_NO_CLOUD=true node tools/release/preview.mjs /tmp/foundation-first.json first modeling-core modeling-metamodel

# After release tags exist: derive proposed versions from actual commit history.
NX_NO_CLOUD=true node tools/release/preview.mjs /tmp/foundation-next.json next modeling-core modeling-metamodel

node --test tools/release/*.test.mjs
yarn nx graph --file=tmp/ci-project-graph.json
node tools/release/check-commits.mjs tmp/ci-project-graph.json BASE_SHA HEAD_SHA
```

`next` deliberately has no production disk fallback: missing release history
must not silently turn a released package into a first release. The disposable
test fixtures use disk fallback solely to test non-bumping pre-release `init`.
They create synthetic tags only inside temporary repositories without remotes,
invoke installed Nx dry runs, and assert unchanged manifests, commits and tags.
No production tag is a test fixture.

The candidate evidence guard reads a reviewed record:

```sh
node tools/release/verify-candidate.mjs /path/to/restricted-candidate-review.json
```

Its inputs are `sourceSha`, the actual Nx `projectsVersionData`, per-project
`history`, reviewed `impacts`, `authorization` and `artifacts`. See
`tools/release/policy.test.mjs` for synthetic input examples. History records
include versions, registry/tag/other-channel review flags, exact source SHA,
reference and timestamp (at most 24 hours old). Impacts are `none`, `patch`,
`feature` or `breaking`, with a review reference. Authorization binds Johan,
source SHA, every selected version, every archive SHA-256 and any explicit
`1.0.0` stabilization. Manifest, intended tag and artifact versions must agree.

The guard checks evidence consistency and minimum compatibility bumps; it does
not authenticate a JSON assertion, infer API compatibility, retrieve archives or
authorize a release. #18 must obtain Nx output directly, derive archive metadata
and hashes from actual artifacts, validate the review/authorization references,
and call this guard immediately before any external mutation. Do not accept
untrusted PR-supplied approval fields as owner authorization. Recheck mutable
registry/tag history immediately before execution even within the 24-hour window.
The gate currently accepts stable distributions only; a later prerelease workflow
would need explicit policy and tests, without changing the first-release rule.

## Owner-defined control proposal for acceptance

1. Johan records authorization for the exact source, package versions, archive
   hashes and intended tag set, after compatibility and candidate-readiness
   acceptance. Stabilization is explicit and package-specific.
2. PRs and the existing required `main` check protect release configuration.
   Ordinary CI has read-only GitHub permissions and no npm publish credential.
3. Tag creation remains frozen. The [first-release tag plan](first-release-tags.md)
   supplies the proposed executor, exact-name payloads and restoration sequence
   for #22 review and separately authorized #23 execution. Replace only the required creation restriction with
   narrowly authorized owner/bot access; preserve tag update/deletion protection.
   Do not grant blanket tag bypass merely to test a release.
4. The owner or controlled automation may create capability tags only within
   the recorded authorization. Proposed Git commands are disabled by default in
   Nx config; direct CLI overrides do not confer authorization. The existing
   server-side freeze is the active enforcement boundary today.
5. Fresh history/identity/readiness checks, tagging and publication are uncached.
   Reuse cacheable build/test/lint/typecheck tasks, but inspect the actual archives.
   Publish core before its dependent metamodel. Stop on mismatch or partial
   failure and obtain the owner's recovery decision; no automatic rollback,
   republishing, tag rewriting or version improvisation.

Accepting #14 selects this policy baseline; it does not approve a release
candidate or activate new tag permissions. #18 owns the operational workflow and
any corresponding authorized control transition. The guarded workflow and staged
artifact procedure are documented in [publishing.md](publishing.md); their presence
does not authorize publication or change the live tag freeze.

## Initial history and evidence

On 17 November 2026, against main
`db8b76f81144e2e1e3f9c36dca59ffc8dfcd0594`, complete authenticated GitHub tag and
release listings were empty. npm metadata queries to `https://registry.npmjs.org`
for both package names returned 404. This establishes no visible distribution in
those queries; it does not establish npm scope control or exclude hidden/deleted
history or distribution through other channels. Those questions require fresh
owner-reviewed evidence before first publication; never turn a network/authentication
failure into an empty release history.

The #14 PR records installed-Nx scenario results and a real-workspace first
version preview. No existing version, lockfile or production tag is rewritten.
This policy follows the session's verified accepted versioning, caching and
release-authority decisions; no public runtime contract changes.

## Documentation readiness

Apply the [package documentation gate](package-documentation.md) to each affected
candidate. Missing, stale, wrong-package or materially unusable documentation blocks
that package's readiness. Verify the actual packed README/resources and executable
examples; documentation edits alone do not prove usability. Record version-specific
notes and recheck the exact final candidate after documentation drift. #22 accepts
pre-publication readiness; #23 separately verifies public distribution pages after
authorized release. The local gate now aligns with accepted Meta ADR-0024 at
`734488ba1bd960dcaa2f61fea899ab49d26c1bd3`; it grants no publication or visibility
authority.
