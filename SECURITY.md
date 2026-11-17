# Security policy

## Report privately

Email **[johan@anarchitects.dev](mailto:johan@anarchitects.dev)** with the subject
`Modeling Foundation security report`. Johan Vrolix is the capability owner,
technical maintainer and initial security contact.

Include the affected commit or package version, impact, a minimal reproduction
and how to contact you. Remove credentials, customer data and unrelated private
material. Do not open a public issue or PR containing vulnerability details.
Coordinate a restricted channel before sending particularly sensitive evidence.

The maintainer will triage, agree a remediation and disclosure plan with the
reporter, and coordinate affected consumers. No response-time SLA or bug-bounty
commitment is made. Disclosure and a remediation release require the owner's
explicit decision; a fix merged privately is not a published remedy.

## Supported state

This workspace is in private development and has no published Foundation release
from this repository. Report issues against the current development revision.
Supported release lines and consumer advisories will be recorded when packages
are distributed; this policy does not promise support for unreleased contracts.

## Dependency and CI security

GitHub's centrally enforced dependency graph, Dependabot alerts and security
updates form the existing baseline. Renovate handles routine updates. Maintainers
review both streams manually and reconcile overlapping fixes; automerge is off.
An empty alert list or a green scaffold run would not establish absence of risk.

Never commit credentials. Keep the Nx shared-cache write token restricted to the
main-only environment; fork/Dependabot PRs run without it. See [CI](docs/ci.md) and
the dated [governance evidence](docs/repository-governance.md) for observed settings,
known findings and remaining verification. Reassess controls before any visibility
change. Paid security features are not enabled by this policy.
