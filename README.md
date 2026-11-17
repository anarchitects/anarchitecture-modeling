# Modeling Foundation

An independent, host-neutral TypeScript modeling capability. The packages retain
the identities `@anarchitects/modeling-core` and
`@anarchitects/modeling-metamodel`; metamodel may depend on core, never the reverse.
Archimatrix is the first consumer. Both packages now build and test independently;
core and metamodel parity are accepted. Publication remains a separate gate.

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

## Licensing and release status

The [license/provenance review](docs/license-provenance-review.md) and its
[inventory](docs/license-provenance-inventory.md) record the Apache-2.0 direction,
rights confirmation and remaining artifact checks. Scaffold MIT metadata is not
final clearance for extracted assets.

The [public-readiness gate](docs/public-readiness.md) defines the evidence and
separate decisions required for repository disclosure and package distribution.
Its [review template](docs/templates/public-readiness-review.md) is unfilled;
the final candidate review remains #22 and authorized execution remains #23.

This repository remains private. Release configuration, final artifact review,
visibility approval and publication are separate work. CI success, a merged PR
or an accepted architecture decision does not authorize those operations.
