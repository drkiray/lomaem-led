import { loadJSON, saveJSON, removeKey } from './storage';

test('round-trips JSON under ll. prefix', () => {
  saveJSON('x', { a: 1 });
  expect(localStorage.getItem('ll.x')).toBe('{"a":1}');
  expect(loadJSON('x', null)).toEqual({ a: 1 });
});

test('returns fallback for missing key', () => {
  expect(loadJSON('missing', 42)).toBe(42);
});

test('returns fallback for corrupted JSON', () => {
  localStorage.setItem('ll.bad', '{not json');
  expect(loadJSON('bad', 'fallback')).toBe('fallback');
});

test('survives storage that throws', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(loadJSON('x', 'fb')).toBe('fb');
  expect(() => saveJSON('x', 1)).not.toThrow();
  spy.mockRestore();
  setSpy.mockRestore();
});

test('removeKey deletes prefixed key', () => {
  saveJSON('y', 1);
  removeKey('y');
  expect(localStorage.getItem('ll.y')).toBeNull();
});
