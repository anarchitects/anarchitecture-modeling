# Nx Cloud report audience and retention

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22),
D4/F07. Review `MF22-2026-11-19-d4-r1`, 19 November 2026, source
`b22629b26bbcb829683052a07c6cc68b076bec55`.
**Result: report audience resolved by the follow-up below; final disclosure delta remains pending.** Johan holds the
restricted record outside this repository. The initial review changed no settings;
Johan subsequently selected the audience verified below.

## Verified follow-up — 19 November 2026

After PR #60 merged, Johan selected **Organization members only**. Reloading the
Modeling workspace settings confirmed that selection persisted, with Public and
Repository access unselected. A fresh anonymous private-window visit to the #60
pipeline redirected to Nx Cloud login. This resolves D4's report-audience
choice; it does not establish access behavior for every asset route.
[Recorded verification](https://github.com/anarchitects/anarchitecture-modeling/issues/22#issuecomment-7004575231).

Retain organization-only visibility through any later GitHub visibility change
and recheck it at that transition. Provider retention remains a conditional
follow-up under the proportionate rule below. Review any report or sharing link
actually intended for public disclosure; final candidate/content review remains
separate. The earlier observations below are historical, not the current selection.

## Initial observed audience

| Surface                 | Observation                                                                                                                                 | Limit                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Workspace visibility    | **Repository access** selected; the UI grants access to users with access to the connected repository and retains organization-admin access | GitHub repository is currently private; this is not a fixed audience across a visibility change |
| Cache permissions       | Default **none**, logged-in developers **read-only**, unprotected CI token **read**, protected CI token **read-write**                      | Cache permissions do not independently establish report-page visibility                         |
| Organization membership | GitHub-managed admin rows; no allowed email domains displayed                                                                               | A settings observation, not a complete identity or authorization audit                          |
| Authenticated report    | The reviewed #58 pipeline opens in the existing authorized session                                                                          | Does not establish nonmember behavior                                                           |
| Anonymous report links  | One pipeline link and one historical run link redirect to Nx Cloud login in a new Safari private window                                     | Covers those two page routes only; no sign-in attempted                                         |
| Resource reports        | Collection enabled; UI states that stopping collection leaves existing reports available                                                    | Disabling a collector is not deletion or a retention policy                                     |

The two ordinary report URLs did not confer anonymous access in these probes.
Direct task downloads, signed storage links, badges, self-healing details and
authenticated users without repository access were not tested. No share token
was created to test them. Do not generalize the page probes to every asset route.

## Repository visibility transition

Nx documents that Repository access follows the connected repository, and public
repositories using it are treated as public workspaces. That repository-linked setting must
therefore be considered in the repository disclosure decision; a private cache
token policy does not prevent this report-audience transition.
[Nx release notes, March 2026](https://nx.dev/changelog#ci-metrics-cleaner-access-control-ai-that-respects-your-git-hooks).

The follow-up above verifies **Organization members only**, with safe local
evidence summaries for public readers. Preserve and revalidate this selection
before an authorized repository visibility change. Any later public report access requires
explicit clearance of its content and audience, including historical reports and
downloadable assets. Recheck actual behavior after any approved change.

Existing restricted report links can support authorized review; they must not be
presented as anonymously accessible evidence. Keep the safe local CI summaries
and exact private evidence mapping. Removing a current link would not erase
historical discussion links or provider-held reports.

## Retention limitation and proportional follow-up

The inspected account is on Hobby. Its workspace, membership and plan pages do
not specify retention/deletion periods. The discovered Public API exposes CI
data and organization identity, but no settings/retention operation. The official
pricing and security pages reviewed did not establish an applicable retention
schedule either. This does not prove that no provider policy exists.

Johan confirms no existing retention contract or support record is available.
On 19 November 2026 he directed a pragmatic, risk-proportionate approach for this
two-person team. This supersedes the initial review's blanket requirement for
provider retention and exhaustive sharing evidence before D4 could progress.

Under the [proportionate readiness rule](public-readiness.md#proportionate-evidence),
unknown retention and backup-deletion periods are a recorded limitation, not
an automatic publication blocker while reports remain restricted. Johan owns
the follow-up. Seek provider clarification if sensitive data, an exposure,
a deletion obligation or a planned audience expansion makes the unknown
material. The prepared provider enquiry is optional and remains unsent.

The untested asset/sharing routes remain explicit limits of the two page probes;
no exhaustive route audit is required without a concrete concern. Review any
actual sharing link intended for public use. Current download availability,
local Nx pruning and GitHub's artifact settings do not establish cloud retention.

## Content review and acceptance boundary

The [initial review](readiness-review-status.md) downloaded and scanned 369
advertised assets at its historical snapshot. That bounded scan is retained;
this settings review neither repeats it nor clears later reports/assets. The
original D4 reference counts also remain historical, not a refreshed inventory.
Final candidate review must include the new source, hosted text and report delta.

D4's audience decision is resolved. Its remaining work is to revalidate that
control at a visibility transition and review the relevant content delta for
any intended disclosure. Preserve usable local evidence when external reports stay restricted.
The retention limitation alone does not hold this work open. Other F07 findings
and final #22 acceptance remain separate; this is not blanket clearance of them.
No provider enquiry was sent, artifact deleted, or repository visibility/release
operation authorized by this review. The agent only verified Johan's audience change.
