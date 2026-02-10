import { describe, it, expect } from 'vitest';
import { fitGrowthCurves, predictFromCurve, GrowthCurvePoint } from '../nowcast';

describe('fitGrowthCurves', () => {
  it('returns an empty array when given no videos', () => {
    expect(fitGrowthCurves([])).toEqual([]);
  });

  it('skips videos with fewer than 28 days of daily views', () => {
    const videos = [
      { id: 'short1', durationSec: 120, dailyViews: Array(10).fill(100) },
      { id: 'short2', durationSec: 300, dailyViews: Array(27).fill(50) },
    ];
    expect(fitGrowthCurves(videos)).toEqual([]);
  });

  it('returns exactly 28 data points for valid input', () => {
    const dailyViews = Array(28).fill(100);
    const videos = [{ id: 'v1', durationSec: 600, dailyViews }];
    const result = fitGrowthCurves(videos);

    expect(result).toHaveLength(28);
    expect(result[0].day).toBe(1);
    expect(result[27].day).toBe(28);
  });

  it('normalizes curves to day 28 (last point medianPct equals 1.0)', () => {
    // Uniform daily views: cumulative at day 28 = 28*100 = 2800
    // Each day d has cumulative = d*100, normalized = d*100/2800 = d/28
    const dailyViews = Array(28).fill(100);
    const videos = [{ id: 'v1', durationSec: 600, dailyViews }];
    const result = fitGrowthCurves(videos);

    // Day 28 (index 27) should have medianPct = 1.0
    expect(result[27].medianPct).toBeCloseTo(1.0, 5);
    // Day 1 (index 0) should have medianPct = 1/28
    expect(result[0].medianPct).toBeCloseTo(1 / 28, 5);
  });

  it('computes correct quantiles across multiple videos', () => {
    // Video 1: front-loaded (high views early)
    const frontLoaded = Array(28).fill(0);
    frontLoaded[0] = 1000;
    for (let i = 1; i < 28; i++) frontLoaded[i] = 10;

    // Video 2: back-loaded (low views early, high later)
    const backLoaded = Array(28).fill(0);
    for (let i = 0; i < 27; i++) backLoaded[i] = 10;
    backLoaded[27] = 1000;

    // Video 3: uniform
    const uniform = Array(28).fill(100);

    const videos = [
      { id: 'v1', durationSec: 600, dailyViews: frontLoaded },
      { id: 'v2', durationSec: 600, dailyViews: backLoaded },
      { id: 'v3', durationSec: 600, dailyViews: uniform },
    ];

    const result = fitGrowthCurves(videos);

    // All day 28 points should be normalized to 1.0
    expect(result[27].medianPct).toBeCloseTo(1.0, 5);
    expect(result[27].p25Pct).toBeCloseTo(1.0, 5);
    expect(result[27].p75Pct).toBeCloseTo(1.0, 5);

    // For day 1, the front-loaded video should have a high percentage,
    // the back-loaded should have a low percentage => p25 < median < p75
    expect(result[0].p25Pct).toBeLessThanOrEqual(result[0].medianPct);
    expect(result[0].medianPct).toBeLessThanOrEqual(result[0].p75Pct);
  });

  it('skips videos where day-28 cumulative is zero', () => {
    const dailyViews = Array(28).fill(0);
    const videos = [{ id: 'v_zero', durationSec: 600, dailyViews }];
    expect(fitGrowthCurves(videos)).toEqual([]);
  });

  it('processes only videos with exactly 28 or more daily views', () => {
    const shortViews = Array(27).fill(100);
    const exactViews = Array(28).fill(100);
    const longViews = Array(60).fill(100);

    const videos = [
      { id: 'short', durationSec: 120, dailyViews: shortViews },
      { id: 'exact', durationSec: 120, dailyViews: exactViews },
      { id: 'long', durationSec: 120, dailyViews: longViews },
    ];

    const result = fitGrowthCurves(videos);
    // Two valid videos (exact and long), so result should exist
    expect(result).toHaveLength(28);
  });
});

describe('predictFromCurve', () => {
  /** Build a simple linear growth curve for testing. */
  function buildLinearCurve(): GrowthCurvePoint[] {
    // Linear growth: medianPct at day d = d/28
    return Array.from({ length: 28 }, (_, i) => ({
      day: i + 1,
      medianPct: (i + 1) / 28,
      p25Pct: (i + 1) / 32, // slightly lower
      p75Pct: (i + 1) / 24, // slightly higher
    }));
  }

  it('returns current views when daysSincePublish >= targetDay (7)', () => {
    const curve = buildLinearCurve();
    const result = predictFromCurve(5000, 10, curve);

    expect(result.predicted7d).toBe(5000);
    expect(result.range).toEqual([5000, 5000]);
  });

  it('returns current views when daysSincePublish is exactly the target day', () => {
    const curve = buildLinearCurve();
    const result = predictFromCurve(3000, 7, curve);

    expect(result.predicted7d).toBe(3000);
    expect(result.range).toEqual([3000, 3000]);
  });

  it('projects forward for a video younger than 7 days', () => {
    const curve = buildLinearCurve();
    // Day 3: medianPct = 3/28, targetDay=7: medianPct = 7/28
    // predicted = (1000 / (3/28)) * (7/28) = 1000 * (7/3) ~= 2333
    const result = predictFromCurve(1000, 3, curve);

    expect(result.predicted7d).toBeGreaterThan(1000);
    expect(result.predicted7d).toBeCloseTo(2333, -1); // within rounding
  });

  it('range lower bound is less than or equal to upper bound', () => {
    const curve = buildLinearCurve();
    const result = predictFromCurve(500, 2, curve);

    expect(result.range[0]).toBeLessThanOrEqual(result.range[1]);
  });

  it('returns current views when day is not found in curve (e.g., day 0)', () => {
    const curve = buildLinearCurve();
    const result = predictFromCurve(100, 0, curve);

    expect(result.predicted7d).toBe(100);
    expect(result.range).toEqual([100, 100]);
  });

  it('handles division by zero safety when medianPct is 0', () => {
    // Curve where day 1 has medianPct = 0
    const curve: GrowthCurvePoint[] = Array.from({ length: 28 }, (_, i) => ({
      day: i + 1,
      medianPct: i === 0 ? 0 : (i + 1) / 28,
      p25Pct: i === 0 ? 0 : (i + 1) / 32,
      p75Pct: i === 0 ? 0 : (i + 1) / 24,
    }));

    // daysSincePublish = 1, medianPct = 0 => fallback
    const result = predictFromCurve(500, 1, curve);
    expect(result.predicted7d).toBe(500);
    expect(result.range).toEqual([500, 500]);
  });

  it('produces reasonable predictions for typical early-day scenarios', () => {
    const curve = buildLinearCurve();

    // Day 1 video with 100 views
    const result = predictFromCurve(100, 1, curve);
    // Should project forward: predicted = 100 / (1/28) * (7/28) = 100 * 7 = 700
    expect(result.predicted7d).toBeCloseTo(700, -1);
    expect(result.predicted7d).toBeGreaterThan(100);
  });

  it('returns fallback when daysSincePublish exceeds curve range', () => {
    const curve = buildLinearCurve(); // days 1-28
    const result = predictFromCurve(10000, 35, curve);

    // Day 35 not in curve => point is undefined => fallback
    expect(result.predicted7d).toBe(10000);
    expect(result.range).toEqual([10000, 10000]);
  });
});
