import type { ElementReference, ModelDocument } from './modeling-core.js';
import type {
  DiagramView,
  ViewDiagnostic,
  ViewDiagnosticCode,
  ViewOccurrence,
  ViewPoint,
} from './views.js';

/** Checks typed view structure/references only; not model semantics or imported JSON. */
export function validateViews(
  model: ModelDocument,
  views: readonly DiagramView[],
): readonly ViewDiagnostic[] {
  const diagnostics: ViewDiagnostic[] = [];
  const viewIds = new Set<string>();
  for (const [viewIndex, view] of views.entries()) {
    function report(
      code: ViewDiagnosticCode,
      path: readonly (string | number)[],
      message: string,
      occurrence?: ViewOccurrence,
    ) {
      diagnostics.push({
        code,
        severity: 'error',
        message,
        location: {
          modelId: view.modelId,
          viewId: view.id,
          viewIndex,
          ...(occurrence && { occurrenceId: occurrence.id }),
          path,
        },
        ...(occurrence && { semanticTarget: occurrence.target }),
      });
    }
    if (!view.id.trim())
      report('view.invalid-identity', ['id'], 'Supply a nonblank view ID.');
    if (viewIds.has(view.id))
      report(
        'view.duplicate-id',
        ['id'],
        'Assign a unique view ID within this model.',
      );
    viewIds.add(view.id);
    if (view.modelId !== model.id)
      report(
        'view.foreign-model',
        ['modelId'],
        'Supply the semantic model referenced by this view.',
      );
    for (const collection of ['elements', 'connectors'] as const) {
      const ids = new Set<string>();
      view[collection].forEach((occurrence, index) => {
        const path = [collection, index];
        if (!occurrence.id.trim())
          report(
            'view.invalid-identity',
            [...path, 'id'],
            'Supply a nonblank occurrence ID.',
            occurrence,
          );
        if (ids.has(occurrence.id))
          report(
            'view.duplicate-id',
            [...path, 'id'],
            'Assign a unique occurrence ID within this view and kind.',
            occurrence,
          );
        ids.add(occurrence.id);
        if (!occurrence.accessibility.label.trim())
          report(
            'view.missing-accessible-label',
            [...path, 'accessibility', 'label'],
            'Provide a nonblank accessible text label.',
            occurrence,
          );
        if (occurrence.target.modelId !== model.id) {
          report(
            'view.foreign-model',
            [...path, 'target'],
            'Reference a semantic target in this model.',
            occurrence,
          );
        } else {
          const entities =
            occurrence.kind === 'element-occurrence'
              ? model.elements
              : model.relationships;
          const matches = entities.filter(
            (entity) => entity.id === occurrence.target.id,
          );
          if (matches.length !== 1)
            report(
              matches.length
                ? 'view.ambiguous-semantic-target'
                : 'view.missing-semantic-target',
              [...path, 'target'],
              'Restore one semantic target or explicitly retarget/remove the occurrence.',
              occurrence,
            );
        }
        if (occurrence.kind === 'element-occurrence') {
          const bounds = occurrence.bounds;
          if (
            !finitePoint(bounds) ||
            !Number.isFinite(bounds.width) ||
            !Number.isFinite(bounds.height) ||
            bounds.width <= 0 ||
            bounds.height <= 0
          )
            report(
              'view.invalid-geometry',
              [...path, 'bounds'],
              'Use finite coordinates and positive finite width/height.',
              occurrence,
            );
        } else {
          occurrence.waypoints.forEach((point, waypoint) => {
            if (!finitePoint(point))
              report(
                'view.invalid-geometry',
                [...path, 'waypoints', waypoint],
                'Use finite waypoint coordinates.',
                occurrence,
              );
          });
          const relationships = model.relationships.filter(
            (relation) =>
              relation.id === occurrence.target.id &&
              occurrence.target.modelId === model.id,
          );
          const relation =
            relationships.length === 1 ? relationships[0] : undefined;
          for (const endpoint of ['source', 'destination'] as const) {
            const reference = occurrence[endpoint];
            const matches = view.elements.filter(
              (element) => element.id === reference.id,
            );
            if (
              reference.view.modelId !== view.modelId ||
              reference.view.id !== view.id ||
              matches.length !== 1
            ) {
              report(
                'view.invalid-endpoint',
                [...path, endpoint],
                'Select exactly one element occurrence in this same view.',
                occurrence,
              );
            } else if (
              relation &&
              !sameElement(
                matches[0].target,
                endpoint === 'source' ? relation.source : relation.target,
              )
            ) {
              report(
                'view.endpoint-mismatch',
                [...path, endpoint],
                'Select an occurrence of the corresponding semantic relation endpoint; layout cannot reverse or retarget the relation.',
                occurrence,
              );
            }
          }
        }
      });
    }
  }
  return diagnostics;
}

function finitePoint(point: ViewPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function sameElement(a: ElementReference, b: ElementReference): boolean {
  return a.kind === b.kind && a.modelId === b.modelId && a.id === b.id;
}
