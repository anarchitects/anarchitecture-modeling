# First-release tag-creation plan

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22), F08.
This completes the proposed tag-control design under [#14's policy](releases.md)
and [#18's publishing workflow](publishing.md). It creates no tags or permissions.
Applying it requires explicit, candidate-specific authorization under
[#23](https://github.com/anarchitects/anarchitecture-modeling/issues/23).

## Executor and exact scope

Johan, `vrxj81` (GitHub user ID `5003361`), is the proposed sole tag creator,
using his authenticated GitHub CLI session. The two lightweight tags point
directly to the **same exact approved source commit**:

- `refs/tags/modeling-core@0.0.1`
- `refs/tags/modeling-metamodel@0.0.1`

These names follow the first-distribution policy and resolved Nx project names;
they are not authorization for a particular candidate. No wildcard release-tag
permission, new team/app, shared credential or Actions write permission is needed.
Publication stays in the existing manual workflow, which can read but not create
tags. A future release needs its own exact names, source and authorization.

On 19 November 2026, the live repository ruleset `27448740` matched
[pre-release-tags.json](../.github/governance/pre-release-tags.json): all tag
creation, update and deletion blocked, active, no bypass actors. Re-resolve and
verify this ruleset at execution; its recorded ID is not permission to overwrite
an unexpectedly changed rule.

## Layered controls

| Payload                                                                                | Scope and purpose                                                                                           | Bypass                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [tag-immutability.json](../.github/governance/tag-immutability.json)                   | Block updates/deletions for every tag, including the two candidates                                         | None                                  |
| [first-release-tag-creator.json](../.github/governance/first-release-tag-creator.json) | Block creation of the two exact names except by Johan                                                       | User `5003361`, creation ruleset only |
| [first-release-tag-window.json](../.github/governance/first-release-tag-window.json)   | Temporarily replace the existing freeze, excluding only those two names; every other tag stays fully frozen | None                                  |
| [pre-release-tags.json](../.github/governance/pre-release-tags.json)                   | Restore the original all-tag freeze immediately after the attempt                                           | None                                  |

All applicable rulesets apply together: bypassing the creator rule does not bypass
the separate immutability rule. GitHub's current REST schema supports `User`
bypass actors; this plan uses `always`, not the audit-exempt mode. No live write
probe was performed. If the API rejects this actor or the account/plan cannot
enforce these rules, stop with the original freeze intact; do not substitute an
administrator-wide bypass.
[Rule layering](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets#about-rule-layering),
[ruleset API](https://docs.github.com/en/rest/repos/rules?apiVersion=2026-03-10).

The rules limit **who and which names**, not the commit those names may target.
The exact-SHA checks below and the publisher's existing authorization checks
provide that binding. An administrator can edit protections; this is not a claim
that rulesets remove administrative control.

## Execution sequence for #23

1. **Prepare while frozen.** Revalidate #22 readiness and #23 authorization for
   the exact source SHA, both versions/tags, archive hashes, named executor and
   this ruleset transition. Resolve the source from the accepted preview, never
   from a moving `HEAD`. Confirm the successful preview and required CI refer to
   it, it is still the intended `main` commit, the existing publishing controls
   are ready, and fresh registry/channel/tag history still supports first release.
   Complete the final preview before tagging; do not rerun version calculation
   using newly created tags as a different release baseline.
2. **Check identity and capture controls.** `GET /user` must return both `vrxj81`
   and `5003361`. Read repository rulesets including inherited rules and their
   details. Verify the freeze, absence of both candidate tags, and absence of
   conflicting or unexpected controls. A permission/API error is not evidence
   of tag absence. Save timestamped original ruleset payloads/IDs outside the
   repository. Have the full-freeze restoration payload ready before any change.
3. **Add the guards first.** Create the immutability and exact-name creator
   rulesets with `POST /repos/anarchitects/anarchitecture-modeling/rulesets`.
   Capture returned IDs and read both back. Verify active enforcement, exact
   conditions, rule types and bypass actors. The original all-tag freeze remains
   active throughout these steps, so no creation has been opened yet.
4. **Open only the exact names.** With both guards verified, update the original
   freeze using `PUT /repos/anarchitects/anarchitecture-modeling/rulesets/{id}`
   and the window payload. Read back all three rulesets before creating anything.
   Only Johan can now create the two names; nobody can update or delete any tag.
   Do not alter organization policy, branch protection or workflow permissions.
5. **Create and verify.** Recheck identity, authorization freshness, the exact
   source and absence of both tags. Use the same authenticated CLI session to
   `POST /repos/anarchitects/anarchitecture-modeling/git/refs`, first core, then
   metamodel. Each JSON body has `ref` equal to its exact full name and `sha` equal
   to the approved 40-character commit. Require HTTP 201, matching `ref`, and
   `object.type: commit` / `object.sha` matching that source. Read each exact ref
   back with `GET /repos/anarchitects/anarchitecture-modeling/git/ref/tags/{name}`.
   Never use update-ref, force push, a branch name as the target, or overwrite.
   [Git reference API](https://docs.github.com/en/rest/git/refs#create-a-reference).
6. **Restore immediately, on success or failure.** Put the original full-freeze
   payload back on the original ruleset and read it back. Confirm no exclusions
   or bypass actors and active creation/update/deletion restrictions for all
   tags. Keep the two additional guards active; the restored freeze blocks even
   Johan from creating tags. There is no need to delete rulesets during recovery.
   Do this in the same attended execution session, before waiting on a chat reply
   or starting npm publication. The API has no automatic expiry: any execution
   helper must restore in a `finally`/cleanup path, with a ready manual fallback
   if the process or network fails.
7. **Record the result before publication.** Read both refs and all relevant
   rulesets again. Record the actor, authorization links, source SHA, exact refs,
   returned rule IDs, opening/restoration times and read-back results in a #23
   comment, with raw responses retained privately. Publication proceeds only if
   both tags match and restoration is verified, under its separate authorization.
   The existing publisher independently rejects missing or wrong-SHA tags.

The two create-ref requests are not atomic. If only one succeeds, a response is
ambiguous, or any check fails, stop further creation/publication and restore the
freeze first. Inventory what actually exists and obtain Johan's recovery decision.
Do not delete/repoint a tag or invent a replacement version. A retry requires
fresh authorization for the observed partial state; it is not a blind rerun.
If restoration fails, stop publication, notify Johan immediately and prioritize
restoring the all-tag freeze. The exact-name creator and immutability guards still
limit exposure, but an open exception must not be reported as restored.

## Review evidence and limits

Payloads are checked locally as a control matrix: before/after the window all tag
creation is blocked; during it only the named user can create the two exact refs;
other names and all update/deletion operations remain blocked for every actor.
This validates the proposed payload composition, not live GitHub enforcement.
No negative probe creates or mutates a production tag. Runtime tests and package
archives are unchanged; no new public API or dependency decision is introduced.

Plan acceptance is separate from activation. F08's tag-design portion is prepared;
release-environment/bootstrap review, final #22 readiness, actual enforcement
read-back and #23 execution authorization remain separate.
