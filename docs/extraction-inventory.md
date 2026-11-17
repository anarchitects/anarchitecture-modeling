# Foundation extraction inventory

Review snapshot for [issue #9](https://github.com/anarchitects/anarchitecture-modeling/issues/9)
under [epic #3](https://github.com/anarchitects/anarchitecture-modeling/issues/3),
17 November 2026. Johan is the Foundation capability owner and technical maintainer;
acceptance remains his separate decision. This inventory moves no source code.

## Pinned scope and coverage

The source is `anarchitects/archimatrix` main at
`b83c78e7a70e1434a6bf9101d7bbf43467becf7f`. Its complete, non-truncated Git tree
and package history were inspected. Refresh the source revision and this inventory
before extraction; do not silently combine revisions.

- [File and fixture manifest](extraction-files.md): all **71 package files**
  (16 core, 55 metamodel), **16 proof documents/event records**, and two supporting
  boundary/smoke scripts, with responsibility and source issue/PR evidence.
- [Public surface](extraction-public-surface.md): **170 exported names**
  (54 core, 116 metamodel), grouped by defining file and runtime/type-only status.
- [Provenance inventory](license-provenance-inventory.md): exact introduction/latest
  commits for the package files; the [rights review](license-provenance-review.md)
  records attribution and remaining artifact/dependency checks.

There are 18 package spec files with inline synthetic fixtures, no separate tracked
fixture asset directory or JSON fixture under either package. Their executable
baseline is **1,183 cases: core 16, metamodel 1,167**. The per-file manifest includes
all 913 codec cases; parameterized malformed-field checks are individual cases,
not 913 independent fixture documents. Fixtures prove bounded generic contracts,
not licensed ArchiMate coverage, method certification or database execution.

## Package identity and resolution

| Field                        | Core                                                                                            | Metamodel                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| npm identity                 | `@anarchitects/modeling-core`                                                                   | `@anarchitects/modeling-metamodel`                           |
| Source root / Nx name        | `packages/modeling/core` / `modeling-core`                                                      | `packages/modeling/metamodel` / `modeling-metamodel`         |
| Version / publication state  | `0.0.0`, `private: true`                                                                        | `0.0.0`, `private: true`                                     |
| Module / main / module entry | `type: module`; both entries `./dist/index.js`                                                  | Same                                                         |
| Declarations                 | `./dist/index.d.ts`                                                                             | Same                                                         |
| `exports["."]`               | `@archimatrix/source` → `./src/index.ts`; `types` → declarations; `import`/`default` → built JS | Same                                                         |
| Other exported subpath       | `./package.json` only                                                                           | Same                                                         |
| Runtime dependencies         | `tslib: ^2.3.0`                                                                                 | Core `workspace:*`, `tslib: ^2.3.0`                          |
| Peer / optional dependencies | None declared                                                                                   | None declared                                                |
| Nx tags                      | `scope:foundation`, `type:core`, `lifecycle:unreleased`                                         | `scope:foundation`, `type:metamodel`, `lifecycle:unreleased` |

The source lockfile resolves the declared helper range to **tslib 2.9.1**, whose
installed manifest has no dependencies (0BSD; retain notice review). Another
transitive tooling resolution, tslib 2.8.1, is not the package runtime resolution.
Both libraries enable `importHelpers`; no explicit tslib import occurs in their
source. The only non-relative library source import is metamodel → core. Config
imports of `vitest/config` and test use of Node globals are development concerns.
The import inventory found no runtime ArchiMate, VS Code, filesystem, framework,
Nx or database dependency. Preserve that distinction when packaging declarations
and compiler helpers; source absence alone does not prove a final tarball closure.

Source TypeScript uses NodeNext module/resolution, ES2022, strict composite builds,
declaration maps and `customConditions: ["@archimatrix/source"]`. Library configs
emit JS and declarations into package-local `dist`, with `rootDir: src` and tests
excluded. Metamodel's library references core's library config. Package solution
configs reference library and test configs; the root solution references projects.
Test configs use Vitest/Node types and reference the library.

The source condition occurs in root TypeScript settings, both Foundation package
export maps, the ArchiMate package export map, the host Vitest config, and the
extension/desktop-harness esbuild configurations. Foundation Vitest configs have
no explicit custom resolve condition; their Node tests currently work with the
resolved graph's dependency build. The separate smoke script uses built public
entries under ordinary Node resolution. Removing the source condition is an
extraction/adoption change that needs built-artifact evidence; it is not done here.

## Resolved Nx graph and targets

The graph was resolved with the source's installed **Nx 24.0.4**, not inferred from
package manifests alone. All five nodes and all workspace edges are:

| Project                   | Direct static workspace dependencies                |
| ------------------------- | --------------------------------------------------- |
| `modeling-core`           | None                                                |
| `modeling-metamodel`      | `modeling-core`                                     |
| `archimate-metamodel-3_2` | `modeling-core`, `modeling-metamodel`               |
| `archimate-vscode`        | Both Foundation projects, `archimate-metamodel-3_2` |
| `workspace-tools`         | Both Foundation projects                            |

Both Foundation projects resolve these targets:

| Target                            | Execution and prerequisites                                              | Cache / outputs                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `build`                           | `tsc --build tsconfig.lib.json`; `^build` first                          | Cache enabled; package `dist` JS/declarations/maps and library build info                            |
| `typecheck`                       | `tsc --build --emitDeclarationOnly`; own `build` first                   | Cache enabled; solution/library/test build info and declarations/maps in `dist` and `out-tsc/vitest` |
| `lint`                            | `eslint .` in project root                                               | Cache enabled; optional configured ESLint output file                                                |
| `test`                            | `vitest` in project root; `^build` first                                 | Cache enabled; `test-output/vitest/coverage`                                                         |
| `test-ci--src/lib/<spec>.spec.ts` | `vitest run` for each discovered spec with a per-file coverage directory | Cache enabled; 2 core / 16 metamodel task splits                                                     |
| `test-ci`                         | No-op aggregate depending on every project spec split                    | Cache enabled; union of split outputs                                                                |
| `build-deps`                      | No-op depending on `^build`                                              | No independent output declaration                                                                    |
| `watch-deps`                      | Nx watch including dependencies, invoking `build-deps`                   | Continuous development command; no cache declaration                                                 |

Build/test/typecheck/lint use resolved `default` and `^default` inputs. Source
`default` covers project files and shared globals while excluding `dist` and
`test-output`; shared globals include the CI workflow, base TypeScript config,
ESLint config, `tools/**`, Yarn config and Node version. The split test targets
also carry inferred file/dependency inputs. These are the source configuration,
not a claim that the destination already has equivalent coverage.

The ArchiMate project has the same inferred build/typecheck/lint/test family
(one split test). The host additionally resolves cached build and VSIX package
targets, with uncached manual `extension-host-smoke` and
`extension-host-integration`. `workspace-tools` resolves lint, test, format,
uncached policy, and a cached `foundation-smoke` depending explicitly on both
Foundation builds. Its `test` combines policy tests with five Foundation boundary
checks; it must not be counted wholesale as portable library tests.

Modeling at `fa82acdcd12f615755217aed1e9ea72d287f0823` has **Nx/@nx/js 24.0.6**,
Yarn 4.18.1 and no package projects. Archimatrix has Nx TypeScript, ESLint and
Vitest inference; Modeling currently has TypeScript inference only. #10 and the
extraction issues must establish actual test/lint targets, accurate inputs/outputs,
links and affected/cache evidence here. This inventory does not copy source Nx
Cloud credentials, workspace identifiers, release configuration or worker counts.

## Consumer and build coupling

All paths below are relative to the pinned Archimatrix tree. Import scans include
production, test and tool files; no cross-repository source dependency is created.

| Consumer paths                                                                                                   | Relationship and disposition                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/archimate/metamodel-3_2/package.json`, `tsconfig.lib.json`, `src/lib/archimate-metamodel-3-2.ts`       | Workspace dependencies/project references and public imports of both packages; method-specific pack stays in Archimatrix. Its spec exercises the local pack indirectly.                                            |
| `apps/archimate-vscode/package.json`, `tsconfig.lib.json`                                                        | Workspace dependencies and project references to both Foundation packages; host stays in Archimatrix.                                                                                                              |
| `apps/archimate-vscode/src/model-context.ts`                                                                     | Metamodel context supplied by host; actual product pack remains unsupported/read-only at this pin.                                                                                                                 |
| `apps/archimate-vscode/src/model-editor.ts`                                                                      | Core identities and metamodel preparation/codec/session APIs; native lifecycle/URI ownership stays with host.                                                                                                      |
| `apps/archimate-vscode/src/backup-storage.ts`, `src/persistence/local-document-storage.ts`                       | Import metamodel codec limits; backup/filesystem implementation stays with host. Second path is relative to the same app root.                                                                                     |
| `apps/archimate-vscode/src/persistence/managed-document.ts`                                                      | Metamodel session/codec APIs plus core revision type; commit adoption, save coordination and capacity alignment stay with host.                                                                                    |
| `apps/archimate-vscode/src/persistence/fixture.spec-helper.ts`                                                   | Test-only synthetic registry/checkpoint fixture importing both packages; retain host fixture, do not ship it in Foundation.                                                                                        |
| `apps/archimate-vscode/src/model-editor.spec.ts`, `src/persistence/persistence.spec.ts`, `src/extension.spec.ts` | Host tests directly consuming Foundation; remaining paths share the app root. Keep host/filesystem/UI assertions in Archimatrix.                                                                                   |
| `apps/archimate-vscode/test/lifecycle-integration.mjs`                                                           | Both public packages in a native desktop test harness; retain host ownership.                                                                                                                                      |
| `tools/foundation-smoke.mjs`                                                                                     | Ordinary Node built-entry consumer of both libraries; portable contract evidence to adapt.                                                                                                                         |
| `tools/foundation-boundaries.spec.mjs`, `eslint.config.mjs`                                                      | Enforce one-way package dependency and reject host/method/framework/persistence/deep imports; adapt paths and allowlist assertions here.                                                                           |
| `tools/build-extension.mjs`                                                                                      | esbuild bundles production extension to CJS, target Node 20, external `vscode`, source condition; checks metafile for test fixture exclusion. This bundle target does not set Foundation's runtime support policy. |
| `tools/extension-host-smoke.mjs`, `apps/archimate-vscode/vitest.config.mts`                                      | Desktop harness bundling and host tests enable the source condition; later adoption must exercise published artifacts.                                                                                             |
| Root `package.json`, `yarn.lock`, `nx.json`, `tsconfig.json`, `tsconfig.base.json`, `vitest.config.mts`          | Workspace links, pinned tooling, inferred graph, references, conditional resolution and test discovery. Adapt to Modeling's package layout and pinned toolchain.                                                   |

Blueprint was consulted for ownership/reuse policy at
`af4f88517302937dc23c0da4763579d0cca83604`; its future adoption is separate. There
is no Blueprint code, private shared package or consumer migration in this change.
Archimatrix's #57 → #58 → #59 follow-ups own its artifact-based adoption/cleanup.

## Evidence scope and open seam decisions

| Evidence                                                                              | What it establishes                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted Archimatrix #8/#22, PR #31, merge `7f95131706db2c386725fafe5c58d3c787e97c7c` | Historical Foundation integration: 18 Nx tasks / 199 total tests, including six integrated contract cases and five boundary checks. Not today's portable count.                                     |
| Accepted Archimatrix #9/#40, PR #49, main `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`  | Historical lifecycle integration: 18 Nx quality tasks / 1,275 whole-workspace tests, plus native host evidence. Native runs used synthetic registries; no production ArchiMate conformance follows. |
| Current two package test targets at the pinned revision                               | 18 spec files / 1,183 passing cases, including 913 codec cases after the #38 corpus split. Current portable baseline only.                                                                          |
| Current built-entry smoke                                                             | Ordinary Node resolution of both built exports, including codec round-trip and session undo/redo/reopen retries. Not a packed or published consumer test.                                           |

#11 must resolve these B1 seams file by file with Johan's acceptance. This list
records current behavior and proposed disposition; it does not accept the split.

| Seam / files                                                                                                                                              | Behavior to preserve and ownership question                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document-session-contracts.ts`, `document-assessment.ts`, `document-edit-preparation.ts`, semantic/view staging and command modules                      | Portable typed checkpoint/context, exact revision/receipt guards and detached candidates. Host supplies registry/theme/executable context and adopts a candidate through its commit port; a port is not a filesystem/VS Code implementation.                                             |
| `document-deletion.ts`, `document-execution.ts`, `document-lifecycle.ts`, `document-transaction-staging.ts`, `document-history.ts`, `session-commands.ts` | Bounded cleanup, generated baselines, transactions and guarded undo/redo. Reopen clears live stacks while retaining durable retry metadata. Inverses do not promise original collection insertion positions.                                                                             |
| `document-codec-contracts.ts`, `document-codec.ts`, `document-codec-shape.ts`, `codec-json.ts`                                                            | Portable UTF-8/JSON codec, envelope 1 / model format 2, exact pins, unknown opaque data and explicit unsupported/resource failures. The envelope string remains `archimatrix-document`; changing the branding in serialized data would be a compatibility decision, not cleanup.         |
| Session history policy versus codec limits and host `managed-document.ts`                                                                                 | Default in-memory history is 100 transactions / 10,000 receipts; codec caps command and applied receipts at 256 each. Host aligns capacity and must preserve session/last-good file on failure, never silently prune retry evidence. Other byte/depth/collection limits may fail sooner. |
| Codec recovery result and host backup/storage/recovery modules                                                                                            | Original recovery bytes are caller-owned and must remain immutable. Core/metamodel cannot absorb locks, fsync/rename, URI/model ownership, save-as/dirty state, native activation or recovery UI.                                                                                        |
| Public entries/configuration and test/bundle consumers                                                                                                    | Preserve all 170 names and signatures/behavior, adapt layout/linking/source condition deliberately, and prove built/packed entry points under the destination toolchain. No new packages or deep-import contract is implied.                                                             |

No unresolved prerequisite blocks this inventory. #11 owns seam acceptance;
#12/#15 own package extraction; #10 retains real graph/cache evidence; #14 owns
release controls. Apache-2.0 attribution and rights findings do not clear every
future tarball or public history: #22 applies the public-readiness gate and #23
owns separately authorized exposure/publication. PWG's Meta #56 review continues
in parallel and remains a prerequisite for final public distribution, not for
this private inventory.

## Reproduction and validation

The pinned source was exported to a temporary directory outside this repository.
Its installed dependencies were reused with temporary local workspace links;
no dependency installation or source checkout mutation was required. Observed
versions: Node 24.22.3, Yarn 4.18.1, Nx 24.0.4, TypeScript 6.0.3, Vitest 5.0.5,
tslib 2.9.1 on darwin/arm64. The resolved versions agree with the source lockfile;
this was not a fresh immutable-install proof.

With `NX_DAEMON=false NX_ISOLATE_PLUGINS=false NX_NO_CLOUD=true` (and `CI=true`
for tasks):

```sh
yarn nx graph --file=/tmp/foundation-source-graph.json
yarn nx run-many -t test --projects=modeling-core,modeling-metamodel
yarn nx run workspace-tools:foundation-smoke --output-style=static
```

Graph: five nodes and the edges above. Tests: both targets and core dependency
build passed, initially 0/3 cache hits; replay with `--output-style=static`
exposed the full per-file logs from the local cache. Smoke: both package builds
and public-entry proof passed (core build reused locally). Nx Cloud was disabled.
No whole-workspace, native desktop, VSIX packaging or release test was rerun.
The five source boundary checks were inspected, not rerun in this inventory.

Coverage was checked against the exact Git-tree file set (89 unique paths), all
170 barrel export symbols and the 18 resolved spec splits. Ordinary imports of
the built entries also matched all 44 runtime export names (13 core, 31
metamodel). Documentation links, Prettier and `git diff --check` passed. Source
checkout remained clean.
These are inventory and source-baseline checks; extraction parity, packed-artifact
compatibility and owner acceptance remain separate evidence.

## Governance record

Meta main was revalidated at `4f0339d86f0ebfa073173ad307cb67c8d6042bdd` against the
session's complete mandatory-source/ADR review. Applicable accepted decisions:
`adr/0004-meta-owns-landscape-contracts.md`,
`adr/0012-canonical-public-api-contract-ownership.md`,
`adr/0013-package-initial-release-and-nx-versioning.md`,
`adr/0014-renovate-and-dependabot-dependency-management.md`,
`adr/0015-nx-task-caching-and-distributed-execution.md`,
`adr/0016-sdlc-ownership-and-architecture-authority.md`,
`adr/0017-release-cadence-and-owner-authority.md`,
`adr/0018-upstream-first-exceptions-and-cutover.md`,
`adr/0019-repository-projects-and-organization-overview.md` and
`adr/0021-consumer-applications-and-public-upstream-reuse.md`.
Proposed enrichment/hierarchy/layering decisions remain proposals.

Local accepted ADRs `docs/adr/0001-modeling-foundation-boundaries.md` and
`docs/adr/0002-extensible-meta-metamodel-and-governance-metadata.md` at Modeling
`fa82acdcd12f615755217aed1e9ea72d287f0823` govern this bounded inventory.
Archimatrix ADR 0001/0002 and accepted child/evidence records were reconciled with
[#12's later dedicated-repository direction](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576):
historical app-local placement is not the current extraction destination, while
proposed wider contracts are not automatically proven behavior. Blueprint ADR
0001/0016/0017 preserve standalone/proprietary boundaries. No architecture exception,
contract change, dependency change, version change or release authorization is
introduced. Private governance content is not reproduced here.
