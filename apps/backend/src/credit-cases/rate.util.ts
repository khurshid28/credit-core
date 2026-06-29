/** True when `rate` is within the inclusive [min, max] lending-rate bounds. */
export const isRateInBounds = (rate: number, min: number, max: number): boolean => rate >= min && rate <= max;
