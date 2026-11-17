# Metamodel extraction and parity evidence

Implementation for [#15](https://github.com/anarchitects/anarchitecture-modeling/issues/15),
17 November 2026. **Johan’s metamodel parity acceptance remains pending.**
Core [#12 was explicitly accepted](https://github.com/anarchitects/anarchitecture-modeling/issues/12#issuecomment-6949062372)
after PR #36 merged at `dd985fe6aee2aa8ea1cc2b7ee5942cdf28c9cf45`.

## Source and retained behavior

Source: Archimatrix `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`,
`packages/modeling/metamodel/`. Destination: `packages/modeling-metamodel/`.
All **48 TypeScript source/test files** retain their relative paths and are
copied **byte-for-byte**: 32 runtime/barrel modules and 16 spec files. All seven
other package files (manifest, three TypeScript configs, ESLint/Vitest configs,
README) are adapted for this workspace. No original test expectation, runtime
implementation, public export or format is rewritten.

The accepted [file/PR manifest](extraction-files.md#metamodel),
[provenance inventory](license-provenance-inventory.md),
[public surface](extraction-public-surface.md) and
[portable/host disposition](extraction-boundary.md) remain the complete accounting
baseline. Source PRs #24/#26–#31 and #41–#45 supply the metamodel, cross-method,
change/command/history/codec lineage; the manifest also records scaffold and later
touches. Source #8/#22 and #9/#40 acceptance governs the assembled result.

Preserved obligations include:

- Exact pack/profile composition, constraints, provenance, notation/view bindings,
  authored overrides and explicit unsupported coverage.
- Bounded default plans, guarded semantic/view/session preparation, atomic
  rejection, explicit deletion/reversal reviews and historical receipt replay.
  Preparation creates candidates; consumers still own checkpoint adoption.
- Historical `archimatrix-document` envelope 1 and semantic model format 2,
  corrupt/invalid/future distinctions, meaningful opaque JSON and no implicit
  upgrades. Decode returns the same caller-owned bytes.
- Separate defaults of 100 live transactions / 10,000 command receipts versus
  codec caps of 256 command and 256 applied-plan receipts. Hosts must coordinate
  capacity before adoption; reopening starts empty live undo/redo stacks.

No method pack, VS Code module, file I/O, Blueprint implementation or private
shared package moves here. The existing synthetic package specs move unchanged
with the focused tests; #13 still owns supporting proof-document migration and
complete original-to-destination evidence mapping. Runtime builds exclude specs.

## Configuration adaptations

The existing Nx 24.0.6 `@nx/js:library` generator was inspected and dry-run before
generation, matching core’s TypeScript/ESLint/Vitest setup. Source tooling used
Nx 24.0.4. No new root dependency or tooling upgrade was necessary.

- npm identity `@anarchitects/modeling-metamodel`, Nx name `modeling-metamodel`,
  tags, private status and version `0.0.0` remain unchanged.
- `yarn workspace @anarchitects/modeling-metamodel add '@anarchitects/modeling-core@workspace:*'`
  links the accepted core. Both workspace links resolve inside this repository.
  Core and `tslib ^2.3.0` (resolved 2.9.1) remain the only runtime declarations;
  there are no peers or optional dependencies.
- TypeScript configs use the new directory depth and reference
  `../modeling-core/tsconfig.lib.json`. Root solution references include both
  projects. `yarn nx sync` reports all files up to date. Library ambient types
  remain empty; runtime build excludes specs/configs and emits JS/declarations.
- Ordinary ESM/type entries still use `dist/index.js` and `dist/index.d.ts`.
  The historical source condition and workspace range are retained pending #16.
  No source alias or cross-repository link is introduced.
- ESLint permits metamodel’s public inward core import while preserving core’s
  prohibition on metamodel and both runtimes’ host/method/framework/tooling bans.
  Dynamic loading, `require` and inline type imports remain prohibited. New
  negative fixtures also prove public core imports are allowed.
- Vitest includes original `src/` specs and two new `tests/` files. The test target
  depends on its own build, which depends on core build. Typecheck depends on its
  own build and core typecheck; incremental output writes are ordered. The narrow
  test-only self-import suppression exercises the ordinary built package entry.
- Existing shared config/toolchain/runtime inputs, conservative dependency inputs
  and generated-output exclusions are retained. No CI workflow or cache access
  policy changes are made.

## Validation results

Local environment: Node 24.22.3, Yarn 4.18.1, Nx/plugins 24.0.6, TypeScript 6.0.3,
Vitest 5.0.5, macOS arm64.

```sh
yarn install --immutable
yarn nx sync
yarn nx show project modeling-metamodel --json
yarn nx graph --file=/tmp/modeling-graph.json
node tools/ci/check-project-graph.mjs /tmp/modeling-graph.json
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
node --test tools/ci/*.test.mjs
```

- Immutable install and synchronization passed. Existing upstream Nx plugin
  peer-provision warnings remain; root tools are present and verification passed.
- The resolved graph has exactly two projects, with metamodel → core and no
  reverse edge. All eight build/test/lint/typecheck targets passed with **0/8
  cache hits**. Commands are TypeScript build/typecheck, Vitest and ESLint, with
  actual inferred prerequisites and declared outputs inspected.
- **1,198 tests passed:** core 24; metamodel 1,174. All 1,167 original metamodel
  cases remain in the same 16 specs, including the 913-case codec suite. Seven
  new cases cover built exports/capacities, exact composition, guarded preparation
  and retry after codec reopen, corrupt/future bytes, and runtime boundaries.
- All 48 source/test files, 32 emitted declarations and 32 emitted JavaScript
  files are byte-identical to the pinned source. The complete 116-name metamodel
  surface (31 runtime / 85 type-only names) is preserved; core’s 54 names remain
  unchanged. Tests and synthetic fixtures do not appear in `dist`.
- The original `tools/foundation-smoke.mjs` from the pinned source was run in
  temporary scripts against both sets of built modules, adapting only import
  locations. All **42 assertions** passed for both. Comparing **13 complete
  results** found equality across composition, plans, semantic/view commands,
  notation, session edit/undo/redo/reopen, encoding, decoding and corrupt input.
  This is bounded source parity, not independent tarball installation or host UI
  acceptance. The source checkout remained clean.
- Five fresh infrastructure regressions passed. On the real graph, explicit
  affected probes select both packages for core source/shared ESLint/lockfile,
  only metamodel for metamodel source, and none for unrelated root README.
- With remote cache disabled, warm builds replayed both tasks. Deleting both
  `dist` directories restored **119 artifacts** with identical SHA-256 hashes:
  core 22, metamodel 97 (JS, declarations/maps and build info).
- Temporary source/config probes verified real cache invalidation: core source
  reran both builds; metamodel source reran only metamodel; compiler config and
  lockfile each reran both. Restoring each input replayed the original artifacts
  exactly. All probe edits were reverted and original source bytes rechecked.
- Initial eight-task Nx duration was about 2.9 seconds, with a 2.3-second,
  three-task critical path. Warm/restored two-build command wall times were
  1.14/0.86 seconds. These are local observations; remote transfer, worker startup,
  memory/runner-seconds and hosted cold/warm performance are not established.

The source/declaration comparison is repeatable using a checkout/archive at the
source pin, building with its pinned tooling and comparing matching files against
the destination. Destination checks require only this repository and its installed
dependencies; the temporary comparison does not add a sibling dependency.

## Governance and remaining gates

The full session governance content review was reused after authenticated default
branch revalidation: Meta `main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd`.
Applicable accepted paths/proposal status remain in the
[inventory governance record](extraction-inventory.md#governance-record).
Local AGENTS, ownership and accepted ADR 0001/0002 apply at Modeling base
`dd985fe6aee2aa8ea1cc2b7ee5942cdf28c9cf45`. Source ADR 0001/0002, current Archimatrix
#12 direction, accepted #8/#22 and #9/#40 evidence were reconciled at the source
pin. Blueprint `af4f88517302937dc23c0da4763579d0cca83604` retains its standalone
and proprietary boundaries. No governance exception, new API or migration is needed.
Modeling owns this change and Johan accepts its bounded parity outcome.

#10 receives real two-library evidence but remains open for remote cache/trust,
hosted cancellation, the measured DTE decision and owner acceptance. Retain one
runner while collecting that evidence; the short local workload alone does not
justify added workers. #13 retains proof mapping, #16 built/packed entries,
#17 artifact-level independence, #19 integrated parity and #14 release controls.
PWG’s Meta #56 review proceeds separately. Existing rights/provenance obligations
apply; scaffold licensing is not final package clearance. #22/#23 retain final
candidate review and authorized disclosure/distribution. No release, tag,
visibility change or consumer adoption is authorized here.
