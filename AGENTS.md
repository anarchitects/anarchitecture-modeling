# Modeling Foundation — AI agent instructions

This is the canonical, agent-neutral workflow for all substantive work in this
repository: planning, issue decomposition, architecture decisions, implementation,
review and significant documentation or configuration changes. **Complete the
governance preflight before starting that work.** Reading sources and inspecting
the repository to perform the preflight are permitted first.

## Instruction scope and inheritance

Read this file, then discover relevant nested `AGENTS.md` files and tool-specific
instructions for the paths involved. Nested instructions refine their scope;
report conflicts rather than silently dropping this preflight. `CLAUDE.md` and
`.github/copilot-instructions.md` point here. `.codex/config.toml` configures tools
and the CI helper; `.codex/agents/` and `.agents/skills/` do not provide governance
exceptions. Apply this workflow before a skill performs substantive work, while
retaining its Nx discovery/generator procedure. Do not duplicate this policy into
each skill or agent configuration.

Delegated agents must receive and examine the applicable instructions and verified
source content, revisions and applicability from the coordinator, or retrieve them
themselves. A title list or unsupported claim of compliance is insufficient. A
bounded read-only helper may reuse that verified context; applying a suggested fix
still requires the relevant source review and authorized scope.

## Proportionate execution

Work pragmatically for a two-person team. Scale verification and documentation
to the concrete risk and the operation being authorized; reuse current evidence
and prefer the smallest sufficient check. For every blocker, identify the actual
risk or applicable requirement and the decision it prevents. Do not invent extra
approval gates, require exhaustive provider audits by default, or turn every
unknown into a release blocker. Record bounded, lower-risk limitations with an
owner and a useful follow-up or revisit trigger. Preserve required authority,
rights, credential protection and confidential-content boundaries; this principle
does not waive accepted governance or the preflight below.

## Mandatory governance preflight

### A. Retrieve current Meta governance

Authorized maintainers and their agents must resolve the **current default branch
and commit SHA** of `anarchitects/anarchitecture-meta` using authenticated `gh` or
connected GitHub tools. Pin reads to that commit; do not assume `main`, use a stale
sibling checkout or treat a local ADR list as authoritative.

Read Meta's `AGENTS.md`, `README.md`, `AI-ENABLEMENT.md`, `REPO-CATALOG.md`,
`ECOSYSTEM-MODEL.md`, `INTERACTIONS.md`, `docs/sdlc.md` and `docs/ownership.md`.
Discover the current complete ADR inventory under `adr/`, `docs/adr/` if present,
and any additional locations identified by those documents. Check tree/listing
completeness and pagination; an incomplete inventory is not a successful review.

Read the actual content of all applicable ADRs and follow any broader reading
requirement in Meta's current instructions. Do not infer applicability from names
alone. Cover ownership, public API/contracts, package versioning/Nx Release,
dependency maintenance, caching/distributed execution, SDLC/acceptance/release
authority, upstream-first reuse and public-package/consumer boundaries. Use full
paths when ADR numbers overlap.

For example, these read-only commands discover the current revision and tree;
they do **not** read the documents or establish compliance:

```sh
meta_repo=anarchitects/anarchitecture-meta
meta_branch=$(gh api "repos/$meta_repo" --jq .default_branch)
meta_sha=$(gh api "repos/$meta_repo/commits/$meta_branch" --jq .sha)
gh api "repos/$meta_repo/git/trees/$meta_sha?recursive=1"
```

Read the discovered files at `meta_sha` through the contents API, connected tools
or a verified checkout. If the tree is truncated, traverse the relevant subtrees
to complete discovery. Keep retrieved private content outside this repository and
out of committed files, public PR text, logs and caches.

### B. Inspect local instructions and architecture

Read the current root/nested instructions, `README.md`, local ADRs and architecture
docs. Discover and read `CONTRIBUTING.md`, `OWNERSHIP.md`, release, security, testing
and CI documentation where present. Inspect `package.json`, `nx.json`, relevant
package/configuration files and the resolved Nx project graph/targets. Do not
assume another repository's files, targets or protections exist here.

Record material gaps and use the existing owning issue where one exists. The
repository-governance work is tracked in [#6](https://github.com/anarchitects/anarchitecture-modeling/issues/6),
Nx/CI conventions in [#10](https://github.com/anarchitects/anarchitecture-modeling/issues/10),
and release controls in [#14](https://github.com/anarchitects/anarchitecture-modeling/issues/14).
Report a missing decision or prerequisite before dependent work; an unrelated
documentation gap need not block a bounded contribution. Do not create duplicate
issues or claim missing controls are implemented.

### C. Inspect relevant upstream and consumer evidence

For extraction, compatibility or package-boundary work, read the current
[Archimatrix #12 body and comments](https://github.com/anarchitects/archimatrix/issues/12),
including the [agreed architectural direction](https://github.com/anarchitects/archimatrix/issues/12#issuecomment-6927596576),
Archimatrix ADR 0001/0002, relevant source contracts, and accepted #8/#9 child-issue,
PR and fixture evidence. Reconcile historical placement/proposal wording with
later accepted decisions; do not treat all proposed contracts as proven behavior.

When Blueprint is affected, consult its ADR 0017 and standalone/proprietary
dependency policies. Inspect other affected upstream packages, public contracts
and consumers as needed, recording their actual revisions or package versions.
Consulting a private source does not authorize copying it or adding a dependency.

### D. Establish applicability and authority

Before proceeding, determine and retain a concise record of:

1. Applicable accepted Meta ADRs and local ADRs, identified by path and revision.
2. Proposed, superseded and rejected decisions, conflicts and the operative
   replacement where relevant. Proposals and recommendations are not binding;
   implementation evidence proves only its demonstrated scope.
3. The repository/capability that owns the change and the accountable decision
   maker from current ownership records; do not infer authority from merge access.
4. Effects on public contracts, versions, dependencies and consumer compatibility.
5. Any required ADR, existing/new issue, owner decision or coordinated migration.
6. Licensing, provenance, security, disclosure and release restrictions.

Resolve conflicts through the documented architecture/ownership authority. Local
implementation choices must respect applicable accepted Meta decisions. Never
invent an exception, silently override an ADR or mistake a proposal for approval.
Stop the affected work when a required decision or authoritative source is
unavailable; identify the exact blocker and owner. Independent read-only discovery
may continue. The external-contributor path below does not waive maintainer review.

### E. Revalidate and report evidence

Recheck source revisions when scope changes, context may be stale, and before
opening or reviewing an implementation PR. Within the same work session, reuse
content already examined only after confirming its authoritative revision is
unchanged; reread changed sources and reassess applicability. Refresh mutable
issue comments/acceptance evidence when relying on them, even if code is unchanged.

Include a concise preflight summary in implementation PR descriptions and in
significant planning/docs PRs: Meta default-branch SHA, relevant accepted ADR paths,
local ADRs, other source revisions/contracts, architecture/dependency effects and
any conflicts, exceptions or unresolved blockers. Use the PR template; reviewers
verify that evidence before claiming compliance. Record actual checks and results,
including skips/limitations. Neither an inventory command nor green CI proves ADR
review, compatibility, owner acceptance or release authorization.

Do not generate a large report for every trivial operation. A short reference to
the verified session record is sufficient for follow-up work within unchanged
scope; retain enough evidence to make the eventual PR reviewable.

## Public contribution baseline and private-source access

The following repository rules are a public-facing summary, not a copy of private
governance documents or a substitute for an authorized maintainer's current review:

- Modeling Foundation is an independent capability intended for open-source
  distribution. Archimatrix and Blueprint are consumers; generic modeling
  semantics are not owned wholesale by either application.
- Keep generic runtime code independent of ArchiMate, VS Code, Angular, NestJS,
  Nx, databases and proprietary Blueprint functionality. Nx and `@nx/js` are
  development tooling. Internal Nx workspace dependencies are allowed;
  cross-repository source links and shared private packages are not.
- Preserve the existing `@anarchitects/modeling-core` and
  `@anarchitects/modeling-metamodel` identities and accepted behavior during
  extraction. Host lifecycle/file I/O, method-specific semantics and proprietary
  application concerns remain with their owners. No speculative editor framework
  or general-purpose transformation engine is implied.
- Public package contracts require compatibility evidence and deliberate version
  and migration decisions. Implementation completion, owner acceptance,
  publication and consumer adoption are separate outcomes. Passing tests does not
  authorize a tag, release, merge or visibility change.
- Apache-2.0 is preferred, subject to license/provenance/contributor-rights and
  dependency review; existing scaffold metadata is not final clearance. Do not
  publish licensed ArchiMate material, private Meta/Blueprint documents or code,
  confidential architecture, credentials, infrastructure secrets or customer data.

External contributors without Meta access must read this baseline and applicable
public/local instructions, disclose the unavailable sources, and leave the private
governance check pending for an authorized maintainer. They may prepare bounded
changes that do not alter architecture, public contracts, dependency ownership or
release policy using the available rules; unrelated contributions do not require
access to private repositories. They must not claim full Meta compliance or guess
a missing policy. For work depending on a private decision, request a safe
maintainer-reviewed clarification before proceeding with that part.

An authorized maintainer must complete the current Meta check before accepting or
merging the contribution. Authorized agents encountering an access failure must
report it and stop dependent substantive work, not silently switch to this external
path. Provide only reviewed, minimal public-facing rule summaries; keep confidential
decision details and evidence in an access-controlled location. Do not paste
private sources into public artifacts to satisfy the preflight.

## Nx execution and verification

### Commit and release intent

Follow [the release policy](docs/releases.md). Validate exact commit scopes against
the resolved Nx graph. Changes within an unreleased package require non-breaking
`init(<exact-project-name>): ...`; split mixed package/lifecycle changes so both
commits and the proposed squash message express correct intent. Repository-wide
work may use an unscoped allowed type. Nx Conventional Commits calculate versions;
do not introduce version plans or silently choose an arbitrary version. Use the
preview-only wrapper for release dry runs. Candidate evidence checks do not grant
owner authorization; production tags and publication require explicit approval.

Retain the generated instructions below. Use this workspace's pinned Yarn and
installed Nx version, inspect available skills/MCP tools and resolve actual project
names/targets before choosing commands. Use `nx affected` with trustworthy base/head
revisions and the project graph where appropriate; use broader checks when the
comparison cannot establish safe coverage. Preserve relevant cached
build/test/lint/typecheck tasks, accurate inputs/outputs and dependency ordering.
External mutations and fresh-state checks are not cacheable; distributed execution
needs workload evidence rather than copied worker counts. Do not invent targets,
flags or a successful test run for an empty graph.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
