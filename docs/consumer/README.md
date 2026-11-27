# Using Modeling Foundation

Modeling Foundation supplies host-neutral data contracts and bounded operations
for semantic models, profiles, diagram views and portable documents. Use
`@anarchitects/modeling-core` for identities and model/view structure; add
`@anarchitects/modeling-metamodel` for composition, semantic validation, notation
bindings, guarded commands, default proposals, history and document encoding.

This guide, the [API reference](api.md), [migration guide](migration.md) and
[executable example](examples/lifecycle.mts) are self-contained. Reading private
governance or a consumer application's repository is not required.

## Installation and compatibility

Install the packages your application uses:

```sh
npm install --save-exact @anarchitects/modeling-core @anarchitects/modeling-metamodel
```

A core-only application needs only `@anarchitects/modeling-core`. Metamodel declares
its compatible core dependency; match that dependency when adding core to an
existing application. Keep your lockfile for reproducible installations.
The packages use `tslib` at runtime; Nx and a TypeScript compiler are not required
to run their JavaScript APIs.

| Surface           | Current evidence / contract                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| JavaScript        | Node 24, ESM; package root resolves to `dist/index.js`                                                  |
| TypeScript        | Strict `NodeNext` and `Node16` ESM resolution, declarations at `dist/index.d.ts`, `skipLibCheck: false` |
| Imports           | Named root imports and the exported `package.json` metadata subpath                                     |
| Private paths     | `src/*`, `dist/*` and implementation helpers are not exported                                           |
| Other runtimes    | No tested CommonJS build, browser/bundler matrix, older Node or compiler support claim                  |
| Editor navigation | Shipped declarations; source/declaration maps are not shipped                                           |

`Node16` names a compiler resolution mode, not support for the Node 16 runtime.

For TypeScript consumers, use `.mts`, or `.ts` with a nearest `package.json`
containing `"type": "module"`. A minimal verification configuration is:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": false,
    "outDir": "out"
  },
  "include": ["lifecycle.mts"]
}
```

For TypeScript, install a compiler with `npm install --save-dev typescript`, then copy
[lifecycle.mts](examples/lifecycle.mts) alongside that configuration, compile with
the consumer's local `tsc -p tsconfig.json`, then run `node out/lifecycle.mjs`.
The example prints a success message or throws on a violated expectation. It uses
only public package imports and the host's console; no Nx installation, custom
conditions, path aliases or application code are needed to run the emitted file.

The lifecycle example requires both packages; the core README provides a smaller
core-only JavaScript quick start. Installation writes dependencies and a lockfile;
the example itself only creates in-memory objects and prints results.

## Model, identity and views

Identity constructors accept nonblank caller-chosen strings and preserve their
exact bytes. TypeScript brands distinguish model, element, member, relationship,
view and occurrence IDs; they do not allocate globally unique IDs or authenticate
input. Renaming/reordering does not change identity. `ModelRevision` is an opaque
equality token supplied by the caller, not a timestamp or incrementing counter.

`createModel` makes an empty format-2 semantic model. Elements have semantic
containers; members have element owners; relationships connect element references.
Tagged `ModelValue` values distinguish scalars, lists, records and references.
References are local to the model and their kind/ownership must resolve. General
cross-document reference resolution is not implemented.

The semantic model contains no layout. A `DiagramView` contains occurrences pointing
at semantic identities, plus bounds/routes and permitted appearance overrides.
Multiple occurrences or views can present the same element without duplicating
semantic ownership. `validateViews` checks those references and geometry contracts;
it does not render a canvas or prove accessibility.

The model's `profile` contains **only `{ id, version }`**. The full selected profile
belongs in `DocumentSnapshot.profile`. Pass only those two fields to `createModel`;
TypeScript structural assignability does not strip extra runtime properties, and
the codec rejects unknown fields in its supported schema.

## Profiles, validation and notation

Consumers supply data-only `ModelingPackDefinition` registries and exact
`{ id, version, contractVersion }` pins. Contract version is `1`. Profiles select
at most one pack for each of five dimensions: abstraction, method,
processing-architecture, provenance and target. Composition verifies dependencies,
conflicts and definition collisions; array order does not grant override priority.
There is no automatic fetching, dynamic code loading, semver-range resolution or
implicit upgrade to a newer pack. Independently enriching another pack's types is
not a general implemented capability.

Use `validateModel` and inspect **status, structure, semantic coverage, diagnostics
and provenance**. `valid`, `invalid` and `unsupported` are different outcomes;
partial/not-run coverage cannot be treated as successful validation. The built-in
member-group operator checks bounded role/reference/ownership structure. A named
rule registration is not an arbitrary executable callback. Unknown rules and
opaque extensions do not acquire validated semantics by being registered.

`assessDocument` adds view, notation-binding and lifecycle checks to semantic
validation. An exact notation definition can resolve shape/token data and permitted
overrides, but `pending-host-verification` remains the accessibility assessment.
The host supplies a trusted theme and must verify actual rendering and interaction.

## Changes, defaults and live history

The example covers an explicit default proposal, exact plan retry, a session
default transaction, rename, stale-request rejection, undo/redo and reopen retry.

- `proposeDefaultPlan` makes one bounded pass over the supplied rule batch. It
  compares baseline/current/proposed values, preserves authored values and
  overrides, and reports conflicts/retired outputs instead of overwriting them.
  It does not execute expressions, cascade rules or delete retired outputs.
- `applyChangePlan` validates the guarded plan and returns a new state or a
  rejection; exact retained plan content can replay without applying twice.
- `prepareSemanticCommand` and `prepareViewCommand` prepare checkpoint candidates.
  Use `prepareSessionCommand` to coordinate supported edits/defaults/reversals
  with live history. Handle `prepared`, `replayed` and `rejected` separately.
- Inspect deletion impact/reversal before submitting removals. Supply reviewed
  dependencies and resolving operations in the same transaction; no automatic
  cascade, permission grant or arbitrary whole-document replacement follows.
- Full retained command content governs retry, not command ID alone. A fresh
  stale request rejects; reusing an ID with different content is not a retry.

Preparation never commits to shared state. Before adoption, the host authorizes
the actor and atomically rechecks the current revision against `expectedRevision`.
Revisions guard the whole snapshot, including views, receipts and baselines.
Actor/source/provenance strings do not authenticate users or establish an audit
trail. Storage, locking, collaboration and conflict UI belong to the host.

Default live-history policy: **100 transactions / 10,000 command receipts**.
Transaction eviction and `pruneDocumentHistory` remove only live stack eligibility;
they retain durable retry evidence. New receipts fail at capacity rather than
silently evicting it. Reopen starts empty undo/redo stacks, while retained receipts
can still recognize an exact retry. Undo/redo uses guarded inverse operations,
not blind replacement by an old snapshot.

The codec has a smaller **256 command receipts and 256 applied-plan receipts**
budget. The example sets session `maxReceipts` to 256, but that alone is not a
durability guarantee: plans, bytes, depth and other budgets also matter. Stage and
encode a candidate before durable adoption; handle refusal without changing the
current checkpoint. Do not delete receipts to force an encode: that changes retry
semantics and needs a deliberate retention/migration policy.

## Portable document codec and recovery

`encodeDocument` / `decodeDocument` preserve the historical identifier
**`archimatrix-document`**, **envelope version 1**, and **model format 2**.
The name is a compatibility identifier, not a host dependency. Package version,
pack version, metamodel contract version, envelope version, model format and model
revision are separate axes. None implicitly migrates another.

Codec outcomes distinguish unreadable/unrepresentable data (`not-decoded` or
`not-encoded`, reason `corrupt`, `unsupported-format` or `resource-limit`) from
decoded/encoded data classified `valid`, `invalid` or `unsupported`. A structurally
representable document may retain invalid/unsupported meaning for recovery; this
does not authorize editing. Future formats, unknown structural fields, malformed
UTF-8/JSON and unsafe/non-JSON data are refused rather than silently normalized.
Plain JSON opaque extension content is preserved, not executed or understood.
Decoded objects may have null prototypes; use structural/JSON comparisons rather
than prototype identity for supported data.

`decodeDocument` always returns `source`, the **original caller-owned byte array**,
including on refusal. It is not a defensive backup copy. Keep an immutable host
copy if recovery must survive mutation, and do not overwrite a file merely because
parsing succeeded. Encoding may change formatting; byte-for-byte file preservation
requires retaining those original bytes.

| Codec hard limit                             | Default maximum |
| -------------------------------------------- | --------------: |
| UTF-8 bytes                                  |           4 MiB |
| Nesting depth                                |              64 |
| JSON nodes                                   |          50,000 |
| General collection                           |           1,000 |
| String length                                |          65,536 |
| Entities                                     |           1,000 |
| Occurrences                                  |           2,000 |
| Each command/applied-plan receipt collection |             256 |

These are admission caps, not performance guarantees. Callers may lower codec
limits, not raise them beyond supported bounds. Use the exported
`DOCUMENT_CODEC_LIMITS` rather than duplicating constants in application logic.
No file I/O, atomic-save protocol, external-resource fetching, implicit migration
or storage adapter ships with the codec. `DocumentCommitPort` is only an interface.

## Versions and support boundaries

Core and metamodel have independent package versions. Metamodel declares the exact
core version it was prepared and verified with; matching numerical versions are
not a general requirement. Check the installed metamodel manifest rather than assuming matching package versions.

On `0.x`, compatible features and fixes increment **patch**; breaking changes
increment **minor**. These packages remain pre-stable; review compatibility notes before upgrading.
Check each release's API/data compatibility and migration notes; pin versions and
test before upgrading. No broader support matrix, support SLA or automatic
migration service is promised. Report security concerns privately to
**johan@anarchitects.dev**, with the exact version/commit and a sanitized reproduction.

Synthetic examples and proofs do **not** certify ArchiMate, 3NF, Kimball, Data Vault
or Medallion conformance. No licensed standard taxonomy, universal transformation
engine, renderer/editor framework, database adapter or governance enforcement
engine is shipped. Method packs and host applications own those concerns. Proposed
external-reference, enrichment and extended provenance designs are not existing
public APIs. See the [API reference](api.md) for the actual supported export surface
and [migration guide](migration.md) for consumer checks and rollback.

Incremental authoring is an [unreleased opt-in contract](authoring.md), with a
separate envelope and commit result. Existing strict consumers remain unchanged.
