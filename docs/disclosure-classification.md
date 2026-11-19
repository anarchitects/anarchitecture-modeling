# Disclosure classification and owner decisions

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22), F02.
Restricted packet `MF22-2026-11-18-disclosure-r1` classifies the identified findings
at source `f46be644facc3c3115d66ee909894e25cd323dad`. Johan holds the packet and
location-level inventories outside this repository. This is a sanitized progress
record; **repository disclosure remains blocked** pending decisions and coverage.

Classification distinguishes information actually present in a file or discussion
from the contents of a linked source. A private URL can reveal names, paths,
revisions and relationships even if its target requires authentication. Conversely,
a reference to a method, a copyright notice or an external repository is not by
itself evidence of a secret or restricted copied material.

## Refreshed evidence

- Current source: 214 tracked files. The fresh mirror contains main and 29 PR
  heads (30 advertised refs), with 62 reachable commits; one branch and no tags.
- Current hosted text: 53 issue/PR records and 110 issue comments, deduplicated
  to 163 records. Inline review-comment listing is empty. Current listings were
  retrieved through their final page; unavailable/deleted surfaces remain separate.
- Source references: 149 distinct Archimatrix URLs, nine distinct Meta/Blueprint
  URLs and 87 distinct Nx report URLs across the selected current-tree/discussion
  matches. These are URL counts, not counts of confidential documents or leaks.
- Public status of the four repositories cited as licensing precedents was
  verified. Their public reference metadata is distinct from references to the
  three private sources; public status does not grant rights over arbitrary content.
- The 18 newly reachable blobs since the initial 317-blob inventory belong to
  PRs #52/#53. Their redacted Gitleaks 8.30.1 scan returned zero detections. This
  bounded delta result does not establish full disclosure clearance.

## Decision register

| ID  | Classification and proposed treatment                                                                                                                                                    | Accountable decision / status                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Retain the packet’s inventoried extraction references and host-boundary summaries. Approval covers listed text and reference metadata, not linked private source contents.               | Approved by Johan as Archimatrix App PO on 18 November 2026: “Approve D1 as scoped.”                                                                                                                                   |
| D2  | Obtain approval for minimal ecosystem ownership, governance and consumer-boundary summaries and reference metadata. Keep private source documents and unrelated product details private. | PWG review pending. Johan confirms the restricted packet was sent from the Meta workspace session; no acceptance is inferred.                                                                                          |
| D3  | Retain the inventoried name and existing Git identity metadata. No history rewrite or persistent Git identity change is required by this disposition.                                    | Approved by Johan on 18 November 2026: “Approve retaining the metadata.” Exact values and the question/answer remain in the restricted record.                                                                         |
| D4  | Retain useful build links with a deliberate audience and suitable content. Keep safe local summaries for restricted reports; treat retention unknowns proportionately.                   | [19 November access review](nx-report-disclosure.md): organization-only audience verified in the follow-up; relevant disclosure delta remains pending. Retention is a conditional follow-up, not an automatic blocker. |
| D5  | Retain the selected synthetic-fixture disclaimers, scope exclusions and required rights notices. No new restricted-standard excerpt was identified in those selected findings.           | Existing provenance evidence retained; final rights/disclosure acceptance remains #22. This is not standards conformance or blanket third-party clearance.                                                             |
| D6  | Keep the historical generated-state review and its limits explicit. Any removal requires an exact-object, history and hosted-surface plan.                                               | Maintainer/security owner; provider-retained/unavailable-content gaps remain F07. No history rewrite or deletion authorized.                                                                                           |

D1/D3 decisions apply only to the packet's exact inventory; they do not clear
D2/D4, unknown material or future additions. A source-owner decision does not open
the referenced private repository. Meta registration acceptance and permission to
disclose particular text are separate decisions. Technical-maintainer access is
not a substitute for the accountable source owner's decision.

If treatment requires a text change, preserve the review evidence and prepare a
bounded PR. Current-tree editing does not erase old blobs, discussion text or edit
history. Issue bodies remain unchanged; any necessary historical/hosted remediation
requires a separately reviewed plan consistent with owner instructions. Do not
delete audit evidence or relax report access merely to make this gate appear green.

## Coverage and handoff

This work groups the identified reference matches by source/account ownership and
checks surrounding boundary, proof and authority examples. It is not a complete
manual re-review of every unflagged historical sentence. The initial edit-history,
Actions/Nx asset and scan evidence retains its original snapshot; new edits, logs,
artifacts and reports require a delta review before final readiness.

The [19 November delta review](readiness-review-status.md#disclosure-delta--19-november-2026)
resolves the current wiki uncertainty and records the D2 supplement. Deleted/provider-retained
objects, rendered job summaries/cache bytes and later disclosure changes remain
explicit F07 limits; Nx report access is resolved and retention is conditional. The fork-window review,
genuine bot event, security dispositions, central registration and execution
controls remain independently tracked in the [readiness status](readiness-review-status.md).
Nothing in this classification waives them.

The [license reconciliation](license-reconciliation.md) is merged through PR #53;
it establishes the new license files and packaging checks, not a disclosure
decision. Candidate clearance remains pending, publication disabled and archives
private. Re-pin source and mutable inventories after this PR and record each
owner decision with scope, authority and reference before accepting #22. Visibility
and publication still require separately authorized #23 execution.
