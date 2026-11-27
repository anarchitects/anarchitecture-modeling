# Release notes

Version numbers below identify releases and compatibility changes. For normal
installation, follow the package README and keep your dependency lockfile.

## 0.0.3

- Metamodel adds opt-in incremental authoring for explicitly selected missing
  required scalar properties. Existing strict APIs keep their behavior.
- Authoring uses a separate document envelope. Older readers reject that format
  and retain its original bytes. Adoption is explicit; no automatic migration or
  downgrade is provided. See the [authoring guide](authoring.md).
- Package documentation now includes useful model examples and simpler installation.
- Core's runtime API is unchanged. Metamodel declares an exact dependency on the
  core release selected by Nx; update both packages together.

## 0.0.2 — 26 November 2026

- Metamodel adds `compareDocumentSnapshots` for semantic comparison by stable
  identity, with explicit differences and assessment coverage. See the
  [comparison guide](comparison.md).
- Core's runtime API and existing model/document formats are unchanged. Existing
  documents need no migration.
- The comparator is absent from earlier package versions. Applications using it
  must install a release that includes that export.
- The published README incorrectly labels comparison as unreleased. The API is
  available in this release; the next documentation update corrects the wording.

## 0.0.1 — 20 November 2026

Initial public release:

- Core: model identities, elements, members, relationships, property values,
  local references, independent views and structural validation.
- Metamodel: exact pack/profile composition, semantic and notation validation,
  reviewed defaults, guarded edits, session history and portable document encoding.

There is no automatic conversion from application-local implementations. Follow
[the migration guide](migration.md) when replacing workspace/source imports.

## Compatibility and maintenance

Metamodel declares its exact compatible core dependency; the package versions
need not match numerically. Check that dependency when updating an existing app.
Keep document-format and pack/profile pins unchanged unless deliberately migrating
them. Downgrading packages does not undo data changes.

The packages are pre-stable: compatible changes increment patch and breaking
changes increment minor. No long-term support or end-of-maintenance schedule has
been announced. Read compatibility notes and run application regressions before
upgrading. Registry entries ending in `-stage` are not supported releases.
