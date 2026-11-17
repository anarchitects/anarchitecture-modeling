# CI and Nx Cloud baseline

Review for [issue #5](https://github.com/anarchitects/anarchitecture-modeling/issues/5),
17 November 2026. Johan owns acceptance. Connection and scaffold execution are
verified; package-cache proofs and the remaining checks below are not complete.

## Configuration

- Preserve workspace ID `6afb6fd0765b866d7b93eb5e`, added by merged
  [PR #1](https://github.com/anarchitects/anarchitecture-modeling/pull/1) at
  `fc617f2f16378ce1af32db9a8aaa9402ccf8c06e`. Do not reconnect or create another workspace.
- Nx and `@nx/js` are pinned to 24.0.6; Yarn is pinned to 4.18.1 with
  `nodeLinker: node-modules`. CI uses Node 24 and `yarn install --immutable`.
  Reviewed CI logs report Node 24.22.2 and Yarn 4.18.1; local review used Node 24.22.3.
- `.yarn/` is ignored and untracked; installation regenerates local state. Keep
  the root `yarn.lock` and `.yarnrc.yml` tracked for reproducible installs.
- The TypeScript plugin supplies build/typecheck conventions, but the resolved
  graph currently has **zero projects and zero tasks**. No package tests have run.
- CI runs affected lint/test/build/typecheck targets on main pushes and PRs with
  verified history, falling back to all projects if comparison is unavailable.
  The [#10 conventions baseline](nx-conventions.md) specifies graph admission,
  required-check behavior, local infrastructure proofs and the remaining package
  and remote-cache verification. The required check remains `main`.
- `actions/setup-node` caches Yarn downloads, not `node_modules` or Nx task outputs.
  These caches must not be counted as remote task-cache hits.
- Distributed execution is disabled: there is no useful task workload to distribute.
  Johan/maintainers revisit in #10 when both libraries have targets, measuring
  cold/warm duration, dependency critical path, startup overhead and compute cost.
  No worker count is selected without that evidence.

The immutable install succeeds with Yarn warning YN0086. Local
`yarn explain peer-requirements p267fcd` identifies `@nx/js@24.0.6` not providing
the `nx` peer requested by its `@nx/devkit` descendant. Root Nx is present at the
matching version and graph discovery succeeds. This is not proof of package-task
compatibility; reassess during #10 rather than silently modifying the lockfile.

## CI authentication and trust boundaries

Johan supplied settings evidence showing default workspace-ID access **none**,
logged-in developer access **read-only**, an unprotected-branch CI token with
**read** permission and a protected-branch CI token with **read-write** permission.
The token values are not source files or documentation.

| CI context               | Credential                                                                             | Expected access                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Push to `main`           | Environment `nx-cloud-main`, secret `NX_CLOUD_ACCESS_TOKEN`                            | Shared-cache read/write                                                         |
| Same-repository PR       | Repository secret `NX_CLOUD_READ_ONLY_TOKEN`, exposed to Nx as `NX_CLOUD_ACCESS_TOKEN` | Shared-cache read-only; any PR-scoped writes follow Nx Cloud's read-only policy |
| Fork PR or Dependabot PR | No credential; `NX_NO_CLOUD=true`                                                      | Local validation/cache only; self-healing skipped                               |

The `nx-cloud-main` environment has a selected-branch policy allowing only branch
`main`, not tags or PR merge refs. `nx-cloud-pr` contains no write secret. These
environment policies enforce isolation independently of a PR's workflow edits.
Do not move the write token into repository-wide secrets. CI fails explicitly
when a trusted run's expected token is missing. Keep the `pull_request` trigger;
do not execute PR code with elevated `pull_request_target` credentials.

GitHub reported `main` as **unprotected** during this review. The environment's
main-only restriction is configured, but it does not establish review/merge
protection. This was a governance gap at the time of #5. The subsequent
[#6](https://github.com/anarchitects/anarchitecture-modeling/issues/6) revisit
reopened that issue and applied owner-approved main protection and a temporary
tag freeze. See the [current governance evidence](repository-governance.md)
for readback, rejection probes and remaining acceptance. Those settings were
not part of the original #5 change.

`actions` and `contents` permissions remain read-only. Checkout does not persist
its GitHub credential. Environment access does not create deployment records.
See [Nx CI tokens](https://nx.dev/docs/guides/nx-cloud/access-tokens) and
[GitHub environment restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Recorded connection evidence

Baseline main: `cbbe9aa41a2b9a53850b563df55b0197784d5d86`. These runs precede the
access-control changes and must not be cited as verification of the new tokens.

| Case                      | GitHub Actions run                                                                              | Nx Cloud run                                       | Result              |
| ------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------- |
| Merged connection         | [43957152248](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/43957152248) | [vXalPtNDhn](https://cloud.nx.app/runs/vXalPtNDhn) | Success, zero tasks |
| Main after ADR acceptance | [44054540846](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44054540846) | [bXZ71GpaRI](https://cloud.nx.app/runs/bXZ71GpaRI) | Success, zero tasks |
| ADR acceptance PR         | [44054298216](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44054298216) | [bBpwEAOdYO](https://cloud.nx.app/runs/bBpwEAOdYO) | Success, zero tasks |

The Nx Cloud Public API `cipes` query for 2026-11-16 through 2026-11-17 returned
eight executions, one complete page (`nextCursor: null`). Following the three
selected executions' run links returned one run each, also complete. Their run
summaries report `cacheEnabled: true`, `isDTE: false`, `isCI: true` and
`tasks.total: 0`. These are recorded API fields, not proof of cache hits, write
permissions, artifact restoration or resolved target inputs/outputs. The PR run
records merge SHA `812f035c04e0d12cb076611e4b89a5442934c6e6`; GitHub's PR head is
`888a025141a6bcf0767fd63a1a8807b39baba0db`.

The three GitHub logs show no tasks run and masked checkout authorization. A
bounded credential-marker scan found no Nx token variables, private-key headers
or GitHub token prefixes. GitHub lists zero uploaded artifacts for these runs;
zero tasks means no task-output restoration was inspected. This review does not
certify the absence of every possible secret or future artifact disclosure.

## Self-healing and remaining acceptance

[PR #27](https://github.com/anarchitects/anarchitecture-modeling/pull/27) adds
`yarn nx fix-ci`. It runs after successful or failed prior steps when the run is
not cancelled and Nx Cloud is enabled. Nx Cloud decides whether there is a
failure to analyze; calling the command is not proof that a fix was generated or
accepted. No auto-apply setting is inferred. Fixes retain normal review and owner
acceptance; self-healing does not authorize merge or release.

Johan accepted the bounded #5 review after PR #27 merged at
`6fbbfa6547a3e66706c818ea89af5aefb0c94973`; #5 is closed. The subsequent
[PR run](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44056716030)
and [main run](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44057108811)
passed with separate credentials and masked token entries. Both ran zero tasks.
PR self-healing was enabled with no fixable tasks; main self-healing was skipped
for the long-lived branch. This establishes connection/authentication evidence,
not actual package-cache behavior.

Credential-free fork/Dependabot execution and actual cache-access enforcement
remain #10 checks when meaningful targets exist. The #6 protection work does not
complete these package proofs or accept epic #2.

## Package-task proof handoff to #10

Once real targets exist, record exact commits, Nx project names, resolved target
configuration, commands and CI/Nx Cloud links for:

1. Build/test/lint/typecheck prerequisites, inputs, outputs and inward dependency
   direction. Confirm which targets are deterministic and cacheable.
2. Cold execution, then local reuse; delete only declared generated outputs and
   prove complete restoration. Separately demonstrate remote reuse in a clean
   runner without a populated local Nx cache.
3. Source, dependency, lockfile, toolchain and configuration invalidation;
   positive and negative affected-selection cases, including invalid-history
   fallback. Missing comparisons must not produce a successful empty check.
4. Shared-cache writes from trusted main, restricted PR writes, and anonymous
   denial without exposing tokens. Inspect actual logs/output archives for
   secrets and private material. No empty-graph run substitutes for these cases.
5. Failure/cancellation propagation and a stable required CI outcome. Keep
   publication, other external mutations and fresh-state checks uncached.

## Governance review

Meta's authenticated default branch remained `main` at
`4f0339d86f0ebfa073173ad307cb67c8d6042bdd`; the complete inventory and current
mandatory documents were reviewed in this session. Applicable accepted paths
include `adr/0004-meta-owns-landscape-contracts.md`,
`adr/0012-canonical-public-api-contract-ownership.md`,
`adr/0013-package-initial-release-and-nx-versioning.md`,
`adr/0014-renovate-and-dependabot-dependency-management.md`,
`adr/0015-nx-task-caching-and-distributed-execution.md`,
`adr/0016-sdlc-ownership-and-architecture-authority.md`,
`adr/0017-release-cadence-and-owner-authority.md`,
`adr/0018-upstream-first-exceptions-and-cutover.md`,
`adr/0019-repository-projects-and-organization-overview.md` and
`adr/0021-consumer-applications-and-public-upstream-reuse.md`.
Proposed governance models remain proposals. Local AGENTS.md and accepted ADRs
0001/0002 apply at baseline `cbbe9aa41a2b9a53850b563df55b0197784d5d86`.

This is repository-owned CI work with no public API, runtime dependency, package
version or consumer changes. No new upstream extraction or Blueprint decision is
needed for this scope. Meta registration, license/disclosure review and release
controls remain separate gates. No governance exception is claimed.
