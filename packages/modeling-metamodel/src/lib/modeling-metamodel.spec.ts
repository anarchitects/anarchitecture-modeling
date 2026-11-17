import {
  resolveModelingPack,
  type ModelingPack,
} from './modeling-metamodel.js';
const pack: ModelingPack = {
  id: 'example',
  version: '1',
  displayName: 'Example',
  implementation: 'scaffold',
};
describe('resolveModelingPack', () => {
  it('resolves an exact version and returns a copy', () => {
    expect(resolveModelingPack([pack], pack)).toEqual(pack);
    expect(resolveModelingPack([pack], pack)).not.toBe(pack);
  });
  it('rejects unavailable versions instead of silently upgrading', () => {
    expect(() =>
      resolveModelingPack([pack], { id: 'example', version: '2' }),
    ).toThrow();
  });
  it('rejects ambiguous registrations', () => {
    expect(() => resolveModelingPack([pack, pack], pack)).toThrow();
  });
});
