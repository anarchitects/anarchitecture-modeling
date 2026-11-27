# Compare semantic models

Use `compareDocumentSnapshots` to compare the meaning represented by two trusted
snapshots. The operation is read-only and matches elements, members and
relationships by stable identity. A rename is a change to the same entity;
replacing its ID is a removal and addition.

The [complete example](examples/semantic-comparison.mts) shows equality, a rename,
incomplete assessment and incompatible inputs using public package imports.

## Inputs and results

Pass `contractVersion: '1'`, `scope: 'semantic-model'`, and `before` / `after`
inputs containing the snapshot, pack definitions and registered validation rules.
The contract version selects the comparison semantics, not an npm package version.
Use exact profile and pack pins. The operation does not fetch definitions or
upgrade a model into a different profile.

| Status         | Meaning and next action                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `equivalent`   | All supported semantic content in scope is equal under the selected contract.                                                    |
| `different`    | Supported semantic differences were found; inspect their paths and before/after values.                                          |
| `incomplete`   | Invalid content or unsupported coverage prevents an equivalence conclusion. Inspect diagnostics before interpreting differences. |
| `incompatible` | The request or comparison contexts cannot be compared under this contract. Align the supported scope and pins deliberately.      |

An empty difference list alone does not establish equivalence. Identical invalid
models still produce `incomplete`. Unknown extension payloads are preserved by
other APIs but are not thereby understood by comparison.

## Scope and limits

Semantic comparison includes model content and the applicable semantic context.
It excludes diagram geometry/presentation, revision guards, receipts, history,
generated baselines and host approval state. Declared unordered collections are
normalized deterministically; ordered values retain their order. No input is
mutated and no persistence or other external action occurs.

Use the result as comparison evidence. Equality does not authorize a commit,
prove a product approval, or replace an expected-revision check. To edit or persist,
use the [document workflow](README.md) and your host's concurrency and authorization
controls. Incomplete authoring checkpoints retain the same comparison limitations.
