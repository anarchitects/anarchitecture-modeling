# Versioned document codec — Archimatrix #36

> Historical contract proof adapted from [Archimatrix #36](https://github.com/anarchitects/archimatrix/issues/36) / [PR #45](https://github.com/anarchitects/archimatrix/pull/45).
> [Pinned source](https://github.com/anarchitects/archimatrix/blob/b83c78e7a70e1434a6bf9101d7bbf43467becf7f/docs/proofs/document-codec.md); original synthetic fixtures retained unchanged.
> Bare issue/PR numbers below refer to **Archimatrix**, and ADR 0002 proof numbers refer to its original ADR.
> Slice-specific future work, commands and counts describe that historical implementation, not today's workspace.
> See the [current migration record](README.md) for accepted boundaries, executed counts and Nx commands.

The public `encodeDocument` and `decodeDocument` exports in
`@anarchitects/modeling-metamodel` implement a portable, bounded internal JSON
boundary. They perform no file access, host commit, migration or registration.
The implementation starts from main `3dc8d46` (PR #44); Johan accepted #35 on
12 November 2026. Johan accepted these concrete #36 refinements on 12 November 2026.

## Envelope and version boundaries

```json
{
  "format": "archimatrix-document",
  "envelopeVersion": 1,
  "checkpoint": {
    "snapshot": {
      "model": { "formatVersion": 2 },
      "profile": {},
      "views": [],
      "constraints": [],
      "extensions": [],
      "notationBindings": [],
      "baselines": [],
      "applied": []
    },
    "commands": []
  }
}
```

This is a schematic field inventory, **not a valid complete document**. The model
must include its identity, revision, name, profile reference and all entity arrays;
the profile must include exact identity/version and pack selections. The executable
shape definition is
[`document-codec-shape.ts`](../../packages/modeling-metamodel/src/lib/document-codec-shape.ts),
corresponding to the public `DocumentCheckpoint` contracts.

Envelope version 1 defines the checkpoint encoding. Semantic model format 2 defines
the kernel vocabulary; `model.revision` guards coordinated document changes. Exact
profile, pack, contract, notation, extension and rule versions identify dependencies.
These versions serve different purposes and are never inferred from each other.

All model/view/occurrence IDs, ordered values and member groups, routes, bounds,
overrides, constraints, explicit notation bindings, generated baselines and durable
plan/command receipts are carried. Original command bodies, guarded inverses and
coordinated execution evidence survive reload. Live undo/redo stacks, installed pack
and rule registries, theme values, executable callbacks and host paths are excluded.
Historical default-rule descriptions are data-only proposal evidence, not installed
operators. Reopen with `openDocumentSession` starts empty live stacks and retains
retry receipts. No Archi storage or ArchiMate exchange compatibility is implied.

## Classification and recovery

The trusted caller supplies `DocumentContext`; no document-supplied code is loaded.
Bytes pass strict UTF-8 and bounded JSON parsing, complete nested shape validation,
current-reference checks and coordinated metadata assessment before a checkpoint is
returned. Missing pack coverage never bypasses current reference validation.

| Result                             | Meaning and host handoff                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not-decoded / corrupt`            | Invalid JSON/UTF-8, unsafe or duplicate key, lossy value, wrong field type, unknown schema field, invalid current reference, mismatched profile pins, notation binding coverage or inconsistent receipt/baseline metadata. No checkpoint. |
| `not-decoded / resource-limit`     | Input/output exceeds a documented budget, or caller attempts an invalid/raised limit. No partial checkpoint or truncation.                                                                                                                |
| `not-decoded / unsupported-format` | Unknown document identifier/version, unsupported semantic version or bare scaffold model. Preserve source; no automatic conversion.                                                                                                       |
| `decoded / valid`                  | Supported shape, current structure, coordinated metadata and available semantic/notation checks pass. Host acceptance, current revision checks and rendered accessibility remain separate.                                                |
| `decoded / invalid`                | Supported structural data has known invalid meaning, such as a wrong property value type, negative geometry or invalid notation override. Preserve for diagnosis/recovery; no edit authorization.                                         |
| `decoded / unsupported`            | Pack/rule/notation/theme coverage is missing, extensions are opaque, or lifecycle evidence is uncoordinated. Preservation does not establish validation or editability.                                                                   |

`classification` is the codec's handoff verdict. Its full `assessment` retains stage
provenance; the older aggregate assessment can label missing composition context
invalid, while the codec classifies unavailable coverage as unsupported. Known
semantic errors take precedence when they can be established. No pack coverage means
those semantics cannot yet be assessed.

Every decode result retains `source`, the **same caller-owned Uint8Array**, untouched.
The host must retain it immutably for recovery; this is not an independent byte copy.
Even oversized sources remain available without allocating a duplicate. A successful
checkpoint is detached parsed data. Saving may change whitespace, escaping, number
spelling and object-key order; original bytes remain the recovery representation.
Arrays, IDs, values and supported opaque JSON data retain meaning and order.

The encoder accepts `unknown` and applies the same shape/reference/metadata policy.
It can preserve invalid or unsupported meaning without granting edit permission.
It never silently filters extra fields; for example, a caller must construct an undo
command with its defined fields rather than spreading an edit command and retaining
an extra `edits` field. Failures return diagnostics with literal paths; the input is
unchanged. Only classified data failures are caught: programming errors in trusted
context are not mislabeled as corrupt files.

## JSON and opaque payload policy

Extension envelopes require exact pack/extension pins. Payloads may contain null,
booleans, Unicode strings, numbers, arrays and plain objects recursively. Unknown
payloads are traversed only for JSON safety and budgets; their semantics remain
unsupported, even if an extension registration exists.

- Numbers must be finite; integers must be safe IEEE-754 integers. Negative zero is
  rejected rather than normalized. A decoded decimal literal must have the same
  normalized decimal value as its JSON re-encoding; precision rounding and underflow
  are rejected. Equivalent spellings such as `1.0` and `1e0` are accepted. This is a
  JSON value preservation policy, not arbitrary-precision arithmetic.
- UTF-8 must be shortest-form valid Unicode, with no surrogate code points or invalid
  continuation bytes. Unpaired escaped UTF-16 surrogates and a leading BOM reject.
- Decoded duplicate keys reject, including escaped aliases. `__proto__`, `prototype`
  and `constructor` keys reject at every depth, including opaque payloads.
- Encoding rejects undefined, symbols, bigint, functions, class instances, Date/Map,
  cycles, sparse arrays, extra array properties, nonenumerable fields and accessors.
  It inspects own data descriptors and serializes a detached plain tree, without
  calling getters or `toJSON`. Shared acyclic values are represented as repeated
  JSON data. Host-owned encoder objects and context must not be hostile proxies;
  JavaScript reflection is not a proxy sandbox.
- Unknown fields in known envelope/checkpoint shapes reject instead of disappearing.
  New schema fields require a versioned contract decision. Opaque payload fields
  remain uninterpreted JSON data, subject only to the rules above.

## Bounded work

`DOCUMENT_CODEC_LIMITS` defines hard caps. Callers may lower individual limits using
the optional final argument; only positive safe integers at or below the caps are
accepted. Both encode and decode enforce them. JSON node/depth/string/collection
budgets cover historical receipts and opaque payloads as well as current content.

| Limit                                            |          Hard cap |
| ------------------------------------------------ | ----------------: |
| UTF-8 bytes                                      | 4 MiB (4,194,304) |
| Nesting depth, root at 0                         |                64 |
| JSON values plus object keys                     |            50,000 |
| Entries per array or object                      |             1,000 |
| UTF-16 code units per string or key              |            65,536 |
| Current elements + members + relationships       |             1,000 |
| Current occurrences across all views             |             2,000 |
| Command receipts and applied-plan receipts, each |               256 |

The byte bound is checked before decoding; parser budgets are checked while building
JSON data. Encoding counts canonical output bytes during safe cloning, before
serializing the entire document. These are bounded input/work policies, not exact
heap/time guarantees. Semantic validators can perform multiple passes within them.
The codec receipt cap is intentionally below #35's general in-memory session cap of
10,000. A host must coordinate its history policy and save limits (#37); an otherwise
valid larger session can fail encoding explicitly. No receipts are silently pruned.

## Versions and trust limits

Bare scaffold format-1 and format-2 model documents are unsupported by this codec.
The existing scaffold command is unchanged and does not yet produce envelope 1.
Unknown envelope versions or semantic model versions fail visibly with original
source retained. No upgrade route is implemented. A later migration must name source
and target versions, preview changes/loss, obtain explicit consent and preserve its
source on failure. Never wrap old content and claim migration by implication.

Current references must resolve within the model/view. Historical request and
baseline content may legitimately describe removed entities; it is checked for shape,
model scope and available lifecycle consistency rather than resolved against the
current snapshot. Removal receipts retain one review per removal and bounded,
unique dependent/resolver indexes. This does not prove that a historical reviewer
actually authorized the change. Receipt/provenance fields are untrusted assertions;
consistent data is not authentication, authorization or evidence of authorship.

## Evidence and handoff

[`document-codec.spec.ts`](../../packages/modeling-metamodel/src/lib/document-codec.spec.ts)
originally recorded 80 cases; the pinned source and migrated suite now execute
**913 cases**, including later hardening. These use public entry points to exercise two independent views, nested model references,
member constraints, exact pins, generated baselines, edit/default/undo/redo receipts,
reopen retries and opaque JSON preservation. Negative cases cover populated nested
shape mutations, broken references without pack coverage, corrupted metadata,
unknown versions, unsafe/duplicate keys, Unicode, lossy numbers, truncation, byte
mutation, all limits and nonrepresentable encoder objects.

The [built-package smoke](../../tools/proofs/foundation-smoke.mjs) also encodes/decodes a
produced session and replays its original request through emitted public exports.
Historical workspace/VSIX verification remains in the pinned source and source PR.
Current Foundation checks and counts are in the [migration record](README.md).
Archimatrix #37 owns host file access and atomic installation; #38–#40 own
lifecycle commands and desktop evidence. Their accepted outcome stays upstream.
