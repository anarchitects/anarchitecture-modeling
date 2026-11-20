# CI and cache acceptance evidence

Review for #10, 17 November 2026. Baseline:
`314fcbff65deca043640471d24177ebc038a93b3`. Johan accepts this bounded outcome;
implementation, acceptance, public disclosure and release remain separate.

## Existing package and local-cache evidence

Accepted #12/#15/#16/#17/#19 establish the real two-library graph, metamodel → core
only, build/test/lint/typecheck inputs and prerequisites, positive/negative affected
selection, source/dependency/config/lockfile invalidation, runtime boundaries and
exact artifact contents. [Integrated parity](integrated-parity.md) records the
12-task clean/warm/restored runs and identical hashes for 130 generated files,
including 80 runtime artifacts. These remain local-cache observations.

The required `main` job has no path filter or job-level skip. Complete ancestor
history narrows affected selection; unavailable comparisons broaden it. Seven
fresh infrastructure tests now include event trust and credential-presence checks,
in addition to history, graph and cache regression coverage. Signals/nonzero child
exits cannot turn validation into a successful no-work result.

## Hosted remote-cache evidence

The authenticated Nx Public API was queried for CIPEs from
`2026-11-17T13:00:00Z` through `2026-11-17T15:30:00Z`: 14 records, one complete
page (`nextCursor: null`). Four selected CIPE run links each returned one completed
run with no next page. No rate, percentile or whole-history claim follows.

### Trusted main output reused by a PR

- Producer: [main CI 44104831306](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44104831306),
  commit `7fe8bda4c93856da47ee4544cac6728b4eb27a13`, Nx run `f9dJ75S9GW`.
- Consumer: [PR #41 CI 44107634158](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44107634158),
  tested merge `a9c6b9afbfe599caa00e91a857c3700b8fac4867`, Nx run `DASemMudQL`.
- The API reports `modeling-core:build`, hash `10445912464385740507`, producer
  `cache-miss`, consumer `remote-cache-hit`. The consumer's `cacheOrigin` explicitly
  links to that main producer. This is observed task-cache reuse, not Yarn download
  caching or an inference from `cacheEnabled` alone.
- The consumer's downloaded gzip/tar contains 17 files: 14 JS/declaration files,
  library build-info, terminal output and exit code. All 14 runtime/declaration
  files match the accepted local build byte-for-byte. Build-info is task-cache
  metadata, excluded from public npm artifacts.

The main-after-#42 metamodel build (`D7CBm4cJ5w`, hash
`15048127260820307848`) was also downloaded: 67 cache files, including 64
JS/declaration files that match the accepted local build. Across both archives,
the bounded scan found no private-key/GitHub-token/Nx-token assignment markers,
credential files, specs or documentation. This is a scoped review of those build
outputs, not a certification of every cache artifact or all possible secret forms.

### PR output is not promoted to the shared main cache

For `modeling-core:build`, both PR #42 run `d9UKCl5naB` (tested merge
`9c729a7cdb920be754c1304fb6740395c71d8011`) and following main run `D7CBm4cJ5w`
(commit `314fcbff65deca043640471d24177ebc038a93b3`) have hash
`2366818652668998127`. Both record `cache-miss`; PR task metadata advertises logs
only, while main advertises an artifact. Main therefore executed this task rather
than reusing the prior PR result. This is a bounded observed isolation case, not a
claim that an absent asset proves it never existed or an exhaustive backend audit.

The configured tokens remain main-only read/write and PR shared-cache read-only.
[Nx's token policy](https://nx.dev/docs/kb/access-tokens) and
[cache-security model](https://nx.dev/docs/kb/cache-security) distinguish shared
cache writes from isolated PR caching; read-only must not be described as a
universal prohibition on all PR-scoped writes. No token value appears in evidence.

## Credential policy and platform limits

The workflow now explicitly excludes fork and Dependabot events from credential
selection, even if an identically named secret were configured for those contexts.
`verify-auth.mjs` compares event/repository/ref/actor context with credential
presence and `NX_NO_CLOUD`. It fails on unexpected credentials, a missing trusted
credential, alternate auth-token injection or inconsistent enablement. It prints
only the expected access class, never values or prefixes.

On 17 November, authenticated settings readback confirmed:

- Private repository, `allow_forking: false`, no existing forks and no open PRs at
  the start of this review. The complete 44-run Actions inventory had no fork or
  Dependabot **PR** runs and no cancelled runs. Dependabot updater jobs are not
  package CI evidence.
- `nx-cloud-main` allows only branch `main`; `nx-cloud-pr` has no write-token
  environment. Repository access and token scopes were not widened.
- `main` has **classic branch protection**, visible under Settings → Branches,
  separately from rulesets: PR required, up-to-date required `main` check tied to
  GitHub Actions, conversations resolved, admins enforced, no force push/deletion.
  Johan is the restricted updater; zero required approvals intentionally permits
  solo-maintainer merges. The active tag-freeze ruleset remains separate.

The dedicated `Cache trust proof` workflow receives no Nx credential and no
environment secrets. It requests a real core-build cache lookup and requires an
explicit authorization rejection, then runs all real package checks with Cloud
disabled. It runs only on demand or when its own proof files change; it does not
duplicate every ordinary package CI run or replace the required `main` check.
It is a controlled credential-free hosted proof, **not a real fork/Dependabot event**.

Hosted proof at head `8e20de87d38acdecda7feae0e978591a67c98322`, tested merge
`63e0d4996c89ca2f4785d51a08a00f205868b7ae`:

- [Credential-free run 44115982326](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44115982326)
  succeeded. The real core-build request produced an explicit remote authorization
  rejection with no supplied Nx credentials. With `NX_NO_CLOUD=true`, all 12 real
  tasks then passed, 0/12 cache hits, 22.1s Nx duration / 19.4s critical path.
- [CI run 44115981877 attempt 1](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44115981877/attempts/1)
  was deliberately cancelled while `Validate affected projects or all projects`
  was active. Required job `main` and that step concluded `cancelled`;
  `nx fix-ci` was skipped. This proves cancellation remains cancellation instead
  of being masked by self-healing/cleanup. The job was then requested to rerun;
  its recovery and the final PR-head checks are recorded in the PR.

The [#44 private event probe plan](private-ci-event-probes.md) records current
settings, preparation changes and required owner decisions. It contains no claim
that either genuine event has already passed.

Actual fork/Dependabot event coverage remains unavailable under current
repository settings. Before expanding repository access, execute a real event
probe and review its secret/cache boundaries. Owner acceptance of the bounded
private-repository result must acknowledge this limitation; it is not silently
waived by green CI or a visibility change.

## DTE decision: retain one runner

Both libraries now exist, so this completes the original deferral review trigger.
The repository retains one GitHub runner with Nx's local task parallelism and no
distributed workers. The recommendation rests on the current workload, not on an
assumed worker count or speculative distributed speedup.

| Completed run               | GitHub job seconds | Validation-step seconds | Nx cache evidence                                 |
| --------------------------- | -----------------: | ----------------------: | ------------------------------------------------- |
| Main after #40, 44104831306 |                 57 |                      33 | Known core build producer                         |
| PR #41, 44107634158         |                 52 |                      22 | 2/10 remote hits                                  |
| PR #42, 44112009591         |                 56 |                      35 | 0/12 hits                                         |
| Main after #42, 44112448658 |                 65 |                      41 | Same core hash executed independently of PR cache |

Durations are computed from GitHub job/step timestamps, not billing estimates.
The current PR #42 Nx summary reports 24.9s task duration and a 22.2s dependency
critical path. At unchanged task speeds, only 2.7s separates that task duration
from the dependency-path lower bound. These different accounting scopes are not
interchangeable: the GitHub validation step also includes Nx startup/reporting.
Install steps took 2–4s in this sample; checkout/setup, graph/infrastructure checks,
reporting and teardown also remain outside task-distribution gains.

The API records `isDTE: false` for all four selected runs and no CIPE compute
utilization metrics. There is no measured worker startup, DTE transfer, memory,
cost or utilization result; no DTE experiment or additional capacity was purchased.
The short task graph offers too little demonstrated scheduling benefit to justify
that experiment now. No claim of DTE equivalence or cost saving is made.

Revisit if the median Nx duration exceeds two minutes across 20 comparable runs,
if independent work outside the longest dependency path exceeds 30 seconds, or
if new projects create memory/parallelism pressure. Record workload, cold/warm
job and task durations, worker startup/transfer, memory, runner-seconds and equal
outputs/failure behavior before proposing capacity. The owner reviews the measured
proposal; publication and external-state checks remain uncached.

## Acceptance boundary

No public contract, dependency version, package release or visibility changes.
Meta's reviewed default branch remains
`main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd`; accepted local ADR 0001/0002 and
the existing ownership/CI decisions apply. The full content review was reused
after revision revalidation. #14 retains release controls, and #22/#23 retain
candidate disclosure/publication. Johan subsequently accepted #10's bounded outcome
after PR #43 merged as `db8b76f81144e2e1e3f9c36dca59ffc8dfcd0594`;
[#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44) owns the
deferred real-event verification. Its original before-readiness sequencing is
superseded for the remaining bot event by the
[20 November bounded disposition](public-readiness.md#bounded-dependabot-follow-up--20-november-2026).
The real fork result and the unverified bot event remain distinct.
