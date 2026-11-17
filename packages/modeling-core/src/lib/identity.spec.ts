import {
  createElementId,
  createMemberId,
  createModel,
  createModelId,
  createModelRevision,
  createRelationshipId,
  createViewId,
  createElementOccurrenceId,
  createConnectorOccurrenceId,
  type ViewId,
  type ElementOccurrenceId,
  type ConnectorOccurrenceId,
  type ElementId,
  type ElementReference,
  type MemberId,
  type MemberReference,
  type MemberReferenceGroup,
  type ModelDocument,
  type ModelEntityReference,
  type ModelId,
  type ModelMember,
  type ModelReference,
  type ModelRelationship,
  type ModelRevision,
  type ModelValue,
  type RelationshipId,
} from '../index.js';

function fixture() {
  const empty = createModel('example-model', 'Example', {
    id: 'example:language',
    version: '1',
  });
  const element: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('element-1'),
  };
  const target: ElementReference = {
    kind: 'element',
    modelId: empty.id,
    id: createElementId('element-2'),
  };
  const first: MemberReference = {
    kind: 'member',
    modelId: empty.id,
    id: createMemberId('member-1'),
  };
  const second: MemberReference = {
    kind: 'member',
    modelId: empty.id,
    id: createMemberId('member-2'),
  };
  const group: MemberReferenceGroup = { members: [second, first] };
  const document: ModelDocument = {
    ...empty,
    elements: [
      {
        id: element.id,
        type: 'example:entity',
        name: 'Original',
        container: { kind: 'model', id: empty.id },
        properties: {},
      },
      {
        id: target.id,
        type: 'example:entity',
        name: 'Nested',
        container: element,
        properties: {},
      },
    ],
    members: [
      {
        id: first.id,
        type: 'example:field',
        name: 'First',
        owner: element,
        properties: {},
      },
      {
        id: second.id,
        type: 'example:field',
        name: 'Second',
        owner: element,
        properties: {},
      },
    ],
    relationships: [
      {
        id: createRelationshipId('relation-1'),
        type: 'example:connects',
        source: element,
        target,
        properties: {
          'example:details': {
            kind: 'record',
            fields: {
              enabled: { kind: 'scalar', value: true },
              weight: { kind: 'scalar', value: 0.5 },
              note: { kind: 'scalar', value: null },
              members: {
                kind: 'list',
                items: group.members.map((value) => ({
                  kind: 'reference',
                  value,
                })),
              },
            },
          },
        },
      },
    ],
  };
  return { document, element, first, second, group };
}

describe('model identity and reference contracts', () => {
  it.each([
    createModelId,
    createElementId,
    createRelationshipId,
    createMemberId,
    createModelRevision,
    createViewId,
    createElementOccurrenceId,
    createConnectorOccurrenceId,
  ])(
    'rejects blank identities without normalizing nonblank values',
    (create) => {
      expect(() => create('')).toThrow('must be non-empty');
      expect(() => create(' \t\n')).toThrow('must be non-empty');
      expect(create(' opaque/value:01 ')).toBe(' opaque/value:01 ');
      expect(create('stable')).toBe(create('stable'));
    },
  );

  it('keeps element and member references stable across name changes and reordering', () => {
    const { document, element, first, group } = fixture();
    // This is a contract fixture, not a production editing/undo command.
    const renamed: ModelDocument = {
      ...document,
      name: 'Renamed model',
      revision: createModelRevision('after-rename'),
      elements: document.elements.map((value) => ({
        ...value,
        name: 'Renamed',
      })),
      members: document.members
        .map((value) => ({ ...value, name: 'Renamed member' }))
        .reverse(),
    };
    expect(renamed.id).toBe(document.id);
    expect(renamed.relationships[0].source).toEqual(element);
    expect(
      renamed.members.find((member) => member.id === first.id),
    ).toMatchObject({
      name: 'Renamed member',
      owner: element,
    });
    expect(group.members.map((ref) => ref.id)).toEqual([
      'member-2',
      'member-1',
    ]);
    expect(
      group.members.map(
        (ref) => renamed.members.find((m) => m.id === ref.id)?.id,
      ),
    ).toEqual(['member-2', 'member-1']);
    expect(renamed.relationships[0].properties).toEqual(
      document.relationships[0].properties,
    );
    expect(document.elements[0].name).toBe('Original');
    expect(document.members[0].name).toBe('First');
  });

  it('represents semantic containment and member ownership independently of views', () => {
    const { document, element } = fixture();
    expect(document.elements[0].container).toEqual({
      kind: 'model',
      id: document.id,
    });
    expect(document.elements[1].container).toEqual(element);
    expect(document.members.map((member) => member.owner)).toEqual([
      element,
      element,
    ]);
    expect(document).not.toHaveProperty('views');
  });

  it('distinguishes a reference from ordinary record data and preserves ordered values', () => {
    const { document, first, second } = fixture();
    const literal: ModelValue = {
      kind: 'record',
      fields: {
        kind: { kind: 'scalar', value: 'member' },
        id: { kind: 'scalar', value: first.id },
      },
    };
    const reference: ModelValue = { kind: 'reference', value: first };
    expect(literal.kind).not.toBe(reference.kind);
    // JSON shape evidence only: no parser, trusted-input check or persistence promise.
    const encoded = JSON.parse(JSON.stringify(document));
    expect(
      encoded.relationships[0].properties['example:details'].fields.members,
    ).toEqual({
      kind: 'list',
      items: [
        { kind: 'reference', value: second },
        { kind: 'reference', value: first },
      ],
    });
    expect(encoded).toEqual(document);
  });

  it('keeps reference kinds, IDs and revisions distinct at the public type boundary', () => {
    expectTypeOf(createModelId('m')).toEqualTypeOf<ModelId>();
    expectTypeOf(createElementId('e')).toEqualTypeOf<ElementId>();
    expectTypeOf(createMemberId('f')).toEqualTypeOf<MemberId>();
    expectTypeOf(createRelationshipId('r')).toEqualTypeOf<RelationshipId>();
    expectTypeOf(createModelRevision('r')).toEqualTypeOf<ModelRevision>();
    expectTypeOf<string>().not.toMatchTypeOf<ModelId>();
    expectTypeOf<ElementId>().not.toMatchTypeOf<MemberId>();
    expectTypeOf<ModelRevision>().not.toMatchTypeOf<ModelId>();
    expectTypeOf(createViewId('v')).toEqualTypeOf<ViewId>();
    expectTypeOf(
      createElementOccurrenceId('e'),
    ).toEqualTypeOf<ElementOccurrenceId>();
    expectTypeOf(
      createConnectorOccurrenceId('c'),
    ).toEqualTypeOf<ConnectorOccurrenceId>();
    expectTypeOf<ViewId>().not.toMatchTypeOf<ModelId>();
    expectTypeOf<ElementOccurrenceId>().not.toMatchTypeOf<ElementId>();
    expectTypeOf<ConnectorOccurrenceId>().not.toMatchTypeOf<ElementOccurrenceId>();
    expectTypeOf<ModelMember['owner']>().toEqualTypeOf<ElementReference>();
    expectTypeOf<
      ModelRelationship['source']
    >().toEqualTypeOf<ElementReference>();
    expectTypeOf<MemberReference>().not.toMatchTypeOf<ElementReference>();
    expectTypeOf<ModelReference>().toMatchTypeOf<ModelEntityReference>();
  });
});
