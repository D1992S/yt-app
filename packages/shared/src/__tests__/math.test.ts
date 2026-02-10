import { describe, it, expect } from 'vitest';
import { sum, mean, variance, stdDev, percentChange, roundTo } from '../utils/math';

describe('sum', () => {
  it('returns 0 for an empty array', () => {
    expect(sum([])).toBe(0);
  });

  it('returns the single element for a one-element array', () => {
    expect(sum([42])).toBe(42);
  });

  it('returns the correct total for multiple positive numbers', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
  });

  it('handles negative numbers', () => {
    expect(sum([-1, -2, -3])).toBe(-6);
  });

  it('handles a mix of positive and negative numbers', () => {
    expect(sum([10, -5, 3, -8])).toBe(0);
  });

  it('handles floating point numbers', () => {
    expect(sum([0.1, 0.2])).toBeCloseTo(0.3);
  });
});

describe('mean', () => {
  it('returns 0 for an empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the single value for a one-element array', () => {
    expect(mean([7])).toBe(7);
  });

  it('computes the correct average for multiple values', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('handles floating point averages', () => {
    expect(mean([1, 2])).toBe(1.5);
  });

  it('handles negative values', () => {
    expect(mean([-10, 10])).toBe(0);
  });
});

describe('variance', () => {
  it('returns 0 for an empty array', () => {
    expect(variance([])).toBe(0);
  });

  it('returns 0 for a single-element array', () => {
    expect(variance([5])).toBe(0);
  });

  it('returns 0 for uniform values', () => {
    expect(variance([3, 3, 3, 3])).toBe(0);
  });

  it('computes the correct population variance for varied values', () => {
    // values: [2, 4, 4, 4, 5, 5, 7, 9]
    // mean = 5, variance = 4
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
  });

  it('computes variance for two values', () => {
    // [0, 10] => mean=5, variance = ((5^2)+(5^2))/2 = 25
    expect(variance([0, 10])).toBe(25);
  });

  it('handles negative values', () => {
    // [-1, 1] => mean=0, variance = (1+1)/2 = 1
    expect(variance([-1, 1])).toBe(1);
  });
});

describe('stdDev', () => {
  it('returns 0 for an empty array', () => {
    expect(stdDev([])).toBe(0);
  });

  it('returns 0 for uniform values', () => {
    expect(stdDev([4, 4, 4])).toBe(0);
  });

  it('equals the square root of variance', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stdDev(values)).toBe(Math.sqrt(variance(values)));
  });

  it('computes the correct standard deviation', () => {
    // variance of [0, 10] = 25, stdDev = 5
    expect(stdDev([0, 10])).toBe(5);
  });
});

describe('percentChange', () => {
  it('returns a positive percent change for growth', () => {
    expect(percentChange(150, 100)).toBe(50);
  });

  it('returns a negative percent change for decline', () => {
    expect(percentChange(50, 100)).toBe(-50);
  });

  it('returns 0 when previous value is 0', () => {
    expect(percentChange(100, 0)).toBe(0);
  });

  it('returns 0 when previous value is falsy (0)', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('returns 100 when value doubles', () => {
    expect(percentChange(200, 100)).toBe(100);
  });

  it('returns -100 when value drops to zero', () => {
    expect(percentChange(0, 50)).toBe(-100);
  });

  it('handles negative previous values', () => {
    // current=10, prev=-5 => ((10 - (-5)) / (-5)) * 100 = -300
    expect(percentChange(10, -5)).toBe(-300);
  });

  it('handles small fractional changes', () => {
    expect(percentChange(1.01, 1)).toBeCloseTo(1);
  });
});

describe('roundTo', () => {
  it('rounds to 0 decimal places', () => {
    expect(roundTo(3.456, 0)).toBe(3);
  });

  it('rounds to 1 decimal place', () => {
    expect(roundTo(3.456, 1)).toBe(3.5);
  });

  it('rounds to 2 decimal places', () => {
    expect(roundTo(3.456, 2)).toBe(3.46);
  });

  it('rounds to 3 decimal places', () => {
    expect(roundTo(3.4567, 3)).toBe(3.457);
  });

  it('rounds 0.5 up (standard rounding)', () => {
    expect(roundTo(2.5, 0)).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(roundTo(-3.456, 2)).toBe(-3.46);
  });

  it('returns the same number if already at fewer decimals', () => {
    expect(roundTo(5, 3)).toBe(5);
  });

  it('handles very large decimal places', () => {
    expect(roundTo(1.123456789, 6)).toBe(1.123457);
  });
});
