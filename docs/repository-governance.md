# Repository governance and evidence

Revisit of [#6](https://github.com/anarchitects/anarchitecture-modeling/issues/6),
17 November 2026. Baseline main: `53e7107e0f9bda94e77ac1b61761e08f9a7e72b2`.
The issue was closed after the preflight contribution in PR #24, while its wider
repository-control outcome remained incomplete. It has been reopened.

## Responsibilities and contributor workflow

Johan confirmed both capability ownership and technical maintainership in this
working session, and selected `johan@anarchitects.dev` for private security
reports. [OWNERSHIP.md](../OWNERSHIP.md), [CONTRIBUTING.md](../CONTRIBUTING.md) and
[SECURITY.md](../SECURITY.md) make those responsibilities and workflows explicit.
The PR template always requires an issue link, using closure only for a complete
outcome. Private Meta access is a maintainer review responsibility; it is not a
prerequisite for every external contribution.

Meta's default branch was revalidated as `main` at
`4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, unchanged from the session's complete
source review. Applicable accepted decisions include landscape ownership,
package versioning, dependency maintenance, Nx caching, ownership, release
controls and project acceptance (Meta ADR paths 0004, 0013–0019 and 0021 under
`adr/`). The accepted local ADRs 0001/0002 remain applicable. Proposed Meta
hierarchy/enrichment decisions are not promoted to policy. This change has no
runtime dependency, public package contract, version or consumer migration effect.
Dedicated-repository central registration remains Meta #56; no exception is claimed.

## Observed GitHub baseline

Authenticated API checks and the repository's Advanced Security page established:

| Control                                      | Observation on 17 November 2026                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Visibility and automerge                     | Private; repository automerge disabled                                                |
| Main protection                              | `protected: false`; classic protection returns HTTP 404 `Branch not protected`        |
| Rulesets                                     | Empty repository/inherited list; no effective main branch rules                       |
| Required check candidate                     | Successful `main` check from GitHub Actions App ID 15368 on the baseline commit       |
| Tags                                         | Empty tag list                                                                        |
| Central security assignment                  | `Anarchitects Supply Chain Security` (286470), enforced                               |
| Dependency graph / alerts / security updates | All enabled in assigned configuration; security fixes enabled and not paused          |
| Malware alerts                               | Explicitly **Enabled** in effective repository settings; npm is a supported ecosystem |
| Triage and grouping                          | UI reports 0 auto-triage rules; grouped security updates off; Standard GitHub runner  |
| Paid security features                       | Code Security and secret-scanning features disabled; no paid product activated        |
| Private vulnerability reporting API          | HTTP 404; email reporting is the documented route                                     |
| Renovate access                              | GitHub App installation 129132893 covers all repositories and is not suspended        |
| Renovate execution                           | Initially Silent; verified Interactive execution is recorded below                    |

The security UI was inspected without changing settings. GitHub documents a
separate [malware-alert control](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-malware-alerts);
the general alerts API alone was not used to infer it. Recheck assignment and
all effective settings before a visibility change.

The alert API returned one open development-dependency alert in `yarn.lock`:
[Dependabot #1](https://github.com/anarchitects/anarchitecture-modeling/security/dependabot/1),
`minimatch`, GHSA-g3hv-75wg-m249, medium severity, globparts-amplification denial
of service. GitHub reports affected versions `>=7.0.0, <11.0.1` and first patched
version `11.0.1`. This proves alert delivery, not remediation. The maintainer must
review the dependency path and compatible upgrade; no broad override or dismissal
is justified by this governance change.

## Approved and applied protection settings

Johan explicitly approved both controls on 17 November 2026. The applied API
payloads are versioned:

- [main-protection.json](../.github/governance/main-protection.json): require a PR,
  the up-to-date GitHub Actions `main` check and resolved review conversations;
  enforce the rules for administrators; block force pushes and deletion. The
  update allowlist names Johan, with no team/app allowances. GitHub administrators
  retain their platform administrative capabilities; this is not a claim of an
  owner-only security boundary against organization administrators.
- Require zero independent approving reviews: this preserves a one-maintainer
  workflow without making self-approval necessary. Human review/acceptance remains
  required by policy; bots have no PR bypass or automatic merge authority.
- [pre-release-tags.json](../.github/governance/pre-release-tags.json): block all
  tag creation, changes and deletion, with no bypass actors while no releases
  exist. [#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14)
  must deliberately replace this temporary freeze with owner-authorized release
  controls before the first tag. No production release tag is a test fixture.

GitHub readback confirms main protection, admin enforcement, the exact check and
app identity, zero independent approvals, resolved conversations, no force pushes
or deletion, and the stated update allowlist. The tag ruleset is active as
[27448740](https://github.com/anarchitects/anarchitecture-modeling/rules/27448740),
with all tags matched and no bypass actors. Configuration files do not apply
themselves; re-read live settings before later changes and preserve concurrent edits.

An isolated branch at the baseline commit received the identical main protection
payload. As Johan's authenticated administrator account, a fast-forward direct
update to a new same-tree commit was rejected with HTTP 422:
`Changes must be made through a pull request. Required status check "main" is expected.`
The branch stayed at the baseline; its temporary protection and branch were then
removed. No update was attempted against main.

A non-release tag probe was rejected through Git with `GH013` and
`Cannot create ref due to creations being restricted.` The REST probe also
returned HTTP 422, although its generic error alone did not identify the rule.
The tag list remained empty and main stayed at
`53e7107e0f9bda94e77ac1b61761e08f9a7e72b2`. Tag update/deletion and force-push
restrictions were verified by configuration only; no existing release was used
as a destructive test fixture.

[PR #29](https://github.com/anarchitects/anarchitecture-modeling/pull/29) was
blocked while its required check was pending and became clean/mergeable after
[Actions run 44067626921](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44067626921)
passed on `3ff2c0472accbd9ee00941194cf3570caf458b1b`. The owner-side merge produced
`eafd3b610c7fe74de89c45674535cc9f1e4851fe`. This demonstrates passing-PR eligibility;
it is still scaffold CI. [#10](https://github.com/anarchitects/anarchitecture-modeling/issues/10)
must preserve a stable required outcome when package/affected checks replace it.

## Routine dependency updates

[renovate.json](../renovate.json) enables the npm and GitHub Actions managers,
a dependency dashboard and Yarn lockfile maintenance. Monday 00:00–05:59 in
Europe/Brussels is the routine window, with at most one new PR per hour and three
concurrent PRs. Majors remain separate from minor/patch updates. Nx packages form
one aligned toolchain group; other packages stay separate. Node stays on major 24
until a deliberate toolchain change. Nx migrations still need maintainer review.

Both automerge paths and both dedicated Renovate vulnerability-update paths are
explicitly off. Dependabot continues security updates independently of this
routine schedule. No regular Dependabot version-update file is introduced.
Review release intent for future package updates: an unscoped bot `chore` title
is only a starting point, not a substitute for the exact project/lifecycle policy.

The official [npm manager](https://docs.renovatebot.com/modules/manager/npm/)
supports Yarn lockfile maintenance and the pinned `packageManager` through
Corepack. Local validation is recorded with the PR. It does not prove hosted
manager extraction, lockfile execution, scheduling or PR creation.

## Hosted execution evidence — 17 November 2026

Johan confirmed the repository was in Silent mode. The repository-specific Mend
setting was changed to Interactive, retaining Community (Free), automated PRs,
require-config and onboarding settings. No organization default, paid engine,
credential or merge setting was changed.

Mend Renovate 44.244.0 completed
[job 8355c184-5957-4af6-90d0-732bdbd813b0](https://developer.mend.io/github/anarchitects/anarchitecture-modeling/-/job/8355c184-5957-4af6-90d0-732bdbd813b0)
at **11:55:11 CET**, duration 24 seconds, result `done`, onboarded/enabled. Logs
identify base SHA `eafd3b610c7fe74de89c45674535cc9f1e4851fe`, the merged
`renovate.json`, no config migration, npm and GitHub Actions extraction across two
files (11 dependencies), both automerge paths false, dedicated Renovate security
updates disabled, Brussels timezone and the configured Monday schedule.

[Dependency Dashboard #30](https://github.com/anarchitects/anarchitecture-modeling/issues/30)
was created. All five proposals, including lockfile maintenance, were
`not-scheduled` on Tuesday. No dependency branches/PRs or lockfile rewrite were
executed in this run. This proves effective activation, config loading, extraction,
dashboard creation and schedule rejection; scheduled artifact generation remains
to be observed in the maintenance window.

The run also exposed a Node policy mismatch: GitHub Actions extracts the runtime
as `depName: node`, `packageName: actions/node-versions`, datasource
`github-releases`. The original datasource-only rule did not match it, allowing
an unintended Node 26 proposal. The correction matches package identities
`node` and `actions/node-versions`, retaining `>=24 <25`. A hosted rerun against
the merged correction must confirm the Node 26 proposal disappears before #6's
Renovate check is accepted. No dependency upgrade is part of this correction.

## Remaining acceptance

- [x] Johan approved the branch/tag controls; live settings and rejection probes verified.
- [x] Passing-PR eligibility verified before owner-side merge of PR #29.
- [x] Interactive Renovate execution evidenced against merged configuration.
- [ ] Verify the Node policy correction in a hosted run after merge.
- [x] Contributor/ownership/security documents merged through PR #29.
- [ ] Johan accepts the complete bounded outcome of #6.

Actual package-task/cache proof belongs to #10, version policy to #14,
publication workflow to #18, and final disclosure/artifact clearance to #8/#22.
The subsequent [release policy](releases.md) supplies commit-scope enforcement
and version/candidate checks; the publishing workflow remains a separate handoff.
Do not close #6 merely because this documentation PR is merged or CI is green.
