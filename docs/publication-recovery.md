# First-release recovery under #23

This procedure addresses the [partial first-publication attempt](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7035661381).
Merging the implementation does not authorize a retry or create a credential.
Johan remains the release owner.

## Observed outcome

[Run 44709234090](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44709234090)
submitted the approved core archive from source
`ed2d1c6aaa7409d46afd95ea6b5ffedf52b67047`. npm accepted the upload, then
processed it asynchronously. The publisher checked core availability immediately
and stopped before uploading metamodel. Core `0.0.1` subsequently became available;
its registry archive, installed files, README example, signatures and provenance
passed verification. Metamodel was never submitted.

npm also created a `0.0.0-stage` core placeholder during processing. It remains in
history alongside `0.0.1`, which is `latest`. No staging command was used and
authenticated stage listings were empty. Preserve and explicitly review this
provider-created placeholder in recovery history; do not silently ignore or
unpublish it. It is not a Foundation runtime release or permission to choose a
different first official version. Both tags remain at the original source under
the restored freeze. [Bootstrap cleanup is complete](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7035707679).

## Availability and interruption handling

[npm scans uploads before they become installable](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/).
After each successful upload, including the last package, the publisher waits up
to 15 minutes for matching metadata and actual archive bytes. It polls at ten-second
intervals; requests time out within 30 seconds or the remaining wait, whichever is
shorter. HTTP 404/429/5xx and request timeouts are retried as reads only. Denied
access, malformed data, unexpected archive origins and identity/integrity/hash
mismatches fail immediately. The publish job has a 40-minute limit. Delays beyond
the bound require inspection and a new recovery decision, not another upload.

Receipts distinguish `upload-started`, `submitted`, `available-verified` and
`already-published-verified`. An interrupted command can leave `upload-started`
even if npm accepted its upload. Neither that state nor `submitted` establishes
availability. Always inspect the registry before recovery. No command retries an
upload, unpublishes a version or changes a tag.

## Exact recovery scope

The `recover` operation is limited to the observed first-release pair: core
`0.0.1` already published, metamodel `0.0.1` absent. It downloads the original
successful preview, without repacking or recalculating Nx versions:

- Preview [44706018904](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44706018904),
  artifact `foundation-candidate`; normal retention expires 27 November 2026.
- Core SHA-256: `6c147dd0d300b7c9f01889274ef7a3bb38eed5f0cedad12bac0264e4c1f1888e`.
- Metamodel SHA-256: `31b6e105e454eb5d84d839a2782e4ce7bea1735652e991d4f4956840d2751f2f`.

All candidate archives still pass identity, legal and documentation checks, and
both tags must match the original source. Before any upload, core's downloaded
registry bytes and integrity must match its approved candidate; it is then skipped.
Full registry/tag histories must match the fresh owner record, including the
placeholder. Metamodel must have no distribution history. Only the missing
metamodel is uploaded, once, then its availability and bytes are verified.
Ordinary `publish` still rejects already-published candidate versions.

Recovery code runs on a new main commit while using archives from the original
source. Authorization names both SHAs. npm provenance describes the recovery
workflow/execution commit; the original source remains bound through the reviewed
preview, candidate report, hashes, tags and source links inside the unchanged
packages. Record both identities during final verification. Do not describe the
recovery executor as the archive's build source.

## Owner record and execution

After merge, recheck registry history, tags/protections, the environment and preview
availability. Obtain Johan's explicit recovery decision for the exact merged
executor and credential policy. Reuse the accepted candidate evidence; refresh the
#22 readiness record if its 24-hour window has elapsed, preserving its original
reference and exact hashes. Use comments, not issue-body edits.

The fresh #23 `foundation-release-authorization` retains `sourceSha`,
`readinessCommentId`, `authentication`, `versions` and `artifactHashes` for the
accepted pair. Replace history with the actual reviewed state and add the fields
below. These are template fields, not approval:

```json
{
  "historyBaselines": {
    "modeling-core": ["0.0.0-stage", "0.0.1"],
    "modeling-metamodel": []
  },
  "recovery": {
    "executionSha": "<exact merged recovery commit>",
    "candidateRun": 44706018904,
    "priorRun": 44709234090,
    "publish": ["modeling-metamodel"],
    "alreadyPublished": ["modeling-core"]
  }
}
```

Both records still require the authenticated owner, correct issues, exact hashes
and timestamps within 24 hours. The preview must be a successful manual main run
of `publish.yml` in this repository at the original source. The prior attempt must
be a completed failed/cancelled owner-dispatched main run of that workflow at the
same source. Expired/unavailable artifacts, different history or other partial
outcomes stop this path.

Create a fresh one-day bootstrap token, preferring only metamodel if selectable,
otherwise at most the separately approved `@anarchitects` scope. Use publish-and-stage
access and explicitly approved temporary 2FA bypass, without organization-management
permission. Store only in `npm-release`; do not reuse the revoked token or change
account/member 2FA.

Dispatch `publish.yml` on `main` with `operation=recover`, `authentication=bootstrap`,
`candidate_run=44706018904` and fresh authorization/readiness comment IDs.
`version_mode` is unused for recovery. Inspect and approve the protected job only
within that exact authorization. Revoke the token and remove the environment
secret after every attempt, including failure/cancellation.

Finally verify metamodel's registry archive and provenance, then install both
exact registry versions in a fresh consumer and repeat the paired runtime,
declaration, README and lifecycle proofs. Record public package pages and the
source/executor distinction in #23. Johan's acceptance of usable public artifacts
remains necessary to close #23; consumer adoption is separate.
