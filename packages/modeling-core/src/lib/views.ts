import type {
  ConnectorOccurrenceId,
  ElementOccurrenceId,
  ModelId,
  ViewId,
} from './identity.js';
import type {
  ElementReference,
  RelationshipReference,
} from './modeling-core.js';

export interface ViewReference {
  readonly modelId: ModelId;
  readonly id: ViewId;
}

export interface ElementOccurrenceReference {
  readonly kind: 'element-occurrence';
  readonly view: ViewReference;
  readonly id: ElementOccurrenceId;
}

/** Abstract view units, not pixels or a host coordinate system. */
export interface ViewPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewBounds extends ViewPoint {
  readonly width: number;
  readonly height: number;
}

/** Opaque presentation IDs/tokens. Their vocabulary and permissions belong to notation. */
export interface PresentationOverrides {
  readonly shape?: string;
  readonly icon?: string;
  readonly fillToken?: string;
  readonly strokeToken?: string;
  readonly textToken?: string;
  readonly lineStyle?: string;
  readonly sourceMarker?: string;
  readonly targetMarker?: string;
}

export interface OccurrenceAccessibility {
  /** Plain text, never executable markup; hosts expose it without relying on color. */
  readonly label: string;
  readonly description?: string;
}

export interface ElementOccurrence {
  readonly kind: 'element-occurrence';
  readonly id: ElementOccurrenceId;
  readonly target: ElementReference;
  readonly bounds: ViewBounds;
  readonly overrides: PresentationOverrides;
  readonly accessibility: OccurrenceAccessibility;
}

export interface ConnectorOccurrence {
  readonly kind: 'connector-occurrence';
  readonly id: ConnectorOccurrenceId;
  readonly target: RelationshipReference;
  /** Same-view occurrences, in the semantic relation's source/target direction. */
  readonly source: ElementOccurrenceReference;
  readonly destination: ElementOccurrenceReference;
  /** Intermediate routing points only; attachment points are a renderer concern. */
  readonly waypoints: readonly ViewPoint[];
  readonly overrides: PresentationOverrides;
  readonly accessibility: OccurrenceAccessibility;
}

export type ViewOccurrence = ElementOccurrence | ConnectorOccurrence;

/** Scoped to the DiagramView supplied to a lookup, never a JavaScript object identity. */
export type ViewOccurrenceIdentity =
  | Pick<ElementOccurrence, 'kind' | 'id'>
  | Pick<ConnectorOccurrence, 'kind' | 'id'>;

/** Separate from ModelDocument: removing layout cannot remove semantic entities. */
export interface DiagramView {
  readonly id: ViewId;
  readonly modelId: ModelId;
  readonly name: string;
  readonly elements: readonly ElementOccurrence[];
  readonly connectors: readonly ConnectorOccurrence[];
}

export type ViewDiagnosticCode =
  | 'view.duplicate-id'
  | 'view.invalid-identity'
  | 'view.foreign-model'
  | 'view.missing-semantic-target'
  | 'view.ambiguous-semantic-target'
  | 'view.invalid-endpoint'
  | 'view.endpoint-mismatch'
  | 'view.invalid-geometry'
  | 'view.missing-accessible-label';

/** Extensible location envelope for integration into #17; no host-specific messages. */
export interface ViewDiagnostic<Code extends string = ViewDiagnosticCode> {
  readonly code: Code;
  readonly severity: 'error';
  readonly message: string;
  readonly location: {
    readonly modelId: ModelId;
    readonly viewId: ViewId;
    /** Present when checking a collection, to locate a duplicate view ID. */
    readonly viewIndex?: number;
    readonly occurrenceId?: ElementOccurrenceId | ConnectorOccurrenceId;
    /** Segments relative to the supplied view, including indexes to disambiguate duplicate IDs. */
    readonly path: readonly (string | number)[];
  };
  readonly semanticTarget?: ElementReference | RelationshipReference;
}
