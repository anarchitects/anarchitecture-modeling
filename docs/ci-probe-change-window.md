# Controlled private-fork CI change window

Refs [#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44).
Prepared on 18 November 2026 against main
`39cb93e819dd4b56c0127f793b39e42194b7e07e`. **Proposed, not executed or approved as
an organization-wide window.** This replaces the failed isolation sequence in
[the event verification plan](private-ci-event-probes.md). Neither genuine event
has passed; final #22 acceptance remains blocked.

## Evidence and decision boundary

- Enabling organization private forking made all 17 private repositories report
  `allow_forking: true`. Disabling it restored all 17 effective flags to false.
  A false GET under the organization prohibition does not reveal a repository's
  underlying preference.
- The Modeling-only restrictive PATCH was rejected with HTTP 422 while the
  organization prohibition remained active. GitHub also documents that the
  organization must permit private forks before repository-level policy can be
  changed: [repository forking policy](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-forking-policy-for-your-repository).
- All 17 repositories were private, non-archived and administrable by the current
  CLI account at preparation time. This is a prerequisite check, not authority
  inferred from access. Refresh the complete paginated inventory before execution.
- The previous agent-mediated rollback was delayed by an action-time approval
  check. Johan must operate the organization controls directly with the rollback
  page open. Do not depend on an agent/UI approval exchange during the window.

An organization administrator must approve the exact private inventory and these
two temporary exposures: (1) from organization enablement until the other
repositories are explicitly restricted; (2) during restoration of their underlying
settings before organization forking is disabled again. Existing authorized users
could create private forks in either interval. The operation does not make code
public, but the exposure cannot be made atomic with the available controls.

The decision must cover temporary `allow_forking: false` writes to the other
16 repositories, restoration of their captured values, the named private probe
fork, the deadlines below and fail-closed recovery. Consult affected maintainers
for operational conflicts; Foundation ownership alone does not authorize changing
their repository policy. Record the decision in a #44 comment, not an issue-body
rewrite. If this scope is unacceptable, use GitHub Support or leave #44 pending.

## Before opening the window

1. Revalidate Meta and local instructions, current main, #44 decisions, main
   protection, cache environment restrictions and fork-workflow settings. Confirm
   no concurrent administrator changes or repository creation are planned during
   this short window. A new repository makes the reviewed inventory stale.
2. An organization administrator opens both settings pages in their own browser:
   [Member privileges](https://github.com/organizations/anarchitects/settings/member_privileges)
   and [Actions](https://github.com/organizations/anarchitects/settings/actions).
   Verify they can save the forking restriction directly. Do not broaden CLI
   authorization scopes to avoid this step.
3. Save a fresh paginated private inventory outside the repository, including
   immutable repository IDs, names, visibility, archived status, admin permission
   and effective forking flags. Review all 17 entries and the exact 16 to restrict.
   Check for existing forks and retain their identities/timestamps for comparison.
   Keep private repository names and audit details out of public artifacts.
4. Verify every intended repository mutation is limited to the reviewed ID/name
   pair and `allow_forking`. Recheck identity, privacy and inventory membership
   immediately before each write. Prepare the commands before opening the window;
   do not discover API syntax while access is expanded.
5. Prepare the normal fork PR marker and title. The local probe prepared earlier
   was commit `0832f1f5caae77c6948a30282ebc18ca6d1109fd` on base `39cb93e`;
   rebase/review it if main changed. It adds only `tools/ci/probes/issue-44.md`,
   selecting both packages through shared inputs. Confirm the fork name
   `vrxj81/anarchitecture-modeling-ci-probe` is unused and review inherited access.
6. Recheck credential restrictions: run fork workflows enabled, write tokens off,
   secrets/variables off, approval required; `nx-cloud-pr` has no secrets; cache
   write token remains confined to main. The repository token default stays read.
   Keep both public visibility and publication disabled.
7. Record start time and proposed limits: **60 seconds to establish isolation,
   15 minutes total**, and **60 seconds for normal restoration**. These are abort
   limits, not a promise that API calls or CI will finish. Johan must be present
   for the entire window and able to disable organization forking immediately.

## Exact API operations

These are review examples, not an instruction to run them before approval.
Use the authenticated `gh` account already checked for repository administration.
Do not print credentials or enable shell tracing. Store snapshots privately.

```sh
# Read; paginate and compare the exact repository ID set each time.
gh api --paginate 'orgs/anarchitects/repos?type=private&per_page=100' \
  --jq '.[] | {id,full_name,private,archived,allow_forking,admin:.permissions.admin}'

# After explicit approval AND organization enablement, for each reviewed other repo:
# substitute only an ID/name-verified member of the approved private inventory.
gh api --method PATCH 'repos/anarchitects/REVIEWED_REPOSITORY' \
  -F allow_forking=false --jq '{id,full_name,private,allow_forking}'

# Modeling is the sole permitted private source after isolation.
gh api --method PATCH repos/anarchitects/anarchitecture-modeling \
  -F allow_forking=true --jq '{id,full_name,private,allow_forking}'
```

For normal restoration, use the same PATCH endpoint with the **captured boolean
for that exact repository ID**, not a guessed default or a blanket `true`. Do
not modify visibility, collaborators, secrets, base permissions or other flags.
Every PATCH must succeed and be followed by GET readback. Any failure triggers
the abort procedure rather than an open-ended retry.

## Execute and prove isolation

1. Johan enables organization private forking and starts the deadline clock.
2. Immediately capture the now-visible per-repository forking values for the
   reviewed ID set. This is the restoration baseline; do not use the earlier
   organization-masked false values. If the inventory, ownership, visibility or
   admin permissions differ, abort without creating a fork.
3. Restrict the other 16 repositories, retaining each response. Ensure Modeling
   alone permits forking. Re-read the **complete** private inventory and compare
   IDs, not merely its count. If isolation is not proven within 60 seconds, abort.
4. Create the approved private fork from the actual upstream repository. Verify
   `private=true`, `fork=true`, the expected parent/source ID and inherited access;
   add no collaborators or secrets. A copied independent repository is not this
   probe. Recheck the organization inventory for drift.
5. Push the reviewed marker branch to that fork and open a normal upstream
   `pull_request` linked with `Refs #44`. Inspect its diff before any requested
   workflow approval. An upstream administrator may not be prompted for approval;
   record the actual behavior without claiming an external-user approval test.
6. Follow the [required event evidence](private-ci-event-probes.md#required-event-evidence-and-completion):
   PR/run/job/SHAs, effective read-only token, no Nx credentials, Cloud off, both
   projects and prerequisites executed, required `main` outcome and skipped
   self-healing. An absent Nx Cloud run is not sufficient evidence of no remote
   cache. Retain sanitized logs and the trust artifact.
7. At the total deadline, restore the restriction even if CI is unfinished. Do
   not waive evidence, extend the window silently or cancel CI merely to produce
   an apparent completion. Do not assume existing-fork CI behavior after policy
   restoration; inspect the actual result.

## Normal restoration and abort

**Normal completion:** close the probe PR without merging. Restore each reviewed
repository's underlying forking boolean from the post-enable snapshot, including
Modeling. This creates the second approved exposure interval. Verify the writes,
then Johan immediately disables organization private forking and saves. Stop
restoration at its 60-second deadline and use the abort path if anything fails.

**Abort at any point:** Johan first disables organization private forking and
saves, without waiting for agent approval or for repository restoration. Verify
the saved UI state and API readback. Do not re-enable it to finish cleanup. Some
repositories may retain stricter underlying flags; list those differences in a
private operator record and obtain a separate recovery decision. Their effective
false flags under the organization prohibition do not prove underlying recovery.

After either path:

- Verify organization forking off and the full private inventory still private
  with effective forking off. Reconcile any newly created forks with the pre-window
  inventory; do not automatically delete repositories or other users' work.
- Restore temporary Actions settings to their pre-#44 baseline: organization and
  Modeling private-fork workflows off, forwarding flags off, approval flag false.
  For the organization, clear the approval checkbox while visible, then disable
  running fork workflows and save; verify the result. The repository API payload
  uses the four documented keys with false values. Preserve the separate general
  first-time-contributor approval control. Johan operates organization UI changes.
- Keep the independently approved repository workflow default read-only and PR
  approval permission false. No rollback to a write-token default is proposed.
- Retain the approved private probe fork pending explicit disposition. Verify
  its actual existence/visibility; do not assume policy rollback deletes it.
- Record timestamps, settings, any residual differences and event results in
  #44 comments and the verification document. Owner outcome acceptance remains
  separate. Neither this runbook nor one passing event closes #44.

## Dependency investigation — 18 November 2026

Read-only npm registry metadata, `yarn why` and current GitHub alerts established:

| Path / candidate                           | Observed result                                            | Consequence                                                        |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `nx` and `@nx/devkit` 24.0.6               | Both pin minimatch 10.2.5; Nx 24.0.6 remains latest stable | No newer stable Nx fix identified                                  |
| Nx/devkit 24.1.0-beta.1                    | Both still pin minimatch 10.2.5                            | The available beta does not solve this path                        |
| Installed typescript-estree 8.72.2         | Resolves minimatch 10.2.6 through `^10.2.2`                | Additional affected path beyond Nx                                 |
| typescript-eslint/typescript-estree 8.73.0 | Stable; estree requests minimatch `^11.0.1`                | Candidate partial remediation, not a complete fix                  |
| minimatch                                  | Latest 11.0.9; alert first patched 11.0.1                  | The fixed major is outside the Nx and installed estree constraints |
| picomatch                                  | Latest 4.0.7; alert has no patched version                 | No patched release identified                                      |

The typescript-eslint 8.73.0 declared peers admit the installed ESLint 9 and
TypeScript 6.0.3, and its engine range admits Node 24. This is metadata feasibility,
**not installed/tested compatibility**. Its version is within the root's existing
`^8.58.0` range. Review a narrow lockfile update through the normal maintenance
process, run actual lint/build/test/typecheck checks, and verify all remaining
paths before accepting remediation. Do not call that human/ Renovate PR genuine
Dependabot evidence. No package or lockfile changed in this investigation.

Picomatch 4.0.7 is reached through Nx JS/workspace, Vite, Vitest and tinyglobby.
Open advisories remain [minimatch](https://github.com/anarchitects/anarchitecture-modeling/security/dependabot/1)
and [picomatch](https://github.com/anarchitects/anarchitecture-modeling/security/dependabot/2).
No forced transitive-major override, beta migration, vulnerable fixture or alert
dismissal is proposed. Remediation and genuine bot-event verification are distinct.

Keep Dependabot security updates enabled and Renovate as the sole routine-update
owner. Recheck compatible upstream releases at the next dependency review and
before #22 acceptance; retry the genuine security-update action when constraints
permit. If timing requires a one-time Dependabot version-update exception, submit
that specific proposal to the governing owners first; this runbook grants none.

## Governance and validation boundary

Meta main `4f0339d86f0ebfa073173ad307cb67c8d6042bdd` was revalidated. The complete
8-document/25-ADR source set was restored to an external private cache and verified
against the untruncated pinned tree; the unchanged session review applies.
Accepted ownership, dependency-maintenance, caching, SDLC/release and reuse
decisions and local ADR0001/0002 apply. Organization administrators own the window;
Johan owns Foundation acceptance. No public contract, package version, consumer
migration, runtime dependency or release authorization changes here. The broader
window decision and both real events remain outstanding.
