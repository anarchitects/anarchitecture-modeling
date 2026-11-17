# Public-readiness candidate review template

Use with [the gate](../public-readiness.md) under #22. **Blank template; no approval.**
Create the completed working record in access-controlled storage outside this
repository. Restricted evidence and raw findings must not enter a repository,
issue, PR, log or attachment intended to become public. Publish only an approved
sanitized summary. Replace every placeholder; unexplained blanks mean incomplete.

## Candidate and inventory

- Review ID, revision, date/time (UTC), reviewer and role:
- Owning issue and restricted evidence custodian/location:
- Proposed operations, destinations and exposure scope (repository / packages):
- Repository identity, current visibility and exact source SHA:
- Ref/history inventory ID/digest, object IDs and coverage:
- Hosted-content snapshot IDs/digests/timestamps, pagination/counts and gaps:
- Lockfile digest; toolchain/OS/architecture; build/pack commands and workflow SHA:
- #20 packed-consumer evidence and #21 documentation revision:
- Accepted Meta registration and governing/local source revisions (restricted mapping):

| Artifact/package | Version     | Source SHA | Archive/asset SHA-256 | File-list inventory/digest | Build evidence |
| ---------------- | ----------- | ---------- | --------------------- | -------------------------- | -------------- |
| `<candidate>`    | `<version>` | `<sha>`    | `<digest>`            | `<record>`                 | `<record>`     |

Include every archive/release asset; do not treat a package name or directory as
an artifact inventory. Record registry integrity separately after publication.

## Coverage and findings

For each surface, record tool/query/version, completeness/pagination/counts,
snapshot or inventory digest, evidence ID, reviewer/date and result: pass,
blocked, not reviewed, or not applicable with reason. Keep raw matches private.

| Surface                                                                            | Evidence and completeness | Findings / disposition | Reviewer / date / result |
| ---------------------------------------------------------------------------------- | ------------------------- | ---------------------- | ------------------------ |
| Full history, branches/tags/PR refs, retained objects, LFS/submodules              | `<record>`                | `<record>`             | `<record>`               |
| Issues/PRs/reviews/comments/attachments/cross-references and retained edits        | `<record>`                | `<record>`             | `<record>`               |
| Docs/fixtures/assets/wiki/discussions/Pages/downloads                              | `<record>`                | `<record>`             | `<record>`               |
| Actions/Nx Cloud logs, summaries, artifacts, release assets and cache exposure     | `<record>`                | `<record>`             | `<record>`               |
| Packed contents, declarations/source maps, embedded source, generated metadata     | `<record>`                | `<record>`             | `<record>`               |
| Rights/contributor grants, copied/generated provenance, final license/notices      | `<record>`                | `<record>`             | `<record>`               |
| Exact shipped dependency closure, versions/licenses and consumer obligations       | `<record>`                | `<record>`             | `<record>`               |
| Secrets/security findings, triage and remediation evidence                         | `<record>`                | `<record>`             | `<record>`               |
| Private-reference classification and approved public traceability                  | `<record>`                | `<record>`             | `<record>`               |
| Current ownership/registration, protections, public contribution/security/API docs | `<record>`                | `<record>`             | `<record>`               |
| Package/scope control, publishing identity, permissions and provenance readiness   | `<record>`                | `<record>`             | `<record>`               |

| Finding ID | Affected operation/artifact | Blocker or justified nonblocker  | Accountable owner | Resolution/evidence or follow-up | Re-review result |
| ---------- | --------------------------- | -------------------------------- | ----------------- | -------------------------------- | ---------------- |
| `<id>`     | `<scope>`                   | `<classification and rationale>` | `<owner>`         | `<record>`                       | `<result>`       |

List unavailable/expired/unreviewed evidence and its exposure implications.
No required-surface gap or unresolved distribution blocker may become a pass.

## Decisions (record each separately)

Every decision names the person, verified authority/role, timestamp, exact
candidate/inventory IDs, approved scope, conditions and evidence reference.

| Decision                            | Named authority and authority evidence              | Candidate/scope/conditions                    | Decision / date / reference |
| ----------------------------------- | --------------------------------------------------- | --------------------------------------------- | --------------------------- |
| Technical review complete           | `<maintainer>`                                      | `<scope>`                                     | `pending`                   |
| Rights/disclosure findings resolved | `<relevant owners>`                                 | `<scope>`                                     | `pending`                   |
| Candidate readiness accepted        | `Johan, capability owner`                           | `<scope>`                                     | `pending`                   |
| Repository visibility approved      | `<verified repository/organization decision maker>` | `<exact operation and exposure inventory>`    | `pending`                   |
| Capability release authorized       | `Johan, capability owner`                           | `<versions, SHA, digests, tags and executor>` | `pending`                   |

- #22 readiness result: **incomplete / blocked / ready for explicit authorization**:
- Remaining findings and rationale; unchanged evidence retained from prior review:
- Approved public summary and its own disclosure review reference:

Readiness does not imply the last two decisions. A person holding several roles
can record each decision; no second approver is implied. If an operation is not
requested, mark its authorization “not requested,” not “approved.”

## Revalidation and later execution (#23)

- Execution-time source/refs/archive/hosted-content/controls/authority comparison:
- Changes since review, affected checks repeated and renewed decisions:
- Explicit visibility/release authorizations verified; permitted executor:
- Actual visibility action and post-action access/control readback:
- Actual tags/package versions/registry URLs/integrity/provenance; source mapping:
- Fresh public-consumer verification and Johan's public-artifact acceptance:
- Partial execution, deviations, remaining blocked steps and recovery decision:
- Consumer adoption remains separately owned and tracked:

Leave this section pending until authorized execution actually occurs. Do not
perform a visibility change, create a tag or publish to fill a template field.
