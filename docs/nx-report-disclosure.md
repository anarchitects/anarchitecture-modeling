# Nx Cloud report audience and retention

Refs [#22](https://github.com/anarchitects/anarchitecture-modeling/issues/22),
D4/F07. Review `MF22-2026-11-19-d4-r1`, 19 November 2026, source
`b22629b26bbcb829683052a07c6cc68b076bec55`.
**Result: access evidence advanced; D4 remains incomplete.** Johan holds the
restricted record outside this repository. No access, retention, credential or
visibility setting was changed.

## Observed audience

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
repositories using it are treated as public workspaces. The current setting must
therefore be considered in the repository disclosure decision; a private cache
token policy does not prevent this report-audience transition.
[Nx release notes, March 2026](https://nx.dev/changelog#ci-metrics-cleaner-access-control-ai-that-respects-your-git-hooks).

Before an authorized repository visibility change, the account owner must select
and verify the intended report audience. The recommendation is **Organization
members only** while historical report disclosure remains unresolved, with safe
local evidence summaries for public readers. That is a proposed treatment, not an
applied setting or owner decision. Alternatively, public report access requires
explicit clearance of its content and audience, including historical reports and
downloadable assets. Recheck actual behavior after any approved change.

Existing restricted report links can support authorized review; they must not be
presented as anonymously accessible evidence. Keep the safe local CI summaries
and exact private evidence mapping. Removing a current link would not erase
historical discussion links or provider-held reports.

## Retention evidence still required

The inspected account is on Hobby. Its workspace, membership and plan pages do
not specify retention/deletion periods. The discovered Public API exposes CI
data and organization identity, but no settings/retention operation. The official
pricing and security pages reviewed did not establish an applicable retention
schedule either. This does not prove that no provider policy exists.

Johan confirms no existing retention contract or support record is available.
Usage allowances do not establish retention terms; the provider response must
confirm applicability to this account.

Account-owner or provider evidence is still needed for:

- Pipeline/run/task metadata, terminal logs, cache artifacts, resource reports
  and self-healing data: retention period, starting event and any access-based
  renewal or plan/region exceptions.
- Expiry, deletion, backups and other retained copies: disposal timing and
  remaining access.
- Sharing and downloadable links: whether permissions are checked on access,
  whether a link independently grants access, and expiry/revocation behavior.

A provider enquiry is prepared in the restricted record and remains unsent.
Current download availability, local Nx cache pruning and GitHub Actions'
seven-day artifact setting are not evidence of Nx Cloud retention.

## Content review and acceptance boundary

The [initial review](readiness-review-status.md) downloaded and scanned 369
advertised assets at its historical snapshot. That bounded scan is retained;
this settings review neither repeats it nor clears later reports/assets. The
original D4 reference counts also remain historical, not a refreshed inventory.
Final candidate review must include the new source, hosted text and report delta.

D4 requires the account owner and maintainer to resolve the audience, retention,
sharing and content findings before accepting the bounded treatment. D4/F07 and
#22 remain open. No provider enquiry was sent, artifact deleted, access widened,
or release/visibility operation authorized by this review.
