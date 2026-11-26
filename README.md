# Modeling Foundation

An independent, host-neutral TypeScript modeling capability. The packages retain
the identities `@anarchitects/modeling-core` and
`@anarchitects/modeling-metamodel`; metamodel may depend on core, never the reverse.
Archimatrix is the first consumer. Both packages now build and test independently;
core and metamodel parity are accepted. Both are published as `0.0.2`;
consumer adoption remains a separate outcome.

Canonical placement and ownership are accepted in
[Meta ADR-0023](https://github.com/anarchitects/anarchitecture-meta/blob/4e481d2ef8c522d3c1118e6de8bb7052b87100a7/adr/0023-independent-modeling-foundation.md).
See [ownership](OWNERSHIP.md) and the [readiness review](docs/readiness-review-status.md)
for the separate disclosure and release decisions.

## Using the packages

Start with the [consumer guide](docs/consumer/README.md),
[public API reference](docs/consumer/api.md) and
[migration guide](docs/consumer/migration.md). The
[executable lifecycle example](docs/consumer/examples/lifecycle.mts) is compiled
and run against packed APIs. Install the verified public pair from npm:

```sh
npm install --save-exact @anarchitects/modeling-core@0.0.2 @anarchitects/modeling-metamodel@0.0.2
```

See the [release record](docs/consumer/release-notes.md) for registry links,
compatibility, archive hashes and provenance. Nx Release updates source package
versions before review; approved distribution archives use those same versions.

## Contributing and ownership

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for development, commit and PR
conventions, and [AGENTS.md](AGENTS.md) for the mandatory governance preflight.
[OWNERSHIP.md](OWNERSHIP.md) records decision and maintenance responsibilities.
Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

The accepted [architecture decisions](docs/adr/README.md) distinguish existing
behavior from future contracts. Generic runtime code stays independent of host
applications, frameworks, persistence and method-specific semantics.

## Development

Use Node 24 and the pinned Yarn 4.18.1. Nx and `@nx/js` are pinned to 24.0.6.

```sh
corepack enable
yarn install --immutable
yarn nx show projects --json
yarn nx run-many -t build test lint typecheck --projects=modeling-core,modeling-metamodel
```

Resolve project names and targets before running package commands. An empty
project list or a successful run with zero tasks does not verify package behavior.
See [CONTRIBUTING.md](CONTRIBUTING.md) for validation and lifecycle guidance.

## CI and dependency maintenance

The workspace is already connected to Nx Cloud; do not reconnect it. The
[CI record](docs/ci.md) explains credentials, self-healing and remaining cache proofs.
[Nx conventions](docs/nx-conventions.md) define package identities, graph checks,
affected selection and the extraction verification handoff.
[Repository governance](docs/repository-governance.md) records effective controls
separately from proposed settings and pending checks.
The [release policy](docs/releases.md) defines independent versions, commit
lifecycle checks, safe previews and the owner-authorization handoff.

Dependabot handles vulnerability alerts and security updates. Renovate handles
routine updates through [renovate.json](renovate.json). Both require human review
and merge. A configuration file alone does not establish hosted execution.

The [extraction inventory](docs/extraction-inventory.md) pins the source files,
public exports, portable tests and consumer dependencies for epic #3. The
[file-level extraction boundary](docs/extraction-boundary.md) records the portable
and host dispositions accepted under #11. The [core extraction record](docs/core-extraction.md)
documents unchanged source, declarations, tests and movement-only configuration
adaptations accepted under #12. The [metamodel extraction record](docs/metamodel-extraction.md)
records #15’s accepted parity. The [proof migration record](docs/proofs/README.md)
maps historical source issues and PRs to current executable fixtures. The
[built-entry and packaging record](docs/package-entry-points.md) describes ordinary
ESM/declaration resolution and the verified tarball contents.
[Dependency-boundary evidence](docs/dependency-boundaries.md) covers source,
declarations, packed artifacts, runtime provenance and the installed closure.
The [integrated parity gate](docs/integrated-parity.md) assembles all seven proof
pressures and lifecycle equivalence through built public entries, accepted under #19.

## Licensing and release status

Original Foundation work is licensed under [Apache-2.0](LICENSE), with attribution
in [NOTICE](NOTICE). Anarchitects is a working, collaboration and brand name.
Separately identified third-party material retains its own licenses and notices.
The [license/provenance review](docs/license-provenance-review.md) and its
[inventory](docs/license-provenance-inventory.md) record the rights confirmation
and remaining artifact checks. See the [license reconciliation](docs/license-reconciliation.md)
for the distinction between the license grant and candidate clearance.

The [public-readiness gate](docs/public-readiness.md) defines the evidence and
separate decisions required for repository disclosure and package distribution.
The [candidate review status](docs/readiness-review-status.md) records #22's
current evidence and blockers; its working record is held outside this repository.
The [review template](docs/templates/public-readiness-review.md) remains reusable.
Authorized execution remains #23. [Third-party notices](THIRD_PARTY_NOTICES.md)
retain the verified copied-tooling grant independently of final package licensing.

This repository is public following the [approved disclosure operation](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7034737872).
Package publication still requires final artifact acceptance and exact release
authorization. CI success, a merged PR or an accepted architecture decision does
not authorize publication.
