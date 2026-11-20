# @anarchitects/modeling-core

Create and inspect host-neutral semantic models and independent diagram-view
data. Use core when you need identities, containment, local references, structured
values and structural diagnostics without a method engine or editor. Core has no
metamodel dependency and does not execute document transactions, interpret method
packs, serialize files or render views.

## Availability and installation

Use the exact versions in the reviewed release record. Run registry commands
only once those versions are available on npm; documentation or a candidate
archive alone does not establish publication. Do not substitute an unverified
registry package or `latest`. Before publication, use the local archives below.

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
npm install --save-exact @anarchitects/modeling-core@<CORE_VERSION>
```

### Local candidate installation

For pre-publication verification, use the reviewed archives instead of the registry
command. The quick start below is the same for either installation method.

Copy the core candidate archive into this directory as `core.tgz`.

<!-- quickstart:install -->

```sh
npm init -y
npm install --save-exact ./core.tgz
```

## Quick start: create and validate a model

Save the following as `quickstart.mjs`. The `.mjs` extension selects ESM without
additional package configuration. The profile here is only an identity, not a
registered method or a claim of semantic validation.

<!-- quickstart:source -->

```js
import {
  createModel,
  validateModelStructure,
} from '@anarchitects/modeling-core';

const model = createModel('example', 'Example', {
  id: 'example-profile',
  version: '1',
});
const result = validateModelStructure(model);
if (!result.valid) throw new Error('Expected a structurally valid empty model');
console.log(
  `format=${model.formatVersion}; elements=${model.elements.length}; valid=${result.valid}`,
);

const invalid = validateModelStructure({ ...model, formatVersion: 99 });
if (invalid.valid) throw new Error('Expected an unsupported format to fail');
console.log(invalid.diagnostics[0].code);
```

Run `node quickstart.mjs`. Expected output:

<!-- quickstart:output -->

```text
format=2; elements=0; valid=true
model.unsupported-format
```

The example creates in-memory values and prints diagnostics. It does not read or
write model files, access the network or mutate the validated input.

## Public surface and responsibilities

Use named imports from `@anarchitects/modeling-core`; `package.json` is an exported
metadata subpath. Implementation `src/*` and `dist/*` paths are not public imports.
The package provides `createModel`, branded identity constructors, model/value/
reference validation, `validateViews`, and types for models, changes and views.
The [API reference](../../docs/consumer/api.md) lists every supported export.

Identity constructors require nonblank caller-chosen strings, preserve their exact
bytes and throw on blank input. They do not allocate unique IDs or authenticate
users. `createModel` returns an empty format-2 model with revision `"0"`; callers
own subsequent revision tokens and values. Pass only `{ id, version }` as its
profile. Typed APIs are not parsers for arbitrary external data.

Structural validation reports `{ valid, diagnostics }`, with diagnostic codes and
locations. References are local to the model and must resolve with the correct
kind and ownership. Validation does not normalize, repair or mutate input. Views
reference semantic identities but contain their own occurrences/layout; validating
geometry does not render it or establish accessibility. There is no configuration
file, global initialization, background worker or cleanup operation.

Consumers own object lifetime, trusted input, persistence, authorization,
concurrency and UI. Readonly TypeScript contracts do not freeze JavaScript objects.
Method-aware validation, guarded commands/history and the portable document codec
belong to the optional companion `@anarchitects/modeling-metamodel`, not core.

## Troubleshooting

| Symptom                         | Diagnosis and action                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_MODULE_NOT_FOUND`          | Install the reviewed archive in this consumer directory and run from it; check `npm ls @anarchitects/modeling-core`.                                                                           |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` | Replace a deep import with a documented package-root export.                                                                                                                                   |
| Import syntax/module error      | Use Node 24 and a `.mjs` file; a CommonJS build is not supplied.                                                                                                                               |
| Constructor rejects an identity | Supply a nonblank ID/name/profile value; do not use constructors as a migration or uniqueness service.                                                                                         |
| Structural diagnostics          | Inspect each code/location, repair ownership/references or use an explicitly supported format. A structurally valid model still needs method-aware validation if your application requires it. |

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
when accessible, or email **johan@anarchitects.dev** while the repository is private.
Include package versions, runtime and a small sanitized reproduction. Report
security issues **privately** to that address, never in a public issue.

Licensed under [Apache-2.0](../../LICENSE), with attribution in [NOTICE](../../NOTICE).
Anarchitects is a working/branding name. Separately identified third-party
material retains its own terms; `tslib` is separately licensed under 0BSD.
No licensed method specification or standard taxonomy is supplied, and synthetic
examples do not certify standards conformance.
