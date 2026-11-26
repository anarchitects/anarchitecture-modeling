# @anarchitects/modeling-metamodel

Compose exact modeling packs/profiles, validate semantics and prepare bounded
model/document changes. Use metamodel for method-neutral validation, notation
bindings, defaults, guarded session history and a portable document codec.
It depends on `@anarchitects/modeling-core`. You supply pack definitions and host
policy; no method pack, renderer, storage service or authorization engine ships here.

## Availability and installation

Both packages are published as `0.0.2`. Use the exact compatible versions in the
[release record](../../docs/consumer/release-notes.md) and preserve their lockfile
integrity. The local archive path below supports verification of future candidates.

Use **Node 24 with ESM** and npm. No Nx, TypeScript compiler, framework or service
is required for this JavaScript example. Installation writes `package.json`, a
lockfile and `node_modules`, and may fetch the runtime helper `tslib` from npm.
Run the commands in a new empty directory. Preserve the lockfile and verify the
archives' supplied integrity values before installation.

### Registry installation

Use the exact versions shown in the packaged README or release record. This
source guide uses placeholders; do not run them unchanged.

<!-- quickstart:registry-install -->

```sh
npm init -y
npm install --save-exact @anarchitects/modeling-core@<CORE_VERSION> @anarchitects/modeling-metamodel@<METAMODEL_VERSION>
```

### Local candidate installation

For pre-publication verification, use the reviewed archives instead of the registry
command. The quick start below is the same for either installation method.

Copy the reviewed compatible pair into this directory as `core.tgz` and
`metamodel.tgz`. Inspect metamodel's manifest or supplied candidate record: its
exact core dependency must match the core archive. Their version numbers need not
be equal. Both are direct dependencies in this example because it imports both.

<!-- quickstart:install -->

```sh
npm init -y
npm install --save-exact ./core.tgz ./metamodel.tgz
```

## Quick start: compose a profile and validate a model

Save this as `quickstart.mjs`. This tiny caller-supplied pack is synthetic, not a
standard implementation. No fetching, plugin discovery or framework setup occurs.

<!-- quickstart:source -->

```js
import { createModel } from '@anarchitects/modeling-core';
import {
  composeModelingProfile,
  validateModel,
} from '@anarchitects/modeling-metamodel';

const pin = { id: 'example', version: '1', contractVersion: '1' };
const pack = {
  ...pin,
  displayName: 'Example',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [],
};
const profile = {
  id: 'example-profile',
  version: '1',
  selections: [{ dimension: 'method', pack: pin }],
};
const composed = composeModelingProfile(profile, [pack]);
if (!composed.ok) throw new Error('Expected exact profile composition');
const model = createModel('example', 'Example', {
  id: profile.id,
  version: profile.version,
});
const result = validateModel({ model, profile, registry: [pack] });
if (result.status !== 'valid') throw new Error('Expected a valid empty model');
console.log(`composed=${composed.ok}; status=${result.status}`);

const missing = composeModelingProfile(profile, []);
if (missing.ok) throw new Error('Expected missing pack rejection');
console.log(missing.diagnostics[0].code);
```

Run `node quickstart.mjs`. Expected output:

<!-- quickstart:output -->

```text
composed=true; status=valid
missing-pack
```

This proves composition and validation only for the supplied empty synthetic
model. Inspect semantic coverage as well as status for real inputs; preserved
unsupported data is not successfully validated. The example only allocates
in-memory data and prints results; it performs no file I/O or network requests.

## Semantic snapshot comparison (since 0.0.2)

`compareDocumentSnapshots` compares trusted snapshots by stable identity with
explicit scope, exact pack/profile/rule pins, deterministic differences and
coverage. Its statuses are `equivalent`, `different`, `incomplete` and
`incompatible`; an empty difference list alone never proves equality.
Views and operational state are excluded; opaque extensions remain unsupported.
Semantic equality never bypasses an expected-revision guard.

This additive API is available in **published 0.0.2**; 0.0.1 does not export it.
See the [contract and limits](../../docs/proofs/semantic-comparison.md) and
[packed TypeScript example](../../docs/consumer/examples/semantic-comparison.mts).
No format migration, implicit pack upgrade or new runtime dependency is introduced.

## Workflows, contracts and host responsibilities

Use named imports from `@anarchitects/modeling-metamodel` and core where needed.
`package.json` is an exported metadata subpath; implementation deep imports are
private. The [API reference](../../docs/consumer/api.md) lists functions, constants,
types and supported extension contracts. The
[complete lifecycle example](../../docs/consumer/examples/lifecycle.mts) demonstrates
changes, retries, history and codec recovery, with compilation instructions in the
[consumer guide](../../docs/consumer/README.md).

Pack contract version is `1`. Profiles select at most one exact pack per dimension;
IDs, versions and contract versions must match. Explicit registry arrays supply
all definitions; there is no global registry, semver-range lookup, dynamic code
loading, automatic upgrade or implicit override priority. Missing/duplicate packs,
dependency conflicts and definition collisions produce diagnostics. APIs expect
trusted typed definitions; there is no arbitrary executable-rule callback.

Validation distinguishes `valid`, `invalid` and `unsupported`, with structure,
coverage, diagnostics and provenance. Opaque extensions can be preserved without
understanding their meaning. Notation/theme checks do not prove rendered
accessibility. Defaults make a bounded explicit proposal, not an expression engine
or recursive rule cascade. Prepared commands return a candidate, replay or
rejection; the host must authorize, atomically recheck the revision and commit.

Session state belongs to the caller. Default live history holds 100 transactions
and 10,000 command receipts; eviction removes undo eligibility, not durable retry
evidence. Reopen starts empty undo/redo stacks. The codec allows 256 receipts of
each kind, so encode/check limits before adopting a durable change. It preserves
`archimatrix-document`, envelope 1 / model format 2; it never migrates implicitly.
Refused decode results retain the caller-owned original byte array, not a defensive
backup. Keep an independent copy for recovery. See the guide for exact admission
limits, defaults and error/result variants.

There is no background service or cleanup hook. Consumers own data lifetime,
trusted registries/themes, permissions, concurrency, file I/O, recovery and UI.
Readonly contracts do not freeze caller objects. No licensed method taxonomy,
universal transformation engine or standards conformance is implied.

## Troubleshooting

| Symptom                                     | Diagnosis and action                                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import failure / invalid dependency tree    | Use Node 24 ESM, public root imports and the exact core version required by metamodel; inspect `npm ls --all`.                                              |
| `missing-pack` / incompatible profile       | Supply exactly one definition for each pinned ID/version/contract and satisfy declared dependencies/conflicts. A newer pack is not an automatic substitute. |
| `unsupported` validation                    | Inspect coverage and diagnostics. Retaining an opaque value does not validate it; apply host read-only/recovery policy where appropriate.                   |
| Stale command or retry rejection            | Reload the current checkpoint and re-evaluate intent. An ID reused with changed content is not an exact retry.                                              |
| Codec `resource-limit` / unsupported format | Preserve original bytes and the current checkpoint. Inspect documented limits; do not silently discard receipts or coerce a future format to force a save.  |

## Compatibility and upgrades

Supported evidence: Node 24 ESM; TypeScript 6.0.3 with strict `NodeNext` and
`Node16` module resolution. `Node16` is a compiler mode, not Node 16 runtime support.
There is no CommonJS build or verified browser/bundler, older runtime/compiler or
Windows support matrix. TypeScript consumers can use `.mts`, or `.ts` with
`"type": "module"` in their project. Import types using `import type` as needed.

Core and metamodel are independently versioned; metamodel declares its exact
compatible core version. Package versions, pack/profile versions, model revision
and serialization versions are separate. On `0.x`, compatible features and fixes
increment patch; breaking changes increment minor. No automatic `1.0` transition,
implicit data migration, support SLA or indefinite maintenance is promised.
Review each version's compatibility and migration notes before upgrading.

The guides below describe this source revision; staged archives include their own
copies and an exact version/source reference. Keep the archive documentation when
upgrading: repository `main` may describe a later contract. First-release notes
and public registry links will be finalized with the authorized release.

- [Consumer guide and supported workflows](../../docs/consumer/README.md)
- [Public API reference](../../docs/consumer/api.md)
- [Migration, compatibility checks and rollback](../../docs/consumer/migration.md)
- [Package release notes and maintenance status](../../docs/consumer/release-notes.md)

## Support and licensing

For ordinary questions or reproducible defects, use the
[issue tracker](https://github.com/anarchitects/anarchitecture-modeling/issues)
or email **johan@anarchitects.dev**.
Include package versions, runtime and a small sanitized reproduction. Report
security issues **privately** to that address, never in a public issue.

Licensed under [Apache-2.0](../../LICENSE), with attribution in [NOTICE](../../NOTICE).
Anarchitects is a working/branding name. Separately identified third-party
material retains its own terms; `tslib` is separately licensed under 0BSD.
No licensed method specification or standard taxonomy is supplied, and synthetic
examples do not certify standards conformance.
