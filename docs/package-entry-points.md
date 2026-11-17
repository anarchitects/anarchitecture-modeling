# Built package entry points and artifact evidence

Implementation for [#16](https://github.com/anarchitects/anarchitecture-modeling/issues/16),
17 November 2026, from Modeling `e41ae08cc4375710d4ff1554c6394c67239592ac`.
Johan’s acceptance of this packaging outcome remains pending. Accepted
[core parity](core-extraction.md), [metamodel parity](metamodel-extraction.md) and
[proof parity](proofs/README.md) provide the behavior baseline.

## Consumption contract

Both `@anarchitects/modeling-core` and `@anarchitects/modeling-metamodel` now resolve
ordinary package imports to built files. No `@archimatrix/source` export condition,
root custom source condition, TypeScript path alias or sibling checkout is needed.

| Metadata / entry             | Both packages                                                      |
| ---------------------------- | ------------------------------------------------------------------ |
| `type`                       | `module`                                                           |
| `main`, `module`             | `./dist/index.js`                                                  |
| `types`                      | `./dist/index.d.ts`                                                |
| `exports["."]`               | `types` → declaration; `import` and `default` → ESM JavaScript     |
| `exports["./package.json"]`  | Package metadata only                                              |
| Other subpaths               | Not exported, including `src/`, `dist/` and implementation helpers |
| Evidenced runtime / compiler | Node 24 ESM; TypeScript 6.0.3 with strict `NodeNext` resolution    |

`engines.node` records the currently evidenced Node 24 major. No CommonJS build,
browser support or broader runtime/version matrix is promised. `module` is kept
aligned with the ESM entry for existing metadata readers; it is not evidence of
bundler/browser compatibility. Hosts still own native lifecycle and persistence.
Consumers use named public imports, for example:

```ts
import { createModel, type ModelDocument } from '@anarchitects/modeling-core';
import { composeModelingProfile } from '@anarchitects/modeling-metamodel';
```

This is a packaging seam change: historical consumers relying on the removed
source condition must use built public entries. Package/source identities,
exports from the barrels, runtime behavior and document formats are unchanged.
Archimatrix adoption remains separately owned; its live dependency is not changed
by this PR. No package version is bumped or release compatibility decision inferred.

## Packed contents and maps

The package `files` allowlist includes `dist/**/*.js`, `dist/**/*.d.ts` and README;
Yarn includes `package.json`. Exact archive inventory is also verified, so stale
or accidental extra JavaScript/declarations fail the check instead of becoming
accepted merely because they match a glob.

| Package   | JavaScript | Declarations | README + manifest | Total files |
| --------- | ---------: | -----------: | ----------------: | ----------: |
| Core      |          7 |            7 |                 2 |          16 |
| Metamodel |         32 |           32 |                 2 |          66 |

Specs, synthetic registries, proof tools/docs, TypeScript source, maps, build info,
configuration and lifecycle scripts are absent. Internal implementation modules
remain necessary files in `dist`; the export map blocks package deep imports.
This is entry-point encapsulation, not a filesystem access/security boundary.

Library builds explicitly disable source/declaration maps. A declaration map
otherwise points back to TypeScript source; that source is intentionally outside
this artifact’s allowlist. Editor navigation therefore stops at the shipped
`.d.ts` contract. See [TypeScript declaration-map semantics](https://www.typescriptlang.org/tsconfig/declarationMap.html).
No broken source links or inlined source payloads are shipped. Old local compiler
maps may remain after an incremental build but are excluded by the allowlist and
checked archive inventory. Test compilation may still use maps outside the package.

Nx configuration moves from each manifest’s `nx` property to `project.json`,
preserving exact project names, tags and inferred build/test/lint/typecheck targets.
It is excluded from the archive. The graph policy checks the resolved project
identity against its npm manifest instead of requiring `nx.name` in shipped JSON.

## Workspace dependency and version boundary

Development retains metamodel → core as `workspace:*`, with no manual linking or
source alias. Both packages still declare only the accepted `tslib ^2.3.0` helper;
metamodel additionally declares core. There are no peers, optionals or development
dependencies in either packed manifest.

The pinned Yarn 4.18.1 `pack` command rewrites `workspace:*` to the current core
version, observed as **`0.0.0`** in this candidate. That is a valid exact semver
reference, not a workspace/file/link path, and is asserted against core’s actual
manifest version rather than hardcoded in the checker. Yarn documents the
[workspace range transformation](https://yarnpkg.com/features/workspaces#cross-references).
Use Yarn to prepare artifacts; raw `npm pack` is not the verified transformation.
The checker creates temporary archives and deletes them after inspection.

Both packages retain `private: true` and `0.0.0`. These are local evidence
artifacts, not publishable release candidates. #14 owns independent versioning,
first official `0.0.1` and release controls; final licensing/disclosure and exact
candidate distribution remain #22/#23. This issue does not remove those guards or
substitute the placeholder version for an authorized first release.

## Executable verification

```sh
yarn install --immutable
yarn nx sync:check
yarn nx run modeling-metamodel:package-check
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
node --test tools/ci/*.test.mjs
```

The [package checker](../tools/packaging/check-packages.mjs) is an **uncached**
`modeling-metamodel:package-check` target, depending on both builds through the
metamodel → core graph. Metamodel tests require it, so existing affected CI includes
fresh artifact checks even when behavior tests replay from cache. Tool changes are
included in affected selection/test inputs. No registry mutation occurs.

The checker packs and extracts both archives into a temporary consumer tree,
then:

- Compares the complete file inventory and manifest/export/dependency metadata.
- Runs the original 42-assertion public-entry smoke against extracted JavaScript.
- Verifies ordinary ESM and exported JSON metadata; rejects source, emitted deep
  and nonexistent subpaths. Even the old custom condition cannot select source.
- Compiles a strict `NodeNext` consumer against the extracted declarations, with
  no aliases/custom conditions/project redirects and `skipLibCheck: false`.
  Negative type imports prove source/deep entries are unavailable. Every resolved
  source must be in the temporary consumer or the installed compiler’s library.

The compiler runs from this workspace and `tslib` is copied from its locked
installation into the temporary tree, not linked back. This isolates the package
resolution proof but is **not a fresh package-manager/registry installation**.
[#20](https://github.com/anarchitects/anarchitecture-modeling/issues/20) supplies
that independent consumer proof; #17 supplies the broader dependency/artifact
boundary enforcement and negative matrix. No native host or browser run is claimed.

## Observed results and compatibility

Local Node 24.22.3, Yarn 4.18.1, Nx 24.0.6 and TypeScript 6.0.3 on macOS arm64:

- All **10 Nx tasks** passed, including both smoke and package checks; **1,198
  package tests** passed. The unchanged 42-assertion smoke passed against workspace
  builds and again against extracted archives (not 84 distinct historical cases).
- Immutable installation, synchronization, graph policy and five fresh CI
  infrastructure regressions passed. Existing Nx peer-provision warnings remain.
- All **57 runtime/barrel/spec TypeScript files** are byte-identical to Archimatrix
  `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`. All 39 emitted JS modules are identical;
  all 39 declaration bodies are identical after excluding only the removed
  `sourceMappingURL` footer. The 54-name core and 116-name metamodel surfaces retain
  their existing runtime/type split; no exported symbol or type is introduced.
- A packaging-tool-only affected probe selects metamodel. A warm metamodel test
  run replayed both builds, smoke and behavior tests (4/5 cache hits), while
  `package-check` executed freshly and passed.
- Real tarballs contain exactly 16/66 files. Both manifest rewrites, runtime smoke,
  declaration resolution and negative subpath checks passed.

Source comparison used the verified pinned-source build from the extraction
review. Normal destination verification requires no Archimatrix checkout. Hosted
results and any limitations are recorded in the PR rather than inferred from local
checks. Owner acceptance, implementation completion and publication remain distinct.

## Governance

Authenticated default-branch revalidation allowed reuse of the complete session
content review: Meta `main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, with applicable
accepted paths/proposal status in the [inventory governance record](extraction-inventory.md#governance-record).
Local AGENTS, ownership and accepted ADR 0001/0002 govern at the Modeling base
above. Archimatrix’s accepted source and current extraction direction were reviewed
at `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`; Blueprint ADR 0001/0016/0017 at
`af4f88517302937dc23c0da4763579d0cca83604` remain consumer-boundary context only.
No new architecture exception, private source transfer or dependency adoption is
introduced. Johan accepts this bounded Foundation packaging outcome.
