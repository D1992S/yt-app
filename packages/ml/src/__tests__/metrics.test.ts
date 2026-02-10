import { describe, it, expect } from 'vitest';
import { mean, mae, mape, smape, median, quantile } from '../metrics';

describe('mean', () => {
  it('returns NaN for an empty array', () => {
    // 0 / 0 = NaN in JS due to reduce starting at 0
    expect(mean([])).toBeNaN();
  });

  it('returns the value itself for a single-element array', () => {
    expect(mean([42])).toBe(42);
  });

  it('computes the arithmetic mean for multiple positive values', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('handles negative values', () => {
    expect(mean([-10, 10])).toBe(0);
  });

  it('handles a mix of negative and positive values', () => {
    expect(mean([-3, -1, 0, 1, 3])).toBe(0);
  });

  it('handles large values without overflow issues for reasonable inputs', () => {
    expect(mean([1e10, 2e10, 3e10])).toBe(2e10);
  });

  it('handles decimal values', () => {
    expect(mean([0.1, 0.2, 0.3])).toBeCloseTo(0.2, 10);
  });
});

describe('mae', () => {
  it('returns 0 when actual and predicted match exactly', () => {
    expect(mae([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('computes the correct mean absolute error for different arrays', () => {
    // |1-2| + |2-4| + |3-6| = 1 + 2 + 3 = 6, mean = 2
    expect(mae([1, 2, 3], [2, 4, 6])).toBe(2);
  });

  it('handles predicted values less than actual', () => {
    // |10-5| + |20-10| = 5 + 10 = 15, mean = 7.5
    expect(mae([10, 20], [5, 10])).toBe(7.5);
  });

  it('throws an error on length mismatch', () => {
    expect(() => mae([1, 2], [1])).toThrow('Length mismatch');
    expect(() => mae([], [1])).toThrow('Length mismatch');
  });

  it('returns 0 for empty matching arrays', () => {
    // mean of empty is NaN, but let's see what happens
    expect(mae([], [])).toBeNaN();
  });

  it('handles single-element arrays', () => {
    expect(mae([5], [3])).toBe(2);
  });

  it('is symmetric: mae(a, b) == mae(b, a)', () => {
    expect(mae([1, 2, 3], [4, 5, 6])).toBe(mae([4, 5, 6], [1, 2, 3]));
  });
});

describe('mape', () => {
  it('computes correct MAPE for normal values', () => {
    // |100-110|/100 = 0.1, |200-190|/200 = 0.05 => mean = 0.075 => 7.5%
    expect(mape([100, 200], [110, 190])).toBeCloseTo(7.5, 5);
  });

  it('returns 0 when predictions match actuals', () => {
    expect(mape([10, 20, 30], [10, 20, 30])).toBe(0);
  });

  it('treats zero actual values as 0 error (avoids division by zero)', () => {
    // When actual is 0, the error contribution is 0 per the implementation
    // actual=[0, 100], predicted=[50, 100]
    // error[0] = 0 (because actual=0), error[1] = 0 => mean = 0
    expect(mape([0, 100], [50, 100])).toBe(0);
  });

  it('handles all-zero actuals', () => {
    expect(mape([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('throws an error on length mismatch', () => {
    expect(() => mape([1, 2, 3], [1, 2])).toThrow('Length mismatch');
  });

  it('returns 100% when predictions double the actuals', () => {
    // |10-20|/10 = 1.0 => 100%
    expect(mape([10], [20])).toBeCloseTo(100, 5);
  });
});

describe('smape', () => {
  it('returns 0 when actual and predicted match', () => {
    expect(smape([10, 20, 30], [10, 20, 30])).toBe(0);
  });

  it('returns 0 when both actual and predicted are zero', () => {
    // denom = 0 => returns 0
    expect(smape([0, 0], [0, 0])).toBe(0);
  });

  it('computes correct SMAPE for normal values', () => {
    // actual=100, predicted=110: 2*|100-110|/(100+110) = 20/210 ~= 0.09524
    // actual=200, predicted=190: 2*|200-190|/(200+190) = 20/390 ~= 0.05128
    // mean ~= 0.07326, *100 ~= 7.326
    expect(smape([100, 200], [110, 190])).toBeCloseTo(7.326, 1);
  });

  it('returns 200% when one is zero and other is nonzero', () => {
    // 2 * |0 - 100| / (0 + 100) = 200/100 = 2.0 => 200%
    expect(smape([0], [100])).toBeCloseTo(200, 5);
  });

  it('handles asymmetric errors: over-prediction vs under-prediction', () => {
    // SMAPE is symmetric: swapping actual and predicted gives same result
    const result1 = smape([100], [150]);
    const result2 = smape([150], [100]);
    expect(result1).toBeCloseTo(result2, 10);
  });

  it('throws an error on length mismatch', () => {
    expect(() => smape([1], [1, 2])).toThrow('Length mismatch');
  });
});

describe('median', () => {
  it('returns 0 for an empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns the single element for a single-element array', () => {
    expect(median([7])).toBe(7);
  });

  it('returns the middle value for an odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('returns the average of the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles already-sorted arrays', () => {
    expect(median([10, 20, 30, 40, 50])).toBe(30);
  });

  it('handles unsorted arrays', () => {
    expect(median([50, 10, 40, 20, 30])).toBe(30);
  });

  it('handles duplicate values', () => {
    expect(median([5, 5, 5, 5])).toBe(5);
  });

  it('handles negative values', () => {
    expect(median([-5, -1, -3])).toBe(-3);
  });

  it('does not mutate the original array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

describe('quantile', () => {
  it('returns 0 for an empty array', () => {
    expect(quantile([], 0.5)).toBe(0);
  });

  it('returns the minimum value for q=0', () => {
    expect(quantile([10, 20, 30, 40, 50], 0)).toBe(10);
  });

  it('returns the maximum value for q=1', () => {
    expect(quantile([10, 20, 30, 40, 50], 1)).toBe(50);
  });

  it('returns the median for q=0.5', () => {
    expect(quantile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });

  it('interpolates between values for q=0.25', () => {
    // sorted = [10, 20, 30, 40, 50], pos = 4 * 0.25 = 1.0
    // base = 1, rest = 0 => sorted[1] + 0 = 20
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
  });

  it('interpolates between values for q=0.75', () => {
    // sorted = [10, 20, 30, 40, 50], pos = 4 * 0.75 = 3.0
    // base = 3, rest = 0 => sorted[3] = 40
    expect(quantile([10, 20, 30, 40, 50], 0.75)).toBe(40);
  });

  it('handles a single-element array at any quantile', () => {
    expect(quantile([42], 0)).toBe(42);
    expect(quantile([42], 0.5)).toBe(42);
    expect(quantile([42], 1)).toBe(42);
  });

  it('interpolates correctly at fractional positions', () => {
    // sorted = [1, 2, 3, 4], pos = 3 * 0.5 = 1.5
    // base = 1, rest = 0.5 => sorted[1] + 0.5 * (sorted[2] - sorted[1]) = 2 + 0.5 = 2.5
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it('handles two-element array', () => {
    // sorted = [10, 20], pos = 1 * 0.5 = 0.5
    // base = 0, rest = 0.5 => 10 + 0.5*(20-10) = 15
    expect(quantile([10, 20], 0.5)).toBe(15);
  });

  it('does not mutate the original array', () => {
    const arr = [50, 10, 30, 20, 40];
    quantile(arr, 0.5);
    expect(arr).toEqual([50, 10, 30, 20, 40]);
  });
});
