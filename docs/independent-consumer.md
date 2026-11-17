# Independent npm consumer proof

[#20](https://github.com/anarchitects/anarchitecture-modeling/issues/20) verifies
the two local candidate tarballs from the accepted [publishing preparation](publishing.md).
It extends the earlier [manual extraction checks](package-entry-points.md) with an
actual npm install outside the workspace and a separately installed compiler.
The tarballs remain private, internal test artifacts. This does not publish them,
establish scope control, clear their license/NOTICE placeholders or demonstrate
registry provenance. Johan accepts this bounded result separately from merge.

## Run and evidence

From a clean commit, using the pinned workspace toolchain:

```sh
NX_NO_CLOUD=true yarn nx run-many -t build
NX_NO_CLOUD=true node tools/consumer/check.mjs tmp/independent-consumer

# Or consume existing reviewed archives without repacking them:
NX_NO_CLOUD=true node tools/consumer/check.mjs tmp/consumer-evidence tmp/exact-candidate
```

Use a new output directory on each run. The default prepares first-version
`0.0.1` private candidates through #18's actual Nx dry run. An explicit candidate
directory must contain `candidate.json` and both named archives from the exact
checked-out commit. The proof currently requires both artifacts; a future
single-package release must supply and review its compatible companion before
this gate can pass. A registry/network error is a failure, never a skipped proof.

The checker creates a disposable directory outside the repository, with no
sibling checkout, workspace configuration, custom conditions, source aliases or
project references. It uses an empty npm user/global configuration, fresh cache
and temporary HOME. Only a small environment allowlist is passed to child
processes; no npm/GitHub/Nx credential, `NODE_PATH`, `NODE_OPTIONS` or workspace
`.bin` path is inherited. Registry downloads use `https://registry.npmjs.org`.
Package lifecycle scripts and audit/funding calls are disabled; this is an
installation/compatibility proof, not a vulnerability audit.

The two candidates are copied as local `.tgz` inputs; their installed manifests
retain exact semver runtime dependencies. The disposable consumer's own `file:`
inputs identify these test archives and are not shipped dependency references.
The helper and compiler are fetched from npm, rather than copied from the
workspace. npm's lock integrity is checked against the candidate's actual archive
integrity. Every installed candidate file is compared with its tarball bytes,
alongside accepted runtime hashes, exact inventory, exports, declarations,
LICENSE/NOTICE and absence of maps/source links.

Output includes:

- `candidate/` and its manifest/hashes/sizes when preparing a new candidate.
- `evidence.json`: source, observed toolchain/platform, archive identities,
  inventory, runtime closure, module-resolution matrix and completed checks.
- `runtime-dependencies.json`: npm's actual runtime dependency tree.
- `consumer-package-lock.json`: exact installations and registry integrities.

The temporary installation and fresh cache are deleted on success or failure.
Required CI uploads the private evidence with a seven-day retention. The manual
publishing preview runs this same check on its exact archives and includes the
report in its candidate artifact. Neither check is cacheable. Nx remains the
cacheable workspace build/test/lint/typecheck orchestrator; the independent
consumer deliberately has no Nx installation or target.

## Executed checks

The initial runtime installation must contain exactly core, metamodel and
`tslib`. The reviewed helper remains `2.9.1`, with no runtime dependencies;
a newly resolved helper requires explicit boundary review rather than silently
changing this evidence. Metamodel's exact core dependency must resolve from its
own installed entry to the same installed core used by the consumer. npm's
dependency tree must be valid. No TypeScript, Nx, VS Code, Angular or Nest runtime
is present during this phase.

The public [smoke fixture](../tools/proofs/foundation-smoke.mjs) exercises profile
composition, validation, notation, bounded plans, semantic/view commands,
session undo/redo, reopen/retries and a codec round trip. Additional installed
checks cover identity preservation/empty rejection, public JSON metadata,
blocked source/deep imports and future envelope refusal with original bytes
retained. Removing core must break a fresh metamodel import instead of finding
a workspace/global fallback. Substituting an incompatible installed core version
must fail npm dependency validation; neither mutation touches repository files.

Next, npm installs TypeScript **6.0.3** as the consumer's only development
dependency. Strict ordinary package resolution checks the entire declaration
closure with `skipLibCheck: false`. All compiler source files, including standard
libraries, must physically resolve inside the consumer. Negative type checks
cover identity-brand mismatch, unbranded strings and blocked implementation paths.
The existing [lifecycle example](consumer/examples/lifecycle.mts) is compiled and
executed in both modes. It includes exact-pin incompatibility, opaque unsupported
data, stale-command rejection, defaults, guarded edits/retries, undo/redo, codec
recovery and retained unsupported payloads. Its content is reused unchanged.

Finally, remove `node_modules`, run `npm ci --offline` using only this run's new
cache and generated lock, verify the lock hash is unchanged, and repeat runtime,
resolution, type and lifecycle checks. This checks locked reinstallation; it
does not claim that the first fresh install can run without registry access.
See npm's [install](https://docs.npmjs.com/cli/v11/commands/npm-install/) and
[ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) documentation.

## Supported and excluded matrix

| Runtime     | Compiler         | Module / resolution             | Expected scope                                       |
| ----------- | ---------------- | ------------------------------- | ---------------------------------------------------- |
| Node 24 ESM | None             | Ordinary package exports        | Runtime-only install and public smoke                |
| Node 24 ESM | TypeScript 6.0.3 | `NodeNext` / `NodeNext`, strict | Installed declarations and emitted lifecycle example |
| Node 24 ESM | TypeScript 6.0.3 | `Node16` / `Node16`, strict     | Installed declarations and emitted lifecycle example |

`Node16` here names a TypeScript resolution mode, **not Node 16 runtime support**.
The package engines remain `^24.0.0`. Reports record the exact Node/npm patch and
OS/architecture actually used; local and hosted results belong in the PR/issue.
No CommonJS build, browser/bundler, older Node/TypeScript, Windows or untested
platform support is inferred. Declaration maps remain intentionally absent.

This is an upstream package verification, not Archimatrix/Blueprint adoption or
licensed-method conformance. Before #23 publication, #22 must review fresh exact
candidate evidence and final legal/disclosure material. After publication, repeat
the installation and behavior proof with exact npm registry versions instead of
local tarballs, verifying registry integrity and provenance. A local `.tgz`
installation cannot establish that registry-specific outcome.

## Governance

Based on accepted #18/#19 and Modeling `a082205cfc16de6e23850258bcb04159e3206b47`.
The complete session governance review was reused after authenticated unchanged
revision checks: Meta main `4f0339d86f0ebfa073173ad307cb67c8d6042bdd`, Archimatrix
`b83c78e7a70e1434a6bf9101d7bbf43467becf7f`, Blueprint
`af4f88517302937dc23c0da4763579d0cca83604`. Current Archimatrix #12 direction and
acceptance comments were refreshed. Local accepted ADR 0001/0002 and the applicable
accepted ownership, public-contract, versioning, dependency, cache, release and
reuse decisions remain operative; proposals are not promoted to new contracts.
No runtime/public API, architecture exception, source transfer or adoption changes.
