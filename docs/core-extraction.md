# Core extraction and parity evidence

Implementation for [#12](https://github.com/anarchitects/anarchitecture-modeling/issues/12),
17 November 2026. **Johan’s parity acceptance remains pending.** The package builds
independently; this record does not authorize publication or consumer cutover.

## Source and movement boundary

Source: Archimatrix `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`,
`packages/modeling/core/`. Destination: `packages/modeling-core/`.
The accepted [#9 inventory](extraction-inventory.md), [file/PR manifest](extraction-files.md#core)
and [#11 disposition](extraction-boundary.md) define this movement. Source
#8/#22 and #9/#40 acceptance governs the assembled behavior; earlier proposal
and pending-acceptance prose does not override those decisions.

These nine files are copied **byte-for-byte**, preserving their internal relative
paths. No implementation, barrel, test expectation or format was rewritten.

| Relative source/destination path | Preserved responsibility / provenance                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src/index.ts`                   | Public barrel; all 54 exported names (13 runtime, 41 type-only)        |
| `src/lib/identity.ts`            | Branded caller-supplied identities and opaque revisions; source PR #23 |
| `src/lib/modeling-core.ts`       | Model format 2, references, containment and values; source PR #3/#23   |
| `src/lib/views.ts`               | Independent view/occurrence/connector data; source PR #25              |
| `src/lib/view-checks.ts`         | Structural view diagnostics; source PR #25                             |
| `src/lib/validation.ts`          | Model/reference/value structural checks; source PR #26                 |
| `src/lib/changes.ts`             | Change categories and canonical paths; source PR #27                   |
| `src/lib/identity.spec.ts`       | 12 original identity/revision cases; source PR #23                     |
| `src/lib/modeling-core.spec.ts`  | Four original creation/version/revision cases; source PR #3/#23        |

Full per-file provenance, including later touches, remains in the linked manifest
and [license inventory](license-provenance-inventory.md). All seven remaining
source package files are configuration/documentation: `package.json`, three
`tsconfig*.json` files, ESLint config, Vitest config and README. Their destination
counterparts are adapted below, rather than silently treated as unchanged code.

## Movement-only configuration

- Nx project `modeling-core`, npm identity `@anarchitects/modeling-core`, tags,
  private status and version `0.0.0` are preserved. The destination fits Yarn’s
  existing `packages/*` workspaces; installation links it locally without aliases
  or links to the source repository.
- The workspace’s Nx 24.0.6 `@nx/js:library` generator supplied the local project
  configuration, with matching `@nx/eslint`/`@nx/vitest` plugins added through Nx.
  Source tooling was Nx 24.0.4. Root lint/test config is included in shared inputs.
- TypeScript solution references use the new directory depth. The library emits
  JavaScript and declarations into `dist`, with its build info there and no Node
  ambient types. Test declarations/build info use `out-tsc`; generated outputs
  are ignored and excluded from task inputs.
- Ordinary ESM exports still resolve to `dist/index.js` and `dist/index.d.ts`.
  The existing `@archimatrix/source` condition is preserved; #16 owns the artifact
  and export-condition review. No bundler, new public entry point or runtime
  dependency was introduced. `tslib ^2.3.0` remains the sole runtime declaration,
  resolved to 2.9.1; there are no peer or optional dependencies.
- ESLint retains the core-to-core graph restriction and checks runtime imports
  separately: relative modules/compiler helpers only, no dynamic loading or
  inline type-import escape. Tooling/tests may use development dependencies.
  The built-entry test deliberately imports the package itself, with narrow
  documented suppressions of Nx’s relative-self-import rule.
- Vitest runs the original source tests and the new `tests/` consumer/boundary
  checks in Node, with watch disabled. The package test target depends on its
  own build. Typecheck also depends on build, preventing concurrent writers to
  library incremental outputs. Runtime build excludes all tests/configuration.

## Observed validation

Local environment: Node 24.22.3, Yarn 4.18.1, Nx/plugins 24.0.6, TypeScript 6.0.3,
Vitest 5.0.5, Vite 8.3.8, ESLint 9.39.5, macOS arm64.

```sh
yarn install --immutable
yarn nx show project modeling-core --json
yarn nx graph --file=/tmp/modeling-core-graph.json
node tools/ci/check-project-graph.mjs /tmp/modeling-core-graph.json
yarn nx run-many -t build test lint typecheck --projects=modeling-core
node --test tools/ci/*.test.mjs
```

- Immutable installation passed. Yarn reports upstream Nx plugin peer-provision
  warnings involving Nx, TypeScript and ESLint; the root supplies these tools and
  all resolved targets passed. No warning was hidden by loosening install checks.
- The resolved graph contains one project and all four real, cacheable targets.
  Build invokes `tsc --build tsconfig.lib.json`; typecheck invokes
  `tsc --build --emitDeclarationOnly`; test invokes Vitest; lint invokes ESLint.
  Graph policy passed. Inputs cover project/dependency sources plus shared
  toolchain/configuration/runtime inputs. There is no reverse or host edge.
- **24 tests in four files passed:** 16 unchanged original cases plus five
  built-entry/structural diagnostic cases and three runtime-boundary cases.
  These cover ordinary built resolution, unchanged runtime exports, independent
  layouts, missing/foreign references, unknown tagged/non-finite values, invalid
  view target/geometry paths and non-mutation. Negative import fixtures cover
  metamodel, method, host/framework/database/tooling and deep imports, re-exports,
  dynamic imports, `require` and inline type imports.
- Comparing pinned source and destination found all nine source/test files,
  all seven emitted `.d.ts` files and all seven emitted `.js` files byte-identical.
  Thus the complete [54-name public surface](extraction-public-surface.md) and
  declaration details remain unchanged, including compile-time brands.
- A paired built-module execution compared 11 results: model creation, exact
  identity spelling, blank-identity rejection, valid structure/value/view,
  unknown/non-finite values, missing/foreign references and invalid view geometry/
  target diagnostics. Full results matched and input snapshots were unchanged.
- Five fresh CI infrastructure tests passed. On the real graph, explicit affected
  file probes selected core for core source, root ESLint/Vitest/TypeScript config
  and lockfile changes; unrelated root README selected no project.
- Local cache checks used `NX_NO_CLOUD=true`. After a four-target execution with
  **0/4 cache hits**, repeated build replayed from local cache. Removing only the
  generated `dist` directory and rerunning build restored all **22 artifacts**
  with identical SHA-256 hashes: seven JavaScript files, seven declarations,
  seven declaration maps and library build info. Warm/restore wall times were
  approximately 0.58/0.57 seconds; these are local measurements, not remote or
  distribution benchmarks.

Source-byte comparison is repeatable against a checkout/archive at the pinned
revision: compare the two `src/` trees, build both with their pinned tooling, then
compare corresponding `.js` and `.d.ts` files under `dist/`. The original source
checkout remained clean. Tests added here consume only the destination package;
verification does not depend on an adjacent private checkout.

## Authority and remaining work

The existing session governance review was revalidated at Meta `main`
`4f0339d86f0ebfa073173ad307cb67c8d6042bdd`; applicable paths and proposal status
are listed in the [inventory governance record](extraction-inventory.md#governance-record).
Local AGENTS, accepted ADR 0001/0002 and ownership apply at Modeling baseline
`3db4366621e98936b92dbc4c91b5ecdb3dc3aae6`. Archimatrix source/ADR 0001/0002 and
current #12 direction/acceptance evidence were reviewed at the source pin above.
Blueprint remains at `af4f88517302937dc23c0da4763579d0cca83604`; its standalone
and proprietary boundaries are unchanged. No private governance or Blueprint
implementation is copied into the package. Modeling owns this change; Johan
accepts its bounded outcome. No architecture exception or new contract is needed.

#11 is accepted. #10’s merged baseline permits extraction, while remote cache,
two-library dependency/invalidation and distribution evidence remain open. This
one-library proof does not claim those results. #15 extracts metamodel; #13 and
#19 retain broader proof migration/parity work; #16/#17 retain artifact/standalone
verification. #14 owns releases. PWG’s Meta #56 review proceeds in parallel.

The package remains private and unreleased. The existing rights/provenance review
applies, but scaffold license metadata is not final package clearance. #22/#23
retain final candidate review and separately authorized disclosure/distribution.
Johan’s explicit #12 acceptance is separate from green tests and PR merge.
