# Incremental authoring

Incremental authoring is opt-in. Existing strict APIs and the comparison contract retain
their behavior. The [executable example](examples/incremental-authoring.mts)
shows Customer created without its definition and owner, completed in a subsequent
command, and undone to an admitted incomplete state.

Supply `AuthoringContext` with a trusted, host-authorized `AuthoringPolicy` and the
normal document context. Each policy selector names an exact profile, pack, type
and required top-level scalar property. Only actual absence may be deferred.
Wrong values, unknown properties, nested missing fields, mandatory constraints,
invalid references, unsupported coverage and invalid lifecycle metadata still block.
Policy definitions cannot contain scripts, wildcards, overrides or unknown fields.

Call `prepareAuthoringImport` with a new empty edit and a fresh revision to adopt
an existing supported checkpoint explicitly. It preserves its receipt chain and
records an import boundary. Continue with `prepareAuthoringCommand`, passing the
checkpoint's exact binding along with the ordinary command. Reuse deletion review,
expected-value guards, defaults and undo/redo commands. Import and pre-import
transactions are not part of live authoring history.

A successful result is `authoring-prepared`. Read `assessment.admission` separately
from `assessment.assessment.status`: an admitted incomplete model remains
semantically invalid. `complete` means all strict requirements currently pass;
it grants no product approval. The host's `AuthoringCommitPort` must atomically
recheck the current revision, exact binding and server authorization, then persist
candidate and receipts together. A changed policy or same-pin definition requires
an explicit future migration; this version does not switch automatically.

Exact retry yields `authoring-replayed`, a historical receipt, even after undo.
Do not reinstall its old checkpoint or reapply its effect. Caller identity strings,
policy pins and equality keys authenticate nobody. Model/definition input to typed
APIs is trusted; imported bytes must pass the codec boundary first.

Use `encodeAuthoringDocument` / `decodeAuthoringDocument`. The separate format
`anarchitects-authoring-document`, envelope version 1, preserves model format 2,
the policy/context equality binding, import identity and all durable receipts.
Existing `DOCUMENT_CODEC_LIMITS` bound the entire document; no hidden resource
budget is added. New readers recompute assessment with caller-owned context and
open empty undo/redo stacks. Unavailable/future policies are recoverable but blocked
for fresh edits. Unknown envelopes preserve their original bytes. Old readers
reject the new format; they must retain those bytes rather than overwrite them.

`definitionKey` is deterministic equality evidence containing definition data,
not a cryptographic signature. Use only definitions suitable for the destination
artifact. Completion does not downgrade the envelope; no bridge to legacy hosts
or automatic policy migration is provided. Admission deficiencies are ordered by
stable entity/property identity; the retained strict assessment keeps its existing
input-relative diagnostic paths. Comparing semantically invalid drafts still
returns `incomplete`, even when their content is identical.
