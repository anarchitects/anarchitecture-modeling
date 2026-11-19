# Genuine private-fork CI evidence — 18 November 2026

Refs [#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44).
The genuine private-fork event passed. The approved change window exceeded its
restoration and total-duration limits; its controls are now restricted again.
On 19 November Johan [accepted the deviation and recorded audit limitation](https://github.com/anarchitects/anarchitecture-modeling/issues/22#issuecomment-7005512190),
resolving #22 F03's owner disposition. The final inventory found only the approved
probe fork; transient, subsequently deleted forks cannot be ruled out. No repeat
organization-wide probe is required solely to close this finding, and no new
access window is authorized. Genuine Dependabot verification remains pending under the [event plan](private-ci-event-probes.md).

## Event and workflow provenance

- [Probe PR #50](https://github.com/anarchitects/anarchitecture-modeling/pull/50)
  was closed without merging at 11:02:40 UTC. Its only change was an eight-line
  marker at `tools/ci/probes/issue-44.md`, selecting both packages through existing
  shared inputs. No workflow or runtime code changed.
- Private fork `vrxj81/anarchitecture-modeling-ci-probe`, ID `1462673991`, has the
  actual upstream Modeling parent/source ID `1460569125`. Privacy, inherited
  administrator access and zero Actions secrets were checked before the probe.
  No collaborator or secret was added. The fork remains private and is retained
  pending explicit disposition; deletion was not authorized.
- [Run 44290122921](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44290122921),
  attempt 1, handled `pull_request` / `opened`.
  [Required job main](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44290122921/job/134752872343)
  completed successfully. Author, actor and triggering actor were `vrxj81`.
- No approval prompt occurred for this existing upstream administrator. This
  proves the fork event path, not external-contributor approval enforcement.

The downloaded sanitized trust artifact is retained verbatim below:

```json
{
  "event": "pull_request",
  "action": "opened",
  "actor": "vrxj81",
  "triggeringActor": "vrxj81",
  "repository": "anarchitects/anarchitecture-modeling",
  "ref": "refs/pull/50/merge",
  "pullRequest": 50,
  "author": "vrxj81",
  "headRepository": "vrxj81/anarchitecture-modeling-ci-probe",
  "headSha": "f6ca515ded4215aea91ee25769e89499521b677c",
  "baseSha": "a2b151493ea05dd16a44792b9b9b1dd6e1ee825d",
  "testedSha": "f341f29105a01a177b6f13cb28e5f6aa3a20b686",
  "workflowRef": "anarchitects/anarchitecture-modeling/.github/workflows/ci.yml@refs/pull/50/merge",
  "workflowSha": "f341f29105a01a177b6f13cb28e5f6aa3a20b686",
  "runId": "44290122921",
  "runAttempt": "1",
  "access": "off",
  "disabled": true,
  "tokenPresent": false,
  "aliasPresent": false
}
```

## Observed execution

GitHub's setup log reported Actions, Contents and Metadata permissions as read.
Checkout used `persist-credentials: false`. The unchanged workflow selects
`nx-cloud-pr` for this event; that environment had no secrets at the pre-window
check. The main-only write-token environment was not selected. The authentication
guard reported `CI cache trust: off; credential presence and enablement verified.`
Execution used `NX_NO_CLOUD=true`; the self-healing step was skipped.

All 12 selected tasks executed successfully with zero cache hits:

- `modeling-core`: build, lint, typecheck and test.
- `modeling-metamodel`: build, lint, typecheck, test, foundation-smoke,
  boundary-check, package-check and built-proof-check.

The later deterministic-archive step reused two **local** cached builds. This is
distinct from remote cache use. Cloud-off configuration, guard output and task
logs establish the observed cache behavior; an absent Nx Cloud execution alone
would not. No network-capture evidence is claimed. Existing #10 failure and
cancellation evidence applies only to unchanged failure propagation/cleanup logic.

Independent-consumer checks passed on Node 24.22.2 and TypeScript 6.0.3, including
strict NodeNext/Node16 declaration checks and lifecycle/recovery examples. The
archive reproduction log recorded:

| Package            | Files | Packed / unpacked bytes | SHA-256                                                            |
| ------------------ | ----- | ----------------------- | ------------------------------------------------------------------ |
| modeling-core      | 18    | 9109 / 32943            | `36e58849a6e10a7bfceae3beffe0a715a195b675c1ab87cdff9d001760fe530f` |
| modeling-metamodel | 68    | 53849 / 234251          | `fa52aeb5e313a726123032c78ab5ed24e8b542127ed3045b38bcf43e97b1effc` |

The run's seven-day artifacts expire on 25 November 2026:

- `ci-event-trust`, artifact `14421101254`, 505 bytes;
  digest `sha256:d7eeb29c1781d65089c6dc547975a3065cbb998ac61b434d05ebfbc4cca5fa2c`.
- `independent-consumer-evidence`, artifact `14421730125`, 69026 bytes;
  digest `sha256:2316704f9111b1fe5ae49087c1a86c23d14203c7bcb8c65fecd2398955428107`.

These artifact digests identify the uploaded artifacts, not the package tarballs.
The sanitized trust contents and reviewed log findings above remain available
after artifact expiry. Raw private inventories and logs are not committed.

## Window execution and deadline deviation

Johan explicitly approved the organization-wide window in the
[runbook](ci-probe-change-window.md), including changes to the other 16 private
repositories and both temporary exposure intervals. Approval and preflight are
recorded in [#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44#issuecomment-6976407603).
The reviewed inventory contained 17 exact repository IDs and no existing forks.

| Observation (UTC, 18 November) | Evidence                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| 10:55:31.864                   | Organization enablement detected; captured underlying flags                                   |
| 11.35 seconds later            | All other 16 repositories restricted; only Modeling allowed forking                           |
| About 11:02                    | All 17 captured underlying flags restored and read back; helper took 15.84 seconds            |
| 11:02:52                       | Organization still reported forking enabled; owner urged to disable immediately               |
| 11:51:20                       | Organization still reported enabled; ABORT issued                                             |
| 12:43:06.969                   | After owner confirmation, API verified organization disabled and all 17 effective flags false |

The exact organization shutdown time is not established. Both the 60-second
restoration and 15-minute total limits were exceeded. The owner readiness exchange
did not ensure timely shutdown. A read-only verification attempt timed out in
automatic approval review; its retry eventually established continued enablement.
An emergency attempt to reapply repository restrictions also timed out in approval
review and **never executed**. Do not describe this as a within-limit completion
or infer that successful CI validated the operational window.

The normal restoration helper successfully verified underlying values against the
post-enable snapshot before organization shutdown. The later effective-false
readback alone would not prove that restoration. It also happened before PR #50
was closed, reversing the runbook's stated close-then-restore order; the PR was
subsequently closed without merging.

After shutdown, a complete paginated fork inventory across all 17 source
repositories found exactly the approved private probe and no other extant forks.
This does not establish that no transient forks were created and deleted during
the extended window. Organization-administrator audit review remains outstanding;
keep detailed organization evidence private. Do not repeat the window without
reviewing the deviation and a shutdown mechanism independent of chat/tool latency.

## Restored controls and remaining work

- Organization private forking is disabled. All 17 original repositories remain
  private and report effective `allow_forking=false`.
- Johan confirmed restoring and saving the organization private-fork Actions
  settings: run false, write tokens false, secrets/variables false, approval false;
  the separate first-time-contributor policy was left unchanged. This is owner
  confirmation; the organization Actions API was unavailable to the CLI account.
- Repository fork-workflow GET reports all four flags false. A restoration PUT
  returned HTTP 422, `Policy is forbidden by entity owner`; therefore the GET
  establishes effective policy, not independently persisted underlying values.
  Recheck them before any later organization Actions enablement.
- Repository workflow default remains `read`, with PR review approval disabled,
  as independently approved. No restoration to a write default was attempted.
- The private probe fork is retained. No visibility, publication or merge occurred.
- Genuine Dependabot verification remains blocked by the documented dependency
  constraints. The fork result does not replace that event, clear the advisories,
  or authorize #22 acceptance or #23 disclosure.

Johan accepted the deadline deviation and audit limitation as recorded above;
the outstanding genuine Dependabot criterion remains separate. This documentation is a partial
evidence delivery, not a request to waive outstanding criteria.

## Governance

Meta default `main` was revalidated at
`4f0339d86f0ebfa073173ad307cb67c8d6042bdd`; the unchanged complete session review
of eight required documents and 25 ADRs applies. Accepted dependency-maintenance,
Nx caching, ownership, SDLC/release authority and consumer-boundary decisions,
local ADR0001/0002 and root instructions remain operative. Base Modeling revision
is recorded in the trust artifact. No public contract, runtime dependency,
package version or consumer migration changed. Organization policy and its
operational deviation belong to the organization administrators; Foundation
outcome acceptance belongs to Johan. No exception is inferred from a passing run.
