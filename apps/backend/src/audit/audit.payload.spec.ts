import { stringifyValue } from './audit.service';

describe('stringifyValue', () => {
  it('formats primitives and null', () => {
    expect(stringifyValue(0.55)).toBe('0.55');
    expect(stringifyValue(null)).toBeNull();
    expect(stringifyValue(undefined)).toBeNull();
    expect(stringifyValue({ a: 1 })).toBe('{"a":1}');
  });
});
