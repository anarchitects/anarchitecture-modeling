# Controlled npm publication

Issue [#23](https://github.com/anarchitects/anarchitecture-modeling/issues/23)
activates the guarded publisher prepared under #18. `tools/publishing/config.json`
has `enabled: true`; this permits the manual publication path, not a release
without approval. Preview remains the workflow default. Publication still requires
public source, the protected `npm-release` environment, exact current owner
records, matching tags and reviewed archives. Root and development package
manifests remain private. The publisher cannot create tags, credentials,
environments or change repository visibility. Johan (@vrxj81) remains the
accountable release owner.

Both packages are public at `0.0.1`. The first attempt published core and the
separately authorized recovery published the original metamodel archive. Registry
consumer checks and provenance verification passed; both temporary tokens are
revoked and the environment has no secrets. See the
[release record](consumer/release-notes.md) and
[bounded recovery procedure](publication-recovery.md).

This enabled policy must reach main only through the explicitly approved #23
activation PR after deployment controls are verified. Merging it does not dispatch publication or supply the
separate exact-candidate authorization below. Setting `enabled: false` again
retains the fail-before-network stop switch.

## Candidate artifacts

Use Node 24, Yarn 4.18.1, installed Nx 24.0.6 and npm 11.19.1. From a clean
commit, build through Nx and prepare into a new ignored or external directory:

```sh
NX_NO_CLOUD=true yarn nx run-many -t build
NX_NO_CLOUD=true node tools/publishing/prepare.mjs tmp/candidate-first first
node --test tools/publishing/*.test.mjs
NX_NO_CLOUD=true node tools/publishing/verify-archives.mjs
```

The preparation command consumes the actual Nx Release dry-run output from
[#14](releases.md). `first` proposes exactly `0.0.1` for each package; after
publication, `next` derives versions from fetched release tags and commit history.
A first-version preview does not prove an empty registry history. The publication
gate separately checks history and rejects an existing version or wrong baseline.

Metadata is staged with built outputs, rather than rewriting development
manifests. This preserves the private workspace and Yarn links while producing
independent, versioned distribution manifests. Each tarball contains:

- Existing ESM entry points and declarations under `dist/`, Node `^24.0.0`
  engine support and the same exports. There is no CommonJS build.
- A package-specific description, repository URL and package directory,
  consumer documentation URL pinned to the source commit and issue URL.
- Only the accepted runtime JavaScript/declaration inventory, `package.json`,
  README, LICENSE, NOTICE and a bounded `docs/` bundle (consumer guide, API,
  migration/release notes and the executable lifecycle example). No source maps
  are emitted or referenced; runtime source,
  tests, fixtures, credentials, build state and lifecycle scripts are excluded.
- An exact core dependency in the metamodel manifest, using the core candidate
  version or its Nx baseline. `workspace:`, `file:`, `link:` and private-source
  references do not escape into runtime dependencies.
- Exact copies of the root Apache-2.0 LICENSE and attribution NOTICE, with
  `license: Apache-2.0` and `private: false`, following the
  [owner's licensing acceptance](license-reconciliation.md). Root/development
  manifests remain private. Accepted licensing
  does not establish final candidate readiness or publication authorization.

`candidate.json` records source SHA, lockfile SHA-256, toolchain, actual Nx version
data, package versions/intended tags, each archive's SHA-256/npm integrity, packed
and unpacked sizes, file inventory and complete manifest. It contains no authority
to release. `verify-archives.mjs` prepares twice and compares the actual tarballs,
reads their manifests/entry points, compares legal files byte-for-byte with this
checkout and checks the tar inventory. Installed consumer copies and the guarded
publisher use the same legal-file comparison, rejecting stale placeholders or
substituted notices even if an accompanying archive report is also changed.
This is same-source/toolchain reproducibility; it does not promise cross-version
compiler or npm equivalence. The [#20 independent consumer proof](independent-consumer.md)
checks fresh npm installation and public behavior; the preview workflow checks its
exact archives and retains the evidence alongside them. #22 must also review
package README wording for the exact release.

The manual `publish.yml` workflow defaults to **preview**. Its prepare job has
read-only repository access, no publishing token or OIDC permission, runs Nx
validation, and uploads a seven-day candidate artifact. It uses local Nx caching;
it needs no Nx Cloud credential. Normal CI runs the authorization tests and fresh
archive proof after package validation. Builds remain cacheable; archive checking,
authorization and publication are not cached Nx targets.

## npm identity and first-publication constraint

Scope ownership/package access must be checked in the owner's authenticated npm
session (`npm whoami`, `npm org ls anarchitects --json`, package access listings)
without printing credentials. Record the npm username, owner/team role, exact
package access, visible versions/dist-tags, query time and any unavailable evidence
in the issue review. An anonymous 404 establishes neither ownership nor an absence
of deleted, private or other-channel distributions. Owner review covers those
channels; an authentication/network error never becomes an empty history.

The [18 November readiness review](readiness-review-status.md) verified authenticated
scope-owner access and recorded Johan's confirmation of no prior distribution
through the reviewed channels. Both target version queries returned 404. Repeat
these mutable checks before execution; absent package names do not have existing
package-specific permission entries to inspect.

[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) supports
GitHub-hosted runners and short-lived OIDC authentication. Configure each existing
package for organization `anarchitects`, repository `anarchitecture-modeling`,
workflow filename `publish.yml`, environment `npm-release`. The pinned npm version
supports this flow. Verify the actual package's connection and its validity window
immediately before execution; do not assume a newly configured trust lasts forever.

The [npm trust command](https://docs.npmjs.com/cli/v11/commands/npm-trust/) requires
an existing package. [Staged publishing](https://docs.npmjs.com/staged-publishing/)
for a new name creates a public `0.0.0-stage` placeholder, which conflicts with the
accepted first-official-version rule. Do not create that placeholder or publish a
probe. The proposed first `0.0.1` route is a separately approved, short-lived,
minimally scoped bootstrap credential stored only as environment secret
`NPM_BOOTSTRAP_TOKEN`. The [authentication plan](release-authentication.md) records
the verified owner/2FA baseline, token scope and expiry, environment readback,
January 2027 direct-token cutoff and cleanup after every attempt. No bootstrap
credential is configured here. Configure trusted publishing near the next real
release within npm's connection-validity window, and disallow token fallback for
subsequent releases. Mixed first and already-released packages require separate
reviewed operations.

[Automatic provenance](https://docs.npmjs.com/generating-provenance-statements/)
requires the public source repository and matching package metadata. Publication
uses GitHub-hosted runners, `--provenance`, and OIDC permission only in the gated
publish job. The [approved visibility operation](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7034737872)
made this repository public on 20 November 2026, following #22's bounded disclosure
review. #23 must still verify registry provenance and installed bytes after
separately authorized publication.

## Deployment controls required before activation

The environment is `npm-release`, with Johan (GitHub user ID `5003361`)
as its sole required reviewer, administrator bypass disabled and deployment allowed
only from branch `main`. Self-review remains allowed so Johan can dispatch and
approve his own release. Reviewable API payloads live in
[npm-release-environment.json](../.github/governance/npm-release-environment.json)
and [npm-release-main-policy.json](../.github/governance/npm-release-main-policy.json).
The [20 November execution readback](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7034737872)
verified these exact controls and an empty environment secret inventory. Recheck
them before adding a credential or publishing; the JSON files alone are not
evidence of effective controls.

[GitHub environment protection availability](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
depends on repository visibility/plan. Verify that these exact restrictions are
enforced before enabling publication; do not silently omit the reviewer when the
current plan does not support it. Only the publish job references this environment.
Its token has `contents: read`, `issues: read`, `actions: read`, `id-token: write`;
there is no tag-writing permission. No `pull_request_target` or untrusted artifact
download path is used. Publication retrieves the reviewed preview from a successful
manual `publish.yml` run on the exact same main commit, verifies that run's
repository/workflow/source identity, and passes its bytes through the current
prepare job. Owner-approved hashes are checked again before publication. It does
not recalculate versions after the authorized candidate tags have been created.

The explicitly authorized `recover` operation may reuse the original successful
preview from a later main executor commit. The owner record binds both commits,
the preview/prior attempt, current histories and the exact publish/skip sets.
This is limited to the first-release core-only outcome described in the
[recovery procedure](publication-recovery.md); ordinary publication retains the
same-source rule and rejects existing versions.

The live all-tag creation/update/deletion freeze remains active. The selected
publication design requires owner-authorized tags to exist at the exact source
commit and cannot create or rewrite them. The [first-release tag plan](first-release-tags.md) specifies Johan as the sole
creator of the two exact first-release names, with separate no-bypass immutability
protection and immediate restoration of the full freeze. Its payloads and execution
sequence are prepared for #22 review under #18/#14. Applying that transition and
any later environment changes remain separately authorized #23 work.

## Exact-candidate authorization

After #20, #21 and #22 are accepted, obtain two current owner-authored GitHub
comments (updated within 24 hours). #44's genuine Dependabot event remains a
[bounded nonblocking follow-up](public-readiness.md#bounded-dependabot-follow-up--20-november-2026);
its absence alone does not prohibit publication. #22 records readiness in one fenced
`foundation-release-readiness` JSON block with:

```json
{
  "decision": "ready",
  "sourceSha": "<exact source commit>",
  "artifactHashes": {
    "modeling-core": "<sha256>",
    "modeling-metamodel": "<sha256>"
  },
  "otherChannelsReviewed": {
    "modeling-core": true,
    "modeling-metamodel": true
  },
  "impacts": {
    "modeling-core": { "level": "none", "reference": "<review URL>" },
    "modeling-metamodel": { "level": "none", "reference": "<review URL>" }
  }
}
```

#23 records separate permission in one fenced `foundation-release-authorization`
JSON block. Use reviewed impact levels rather than assuming the example's `none`.
The first-publication example below requires corroborated empty histories:

```json
{
  "sourceSha": "<same commit>",
  "readinessCommentId": 123,
  "authentication": "bootstrap",
  "versions": { "modeling-core": "0.0.1", "modeling-metamodel": "0.0.1" },
  "artifactHashes": {
    "modeling-core": "<sha256>",
    "modeling-metamodel": "<sha256>"
  },
  "historyBaselines": { "modeling-core": [], "modeling-metamodel": [] }
}
```

These illustrative records confer no approval. The publisher retrieves comments
from GitHub, verifies their issue, author ID/login and age, checks environment
restrictions and main/owner/manual execution, and binds both reviews to source and
archive hashes. It verifies actual tarball manifest/license/NOTICE, exact tags and
fresh registry/tag history, then invokes #14's compatibility/version guard.
Future stabilization additionally requires `stabilizations` with the exact `1.0.0`
decision. Issue closure alone is insufficient authorization.

The accepted license/NOTICE configuration permits public archive metadata.
The #23 activation change sets `enabled: true` and retains disabled-policy,
local-execution rejection and exact-authorization tests. Approve and merge that
change only after the deployment controls above have been verified.
Completed outcomes #20, #21, #22 and #55 remain required; an open #44 does not
prevent publication under the accepted bounded follow-up. Issue closure is still
insufficient without the exact owner records.
Prepare and review artifacts from that final commit; do not approve hashes from an earlier candidate, including one with
the same license but pending clearance or different private/public metadata.

Dispatch publication from that exact `main` commit with the successful preview run
ID, the two comment IDs and matching authentication mode. Run a new preview if its
artifact expired; never use artifacts from another commit. After environment approval the publisher rechecks
history, publishes core first, and requires its exact registry version/integrity
before the metamodel. It stops on registry lag or partial failure; it does not
retry, roll back, overwrite a version, rewrite a tag or invent a new version. A
receipt records successful commands. Investigate actual registry state and obtain
Johan's recovery decision before another operation. After first publication,
reconcile lifecycle metadata, source versions and lockfile through reviewed PRs.

Live environment approval, scope control, bootstrap authentication, OIDC
exchange and npm provenance are external gates. Local tests use synthetic
authorization records; they prove rejection logic, not an executed deployment.

## Documentation verification

The [package documentation gate](package-documentation.md) is part of candidate
review. Staging derives the package-specific README from reviewed source, pins
online references/homepage to the source SHA and includes offline guides/examples.
Archive, installed-consumer and publisher checks compare these exact bytes
with the reviewed source; they also check bundled relative links/anchors. These
checks do not establish remote URL accessibility or registry rendering.

Before #22 sign-off, review each README and its exact candidate version, supported
matrix, install path and limitations. The package READMEs include conditional
registry commands pinned at staging to
each archive's version and the exact core dependency; the local-tarball commands
remain executable before publication. The independent consumer checks those
registry pins but does not execute a registry install or claim public availability.
Before #23 activation, regenerate/review exact archives and run their examples. Never silently transform a
preview into a published-availability claim. After authorized publication, inspect
each actual npm version page and its links, and run the documented registry install
and quick starts. Record URLs/observations and handle mismatches through the normal
owner-authorized release process. Keep immutable published artifacts unchanged.
