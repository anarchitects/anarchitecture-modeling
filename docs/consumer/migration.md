# Migrating a workspace consumer

This is a consumer-owned migration procedure for the contracts described in the
[consumer guide](README.md). It does not claim any application has migrated or
that a registry release exists. Both current development packages remain private
at `0.0.0`. Start actual artifact adoption only when exact authorized versions,
integrity and compatibility evidence are available.

## Establish a reversible baseline

Record the application's current revision, Foundation imports, pack/profile pins,
lockfile, document formats and representative supported/invalid/unsupported
fixtures. Preserve recovery copies of files and retained retry receipts. Inventory
source aliases, `@archimatrix/source` custom conditions, workspace dependencies,
TypeScript references and build/packaging steps that currently supply Foundation.

Keep method packs, UI/rendering, host lifecycle, persistence, authorization,
collaboration and product integrations in their owning application. This migration
changes package resolution; it does not transfer those responsibilities or license
standard-specific material for redistribution.

## Replace resolution with exact artifacts

1. Select a reviewed core/metamodel release pair. Verify metamodel's exact core
   dependency, package integrity/provenance and license/notice contents. Lock both
   direct versions without ranges where the application imports both.
2. Replace `workspace:*`, `file:`, `link:` and sibling source references for these
   two packages with the released dependencies. Do not create a private shared
   package, synchronized fork or cross-repository source alias as an intermediate
   integration contract.
3. Import named symbols from `@anarchitects/modeling-core` and
   `@anarchitects/modeling-metamodel`. Replace deep `src/*`, `dist/*` and internal
   helper imports with the existing public contract, or request a deliberate
   upstream API change if no public equivalent exists. The exported
   `package.json` subpath is metadata only.
4. Remove Foundation-specific `@archimatrix/source` conditions, `paths` aliases
   and project references. Inspect other packages before removing shared settings
   they still need. Confirm ordinary ESM and strict NodeNext declaration resolution
   reaches installed artifacts without a source fallback.
5. Update the application's build, test, lint and packaging graph to consume the
   installed dependencies. Check required runtime dependencies are shipped by the
   application's distribution process. Nx is not required in the runtime.

Moving between these package entries does not itself change envelope 1/model
format 2 or profile pins. Do not rename the `archimatrix-document` identifier,
upgrade packs automatically or discard unknown content as part of installation.
The core/metamodel APIs remain subject to the [0.x policy](README.md#versions-and-support-boundaries).

## Verify the actual application

Run the consumer's own clean install, typecheck, build, tests and final artifact
checks using its resolved tools/targets. Record exact commands and versions.
The [portable lifecycle example](examples/lifecycle.mts) is a useful package probe;
it cannot replace application regression evidence.

| Concern           | Required consumer evidence                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resolution        | No sibling source conditions/aliases; only expected packed runtime dependencies                                                                        |
| Behavior          | Stable IDs/references, exact profile conflicts, diagnostics/coverage, independent layouts, authored values, guarded edits/defaults and deletion review |
| Retry/history     | Exact retry before/after reopen; mismatched/stale requests reject; bounded undo/redo and receipt retention remain deliberate                           |
| Files/recovery    | Known document round trips; invalid, unsupported, future and corrupt inputs preserve originals; no implicit migration                                  |
| Commit authority  | Permission check plus atomic revision comparison; no adoption after conflict, encode failure or persistence failure                                    |
| Host distribution | Actual extension/app bundle includes needed packages; lifecycle, native/UI interaction and persistence regressions still pass                          |

Archimatrix's migration, Extension Host/VSIX regression acceptance and retirement
of obsolete local Foundation copies are separate consumer-owned steps in that
order. Its maintainers track them in their own repository; private issue/source
links are not needed to use this guide. Blueprint adoption is a separate decision.
Retain the old implementation/build references until the owner accepts the new
application path, then remove them in a separately reviewed cleanup. Avoid shipping
two competing Foundation implementations during the transition.

## Compatibility and rollback

Keep the previous accepted application artifact and dependency lockfile available.
On regression, stop new writes if necessary and restore that accepted application
and exact dependency set. Run its known-fixture and file-recovery checks before
resuming edits. Downgrading npm packages alone does not roll back document data,
pack versions or receipts.

If any proposed change alters serialized content or retry semantics, require an
explicit migration decision, reversible strategy and old/new reader evidence
before writes begin. Prefer recoverable read-only handling for content the old
reader cannot safely edit. Do not erase unknown fields, reinterpret unsupported
data or silently drop receipts to make a downgrade pass. Preserve original bytes
outside the mutable decode result and coordinate backups/restore with the host.

Accept package compatibility, application behavior and local-source cleanup
separately. Successful Foundation tests or a merged migration PR are not evidence
of a deployed application release or permission to publish one.
