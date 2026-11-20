# Real private fork and Dependabot CI verification

Work for [#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44),
started 18 November 2026 from `b93d0bb26dae38f3063637ed03051df54bc0b7c8`.
This is a verification plan and dated settings record. **The genuine private-fork
event passed; the genuine Dependabot event remains pending.** See the
[retained fork evidence and window deviation](private-fork-ci-evidence.md).
The missing bot event remains tracked under #44, regardless of its GitHub closed
state. The [bounded release disposition](public-readiness.md#bounded-dependabot-follow-up--20-november-2026)
supersedes the earlier requirement to complete this event before final #22
readiness; it does not claim the event passed.
The accepted bounded [#10 evidence](ci-verification.md) remains valid within its
documented scope. Owner: Johan; organization-level settings require organization
administrator authority. No publication or visibility change is authorized here.

## Initial readback — before PR #48

| Control                         | Observed value                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository visibility / forking | Private / disabled                                                                                                                                            |
| Organization private forking    | `members_can_fork_private_repositories: false`                                                                                                                |
| Repository fork-PR Actions      | Run disabled; write-token forwarding false; secrets/variables forwarding false; approval requirement false                                                    |
| Organization Actions policy     | Owner screenshot: private/internal fork workflows disabled; other private-fork options hidden. CLI GET returned 403                                           |
| General contributor approval    | Owner screenshot: approval required for first-time contributors; separate from the private/internal fork controls                                             |
| Repository token default        | Write; ordinary CI explicitly restricts `actions` and `contents` to read                                                                                      |
| Main protection                 | PR required; up-to-date `main` check tied to GitHub Actions; resolved conversations; admins enforced; Johan restricted updater; force push/deletion forbidden |
| Cache write credential          | Only `nx-cloud-main`, with a `main` branch-only deployment policy                                                                                             |
| PR environment                  | `nx-cloud-pr`, no environment secrets                                                                                                                         |
| Repository secret               | `NX_CLOUD_READ_ONLY_TOKEN` only; no value read or recorded                                                                                                    |
| Dependabot                      | Security updates enabled/unpaused; no secrets; no existing bot-authored PR found                                                                              |
| Release controls                | Tag freeze active; publishing disabled; no visibility or credential change                                                                                    |

The full current organization private-repository listing returned no repository
with `allow_forking: true`. Recheck it before any organization setting change;
this snapshot is not permission to broaden other repositories. Browser access
was unavailable during discovery. The owner supplied the organization settings
screenshot and minimatch security-update error on 18 November. The screenshot
shows the selected controls, but does not independently prove a saved setting or
the values of hidden private-fork options; read them back before execution.

## Prepared workflow changes

The normal `pull_request` workflow remains the verification path. No
`pull_request_target`, privileged workflow handoff or simulated bot identity is
introduced. Cache selection now checks **both PR author and event actor**: an
owner editing or reopening a Dependabot-authored PR cannot switch it to the
credentialed same-repository path. Missing author metadata fails closed.
Alternate auth/personal-token injection is rejected without logging its value.

After the guard passes, `tmp/ci-trust.json` records only event/action, actor and
triggering actor, PR author/number/repositories, base/head/tested SHAs, workflow
ref/SHA, run/attempt IDs, access classification and credential-presence booleans.
It is included in the job summary and seven-day `ci-event-trust` artifact. It
contains no raw event payload, token, credential prefix/length or environment dump.
The report describes the checked process context; workflow/settings/log inspection
must independently establish environment selection and effective permissions.

Synthetic tests cover the additional human-triggered bot-PR cases, malformed
author metadata and personal-token refusal. They do not satisfy the genuine-event
criterion. Existing validation failure/signal propagation and the self-healing
condition remain unchanged: `!cancelled()` and Cloud enabled. The final evidence
upload cannot convert a prior failed/cancelled step into a successful job.

## Revised fork probe procedure

**Do not execute the original organization-enable-first proposal.** After PR #48
merged as `39cb93e819dd4b56c0127f793b39e42194b7e07e`, its authorized trial exposed
forking on all 17 private repositories. The organization prohibition was restored;
all 17 effective flags matched the original baseline. No probe fork was created.
A subsequent Modeling-only `PATCH` with `allow_forking: false`, while organization
forking was disabled, returned HTTP 422. Preconfiguring restrictions under that
prohibition is therefore not a workable route through this API.

The [controlled change-window runbook](ci-probe-change-window.md) supersedes that
sequence. It records the additional organization-wide decision, direct owner
operation, isolation checks, deadlines and restoration/abort procedures. Preparing
or merging it does not authorize its execution.

After the initial rollback, organization private forking remained disabled.
Modeling's workflow token default is read-only with PR approval permission off.
Organization and Modeling fork-workflow settings were separately saved as run
enabled, write-token forwarding off, secrets/variables forwarding off and approval
required. Those Actions settings remained configured after that initial rollback;
they were subsequently restored after the approved controlled window. The
[execution record](private-fork-ci-evidence.md) supersedes this historical snapshot.

### Retained probe requirements

1. Obtain current organization Actions fork-policy readback and use the revised
   runbook to establish isolation. Preserve unrelated policies. At this repository
   use the exact credential restrictions in
   [private-fork-workflows.json](../.github/governance/private-fork-workflows.json).
2. Retain the repository's read-only workflow token default in
   [read-only-workflow-default.json](../.github/governance/read-only-workflow-default.json).
   CI already explicitly requests read-only access; this also avoids a permissive
   default for a new workflow. Retain the prohibition on PR review approval.
3. Create one **private** fork in Johan's account, proposed name
   `vrxj81/anarchitecture-modeling-ci-probe`, after confirming the name is unused
   and the fork's inherited access is appropriate. Add no collaborators or secrets.
   Do not substitute a new public repository or copied synthetic project.
4. From the fork, open a normal PR into upstream `main` with a small marker under
   `tools/ci/probes/` and a valid `ci: ...` commit/title. That shared input selects
   both packages without changing runtime behavior. Link #44. Inspect its exact
   diff before approving a requested run. Record whether approval is needed;
   the policy may not prompt for an actor who already has upstream write access.
5. Collect the evidence below. Do not merge the probe merely to run it. Close the
   probe PR after review and execute the runbook's approved restoration procedure.
   Retain the private fork until its
   disposition is explicitly agreed; deletion is not part of this proposal.

This proposal does not ask to make the repository public. GitHub supports
[private fork workflows](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
with restricted credentials, subject to
[organization forking policy](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-forking-policy-for-your-organization).
If those controls cannot be enabled privately, stop and obtain an explicit owner
sequencing decision; do not waive the event or expand disclosure silently.

## Dependabot probe

Dependabot remains the security-update owner; Renovate remains the sole routine
version-update owner. The proposed `.github/dependabot.yml` sets routine PR limit
to **zero** and supplies the unscoped `chore` prefix for security-update messages.
Its required schedule does not enable routine PRs. Security PRs have their own
limit, per the [official options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
No grouped fixes, automerge, alert dismissal or dependency downgrade is introduced.
Package-local changes must still meet the existing lifecycle/scope rules; do not
weaken commit validation merely to make a bot PR green.

The owner confirmed that existing [minimatch alert #1](https://github.com/anarchitects/anarchitecture-modeling/security/dependabot/1)
cannot produce a security update: Nx 24.0.6 and its `@nx/js` / `@nx/devkit`
dependency paths constrain minimatch to 10.2.5, while GitHub identifies 11.0.1 as
the first patched version. Alert #2, picomatch, currently has no patched version.
Neither alert currently offers a viable bot PR for this probe. The configuration
above does not resolve these dependency constraints.

The [18 November dependency investigation](ci-probe-change-window.md#dependency-investigation--18-november-2026)
confirms the current stable Nx constraint and identifies a partial
typescript-eslint update. It does not claim compatibility tests or complete
remediation, and no dependency versions were changed by that investigation.

Keep the genuine Dependabot event pending until a compatible security update is
available or an alternative is reviewed under the dependency-maintenance policy.
Do not force a major transitive override, downgrade dependencies or introduce a
routine update stream solely to manufacture an event. When the constraint is
resolved and the preparation PR is merged, use **Create Dependabot security
update**, if available, and retain the resulting PR or exact updater error. The
updater itself is not the required `pull_request` CI evidence.
See [GitHub's alert workflow](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-dependabot-alerts/view-dependabot-alerts).

For the bot PR, inspect the exact dependency change and normal CI event before
any merge. Record its author and triggering actor. Test a human title/body edit
or rerun as an additional trust-boundary case where appropriate. GitHub documents
[Dependabot credential restrictions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions);
the workflow independently disables Nx Cloud for the bot author. Linking #44 in a
PR comment does not alter its body. Security remediation acceptance is separate
from CI trust acceptance.

## Required event evidence and completion

For **each** real event retain PR URL, author/actor, fork identity or Dependabot
provenance, base/head/tested merge SHAs, workflow revision, run/job/attempt IDs,
approval/rerun behavior, sanitized trust report and job logs. Verify:

- Effective `GITHUB_TOKEN` permissions are read-only; no checkout credential is
  persisted; job uses `nx-cloud-pr`, never the write-token environment.
- Guard reports `off`, credential/alias presence false and Cloud disabled.
  Inspect commands/environment and Nx logs for no remote-cache use or connection;
  do not infer this solely from an absent Nx Cloud execution record.
- Both resolved projects execute actual build/test/lint/typecheck targets and
  prerequisites. The fork marker and dependency-lock change should select both;
  verify the actual graph/task result, not the intended selection. Local task
  reuse may occur later in the job; distinguish it from remote cache.
- Required `main` completes successfully. Self-healing is skipped on the
  credential-free path. Reuse #10 failure/cancellation evidence only for unchanged
  failure propagation and cleanup logic; rerun affected negative cases if that
  behavior changes.

Archive final sanitized evidence durably in the verification document; CI artifact
links expire after seven days. Record actual limitations and obtain Johan's
explicit acceptance of the real-event result. Feed that record into #22/#23 as
follow-up evidence. Until it exists, use the bounded disposition above; revalidate
settings immediately before any separately authorized #23 access/visibility action.

## Governance

Meta default main `4f0339d86f0ebfa073173ad307cb67c8d6042bdd` was revalidated;
the complete untruncated tree and all 8 mandatory documents/25 ADR files match the
previously examined session content. Applicable accepted ownership, public API,
versioning, dependency maintenance, Nx caching, SDLC/release authority and reuse
decisions remain operative; proposals are not policy. Accepted local ADR0001/0002,
root AGENTS and current ownership/CI/release controls apply. This is repository CI
work, with no runtime/API/package-version/consumer change or new upstream contract.
Organization policy is owned by its administrators; Johan accepts Foundation's
bounded result. The recorded permission and event gaps remain open, not exceptions.
