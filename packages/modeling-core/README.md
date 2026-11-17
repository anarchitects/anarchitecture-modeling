# @anarchitects/modeling-core

Host-neutral model identities, structured values, containment, references,
revision/change primitives and separate diagram-view data. Structural/reference
and view validation reports diagnostics without adopting changes or repairing
caller data. Metamodel semantics, executable context, persistence and host
lifecycle belong outside core.

This is the unchanged core implementation extracted from Archimatrix at
`b83c78e7a70e1434a6bf9101d7bbf43467becf7f`. See the
[extraction record](../../docs/core-extraction.md) for file/test provenance,
public declaration parity and configuration adaptations. The semantic model
format remains version 2; package versions and opaque model revisions are separate.

From the workspace root, using Node 24 and pinned Yarn:

```sh
yarn install --immutable
yarn nx run-many -t build test lint typecheck --projects=modeling-core
```

The ordinary package entry resolves to `dist/index.js`, with declarations at
`dist/index.d.ts`. Tests exercise this built entry as well as the original source
fixtures. `tslib` is the only declared runtime dependency. Runtime code has no
metamodel, framework, host, database or tooling dependency.

The package remains private at `0.0.0`. The existing `@archimatrix/source` export
condition is retained for compatibility until the separate packaging review in
#16. Extraction does not authorize a release, visibility change or consumer
cutover; final licensing/artifact clearance remains a separate gate.
