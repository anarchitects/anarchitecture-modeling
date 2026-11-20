# Release environment and authentication plan

This completes the F08 design review under [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22).
Execution belongs to separately authorized [#23](https://github.com/anarchitects/anarchitecture-modeling/issues/23),
alongside the [tag plan](first-release-tags.md) and [exact-candidate publication gate](publishing.md#exact-candidate-authorization).
The activation state is recorded in [publishing.md](publishing.md).
These instructions do not create credentials or
authorize visibility, environment, tag or registry changes.

## Verified baseline — 19 November 2026

Authenticated npm checks identify `vrxj81` as an `@anarchitects` owner, with account
2FA enabled for authorization and writes. The npm organization Members page shows
2FA enforcement enabled. This is the [member-account requirement](https://docs.npmjs.com/requiring-two-factor-authentication-in-your-organization/);
it does not by itself demonstrate a package-level prohibition on automation tokens.
Do not disable account or organization 2FA for this release. Package-specific
permissions/trust cannot yet be inspected for the two unpublished names.

The GitHub repository is private and `npm-release` does not exist. The current
environment JSON files are proposals. Ownership, history and effective controls
must be rechecked during execution; this observation is not a permanent access grant.

## Establish the environment before adding a credential

After the separately authorized public-visibility step, configure `npm-release`
using [the environment proposal](../.github/governance/npm-release-environment.json)
and [main-only policy](../.github/governance/npm-release-main-policy.json).
Required reviewers depend on visibility and plan; do not purchase a plan or weaken
the reviewer requirement merely to test private preparation. See [GitHub environment availability](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

Read the resulting environment and all deployment branch policies back from
GitHub before adding `NPM_BOOTSTRAP_TOKEN`:

- Exactly one required reviewer: **User** `5003361` (Johan / `vrxj81`).
- `prevent_self_review: false`, so Johan may dispatch and approve his own release.
- `can_admins_bypass: false`.
- Custom deployment branches enabled, protected-branches mode disabled, with
  exactly one policy: branch `main` (no tag or wildcard policy).

The [environment REST endpoint](https://docs.github.com/en/rest/deployments/environments#create-or-update-an-environment)
does not document `can_admins_bypass` as an update parameter. Treat that field in
the proposal as required desired state, not proof that a PUT applies it. If needed,
clear **Allow administrators to bypass configured protection rules** in GitHub's
environment UI and verify the readback. Stop if the controls cannot be enforced.
The publication guard checks the reviewer type and ID, self-review and branch
policy as well as bypass. Local fixtures verify rejection behavior; they do not
prove the live approval gate.

## First-publication credential

The proposed route is one granular access token, created by Johan just before the
authorized first release. Select **Read and write (publish and stage)** and only
the two package names if npm permits selecting unpublished names; otherwise select
only the `@anarchitects` scope. Scope selection also permits access to other
packages Johan can publish in that scope: record and approve that actual breadth
in #23, rather than describing it as a two-package credential. Organization
management permissions must be **No access**. Set expiry to one day and revoke
promptly after the attempt. See [npm token creation](https://docs.npmjs.com/creating-and-viewing-access-tokens/).

Noninteractive direct publication needs **Bypass 2FA** on this token. Obtain the
owner's explicit approval of that temporary credential policy; never disable
account/member 2FA. If a package or organization policy requires fully enforced
2FA without token bypass, stop and resolve the first-publication route rather than
changing that policy. npm documents removal of direct token publishing in
**January 2027**; recheck support at execution, and revisit this design if the
release reaches that cutoff. See [npm token restrictions](https://docs.npmjs.com/about-access-tokens/).

Store the value only as environment secret `NPM_BOOTSTRAP_TOKEN` in `npm-release`.
Do not put it in repository/organization secrets, source, comments or logs. Record
its permissions, expiry and revocation evidence without its value. Keep it absent
from preview and OIDC runs. A stage-only token cannot drive the existing publisher;
new-name staging creates a public `0.0.0-stage` placeholder, so it is not an
automatic fallback for the accepted first-version policy. See [npm staging](https://docs.npmjs.com/staged-publishing/).

After the attempt, revoke the token at npm and remove the environment secret,
including after failure or cancellation. Check actual registry state before any
recovery; a partial core publication must not be blindly retried. Cleanup does not
unpublish a package or rewrite its tags. Keep the existing provenance, archive
integrity and independent-consumer verification in #23.

## Subsequent releases

Once the packages exist, configure trusted publishing for each with GitHub owner
`anarchitects`, repository `anarchitecture-modeling`, workflow `publish.yml` and
environment `npm-release`. Permit direct publication for this workflow. Use the
existing GitHub-hosted runner and pinned Node/npm versions. A new trust connection
must publish successfully within two days or expires: configure it near the next
real, authorized release, rather than publishing a validation version. Record the
first successful OIDC/provenance result then; configuration alone is not that proof.

After bootstrap cleanup, select package publishing security that requires 2FA and
disallows traditional tokens. Trusted publishing remains available under that
setting. OIDC mode must have no `NODE_AUTH_TOKEN` and must not fall back to a saved
bootstrap credential. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
