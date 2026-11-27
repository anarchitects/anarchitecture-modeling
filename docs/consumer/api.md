# Public API reference

The package-root exports below are the current development contract. Runtime
functions/constants can be imported as values; TypeScript-only names require
`import type` when used with verbatim module syntax. The packed declarations are
the precise signatures and discriminated result shapes. No internal module path
is a public entry. See the [consumer guide](README.md) for compatibility, limits
and release status, and the [compiled example](examples/lifecycle.mts) for usage.

See the [semantic comparison contract](comparison.md) for its supported scope. Incremental authoring is an
**unreleased opt-in addition**; see the [authoring guide](authoring.md) and
[executable example](examples/incremental-authoring.mts). Strict APIs retain their
valid-only guarantees.

## Choose an operation

| Need                          | Public entry points / types                                                                                             | Contract boundary                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Create identities/model       | Core `createModel`, `create*Id`, `createModelRevision`, `ModelDocument`                                                 | Caller-supplied nonblank identity; no I/O or uniqueness service                                  |
| Validate structure/references | Core `validateModelStructure`, `validateModelReference`, `validateModelValue`                                           | Tagged structure, local references, containment/ownership; no method interpretation              |
| Model independent views       | Core `DiagramView`, `ViewOccurrence`, `validateViews`                                                                   | Layout/occurrence data; no renderer                                                              |
| Describe low-level changes    | Core `ModelChange`, `InverseModelChange`, `PropertyState`                                                               | Data contracts; core exports no transaction executor                                             |
| Find a pack descriptor        | `resolveModelingPack`, `ModelingPack`                                                                                   | Descriptor lookup; use composition for complete profile compatibility                            |
| Compose exact profiles        | `composeModelingProfile`, `resolveTypeDefinition`, `packReference`                                                      | Exact registry/pins, explicit collisions/dependencies; no dynamic loader                         |
| Inspect extensions            | `inspectExtensionSupport`, `ExtensionEnvelope`                                                                          | Preserve opaque payload; support availability is not semantic validation                         |
| Validate semantics            | `validateModel`, `ModelValidationResult`, `MEMBER_GROUP_OPERATOR`                                                       | Inspect invalid/unsupported and coverage/provenance, not just diagnostics length                 |
| Compare semantic snapshots    | `compareDocumentSnapshots`, `SemanticComparisonRequest`, `SemanticComparisonResult`                                     | Contract 1 / semantic-model scope; explicit incomplete/incompatible evidence; no write authority |
| Assess notation               | `validateOccurrenceNotation`, `resolveOccurrenceNotation`                                                               | Contract/theme resolution; accessibility remains host-verified                                   |
| Propose/apply defaults        | `proposeDefaultPlan`, `generatedMemberIdentity`, `applyChangePlan`, `DEFAULTS_OPERATOR`                                 | Bounded explicit rule batch, baseline comparisons, exact retry; no rule cascade                  |
| Assess document               | `assessDocument`, `DocumentCheckpoint`, `DocumentContext`                                                               | Trusted registries plus semantic/view/notation/lifecycle assessment                              |
| Review deletion               | `inspectDocumentDeletion`, `reviewDeletion`, `DeletionReview`                                                           | Review dependents and resolving operations; no implicit cascade                                  |
| Prepare authored changes      | `prepareSemanticCommand`, `prepareViewCommand`                                                                          | Candidate checkpoint or rejection/replay, never durable commit                                   |
| Coordinate history            | `openDocumentSession`, `prepareSessionCommand`, `inspectDocumentReversal`, `pruneDocumentHistory`, `historyDiagnostics` | Guarded live stacks with durable retry receipts; reopen does not restore stacks                  |
| Encode/decode                 | `encodeDocument`, `decodeDocument`, `DOCUMENT_CODEC_LIMITS`                                                             | Bounded envelope 1/model format 2, explicit classification and original recovery bytes           |
| Integrate persistence         | `DocumentCommitPort`                                                                                                    | Interface only; host implements authorization, concurrency and atomic storage                    |

Methods accepting typed models/checkpoints expect trusted typed input. Use the
codec at a byte boundary, then inspect its classification/assessment and apply host
policy. Constructors, type assertions, registry names and `openDocumentSession`
are not arbitrary-data parsers or authorization checks. In particular,
`DocumentLoadResult` is a minimal handoff type; `DocumentDecodeResult` carries
classification, assessment and recovery bytes needed by a real load flow.

## Complete export inventory

These lists are checked against the extracted package declarations by the packed
example verification. They distinguish exported names from implemented features:
interfaces such as `DocumentCommitPort` do not install implementations. Counts
cover root exports only; `package.json` is a separate metadata subpath.

### Core runtime (13)

<!-- exports:modeling-core:runtime -->

```text
createConnectorOccurrenceId
createElementId
createElementOccurrenceId
createMemberId
createModel
createModelId
createModelRevision
createRelationshipId
createViewId
validateModelReference
validateModelStructure
validateModelValue
validateViews
```

### Core types (41)

<!-- exports:modeling-core:types -->

```text
ConnectorOccurrence
ConnectorOccurrenceId
DiagramView
ElementId
ElementOccurrence
ElementOccurrenceId
ElementOccurrenceReference
ElementReference
InverseModelChange
MemberId
MemberReference
MemberReferenceGroup
ModelChange
ModelDiagnostic
ModelDiagnosticLocation
ModelDocument
ModelElement
ModelEntityReference
ModelId
ModelMember
ModelProfile
ModelProperties
ModelReference
ModelRelationship
ModelRevision
ModelValue
OccurrenceAccessibility
PresentationOverrides
PropertyState
PropertySubject
RelationshipId
RelationshipReference
StructuralValidationResult
ViewBounds
ViewDiagnostic
ViewDiagnosticCode
ViewId
ViewOccurrence
ViewOccurrenceIdentity
ViewPoint
ViewReference
```

### Metamodel runtime (41)

<!-- exports:modeling-metamodel:runtime -->

```text
AUTHORING_ENVELOPE_FORMAT
AUTHORING_ENVELOPE_VERSION
AUTHORING_POLICY_CONTRACT_VERSION
DEFAULTS_OPERATOR
DEFAULT_DOCUMENT_HISTORY_POLICY
DOCUMENT_CODEC_LIMITS
DOCUMENT_ENVELOPE_FORMAT
DOCUMENT_ENVELOPE_VERSION
MEMBER_GROUP_OPERATOR
METAMODEL_CONTRACT_VERSION
PROFILE_DIMENSIONS
SEMANTIC_COMPARISON_CONTRACT_VERSION
applyChangePlan
assessAuthoringCheckpoint
assessDocument
compareDocumentSnapshots
composeModelingProfile
decodeAuthoringDocument
decodeDocument
encodeAuthoringDocument
encodeDocument
generatedMemberIdentity
historyDiagnostics
inspectDocumentDeletion
inspectDocumentReversal
inspectExtensionSupport
openDocumentSession
packReference
prepareAuthoringCommand
prepareAuthoringImport
prepareSemanticCommand
prepareSessionCommand
prepareViewCommand
proposeDefaultPlan
pruneDocumentHistory
resolveModelingPack
resolveOccurrenceNotation
resolveTypeDefinition
reviewDeletion
validateModel
validateOccurrenceNotation
```

### Metamodel types (104)

<!-- exports:modeling-metamodel:types -->

```text
AppliedChangeRecord
ApplyPlanResult
AuthoringAssessment
AuthoringBinding
AuthoringCheckpoint
AuthoringCommand
AuthoringCommitPort
AuthoringContext
AuthoringDecodeResult
AuthoringDeficiency
AuthoringEncodeResult
AuthoringPolicy
AuthoringSession
Cardinality
ChangeContext
ChangeDiagnostic
ChangeOrigin
ChangePlan
ChangeSnapshot
ChangeSource
ChangeState
ChangeTarget
ComposedModelingProfile
ConstraintBinding
ConstraintDefinition
ConstraintInstance
ConstraintReference
DefaultProposalInput
DefaultRule
DeletionReview
DocumentAssessment
DocumentBaselineChange
DocumentCheckpoint
DocumentCodecDiagnostic
DocumentCodecFailure
DocumentCodecLimits
DocumentCommand
DocumentCommandIdentity
DocumentCommandReceipt
DocumentCommitPort
DocumentContext
DocumentDecodeResult
DocumentDeletionImpact
DocumentDiagnostic
DocumentEdit
DocumentEncodeResult
DocumentEnvelope
DocumentExecution
DocumentHistoryPolicy
DocumentLoadResult
DocumentLocation
DocumentReversalPreview
DocumentSession
DocumentSnapshot
EndpointRoleDefinition
ExtensionDefinition
ExtensionEnvelope
ExtensionSupport
GeneratedBaseline
GenerationComparison
GenerationOrigin
HostTheme
MemberRoleDefinition
MetamodelDiagnostic
MetamodelResult
ModelValidationInput
ModelValidationResult
ModelingPack
ModelingPackDefinition
ModelingProfileDefinition
NamespacedId
NotationAccessibility
NotationDefinition
NotationDiagnostic
NotationDiagnosticCode
NotationReference
NotationResult
NotationValidationResult
OccurrenceNotationBinding
OccurrenceNotationInput
PackReference
PrepareAuthoringResult
PrepareDocumentResult
PrepareSessionResult
ProfileDimension
PropertyDefinition
ProposalResult
ReferenceTarget
RuleReference
SemanticComparisonDiagnostic
SemanticComparisonEvidence
SemanticComparisonInput
SemanticComparisonRequest
SemanticComparisonResult
SemanticComparisonValue
SemanticDifference
TypeDefinition
TypeKind
TypeReference
ValidationDiagnostic
ValidationProvenance
ValidationReporter
ValidationRuleRegistration
ValueDefinition
```

## Incremental authoring

`prepareAuthoringImport` explicitly adopts a supported checkpoint with a guarded
empty edit and fresh revision. `prepareAuthoringCommand` accepts existing document
commands plus an exact admission binding; `assessAuthoringCheckpoint` separates
strict assessment from complete/incomplete/blocked admission. Use the distinct
`PrepareAuthoringResult`, `AuthoringSession` and `AuthoringCommitPort` family.
`decodeAuthoringDocument` and `encodeAuthoringDocument` use a separate envelope
and the existing codec limits. See [the guide](authoring.md) for all invariants,
recovery, authorized selection and migration restrictions.
