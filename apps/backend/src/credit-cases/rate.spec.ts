import { isRateInBounds } from './rate.util';

describe('rate bounds', () => {
  it('accepts within [min,max]', () => {
    expect(isRateInBounds(0.55, 0.55, 0.6)).toBe(true);
    expect(isRateInBounds(0.6, 0.55, 0.6)).toBe(true);
    expect(isRateInBounds(0.58, 0.55, 0.6)).toBe(true);
  });
  it('rejects below/above', () => {
    expect(isRateInBounds(0.54, 0.55, 0.6)).toBe(false);
    expect(isRateInBounds(0.61, 0.55, 0.6)).toBe(false);
  });
});
