# @anarchitects/modeling-metamodel

Define the concepts and rules of a modeling language, validate models against
them, and prepare guarded edits with undo/redo and portable document storage.

Use it with `@anarchitects/modeling-core` to build domain, data or architecture
modeling tools. You supply the model definitions; the package supplies composition,
validation, comparison and editing mechanisms. It does not include a particular
modeling standard, editor UI or database adapter.

## Install

Requires **Node.js 24** and **ES modules**. TypeScript declarations are included.
Install both packages when your application imports model constructors as in the
example below. Metamodel declares its compatible core dependency.

<!-- quickstart:registry-install -->

```sh
npm init -y
npm install --save-exact @anarchitects/modeling-core @anarchitects/modeling-metamodel
```

## Require a definition for every Customer

Save this as `quickstart.mjs`. This synthetic pack defines a Customer type with a
required textual definition. The example first detects the missing definition,
then validates a completed model.

<!-- quickstart:source -->

```js
import { createModel, createElementId } from '@anarchitects/modeling-core';
import { validateModel } from '@anarchitects/modeling-metamodel';

const pin = { id: 'sales', version: '1', contractVersion: '1' };
const pack = {
  ...pin,
  displayName: 'Sales modeling',
  implementation: 'scaffold',
  dimensions: ['method'],
  requires: [],
  conflicts: [],
  constraints: [],
  extensions: [],
  types: [
    {
      kind: 'element',
      id: 'sales:customer',
      constraints: [],
      properties: [
        {
          id: 'sales:definition',
          required: true,
          value: { kind: 'scalar', valueType: 'string' },
        },
      ],
    },
  ],
};
const profile = {
  id: 'sales-profile',
  version: '1',
  selections: [{ dimension: 'method', pack: pin }],
};
const empty = createModel('sales', 'Sales', {
  id: profile.id,
  version: profile.version,
});
const customer = {
  id: createElementId('customer'),
  type: 'sales:customer',
  name: 'Customer',
  container: { kind: 'model', id: empty.id },
  properties: {},
};
const validate = (element) =>
  validateModel({
    model: { ...empty, elements: [element] },
    profile,
    registry: [pack],
  });

const incomplete = validate(customer);
console.log(`Before: ${incomplete.status}`);
console.log(incomplete.diagnostics[0].code);

const complete = validate({
  ...customer,
  properties: {
    'sales:definition': { kind: 'scalar', value: 'A party placing an order' },
  },
});
console.log(`After: ${complete.status}`);
```

Run `node quickstart.mjs`. Expected output:

<!-- quickstart:output -->

```text
Before: invalid
validation.required-property
After: valid
```

The pack's IDs and version pins identify the supplied definitions; they are not
npm package versions. Validation does not add defaults or mutate the model. The
example performs no file I/O or network requests.

## Choose a workflow

| Task                         | Entry points and guidance                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combine modeling definitions | `composeModelingProfile` resolves exact pack selections and reports missing definitions or conflicts.                                                                             |
| Validate a model             | `validateModel` reports semantic validity, assessment coverage and diagnostics with locations.                                                                                    |
| Compare snapshots            | `compareDocumentSnapshots` reports `equivalent`, `different`, `incomplete` or `incompatible`; see the [comparison example](../../docs/consumer/examples/semantic-comparison.mts). |
| Edit with revision guards    | `prepareSemanticCommand`, `prepareViewCommand` and `prepareSessionCommand` produce a proposed candidate, a replay receipt or a rejection.                                         |
| Review generated defaults    | `proposeDefaultPlan` creates a reviewable plan; `applyChangePlan` validates its application. Existing authored values are preserved by conflict checks.                           |
| Undo and redo                | Session commands coordinate semantic changes, views and generated baselines; see the [editing example](../../docs/consumer/examples/lifecycle.mts).                               |
| Save and reopen              | `encodeDocument` and `decodeDocument` handle a versioned byte representation; your application performs storage.                                                                  |

The [consumer guide](../../docs/consumer/README.md) explains these workflows and
limits. The [API reference](../../docs/consumer/api.md) lists supported imports and
result types. Use public package-root imports, not internal file paths.

## Validation, editing and storage

`valid` means the supplied model satisfies the understood definitions. `invalid`
means known requirements fail. `unsupported` means the supplied context cannot
fully assess the model. Check coverage as well as status: preserving an extension
payload does not mean its semantics are understood.

Profiles use exact pack identities and versions, with one selection per dimension.
Supply definitions and registered rules explicitly. Missing or duplicate packs
and conflicting definitions produce diagnostics; there is no automatic fetching,
version upgrade or override precedence.

Strict editing requires valid original and resulting documents, except for the
existing bounded defaults-repair path. Preparation never commits a change.
Your host must authorize the operation, atomically recheck the expected revision,
and persist the candidate with its receipts. Exact retry returns historical
information; it must not reapply an effect. Your host also owns file I/O, recovery,
collaboration and user-facing approval workflows.

The codec uses `archimatrix-document`, envelope `1`, with model format `2`.
Unsupported formats retain the original input bytes for recovery. Keep a separate
backup: the returned byte array is caller-owned. Encoding has size, depth and
receipt limits; check the result before saving. See the [codec limits](../../docs/consumer/README.md#portable-document-codec-and-recovery).

### Preview: incremental authoring

An unreleased opt-in API supports selected missing required metadata during
editing, while keeping semantic validation truthful. It uses separate result and
storage contracts. See the [preview guide](../../docs/consumer/authoring.md);
the registry installation above does not yet include this addition.

## Troubleshooting and compatibility

| Problem                                | What to check                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Import or dependency error             | Use ESM and run `npm ls @anarchitects/modeling-core @anarchitects/modeling-metamodel`; match core to metamodel's declared dependency.         |
| `missing-pack` or incompatible profile | Supply exactly one definition for every selected ID/version/contract, including its dependencies.                                             |
| `unsupported` validation               | Inspect coverage and diagnostics; provide the missing supported definitions or retain the document without editing it.                        |
| An edit is rejected                    | Check semantic diagnostics, expected values, deletion review and the current revision. Strict commands cannot leave required metadata absent. |
| A retry conflicts                      | Keep the original command ID and content for an exact retry; use a new command after reviewing changed intent.                                |
| Encoding or decoding is refused        | Preserve the current checkpoint and original bytes. Inspect the reason and limits; do not discard receipts or unknown fields to force a save. |

The package is ESM-only. Browser/bundler and other runtime environments are not
currently verified. TypeScript consumers can use `NodeNext` module resolution.
No renderer, automatic data migration, universal transformation engine or
executable rule scripting is provided. Readonly types do not freeze caller data.

Review the [release notes](../../docs/consumer/release-notes.md) and
[migration guide](../../docs/consumer/migration.md) when upgrading. Package,
pack/profile and document-format versions are independent; changing one does
not migrate the others. Documentation bundled with an installed package describes
that package; repository documentation may include labeled previews.

## Support and license

Ask questions or report reproducible bugs in the
[issue tracker](https://github.com/anarchitects/anarchitecture-modeling/issues).
Include installed package versions, runtime and a small reproduction. Report
security issues privately to [johan@anarchitects.dev](mailto:johan@anarchitects.dev).

Licensed under [Apache-2.0](../../LICENSE); see [NOTICE](../../NOTICE).
The runtime helper `tslib` is separately licensed under 0BSD. The examples are
synthetic and do not claim conformance to a modeling standard.
