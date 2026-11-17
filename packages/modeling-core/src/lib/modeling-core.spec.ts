import { createModel } from '../index.js';
describe('createModel', () => {
  it('creates independent documents without coupling to a modeling language', () => {
    const profile = { id: 'example-language', version: '1' };
    const a = createModel('a', 'A', profile);
    const b = createModel('b', 'B', profile);
    profile.version = '2';
    expect(a.profile.version).toBe('1');
    expect(a.elements).not.toBe(b.elements);
    expect(a.relationships).toEqual([]);
    expect(a.members).not.toBe(b.members);
    expect(a).toMatchObject({ formatVersion: 2, revision: '0', members: [] });
  });
  it.each(['', '   '])('rejects empty identity %j', (id) => {
    expect(() =>
      createModel(id, 'A', { id: 'example', version: '1' }),
    ).toThrow();
  });
  it('keeps format, profile version and revision independent', () => {
    const document = createModel('model', 'Model', {
      id: 'example',
      version: '7.3',
    });
    expect(document.formatVersion).toBe(2);
    expect(document.profile.version).toBe('7.3');
    expect(document.revision).toBe('0');
  });
});
