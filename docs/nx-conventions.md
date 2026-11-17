# Nx package and CI conventions

Baseline for [#10](https://github.com/anarchitects/anarchitecture-modeling/issues/10).
The original empty-graph baseline permits extraction to start. The graph now
contains **modeling-core and modeling-metamodel**, with eight real targets and
one inward dependency; see the [#12](core-extraction.md) and
[#15 extraction evidence](metamodel-extraction.md). Remote cache/trust proofs
remain outstanding. Johan accepts the outcome. PWG's parallel Meta #56 review
retains its registration/distribution scope.

## Package identities and boundaries

Preserve the source manifests' Nx names, npm identities and tags:

| Nx project           | npm package                        | Destination root              | Tags before first release                                    |
| -------------------- | ---------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `modeling-core`      | `@anarchitects/modeling-core`      | `packages/modeling-core`      | `scope:foundation`, `type:core`, `lifecycle:unreleased`      |
| `modeling-metamodel` | `@anarchitects/modeling-metamodel` | `packages/modeling-metamodel` | `scope:foundation`, `type:metamodel`, `lifecycle:unreleased` |

These destinations match the existing Yarn `packages/*` workspace pattern.
Set `name` explicitly in each package’s `project.json`; keep Nx tags/targets
there so tooling configuration is excluded from packed package metadata. Metamodel depends on core through a
Yarn workspace dependency and TypeScript project reference; core never depends
on metamodel. Use the package manager to link workspace packages. Consumers use
public entry points; no sibling-repository source paths or private shared package.
An Nx project name becomes a valid commit scope only after it exists in the graph.

`tools/ci/check-project-graph.mjs` checks the **resolved** Nx graph on every run:
known names/roots/tags, metamodel's inward edge, no reverse/project-host edges,
four required targets, cache/input declarations and build output declarations.
It allows the empty bootstrap graph and core arriving first. A present incomplete
package fails instead of silently disappearing from `run-many`. The manifest
check preserves the npm and Nx identities. Additional projects need deliberate
policy review. `lifecycle:released` is allowed only as part of the separately
authorized first release; this checker does not grant release authority.

Graph checks do not detect every forbidden source import, deep import, external
runtime dependency or false output declaration. Extraction must bring the source
boundary checks and negative fixtures. Runtime stays independent of Nx, hosts,
frameworks, databases, private Blueprint code and method-specific semantics.
See [ADR 0001](adr/0001-modeling-foundation-boundaries.md).

## Resolved targets, prerequisites and cache inputs

Use Nx 24.0.6, `@nx/js` 24.0.6, Yarn 4.18.1 and Node 24. Resolve each new project
with `yarn nx show project <name> --json`; inspect the actual command, inputs,
outputs, prerequisites and synchronization generators, not only its manifest.

| Target      | Convention and extraction verification                                                                                                                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`     | Existing `@nx/js/typescript` plugin infers from a valid `tsconfig.lib.json`; `^build` orders dependency builds. Retain inferred JavaScript/declaration/map/build-info outputs and prove all required artifacts restore. Root `emitDeclarationOnly` must be deliberately overridden for a JavaScript-producing package. |
| `typecheck` | Inspect the TypeScript plugin's inferred command, reference prerequisites and outputs. Reject disabled/echo-only targets. Avoid overlapping incremental/output files with simultaneous builds.                                                                                                                         |
| `test`      | Inferred by `@nx/vitest` for both libraries. Public-entry tests depend on the owning build; metamodel build orders core build first.                                                                                                                                                                                   |
| `lint`      | Inferred by `@nx/eslint/plugin` for both libraries, with runtime import restrictions and negative fixtures. Root lint/test configuration is included in shared inputs.                                                                                                                                                 |

`targetDefaults` makes those four deterministic targets cacheable, includes
`default` and `^default`, and preserves plugin outputs. Target defaults do **not**
create absent targets. `default` includes all project files and shared inputs.
Shared inputs explicitly cover root package/lockfile/Yarn/Nx/TypeScript config,
the CI workflow, CI tools, and Node version/OS/architecture. Nx's default external
dependency hashing remains enabled; no narrowed external-dependency allowlist is
introduced. Future root test/lint configuration must be included when introduced.

For two libraries, all lockfile/toolchain changes invalidate both projects. This
is a deliberate conservative baseline. Project sources and dependency sources
still invalidate in the correct direction; unrelated root Markdown does not
select library tasks. Keep `production` conservative until real fixtures prove
safe exclusions. Do not include generated outputs as source inputs; keep them
ignored and declare every artifact downstream tasks need. Resolve environment,
fixture and command-argument inputs when adding each task.

Publishing, GitHub mutations, current external-state checks and release approval
remain uncached. The CI history/graph checks and their fresh temporary-Git/cache
regressions run directly in the bootstrap step: caching that evidence would hide
the fresh-state behavior under test. Library verification always runs via Nx.

## Affected selection and the required check

The workflow fetches complete history and objects, without a partial-clone filter.
Historical trees must be available after checkout removes its credentials.
The upstream `nrwl/nx-set-shas@v5.1.0`
action uses a PR merge-base for PRs and the previous successful `ci.yml` push on
main for pushes. Its `per-commit` lookup excludes the current commit and examines
up to 100 preceding first-parent commits. API failure, no successful predecessor
or exhausted lookup makes selection fall back to all projects. We explicitly
disable its permissive `HEAD~1` fallback and do not export unverified Nx variables.

`tools/ci/validate.mjs` verifies full commit SHAs, available commits, non-shallow
history, ancestry, a readable diff and equality of the proposed head to the checked-out HEAD.
Equal base/head also falls back to all. A valid comparison runs `yarn nx affected
-t lint test build typecheck --base=... --head=...`; otherwise it runs `yarn nx
run-many -t lint test build typecheck`. A failing Nx comparison/task fails the
job; it is never interpreted as an empty successful selection.

The required GitHub check remains **`main`**, in one job without path filters or
job-level skips. A valid no-work selection succeeds with the actual selection
and bootstrap status in the job summary. Task/preflight/install failure fails
the check; cancellation remains cancellation. Only SHA discovery may continue
on error, and its fallback still runs validation. Self-healing cannot turn a
failed earlier step into success. No worker pool or parallel job split is added.
Existing main-only write-token isolation, PR read-only access and credential-free
fork/Dependabot handling remain as documented in [CI](ci.md).

## Verification evidence and remaining gates

Run the fresh infrastructure proofs with `node --test tools/ci/*.test.mjs`.
They construct disposable Git repositories outside the workspace and use the
installed Nx binary. They do not add projects to the production graph or call
Nx Cloud. The two-project fixture uses synthetic `run-commands` builds, not
extracted TypeScript or consumer contracts.

Initial scaffold observations on 17 November 2026, Node 24.22.3/macOS arm64:

- Valid ancestor selection; broad fallback for missing/malformed/unavailable
  commits, failed/skipped/cancelled lookup, wrong/equal head, unrelated history
  shallow history and missing historical trees; nonzero exits and interrupted
  subprocesses cannot pass.
- Graph admission and rejection, including incomplete targets and reverse edges.
- Actual Nx selection: unrelated Markdown selects none; metamodel source selects
  metamodel; core source selects both.
- Local fixture cache: two cold executions; warm replay adds none; deleting both
  output directories restores identical output without executing; core source
  invalidates both, metamodel source only itself, shared compiler config and
  lockfile each invalidate both. Logs print wall times for each case.
- One local fixture run measured 354 ms cold, 265 ms warm and 266 ms for clean
  restoration; all five infrastructure tests completed in 3.60 s. These small
  synthetic measurements establish test overhead, not production speedups.
- At that baseline the real graph was empty; graph generation/check took approximately 0.56 s.
  No real library test, artifact restoration or remote task-cache result follows.

DTE remains deferred. Both libraries now have targets, reaching the revisit
trigger below. #15 records eight cold local tasks in about 2.9 seconds and a
2.3-second critical path, plus real local cache restoration/invalidation. The
remaining hosted/remote measurements and owner decision stay in #10; these
local results do not establish a benefit from adding runners. DTE startup, remote
transfer, worker utilization and cost are **not measured**, and synthetic fixture
timings are not a distribution benchmark. Maintain one runner and no DTE workers.
Johan/maintainers now have both real libraries available for that review in #10;
revisit again if a substantial independent task workload appears. Record cold/warm total CI
time, selection/install overhead, longest task/dependency chain, cache transfer,
worker startup, memory and runner-seconds before selecting capacity. Use measured
benefit and equal outputs/failure behavior to decide whether distribution helps.

Keep #10 open for package-specific evidence as #12 (core) and #15 (metamodel)
arrive. Extraction is not blocked on completing both packages first. Record:

- Resolved real targets/inputs/outputs/prerequisites and runtime-boundary tests.
- Real positive/negative affected cases and source/dependency/config/environment
  invalidation; cold/warm replay and clean restoration of shipped artifacts.
- Remote write/reuse separately from local cache; PR write isolation and actual
  fork/Dependabot execution. Download caches and zero-task runs are insufficient.
- Hosted success/no-work/failure/cancellation outcomes for the stable check.
- The measured two-library DTE decision and explicit owner acceptance.

Release configuration and exact scope/type enforcement remain [#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14).
Publication, visibility and consumer adoption remain separate gates.
