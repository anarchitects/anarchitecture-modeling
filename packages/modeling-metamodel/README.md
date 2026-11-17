# @anarchitects/modeling-metamodel

Host-neutral pack/profile composition, validation and provenance, notation/view
bindings, bounded change/default plans, semantic/view commands, guarded session
history and a portable versioned document codec. The package depends inward on
`@anarchitects/modeling-core`; hosts supply trusted context and own adoption,
authorization, storage and UI.

The implementation and original tests are extracted unchanged from Archimatrix
`b83c78e7a70e1434a6bf9101d7bbf43467becf7f`. The
[extraction record](../../docs/metamodel-extraction.md) provides provenance,
declaration/behavior parity and configuration adaptations. The
[accepted portable/host boundary](../../docs/extraction-boundary.md) records the
consumer obligations in detail.

Preserved compatibility includes exact version pins, explicit unsupported
coverage, authored overrides, atomic rejection, exact receipt replay, reviewed
deletion/reversal and no implicit migration. The historical
`archimatrix-document` envelope stays at version 1 with semantic model format 2.
Session defaults remain 100 live transactions and 10,000 retained command
receipts; the codec caps command/applied-plan receipts at 256 each. Consumers
must coordinate those distinct limits before durable adoption. Reopening keeps
retry evidence but starts empty live undo/redo stacks. Decode returns the original
caller-owned bytes; it does not grant editing permission or persistence guarantees.

From the workspace root, with Node 24 and pinned Yarn:

```sh
yarn install --immutable
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
```

Ordinary ESM imports use `dist/index.js` with `dist/index.d.ts` declarations.
Original source tests and additional built-entry/boundary checks run through Nx;
synthetic fixtures and development tooling are excluded from runtime build output.

The package stays private at `0.0.0`. Its existing `@archimatrix/source` condition
and workspace dependency remain until #16’s packaging review. The [proof migration record](../../docs/proofs/README.md) maps #13’s historical
evidence to current tests; the test target also runs the original built-public-entry
smoke. Remaining gates include #17 artifact-level independence checks and
#19 integrated parity acceptance. Release and final licensing/distribution
clearance remain separate gates.
