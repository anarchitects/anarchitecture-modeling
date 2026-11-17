# @anarchitects/modeling-core

Host-neutral identities, semantic models, structured values, containment, local
references, revision/change primitives and independent diagram-view data.
Structural/reference/view checks report diagnostics without mutating caller data.
Core has no metamodel, framework, host or tooling runtime dependency.

**Unreleased:** this package remains private at `0.0.0`. No registry availability,
publication clearance or consumer adoption is claimed. The first official version
is planned as `0.0.1`, subject to separate owner authorization and artifact review.

## Public contract

Use named package-root imports. Built ESM resolves to `dist/index.js` and types to
`dist/index.d.ts`; `package.json` is also exported. Source/implementation deep
imports are not exported. No custom source conditions or path aliases are needed.

Current compatibility evidence: Node 24 ESM and TypeScript 6.0.3 with strict
`NodeNext` resolution. No CommonJS build, browser/bundler support or older runtime/
compiler matrix is claimed. Runtime artifacts exclude tests, source, maps and Nx.
`tslib` is a runtime dependency; metamodel additionally pins the packed core version.
Core and metamodel versions are independent, so inspect the actual dependency pair.

On `0.x`, compatible features/fixes increment patch and breaking changes increment
minor. Stabilization at `1.0.0` requires an explicit decision. Package versions,
profile/pack pins, model revisions and document-format versions are distinct.
The portable codec retains `archimatrix-document` envelope 1 / model format 2 and
never migrates implicitly.

## Consumer documentation

- [Guide and compatibility](https://github.com/anarchitects/anarchitecture-modeling/blob/main/docs/consumer/README.md)
- [Complete public API reference](https://github.com/anarchitects/anarchitecture-modeling/blob/main/docs/consumer/api.md)
- [Executable lifecycle example](https://github.com/anarchitects/anarchitecture-modeling/blob/main/docs/consumer/examples/lifecycle.mts)
- [Migration and rollback](https://github.com/anarchitects/anarchitecture-modeling/blob/main/docs/consumer/migration.md)

These pages require no private governance or application-source knowledge.
Installation commands remain release templates until actual versions and integrity
are recorded. The example is compiled/executed against locally packed APIs;
registry installation is a separate verification step.

Semantic identity is independent of view occurrences/layout. Exact pins and explicit
unsupported coverage are preserved. Prepared commands do not commit; the host must
authorize and atomically recheck revisions. Reopen retains retry receipts but starts
empty undo/redo stacks. Live history defaults (100 transactions / 10,000 command receipts)
exceed the codec's 256-per-receipt-collection cap: encode and check limits before
adopting a durable change. Pruning live history does not delete retry receipts.

Synthetic examples are not standards certification. No method taxonomy, renderer,
universal transformation engine, persistence, authorization or collaboration
implementation ships here. Report security issues privately to
**johan@anarchitects.dev**. No support SLA is promised for unreleased contracts.
