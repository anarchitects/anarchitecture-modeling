# Contributing to Modeling Foundation

## Start with the owning issue

Keep changes bounded to an existing issue and its acceptance criteria. Discuss
changes to public contracts or ownership before implementing them. Follow the
[governance preflight](AGENTS.md) and [accepted local ADRs](docs/adr/README.md).
An authorized maintainer reviews current Meta governance before acceptance.

External contributors do not need private Meta access for bounded contributions:
use the public baseline in AGENTS.md, disclose unavailable sources and leave the
private review pending for a maintainer. Never copy private governance documents,
licensed specifications, credentials or customer data into contributions.

## Development prerequisites and verification

Use Node 24, Yarn 4.18.1 from `packageManager`, and installed Nx 24.0.6 tooling.
Enable Corepack where necessary, then install without changing the lockfile:

```sh
corepack enable
yarn install --immutable
yarn nx show projects --json
```

The current scaffold returns `[]`: there are no package projects or tests yet.
As projects arrive, inspect `yarn nx show project <exact-project-name> --json`
and run actual targets with `yarn nx run <exact-project-name>:<target>`.
Use the project graph rather than assuming target names or reading only partial
project configuration. Prefix Nx commands with `yarn`; do not use a global Nx.

CI runs affected lint/test/build/typecheck tasks with a verified base/head, falling
back to all projects when the comparison is unavailable. The
[Nx conventions](docs/nx-conventions.md) define exact identities, graph admission,
inputs, outputs and the remaining real-package/remote-cache proofs under
[#10](https://github.com/anarchitects/anarchitecture-modeling/issues/10).
Report zero tasks and skipped checks honestly. For Markdown/JSON-only changes,
check changed files with `yarn prettier --check <files>` and `git diff --check`;
do not invent runtime test evidence. Keep `.yarn/` untracked and ignored.

## Commits and package lifecycle

Use Conventional Commits. Repository-wide work may be unscoped, for example
`docs: clarify contribution workflow`. Every scope must exactly match a project
name returned by the active Nx graph; a folder, npm scope or release-group name
is not a substitute. With the current empty graph, use unscoped repository commits.

Before a package's first release, use `init(<exact-nx-project-name>): ...` for
package development, without breaking-change intent. `init` must be non-bumping.
After first publication, use normal reviewed release intent. Packages on `0.x`
remain there until Johan explicitly accepts a `1.0.0` stabilization candidate;
compatible features and fixes increment patch, breaking changes increment minor.

[#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14) owns the
complete Nx type mapping, non-bumping `init`, scope/type enforcement, release
dry runs and first-publication checks. These controls are not implemented by this
guide. First official distribution of each new Foundation package must be exactly
`0.0.1`, with manifest, tag and artifact agreement. No release command is part of
the contributor quickstart.

## Pull requests and acceptance

- Create a feature branch and use the PR template. Always link the owning issue:
  use `Closes #N` only when the whole agreed outcome is delivered; use `Refs #N`
  for a partial contribution and record what remains.
- Include the concise governance preflight, exact validation evidence and any
  contract, dependency, migration or provenance effects. Keep confidential
  evidence in access-controlled records; provide only safe public summaries.
- Obtain human review of dependency changes and self-healing suggestions. Bots
  and green CI do not authorize merge. Resolve review conversations and explain
  failures or skipped checks before acceptance.
- Johan accepts the capability outcome. Technical readiness, acceptance,
  publication and consumer adoption are separate. A merged partial PR does not
  close the broader issue.

Current and proposed GitHub controls are recorded in
[repository governance](docs/repository-governance.md). Release/tag controls and
distribution readiness require their own evidence and owner authorization.

## Dependencies and provenance

Renovate owns routine updates; Dependabot owns security updates. Do not add a
second routine Dependabot update schedule or enable automerge. Keep Nx and
`@nx/*` aligned; framework migrations need deliberate review. Inspect manifest
and lockfile changes, compatibility, licenses and resolved targets.

Retain upstream copyright and notices, identify copied/generated material and
confirm authority to contribute it. See the
[license/provenance review](docs/license-provenance-review.md). Final license
files and artifact clearance remain separate from this contribution workflow.
