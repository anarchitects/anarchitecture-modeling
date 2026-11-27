# Dependency boundaries and runtime provenance

Implementation evidence for [#17](https://github.com/anarchitects/anarchitecture-modeling/issues/17),
from accepted #16 / PR #39 at `01e80165db4c17aa0797f639c57ddd2d1702a948`,
17 November 2026. [Johan explicitly accepted #17](https://github.com/anarchitects/anarchitecture-modeling/issues/17#issuecomment-6951192812)
after PR #40 merged at `7fe8bda4c93856da47ee4544cac6728b4eb27a13`.
The [accepted architecture](adr/0001-modeling-foundation-boundaries.md),
[extraction boundary](extraction-boundary.md) and
[built-entry evidence](package-entry-points.md) define the two-package scope.

## Enforced dependency policy

| Surface                                       | Allowed                                                                                      | Rejected / checked evidence                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Core source, emitted JS and declarations      | Relative modules within its own tree; public `tslib` helper                                  | Metamodel, method packs, hosts, frameworks, databases, private packages and all other bare imports                                   |
| Metamodel source, emitted JS and declarations | Own relative modules; `tslib`; exact public `@anarchitects/modeling-core`                    | All other external/deep imports; no reverse dependency or method-specific implementation                                             |
| Relative paths                                | Existing `.js` module references resolving inside the appropriate source/JS/declaration tree | `..` escapes, encoded/backslash paths, missing targets, symlinks and sibling checkout paths                                          |
| Loading syntax                                | Static imports/re-exports and checked declaration type references                            | Dynamic/computed import, require/module.require, import-equals, external reference directives; forbidden ambient module declarations |
| Workspace manifests                           | Core: `tslib ^2.3.0`; metamodel: same helper plus `workspace:*` core                         | Extra runtime, peer, optional or bundled dependencies; package source aliases/conditions                                             |
| Packed manifests                              | Same helper plus exact current core version in metamodel                                     | Workspace/file/link/portal/Git paths, source conditions and private/deep exports                                                     |
| Effective library compiler config             | Local `src` / `dist`; metamodel’s inward core project reference                              | Paths aliases, custom conditions, alternate source roots and foreign project references                                              |
| Repository/layout                             | Regular tracked files; ordinary local Yarn workspace link to core                            | Git submodules/gitlinks, `.gitmodules`, tracked symlinks and linked runtime/package trees                                            |

The parser-based checks use the installed TypeScript compiler API. They cover
both positive and negative declaration dependencies rather than relying only on
runtime smoke coverage. Existing ESLint/Nx rules remain the early source feedback;
their real-config tests now explicitly include Blueprint/private-package/source
aliases. Cross-tree relative imports are checked by the new verifier even if an
ESLint relative-import pattern would otherwise allow them.

Internal workspace linking is intentionally permitted: the verifier resolves
metamodel’s actual public core dependency and requires it to be **this checkout’s**
`packages/modeling-core/package.json`. It does not ban `workspace:*` in development
or inspect development-only root Nx tooling as a runtime dependency.

## Reviewed runtime provenance

[`runtime-baseline.json`](../tools/boundaries/runtime-baseline.json) records the
current candidate runtime: **48 source modules, 48 JavaScript modules and 48
declarations**. Its `acceptedModelingCommit` identifies the original accepted #16
extraction, not approval of later additions. Issue #77 adds three independently
authored semantic-comparison modules and metamodel root exports; #84 adds four original authoring modules and extracts the existing session/plan
engines into two internal modules. Public strict wrappers retain their guarantees;
the shared engines add a fixed internal admission seam for the authoring path.
Core, validation, comparison and existing codec runtime remain unchanged. These candidate hashes require owner
review with the implementation evidence.

The original Archimatrix revision is `b83c78e7a70e1434a6bf9101d7bbf43467becf7f`.
Its immutable source/JavaScript hashes are retained separately in
[`source-runtime-baseline.json`](../tools/parity/source-runtime-baseline.json) for
the optional historical source proof. The existing historical fixtures run against
the current candidate without changing their expected original bytes. #16's
declarations intentionally omit source-map footers.

The verifier rejects an extra vendored module and modifications inside an existing
approved module, including copied product code with no obvious forbidden import.
It applies the same inventory/hash checks to unpacked archives, catching generated
or cached artifacts that differ from the reviewed build. Fixtures, tests and
registries remain outside runtime output and the archive allowlist.

This baseline is a deliberate review checkpoint, **not an eternal implementation
freeze or an automatic authorship detector**. A legitimate runtime change, compiler
output change or module addition must include its provenance/contract review,
updated hashes and validation evidence in the owning PR. Do not regenerate the
baseline merely to silence a failure. A hash change by itself does not establish
rights, semantic correctness or owner acceptance. Final licensing/disclosure still
requires the separate candidate review. Arbitrary JavaScript behavior and global
APIs are not sandboxed by import checks; source review remains necessary.

## Effective runtime closure

The installed manifests and resolutions were inspected under the immutable lock:

```text
@anarchitects/modeling-metamodel@0.0.0
  ├─ @anarchitects/modeling-core@0.0.0  (this workspace; exact version in archive)
  │    └─ tslib@2.9.1
  └─ tslib@2.9.1                       (same resolved copy)
```

`tslib` declares license `0BSD` and no runtime, peer, optional or bundled dependency
edges. It remains the explicitly reviewed compiler helper, not an exception for
arbitrary packages. The checker verifies the installed helper version and leaf
metadata and repeats that check on the copy used by the packed consumer. A helper
upgrade or new edge requires a fresh review and corresponding policy update.
Root Nx, TypeScript, ESLint and Vitest packages are development tools; none appears
in either runtime manifest or packed runtime import graph. This is a dependency
boundary proof, not a new vulnerability audit or registry provenance attestation.

## Nx execution and negative evidence

```sh
yarn install --immutable
yarn nx sync:check
yarn nx run modeling-metamodel:boundary-check
yarn nx run modeling-metamodel:package-check
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
node --test tools/ci/*.test.mjs
```

`boundary-check` runs the [111 policy cases](../tools/boundaries/policy.test.mjs)
and then [checks the actual workspace](../tools/boundaries/check-workspace.mjs).
`package-check` depends on it and applies the shared
[policy](../tools/boundaries/policy.mjs) to real extracted archives before the
existing public-entry and strict NodeNext consumer proofs. Both fresh-state checks
are uncached. Metamodel’s test prerequisite chain includes them, so CI’s ordinary
affected invocation cannot skip them because behavior tests hit cache. Boundary
tools are explicit affected/test inputs.

The negative matrix exercises forbidden VS Code, ArchiMate, Angular, NestJS,
Nx/@nx, database, Blueprint/private package and source-alias paths across source,
JavaScript and declarations. Further cases cover reverse dependencies, re-exports,
type imports/ambient declarations, dynamic loading, relative escapes, symlinks,
peer/optional/bundled metadata, packed local protocols, compiler aliases, gitlinks
and vendoring. Positive controls retain relative modules, `tslib`, metamodel’s
public core import and workspace-to-exact-version packaging.

## Observed results and limits

Local Node 24.22.3 / Yarn 4.18.1 / Nx 24.0.6 / TypeScript 6.0.3, macOS arm64:

- All **11 Nx tasks** passed, including boundary and archive checks. **1,198
  existing package cases** still pass; the new **111 policy cases** are counted
  separately, as are the **five infrastructure regressions**.
- Both packages’ 39 source / 39 JS / 39 declaration modules matched the reviewed
  provenance and import policy. Installed closure is the two packages plus one
  `tslib@2.9.1` leaf. No runtime source/API/dependency change was made.
- Actual archives retain **16 core / 66 metamodel files**; packed imports,
  declarations, metadata and provenance pass. The original **42 smoke assertions**
  still pass against builds and extracted artifacts, with deep imports rejected.
- A boundary-tool-only affected probe selects metamodel. A warm test run
  replayed four tasks while both boundary and archive checks ran freshly
  (4/6 cache hits); no fresh-state check was bypassed.
- Immutable install, synchronization and resolved graph policy passed. Existing
  Nx peer-provision warnings remain. Hosted CI is recorded separately in the PR.

All verification runs from this repository and its installed dependencies;
no sibling checkout is required. #20 still owns a fresh independent
package-manager installation. This does not authorize publication, consumer
adoption or a release. No browser, native-host or standards-conformance claim is
added. Issue bodies and accepted source issues remain unchanged.

## Governance

The full session content review was reused after authenticated unchanged
revision validation: Meta `main@4f0339d86f0ebfa073173ad307cb67c8d6042bdd`.
The [inventory governance record](extraction-inventory.md#governance-record)
identifies applicable accepted paths and proposals. Current root AGENTS, ownership
and accepted local ADR 0001/0002 apply at the Modeling base above. Archimatrix
ADR 0001/0002 and current #12 direction / #8/#22 / #9/#40 acceptance govern the
source revision above; Blueprint ADR 0001/0016/0017 at
`af4f88517302937dc23c0da4763579d0cca83604` remain consumer context only.
No new architecture exception or private source transfer is introduced. Johan
owns acceptance of the Foundation outcome; release/disclosure authority remains
separate.
