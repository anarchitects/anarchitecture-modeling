import {
  createModel,
  createModelRevision,
  createElementId,
  createMemberId,
  createRelationshipId,
  createViewId,
  createElementOccurrenceId,
  createConnectorOccurrenceId,
  type ElementReference,
  type MemberReference,
  type ModelProperties,
} from '@anarchitects/modeling-core';
import {
  assessDocument,
  prepareSemanticCommand,
  inspectDocumentDeletion,
  MEMBER_GROUP_OPERATOR,
  type DocumentCheckpoint,
  type DocumentContext,
  type DocumentCommand,
  type DocumentEdit,
  type DeletionReview,
  type PrepareDocumentResult,
  type PropertyDefinition,
} from '../index.js';

function fixture() {
  const empty = createModel('commands', 'Command proof', {
    id: 'proof',
    version: '1',
  });
  const pin = { id: 'proof', version: '1', contractVersion: '1' };
  const node = {
    pack: pin,
    kind: 'element' as const,
    id: 'proof:node' as const,
  };
  const field = {
    pack: pin,
    kind: 'member' as const,
    id: 'proof:field' as const,
  };
  const a: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('a'),
  };
  const b: ElementReference = { ...a, id: createElementId('b') };
  const m: MemberReference = {
    kind: 'member',
    modelId: empty.id,
    id: createMemberId('m'),
  };
  const n: MemberReference = { ...m, id: createMemberId('n') };
  const required = {
    'proof:required': { kind: 'scalar' as const, value: 'kept' },
  };
  const links: ModelProperties = {
    'proof:links': {
      kind: 'list',
      items: [
        {
          kind: 'record',
          fields: { 'proof:target': { kind: 'reference', value: m } },
        },
      ],
    },
  };
  const group = { pack: pin, id: 'proof:group' as const };
  const rule = {
    id: 'proof:group-check' as const,
    version: '1',
    operator: MEMBER_GROUP_OPERATOR,
  };
  const model = {
    ...empty,
    elements: [
      {
        id: a.id,
        type: node.id,
        name: 'A',
        container: { kind: 'model' as const, id: empty.id },
        properties: required,
      },
      {
        id: b.id,
        type: node.id,
        name: 'B',
        container: a,
        properties: { ...required, ...links },
      },
    ],
    members: [
      { id: m.id, type: field.id, name: 'M', owner: a, properties: {} },
      { id: n.id, type: field.id, name: 'N', owner: b, properties: links },
    ],
    relationships: [
      {
        id: createRelationshipId('r'),
        type: 'proof:link',
        source: a,
        target: b,
        properties: {
          'proof:note': { kind: 'scalar' as const, value: 'edge' },
          ...links,
        },
      },
    ],
  };
  const common: PropertyDefinition[] = [
    {
      id: 'proof:note',
      required: false,
      value: { kind: 'scalar', valueType: 'string' },
    },
    {
      id: 'proof:links',
      required: false,
      value: {
        kind: 'list',
        cardinality: { min: 0, max: null },
        items: {
          kind: 'record',
          fields: [
            {
              id: 'proof:target',
              required: true,
              value: {
                kind: 'reference',
                target: { kind: 'member', types: [field] },
              },
            },
          ],
        },
      },
    },
  ];
  const context: DocumentContext = {
    packs: [
      {
        ...pin,
        displayName: 'Synthetic command schema',
        implementation: 'scaffold',
        dimensions: ['method'],
        requires: [],
        conflicts: [],
        extensions: [],
        constraints: [
          {
            id: group.id,
            mandatory: false,
            rule,
            roles: [
              {
                id: 'proof:fields',
                ordered: true,
                distinct: true,
                cardinality: { min: 1, max: 2 },
                memberTypes: [field],
              },
            ],
          },
        ],
        types: [
          {
            kind: 'element',
            id: node.id,
            properties: [
              ...common,
              {
                id: 'proof:required',
                required: true,
                value: { kind: 'scalar', valueType: 'string' },
              },
            ],
            constraints: [group],
          },
          {
            kind: 'member',
            id: field.id,
            owners: [node],
            properties: common,
            constraints: [],
          },
          {
            kind: 'relationship',
            id: 'proof:link',
            properties: common,
            constraints: [],
            endpointPairs: [
              {
                source: { role: 'proof:source', types: [node] },
                target: { role: 'proof:target', types: [node] },
              },
            ],
          },
          {
            kind: 'element',
            id: 'proof:other',
            properties: [],
            constraints: [],
          },
        ],
      },
    ],
    validationRules: [{ pack: pin, rule }],
    defaultRules: [],
    notations: [],
    theme: { id: 'host', tokens: { paper: '#fff', ink: '#111' } },
  };
  const notation = (
    kind: 'element' | 'relationship',
    id: 'proof:node' | 'proof:link',
  ) => ({
    reference: { pack: pin, id: `${id}-notation` as const, version: '1' },
    type: { pack: pin, kind, id },
    defaults:
      kind === 'element'
        ? {
            shape: 'box',
            fillToken: 'paper',
            strokeToken: 'ink',
            textToken: 'ink',
          }
        : {
            lineStyle: 'line',
            targetMarker: 'arrow',
            strokeToken: 'ink',
            textToken: 'ink',
          },
    allowedOverrides: {},
    accessibility: {
      labelRequired: true as const,
      nonColorCueRequired: true as const,
      minimumTextContrast: 4.5,
      minimumGraphicContrast: 3,
    },
  });
  const notations = [
    notation('element', 'proof:node'),
    notation('relationship', 'proof:link'),
  ];
  const views = ['overview', 'detail'].map((id) => {
    const view = { modelId: model.id, id: createViewId(id) };
    const elements = [a, b].map((target, i) => ({
      kind: 'element-occurrence' as const,
      id: createElementOccurrenceId(`o${i}`),
      target,
      bounds: { x: i * 200, y: 0, width: 100, height: 50 },
      overrides: {},
      accessibility: { label: target.id },
    }));
    return {
      ...view,
      name: id,
      elements,
      connectors: [
        {
          kind: 'connector-occurrence' as const,
          id: createConnectorOccurrenceId('edge'),
          target: {
            kind: 'relationship' as const,
            modelId: model.id,
            id: model.relationships[0].id,
          },
          source: {
            kind: 'element-occurrence' as const,
            view,
            id: elements[0].id,
          },
          destination: {
            kind: 'element-occurrence' as const,
            view,
            id: elements[1].id,
          },
          waypoints: [],
          overrides: {},
          accessibility: { label: 'Link' },
        },
      ],
    };
  });
  const checkpoint: DocumentCheckpoint = {
    snapshot: {
      model,
      profile: {
        ...model.profile,
        selections: [{ dimension: 'method', pack: pin }],
      },
      views,
      constraints: [
        {
          subject: a,
          instance: {
            definition: group,
            parameters: {},
            roles: [{ role: 'proof:fields', group: { members: [m] } }],
          },
        },
      ],
      extensions: [],
      baselines: [],
      applied: [],
      notationBindings: views.flatMap((view) =>
        [...view.elements, ...view.connectors].map((o) => ({
          view: { modelId: model.id, id: view.id },
          occurrence:
            o.kind === 'element-occurrence'
              ? { kind: o.kind, id: o.id }
              : { kind: o.kind, id: o.id },
          notation:
            notations[o.kind === 'element-occurrence' ? 0 : 1].reference,
        })),
      ),
    },
    commands: [],
  };
  return {
    checkpoint,
    context: { ...context, notations },
    a,
    b,
    m,
    n,
    required,
  };
}
function command(
  checkpoint: DocumentCheckpoint,
  edits: readonly DocumentEdit[],
  deletionReviews: readonly DeletionReview[] = [],
): DocumentCommand {
  return {
    kind: 'edit',
    id: `command-${checkpoint.commands.length}`,
    actor: 'author',
    source: { id: 'review', revision: '1' },
    modelId: checkpoint.snapshot.model.id,
    expectedRevision: checkpoint.snapshot.model.revision,
    nextRevision: createModelRevision(
      `revision-${checkpoint.commands.length + 1}`,
    ),
    edits,
    deletionReviews,
  };
}
function prepared(result: PrepareDocumentResult) {
  if (result.status !== 'prepared') throw new Error(JSON.stringify(result));
  return result;
}
function rejected(result: PrepareDocumentResult, code?: string) {
  expect(result.status).toBe('rejected');
  expect(result).not.toHaveProperty('candidate');
  if (result.status !== 'rejected') throw new Error('Expected rejection');
  if (code) expect(result.diagnostics.map((d) => d.code)).toContain(code);
  return result;
}
function rename(f: ReturnType<typeof fixture>): DocumentEdit {
  return { kind: 'rename', target: f.a, expected: 'A', value: 'Authored' };
}

/** A test-owned review UI for an explicit remove-everything batch; never auto-adds operations. */
function fullRemovalReview(
  cp: DocumentCheckpoint,
  edits: readonly DocumentEdit[],
): DeletionReview[] {
  return edits.map((edit, operationIndex) => ({
    operationIndex,
    dependents: inspectDocumentDeletion(cp.snapshot, edit).dependents.map(
      (location) => {
        const resolver = edits.findIndex((other) => {
          if (location.section === 'constraints')
            return (
              other.kind === 'remove-constraint' &&
              other.expected ===
                cp.snapshot.constraints[Number(location.path[0])]
            );
          if (location.section === 'views')
            return (
              other.kind === 'remove-view' &&
              other.expected.id ===
                cp.snapshot.views[Number(location.path[0])].id
            );
          if (location.section === 'notationBindings')
            return (
              other.kind === 'remove-view' &&
              other.expected.id ===
                cp.snapshot.notationBindings[Number(location.path[0])].view.id
            );
          if (location.section === 'model') {
            const key = location.path[0] as
              | 'elements'
              | 'members'
              | 'relationships';
            const target = cp.snapshot.model[key][Number(location.path[1])];
            return (
              other.kind ===
                `remove-${key === 'elements' ? 'element' : key === 'members' ? 'member' : 'relationship'}` &&
              'expected' in other &&
              typeof other.expected === 'object' &&
              'id' in other.expected &&
              other.expected.id === target.id
            );
          }
          return false;
        });
        if (resolver < 0)
          throw new Error('The authored batch omitted an explicit cleanup');
        return { location, resolvedBy: [resolver] };
      },
    ),
  }));
}

describe('atomic authored semantic commands', () => {
  it('assesses exact semantics, constraints and every occurrence before editing', () => {
    const f = fixture();
    expect(assessDocument(f.checkpoint, f.context)).toMatchObject({
      status: 'valid',
      lifecycle: 'valid',
      views: [],
      diagnostics: [],
    });
  });
  it('creates related elements, members, relationships and bindings in any declaration order', () => {
    const f = fixture();
    const model = f.checkpoint.snapshot.model;
    const c = { ...f.a, id: createElementId('c') };
    const member = {
      id: createMemberId('new-field'),
      type: 'proof:field',
      name: 'Field',
      owner: c,
      properties: {},
    };
    const constraint = {
      ...f.checkpoint.snapshot.constraints[0],
      subject: c,
      instance: {
        ...f.checkpoint.snapshot.constraints[0].instance,
        roles: [
          {
            role: 'proof:fields' as const,
            group: { members: [{ ...f.m, id: member.id }] },
          },
        ],
      },
    };
    const edits: DocumentEdit[] = [
      { kind: 'add-constraint', value: constraint },
      {
        kind: 'create-relationship',
        value: {
          ...model.relationships[0],
          id: createRelationshipId('new-link'),
          target: c,
        },
      },
      { kind: 'create-member', value: member },
      {
        kind: 'create-element',
        value: { ...model.elements[0], id: c.id, name: 'C' },
      },
    ];
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, edits),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.model.elements.map((e) => e.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(result.candidate.commands[0].inverse?.map((e) => e.kind)).toEqual([
      'remove-element',
      'remove-member',
      'remove-relationship',
      'remove-constraint',
    ]);
    expect(f.checkpoint.snapshot.model.elements).toHaveLength(2);
  });
  it('renames elements and members and composes disjoint property edits with guarded inverse provenance', () => {
    const f = fixture();
    const request = command(f.checkpoint, [
      rename(f),
      { kind: 'rename', target: f.m, expected: 'M', value: 'Member renamed' },
      {
        kind: 'set-property',
        target: f.a,
        property: 'proof:note',
        expected: { present: false },
        value: { present: true, value: { kind: 'scalar', value: 'note' } },
      },
    ]);
    const before = JSON.stringify(f.checkpoint);
    const result = prepared(
      prepareSemanticCommand(f.checkpoint, request, f.context),
    );
    expect(result.candidate.snapshot.model.elements[0]).toMatchObject({
      name: 'Authored',
      properties: { 'proof:note': { value: 'note' } },
    });
    expect(result.candidate.snapshot.model.members[0].name).toBe(
      'Member renamed',
    );
    expect(result.candidate.snapshot.constraints).toEqual(
      f.checkpoint.snapshot.constraints,
    );
    expect(result.candidate.snapshot.views).toEqual(
      f.checkpoint.snapshot.views,
    );
    expect(result.candidate.commands[0]).toMatchObject({
      command: { actor: 'author', source: { id: 'review', revision: '1' } },
      inverse: [
        { kind: 'set-property', value: { present: false } },
        { kind: 'rename', expected: 'Member renamed', value: 'M' },
        { kind: 'rename', expected: 'Authored', value: 'A' },
      ],
    });
    expect(JSON.stringify(f.checkpoint)).toBe(before);
  });
  it('updates and removes relationship properties explicitly with exact presence guards', () => {
    const f = fixture();
    const relation = f.checkpoint.snapshot.model.relationships[0];
    const target = {
      kind: 'relationship' as const,
      modelId: f.a.modelId,
      id: relation.id,
    };
    const update: DocumentEdit = {
      kind: 'set-property',
      target,
      property: 'proof:note',
      expected: { present: true, value: relation.properties['proof:note'] },
      value: { present: true, value: { kind: 'scalar', value: 'changed' } },
    };
    const first = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [update]),
        f.context,
      ),
    ).candidate;
    const removal: DocumentEdit = {
      ...update,
      expected: { present: true, value: { kind: 'scalar', value: 'changed' } },
      value: { present: false },
    };
    const last = prepared(
      prepareSemanticCommand(first, command(first, [removal]), f.context),
    ).candidate;
    expect(last.snapshot.model.relationships[0].properties).not.toHaveProperty(
      'proof:note',
    );
    expect(last.commands.at(-1)?.inverse).toEqual([
      { ...removal, expected: { present: false }, value: removal.expected },
    ]);
  });
  it('rejects removing required properties and preserves all coordinated input', () => {
    const f = fixture();
    const before = JSON.stringify(f.checkpoint);
    const r = rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            kind: 'set-property',
            target: f.a,
            property: 'proof:required',
            expected: { present: true, value: f.required['proof:required'] },
            value: { present: false },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(r.assessment?.semantics.status).toBe('invalid');
    expect(JSON.stringify(f.checkpoint)).toBe(before);
  });
  it('rejects invalid endpoint types and view mismatch while allowing explicit connector cleanup', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const rel = s.model.relationships[0];
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            kind: 'replace-relationship',
            expected: rel,
            value: { ...rel, target: f.a },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    const removals: DocumentEdit[] = s.views.map((view) => ({
      kind: 'remove-occurrence',
      view: { modelId: view.modelId, id: view.id },
      expected: view.connectors[0],
      expectedNotation: s.notationBindings.filter(
        (b) =>
          b.view.id === view.id && b.occurrence.kind === 'connector-occurrence',
      )[0].notation,
    }));
    const edits: DocumentEdit[] = [
      {
        kind: 'replace-relationship',
        expected: rel,
        value: { ...rel, target: f.a },
      },
      ...removals,
    ];
    const reviews: DeletionReview[] = removals.map((edit, i) => ({
      operationIndex: i + 1,
      dependents: inspectDocumentDeletion(s, edit).dependents.map(
        (location) => ({ location, resolvedBy: [i + 1] }),
      ),
    }));
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, edits, reviews),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.model.relationships[0].target).toEqual(
      f.a,
    );
    expect(
      result.candidate.snapshot.views.every((v) => v.connectors.length === 0),
    ).toBe(true);
    const other = { ...f.a, id: createElementId('other') };
    const invalid = [
      {
        kind: 'create-element' as const,
        value: {
          id: other.id,
          type: 'proof:other',
          name: 'Other',
          container: { kind: 'model' as const, id: s.model.id },
          properties: {},
        },
      },
      {
        kind: 'replace-relationship' as const,
        expected: rel,
        value: { ...rel, target: other },
      },
      ...removals,
    ];
    const wrong = rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(
          f.checkpoint,
          invalid,
          reviews.map((r) => ({
            ...r,
            operationIndex: r.operationIndex + 1,
            dependents: r.dependents.map((d) => ({
              ...d,
              resolvedBy: d.resolvedBy.map((n) => n + 1),
            })),
          })),
        ),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(
      wrong.assessment?.semantics.diagnostics.map((d) => d.code),
    ).toContain('validation.endpoint-pair');
  });
  it('preserves IDs/types/owners on replacements while permitting reviewed containment and member metadata', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            kind: 'replace-element',
            expected: s.model.elements[1],
            value: {
              ...s.model.elements[1],
              container: { kind: 'model', id: s.model.id },
            },
          },
          {
            kind: 'replace-member',
            expected: s.model.members[0],
            value: { ...s.model.members[0], name: 'Member metadata' },
          },
        ]),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.model.elements[1].container.kind).toBe(
      'model',
    );
    expect(result.candidate.snapshot.model.members[0].id).toBe(f.m.id);
    for (const value of [
      { ...s.model.members[0], id: createMemberId('different') },
      { ...s.model.members[0], type: 'proof:other' },
      { ...s.model.members[0], owner: f.b },
    ])
      rejected(
        prepareSemanticCommand(
          f.checkpoint,
          command(f.checkpoint, [
            { kind: 'replace-member', expected: s.model.members[0], value },
          ]),
          f.context,
        ),
        'command.conversion',
      );
  });
  it('reports exact dependent locations across ownership, containment, constraints, views and nested references', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const impact = inspectDocumentDeletion(s, {
      kind: 'remove-element',
      expected: s.model.elements[0],
    });
    expect(impact.coverage).toBe('complete');
    expect(impact.dependents.map((d) => [d.section, d.path])).toEqual([
      ['model', ['elements', 1, 'container']],
      ['model', ['members', 0, 'owner']],
      ['model', ['relationships', 0, 'source']],
      ['constraints', [0, 'subject']],
      ['views', [0, 'elements', 0, 'target']],
      ['views', [1, 'elements', 0, 'target']],
    ]);
    const member = inspectDocumentDeletion(s, {
      kind: 'remove-member',
      expected: s.model.members[0],
    });
    expect(member.dependents).toHaveLength(4);
    expect(member.dependents.map((d) => d.path)).toContainEqual([
      'elements',
      1,
      'properties',
      'proof:links',
      'items',
      0,
      'fields',
      'proof:target',
      'value',
    ]);
    expect(member.dependents.map((d) => d.path)).toContainEqual([
      0,
      'instance',
      'roles',
      0,
      'group',
      'members',
      0,
    ]);
  });
  it('requires complete impact review even for isolated deletion and refuses implicit cleanup', () => {
    const f = fixture();
    const edit: DocumentEdit = {
      kind: 'remove-member',
      expected: f.checkpoint.snapshot.model.members[1],
    };
    expect(
      inspectDocumentDeletion(f.checkpoint.snapshot, edit).dependents,
    ).toEqual([]);
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [edit]),
        f.context,
      ),
      'command.deletion-review',
    );
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [edit], [{ operationIndex: 0, dependents: [] }]),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.model.members.map((m) => m.id)).toEqual([
      'm',
    ]);
    expect(result.candidate.commands[0].inverse).toEqual([
      { kind: 'create-member', value: edit.expected },
    ]);
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(
          f.checkpoint,
          [
            {
              kind: 'remove-element',
              expected: f.checkpoint.snapshot.model.elements[0],
            },
          ],
          [{ operationIndex: 0, dependents: [] }],
        ),
        f.context,
      ),
      'command.deletion-review',
    );
  });
  it('applies an explicit complete deletion batch in any order with guarded inverse data and no cascade', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const edits: DocumentEdit[] = [
      ...s.model.elements.map((expected) => ({
        kind: 'remove-element' as const,
        expected,
      })),
      ...s.model.members.map((expected) => ({
        kind: 'remove-member' as const,
        expected,
      })),
      ...s.model.relationships.map((expected) => ({
        kind: 'remove-relationship' as const,
        expected,
      })),
      ...s.constraints.map((expected) => ({
        kind: 'remove-constraint' as const,
        expected,
      })),
      ...s.views.map((expected) => ({
        kind: 'remove-view' as const,
        expected,
        expectedNotations: s.notationBindings.filter(
          (b) => b.view.id === expected.id,
        ),
      })),
    ];
    const before = JSON.stringify(f.checkpoint);
    const reviews = fullRemovalReview(f.checkpoint, edits);
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, edits, reviews),
        f.context,
      ),
    );
    expect(result.candidate.snapshot).toMatchObject({
      model: { elements: [], members: [], relationships: [] },
      constraints: [],
      views: [],
      notationBindings: [],
    });
    expect(result.candidate.commands[0].inverse).toHaveLength(edits.length);
    expect(result.candidate.commands[0].inverse?.[0]).toEqual({
      kind: 'create-view',
      value: s.views[1],
      notationBindings: s.notationBindings.filter(
        (b) => b.view.id === s.views[1].id,
      ),
    });
    expect(JSON.stringify(f.checkpoint)).toBe(before);
    const wrong = reviews.map((r, i) =>
      i === 0
        ? {
            ...r,
            dependents: r.dependents.map((d) => ({ ...d, resolvedBy: [999] })),
          }
        : r,
    );
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, edits, wrong),
        f.context,
      ),
      'command.deletion-review',
    );
  });
  it('rejects claimed resolution by an unrelated operation and incomplete connector/notation cleanup', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    const view = s.views[0];
    const occurrence = view.elements[0];
    const edit: DocumentEdit = {
      kind: 'remove-occurrence',
      view: { modelId: view.modelId, id: view.id },
      expected: occurrence,
      expectedNotation: s.notationBindings[0].notation,
    };
    const impact = inspectDocumentDeletion(s, edit);
    expect(impact.dependents.map((d) => d.section)).toEqual([
      'views',
      'notationBindings',
    ]);
    const request = command(
      f.checkpoint,
      [edit, rename(f)],
      [
        {
          operationIndex: 0,
          dependents: impact.dependents.map((location) => ({
            location,
            resolvedBy: [1],
          })),
        },
      ],
    );
    rejected(
      prepareSemanticCommand(f.checkpoint, request, f.context),
      'command.deletion-review',
    );
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            ...edit,
            expectedNotation: { ...edit.expectedNotation, version: '99' },
          },
        ]),
        f.context,
      ),
      'command.precondition',
    );
  });
  it('handles constraint replacement and removal with valid schema/rule provenance', () => {
    const f = fixture();
    const original = f.checkpoint.snapshot.constraints[0];
    const value = {
      ...original,
      instance: {
        ...original.instance,
        roles: [
          { role: 'proof:fields' as const, group: { members: [f.m, f.m] } },
        ],
      },
    };
    const bad = rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { kind: 'replace-constraint', expected: original, value },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(
      bad.assessment?.semantics.diagnostics.some(
        (d) => d.provenance?.constraint?.id === 'proof:group',
      ),
    ).toBe(true);
    const result = prepared(
      prepareSemanticCommand(
        f.checkpoint,
        command(
          f.checkpoint,
          [{ kind: 'remove-constraint', expected: original }],
          [{ operationIndex: 0, dependents: [] }],
        ),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.constraints).toEqual([]);
  });
  it('targets original constraint slots when replacements exchange existing values', () => {
    const f = fixture();
    const first = f.checkpoint.snapshot.constraints[0];
    const second = {
      subject: f.b,
      instance: {
        ...first.instance,
        roles: [{ role: 'proof:fields' as const, group: { members: [f.n] } }],
      },
    };
    const checkpoint = {
      ...f.checkpoint,
      snapshot: { ...f.checkpoint.snapshot, constraints: [first, second] },
    };
    const swap: DocumentEdit[] = [
      { kind: 'replace-constraint', expected: first, value: second },
      { kind: 'replace-constraint', expected: second, value: first },
    ];
    for (const edits of [swap, [...swap].reverse()]) {
      const result = prepared(
        prepareSemanticCommand(
          checkpoint,
          command(checkpoint, edits),
          f.context,
        ),
      );
      expect(result.candidate.snapshot.constraints).toEqual([second, first]);
    }
    const result = prepared(
      prepareSemanticCommand(
        checkpoint,
        command(
          checkpoint,
          [swap[0], { kind: 'remove-constraint', expected: second }],
          [{ operationIndex: 1, dependents: [] }],
        ),
        f.context,
      ),
    );
    expect(result.candidate.snapshot.constraints).toEqual([second]);
    expect(checkpoint.snapshot.constraints).toEqual([first, second]);
  });
  it('rejects a late invalid nested reference without leaking an earlier valid rename', () => {
    const f = fixture();
    const before = JSON.stringify(f.checkpoint);
    const result = rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          rename(f),
          {
            kind: 'set-property',
            target: f.b,
            property: 'proof:links',
            expected: {
              present: true,
              value:
                f.checkpoint.snapshot.model.elements[1].properties[
                  'proof:links'
                ],
            },
            value: {
              present: true,
              value: {
                kind: 'list',
                items: [
                  {
                    kind: 'record',
                    fields: {
                      'proof:target': {
                        kind: 'reference',
                        value: { ...f.m, id: createMemberId('missing') },
                      },
                    },
                  },
                ],
              },
            },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    expect(
      result.assessment?.semantics.diagnostics.some(
        (d) => d.code === 'model.missing-reference',
      ),
    ).toBe(true);
    expect(JSON.stringify(f.checkpoint)).toBe(before);
  });
  it('rejects overlapping whole-record/field writes and duplicate IDs instead of ordering them', () => {
    const f = fixture();
    const e = f.checkpoint.snapshot.model.elements[0];
    for (const edits of [
      [rename(f), rename(f)],
      [
        rename(f),
        {
          kind: 'replace-element',
          expected: e,
          value: { ...e, name: 'replace' },
        },
      ],
      [{ kind: 'create-element', value: e }],
      [
        {
          kind: 'set-property',
          target: f.a,
          property: 'proof:note',
          expected: { present: false },
          value: { present: false },
        },
        {
          kind: 'set-property',
          target: f.a,
          property: 'proof:note',
          expected: { present: false },
          value: { present: false },
        },
      ],
    ] as DocumentEdit[][])
      rejected(
        prepareSemanticCommand(
          f.checkpoint,
          command(f.checkpoint, edits),
          f.context,
        ),
      );
  });
  it('rejects blank, foreign, stale and reused revisions and failed value preconditions', () => {
    const f = fixture();
    const c = command(f.checkpoint, [rename(f)]);
    for (const wrong of [
      { ...c, id: '' },
      { ...c, actor: '' },
      {
        ...c,
        modelId: createModel('foreign', 'Foreign', {
          id: 'proof',
          version: '1',
        }).id,
      },
      { ...c, expectedRevision: createModelRevision('stale') },
      { ...c, nextRevision: c.expectedRevision },
    ])
      rejected(prepareSemanticCommand(f.checkpoint, wrong, f.context));
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { kind: 'rename', target: f.a, expected: 'wrong', value: 'new' },
        ]),
        f.context,
      ),
      'command.precondition',
    );
    const cp = prepared(
      prepareSemanticCommand(f.checkpoint, c, f.context),
    ).candidate;
    rejected(
      prepareSemanticCommand(
        cp,
        { ...command(cp, []), nextRevision: c.expectedRevision },
        f.context,
      ),
      'command.reused-revision',
    );
  });
  it('returns exact detached replay evidence after later edits without stale state replacement', () => {
    const f = fixture();
    const c = command(f.checkpoint, [rename(f)]);
    const cp = prepared(
      prepareSemanticCommand(f.checkpoint, c, f.context),
    ).candidate;
    const later = prepared(
      prepareSemanticCommand(
        cp,
        command(cp, [
          {
            kind: 'rename',
            target: f.a,
            expected: 'Authored',
            value: 'Later human edit',
          },
        ]),
        f.context,
      ),
    ).candidate;
    const result = prepareSemanticCommand(later, c, f.context);
    expect(result.status).toBe('replayed');
    expect(result).not.toHaveProperty('candidate');
    expect(later.snapshot.model.elements[0].name).toBe('Later human edit');
    rejected(
      prepareSemanticCommand(later, { ...c, actor: 'changed' }, f.context),
      'command.identity-conflict',
    );
    expect(cp.commands[0].command).not.toBe(c);
  });
  it('rejects conflicting or incomplete receipt chains before accepting replay evidence', () => {
    const f = fixture();
    const c = command(f.checkpoint, [rename(f)]);
    const cp = prepared(
      prepareSemanticCommand(f.checkpoint, c, f.context),
    ).candidate;
    rejected(
      prepareSemanticCommand(
        { ...cp, commands: [...cp.commands, ...cp.commands] },
        c,
        f.context,
      ),
      'document.invalid-receipt',
    );
    rejected(
      prepareSemanticCommand(
        {
          ...cp,
          snapshot: {
            ...cp.snapshot,
            model: {
              ...cp.snapshot.model,
              revision: createModelRevision('unrecorded'),
            },
          },
        },
        c,
        f.context,
      ),
      'document.receipt-head',
    );
  });
  it('preserves opaque extension objects and rejects partial coverage without inspecting payloads', () => {
    const f = fixture();
    const envelope = {
      pack: { id: 'unknown', version: '1', contractVersion: '1' },
      extension: { id: 'unknown:data' as const, version: '1' },
      get payload() {
        throw new Error('opaque');
      },
    };
    const cp = {
      ...f.checkpoint,
      snapshot: { ...f.checkpoint.snapshot, extensions: [envelope] },
    };
    const result = rejected(
      prepareSemanticCommand(cp, command(cp, [rename(f)]), f.context),
      'command.not-editable',
    );
    expect(result.assessment?.status).toBe('unsupported');
    expect(result.assessment?.semantics.extensions[0].envelope).toBe(envelope);
    expect(
      inspectDocumentDeletion(cp.snapshot, {
        kind: 'remove-element',
        expected: cp.snapshot.model.elements[0],
      }).coverage,
    ).toBe('partial');
  });
  it('refuses generated lifecycle state, unsupported commands and missing exact registry coverage', () => {
    const f = fixture();
    const c = command(f.checkpoint, []);
    const plan = {
      id: 'old',
      modelId: c.modelId,
      expectedRevision: c.expectedRevision,
      nextRevision: c.nextRevision,
      source: c.source,
      rules: [],
      operations: [],
      baselineUpdates: [],
    };
    const cp = {
      ...f.checkpoint,
      snapshot: {
        ...f.checkpoint.snapshot,
        applied: [
          {
            plan,
            inverse: [],
            beforeRevision: plan.expectedRevision,
            afterRevision: plan.nextRevision,
          },
        ],
      },
    };
    const result = rejected(
      prepareSemanticCommand(
        cp,
        { ...c, nextRevision: createModelRevision('fresh-after-generation') },
        f.context,
      ),
      'command.not-editable',
    );
    expect(result.assessment?.lifecycle).toBe('not-checked');
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        { ...c, kind: 'undo', transactionId: 'x' },
        f.context,
      ),
      'command.unsupported-kind',
    );
    rejected(
      prepareSemanticCommand(f.checkpoint, c, { ...f.context, packs: [] }),
      'command.not-editable',
    );
    rejected(
      prepareSemanticCommand(f.checkpoint, c, { ...f.context, notations: [] }),
      'command.not-editable',
    );
    rejected(
      prepareSemanticCommand(f.checkpoint, c, {
        ...f.context,
        validationRules: [],
      }),
      'command.not-editable',
    );
  });
  it('keeps all returned command/entity/inverse data detached from authored input', () => {
    const f = fixture();
    const value = {
      ...f.checkpoint.snapshot.model.elements[0],
      id: createElementId('created'),
      name: 'Created',
    };
    const c = command(f.checkpoint, [{ kind: 'create-element', value }]);
    const result = prepared(prepareSemanticCommand(f.checkpoint, c, f.context));
    value.name = 'mutated caller input';
    expect(result.candidate.snapshot.model.elements.at(-1)?.name).toBe(
      'Created',
    );
    expect(result.candidate.commands[0].inverse).toMatchObject([
      { kind: 'remove-element', expected: { name: 'Created' } },
    ]);
  });
  it('advances revision for a reviewed receipt-only transaction without changing semantic content', () => {
    const f = fixture();
    const request = command(f.checkpoint, []);
    const result = prepared(
      prepareSemanticCommand(f.checkpoint, request, f.context),
    );
    expect(result.candidate.snapshot.model.elements).toEqual(
      f.checkpoint.snapshot.model.elements,
    );
    expect(result.candidate.snapshot.model.revision).toBe(request.nextRevision);
    expect(result.candidate.commands[0].inverse).toEqual([]);
    expect(
      prepareSemanticCommand(result.candidate, request, {
        ...f.context,
        packs: [],
      }).status,
    ).toBe('replayed');
    expect(
      inspectDocumentDeletion(f.checkpoint.snapshot, rename(f)).coverage,
    ).toBe('not-applicable');
  });

  it('requires complete unambiguous exact notation bindings and distinct constraint bindings', () => {
    const f = fixture();
    const s = f.checkpoint.snapshot;
    for (const notationBindings of [
      s.notationBindings.slice(1),
      [...s.notationBindings, s.notationBindings[0]],
      s.notationBindings.map((binding, i) =>
        i
          ? binding
          : {
              ...binding,
              notation: { ...binding.notation, version: 'missing' },
            },
      ),
    ]) {
      const cp = { ...f.checkpoint, snapshot: { ...s, notationBindings } };
      rejected(
        prepareSemanticCommand(cp, command(cp, [rename(f)]), f.context),
        'command.not-editable',
      );
    }
    const duplicate = {
      ...f.checkpoint,
      snapshot: { ...s, constraints: [...s.constraints, ...s.constraints] },
    };
    expect(
      assessDocument(duplicate, f.context).diagnostics.map((d) => d.code),
    ).toContain('document.ambiguous-constraint');
  });

  it('rejects extra, duplicate and non-removal review entries rather than trusting asserted approval', () => {
    const f = fixture();
    const edit: DocumentEdit = {
      kind: 'remove-member',
      expected: f.checkpoint.snapshot.model.members[1],
    };
    for (const reviews of [
      [
        { operationIndex: 0, dependents: [] },
        { operationIndex: 0, dependents: [] },
      ],
      [{ operationIndex: 99, dependents: [] }],
      [{ operationIndex: 0.5, dependents: [] }],
    ]) {
      rejected(
        prepareSemanticCommand(
          f.checkpoint,
          command(f.checkpoint, [edit], reviews),
          f.context,
        ),
        'command.deletion-review',
      );
    }
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(
          f.checkpoint,
          [rename(f)],
          [{ operationIndex: 0, dependents: [] }],
        ),
        f.context,
      ),
      'command.deletion-review',
    );
  });

  it('rejects containment cycles and same-batch identity collisions without leaking partial creation', () => {
    const f = fixture();
    const first = f.checkpoint.snapshot.model.elements[0];
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          {
            kind: 'replace-element',
            expected: first,
            value: { ...first, container: f.b },
          },
        ]),
        f.context,
      ),
      'command.invalid-candidate',
    );
    const added = { ...first, id: createElementId('new') };
    rejected(
      prepareSemanticCommand(
        f.checkpoint,
        command(f.checkpoint, [
          { kind: 'create-element', value: added },
          { kind: 'create-element', value: added },
        ]),
        f.context,
      ),
      'command.overlap',
    );
    for (const value of [
      { ...first, id: createElementId('different') },
      { ...first, type: 'proof:other' },
    ]) {
      rejected(
        prepareSemanticCommand(
          f.checkpoint,
          command(f.checkpoint, [
            { kind: 'replace-element', expected: first, value },
          ]),
          f.context,
        ),
        'command.conversion',
      );
    }
  });
});
