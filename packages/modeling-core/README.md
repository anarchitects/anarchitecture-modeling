# @anarchitects/modeling-core

Build in-memory models with stable identities, typed properties and relationships.
Validate their structure and keep diagram layout separate from the modeled content.

Use this package when building a modeling tool or a service that needs a common
model representation. Add `@anarchitects/modeling-metamodel` when you also need
method-specific rules, guarded editing, undo/redo or document serialization.

## Install

Requires **Node.js 24** and **ES modules**. TypeScript declarations are included;
JavaScript users do not need a compiler. No initialization or configuration file
is required.

<!-- quickstart:registry-install -->

```sh
npm init -y
npm install --save-exact @anarchitects/modeling-core
```

## Create and validate a model

Save this as `quickstart.mjs`. It creates a Customer element, validates it, then
shows how a duplicate identity is reported.

<!-- quickstart:source -->

```js
import {
  createModel,
  createElementId,
  validateModelStructure,
} from '@anarchitects/modeling-core';

const empty = createModel('sales', 'Sales', {
  id: 'sales-profile',
  version: '1',
});
const customer = {
  id: createElementId('customer'),
  type: 'sales:customer',
  name: 'Customer',
  container: { kind: 'model', id: empty.id },
  properties: {
    'sales:definition': { kind: 'scalar', value: 'A party placing an order' },
  },
};
const model = { ...empty, elements: [customer] };
const result = validateModelStructure(model);
console.log(`Customer model valid: ${result.valid}`);

const duplicate = validateModelStructure({
  ...model,
  elements: [customer, customer],
});
console.log(`Duplicate identity accepted: ${duplicate.valid}`);
```

Run `node quickstart.mjs`. Expected output:

<!-- quickstart:output -->

```text
Customer model valid: true
Duplicate identity accepted: false
```

Validation checks identities, containment, references and value shapes. It does
not decide whether `sales:customer` is a recognized business concept or whether a
definition is required. Those rules belong to a metamodel. This example creates
in-memory objects only; it does not save files or make network requests.

## Model building blocks

| Building block                                                           | Use it for                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `createModel`                                                            | Create an empty model with a caller-selected identity and profile.               |
| `createElementId`, `createMemberId`, `createRelationshipId`              | Construct distinct TypeScript identity types from nonblank strings.              |
| Elements and members                                                     | Represent concepts and their addressable parts, such as Customer and its fields. |
| Relationships and references                                             | Connect entities by stable identity rather than by name or array position.       |
| Tagged property values                                                   | Store scalars, local references, lists and records with explicit value kinds.    |
| `validateModelStructure`, `validateModelValue`, `validateModelReference` | Obtain diagnostics with codes and locations for structural problems.             |
| `DiagramView`, `validateViews`                                           | Describe and validate separate diagram occurrences and geometry.                 |

Import from `@anarchitects/modeling-core`. Internal file paths are not public APIs.
The [API reference](../../docs/consumer/api.md) describes the exported contracts;
the [consumer guide](../../docs/consumer/README.md) covers composition with metamodel.

IDs are supplied by your application. Constructors reject blank values but do not
generate unique IDs. Renaming an element should keep its identity. Validation is
non-mutating and never repairs input. Readonly TypeScript types do not freeze
JavaScript objects; your application owns object lifetime and updates.

## Limits and compatibility

- Core provides structural checks, not method semantics, rendering or persistence.
  Diagram validation does not render a view or verify its accessibility.
- References are local to one model. Cross-document resolution is not provided.
- The model representation uses format `2`. A profile's version is independent of
  the model format and package version. Loading or migrating stored documents is
  handled by your application or the companion metamodel codec.
- Use ESM imports (`.mjs`, `.mts`, or a project with `"type": "module"`). There is
  no CommonJS build. Browser/bundler and other runtime environments are not
  currently verified. TypeScript consumers can use `NodeNext` module resolution.

## Troubleshooting and support

| Problem                         | What to check                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Package cannot be found         | Run `npm ls @anarchitects/modeling-core` in the application directory and confirm installation completed.                 |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` | Replace a deep import with a documented package-root import.                                                              |
| Import syntax error             | Use the supported Node runtime and ESM configuration shown above.                                                         |
| An identity constructor throws  | Supply a nonblank string. Preserve existing IDs when changing names or properties.                                        |
| Validation fails                | Read `diagnostics` and inspect each location for duplicate IDs, missing targets, invalid containment or malformed values. |

For questions or bugs, use the [issue tracker](https://github.com/anarchitects/anarchitecture-modeling/issues).
Include installed package versions and a small reproduction. Report security
issues privately to [johan@anarchitects.dev](mailto:johan@anarchitects.dev).

## Upgrading and license

Review the [release notes](../../docs/consumer/release-notes.md) and
[migration guide](../../docs/consumer/migration.md) before upgrading. Keep your
lockfile and test representative models. Installing a new package does not
migrate stored data. When using both packages, match core to the dependency
required by your installed metamodel package.

Licensed under [Apache-2.0](../../LICENSE); see [NOTICE](../../NOTICE) for
attribution. The runtime helper `tslib` has its own 0BSD license. No licensed
method specification or standard taxonomy is included.
