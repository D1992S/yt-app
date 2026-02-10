import { describe, it, expect } from 'vitest';
import { runBacktest, calculateConfidenceIntervals, BacktestResult } from '../backtest';
import { TimeSeriesPoint, ForecastResult, forecastNaive } from '../forecasting';

/** Helper: generate a series of TimeSeriesPoints starting from a given date. */
function generateSeries(startDate: string, values: number[]): TimeSeriesPoint[] {
  const start = new Date(startDate);
  return values.map((value, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split('T')[0], value };
  });
}

/** A simple constant forecast function for testing. */
function constantForecast(history: TimeSeriesPoint[], horizon: number): ForecastResult {
  const lastDate = history.length > 0
    ? new Date(history[history.length - 1].date)
    : new Date('2024-01-01');

  const predictions = Array.from({ length: horizon }, (_, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().split('T')[0], value: 100 };
  });

  return { predictions, modelName: 'Constant100' };
}

/**
 * A safe wrapper around forecastNaive that handles empty history.
 * This is necessary because runBacktest calls forecastFn([], 1) to get the model name,
 * but forecastNaive crashes on empty history (accessing undefined.value).
 */
function safeNaiveForecast(history: TimeSeriesPoint[], horizon: number): ForecastResult {
  if (history.length === 0) {
    return { predictions: [{ date: '1970-01-01', value: 0 }], modelName: 'Naive' };
  }
  return forecastNaive(history, horizon);
}

describe('runBacktest', () => {
  it('returns valid metrics with sufficient data', () => {
    // Generate 56 days of data (enough for windowSize=28 + horizon=7 + some rolling)
    const values = Array.from({ length: 56 }, (_, i) => 100 + Math.sin(i) * 10);
    const data = generateSeries('2024-01-01', values);

    const result = runBacktest(data, safeNaiveForecast, 28, 7, 7);

    expect(result.modelName).toBe('Naive');
    expect(typeof result.smape).toBe('number');
    expect(typeof result.mae).toBe('number');
    expect(result.smape).toBeGreaterThanOrEqual(0);
    expect(result.mae).toBeGreaterThanOrEqual(0);
    expect(result.residuals.length).toBeGreaterThan(0);
  });

  it('returns zero metrics and empty residuals when data is too short', () => {
    // With windowSize=28 and horizon=7, need at least 35 points
    // 20 points is too short: loop condition (28 <= 20-7=13) never true
    const data = generateSeries('2024-01-01', Array(20).fill(100));

    const result = runBacktest(data, constantForecast, 28, 7, 7);

    expect(result.smape).toBe(0);
    expect(result.mae).toBe(0);
    expect(result.residuals).toHaveLength(0);
  });

  it('rolling window: produces multiple evaluation windows for long series', () => {
    // 70 days of data, windowSize=28, horizon=7, step=7
    // Windows: i=28,35,42,49,56,63 => 6 windows, each produces 7 residuals = 42 total
    const values = Array.from({ length: 70 }, () => 100);
    const data = generateSeries('2024-01-01', values);

    const result = runBacktest(data, constantForecast, 28, 7, 7);

    // With constant actual=100 and constant prediction=100, MAE and SMAPE should be 0
    expect(result.mae).toBe(0);
    expect(result.smape).toBe(0);
    // 6 windows * 7 horizon = 42 residuals
    expect(result.residuals).toHaveLength(42);
    result.residuals.forEach(r => expect(r).toBe(0));
  });

  it('produces non-zero errors when forecast differs from actual', () => {
    // Actual: linearly increasing
    const values = Array.from({ length: 56 }, (_, i) => i * 10);
    const data = generateSeries('2024-01-01', values);

    // constantForecast always predicts 100
    const result = runBacktest(data, constantForecast, 28, 7, 7);

    expect(result.mae).toBeGreaterThan(0);
    expect(result.smape).toBeGreaterThan(0);
    expect(result.residuals.length).toBeGreaterThan(0);
  });

  it('residuals are actual minus predicted', () => {
    // Actual = 200 everywhere, forecast = 100 everywhere
    const values = Array(42).fill(200);
    const data = generateSeries('2024-01-01', values);

    const result = runBacktest(data, constantForecast, 28, 7, 7);

    // Residuals = actual - predicted = 200 - 100 = 100
    result.residuals.forEach(r => {
      expect(r).toBe(100);
    });
  });

  it('uses the correct step size between windows', () => {
    // 49 days, windowSize=28, horizon=7, step=14
    // i=28 (valid if 28 <= 49-7=42), i=42 (valid if 42<=42)
    // => 2 windows => 14 residuals
    const data = generateSeries('2024-01-01', Array(49).fill(50));

    const result = runBacktest(data, constantForecast, 28, 7, 14);

    // 2 windows * 7 = 14 residuals
    expect(result.residuals).toHaveLength(14);
  });

  it('works with the safe naive forecast wrapper', () => {
    const values = Array.from({ length: 56 }, (_, i) => 100 + i);
    const data = generateSeries('2024-01-01', values);

    const result = runBacktest(data, safeNaiveForecast, 28, 7, 7);

    expect(result.modelName).toBe('Naive');
    expect(result.residuals.length).toBeGreaterThan(0);
  });

  it('handles the exact minimum data length for one window', () => {
    // windowSize=28, horizon=7 => need exactly 35 data points for one window
    // Loop: i=28, check 28 <= 35-7=28 => true => 1 window
    const data = generateSeries('2024-01-01', Array(35).fill(100));

    const result = runBacktest(data, constantForecast, 28, 7, 7);

    // Exactly 1 window * 7 residuals = 7
    expect(result.residuals).toHaveLength(7);
  });

  it('retrieves model name from the forecast function', () => {
    const result = runBacktest(
      generateSeries('2024-01-01', Array(50).fill(100)),
      constantForecast,
      28,
      7,
      7
    );

    expect(result.modelName).toBe('Constant100');
  });
});

describe('calculateConfidenceIntervals', () => {
  it('returns lower and upper bounds with the same number of predictions', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-02', value: 200 },
      { date: '2024-01-03', value: 300 },
    ];
    const residuals = [-20, -10, 0, 10, 20, 30, 40, 50];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    expect(lower).toHaveLength(3);
    expect(upper).toHaveLength(3);
  });

  it('values are non-negative (clamped by Math.max(0, ...))', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 10 },
      { date: '2024-01-02', value: 5 },
    ];
    // Large negative residuals would make lower bound negative without clamping
    const residuals = [-100, -50, -30, -20, -10, 0, 10, 20];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    lower.forEach(p => expect(p.value).toBeGreaterThanOrEqual(0));
    upper.forEach(p => expect(p.value).toBeGreaterThanOrEqual(0));
  });

  it('lower bound is generally less than or equal to upper bound', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 500 },
      { date: '2024-01-02', value: 600 },
      { date: '2024-01-03', value: 700 },
    ];
    // Residuals with clear spread
    const residuals = [-50, -30, -10, 0, 10, 30, 50, 80, 100];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    for (let i = 0; i < predictions.length; i++) {
      expect(lower[i].value).toBeLessThanOrEqual(upper[i].value);
    }
  });

  it('preserves dates from predictions', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-06-15', value: 100 },
      { date: '2024-06-16', value: 200 },
    ];
    const residuals = [-10, 0, 10, 20];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    expect(lower[0].date).toBe('2024-06-15');
    expect(lower[1].date).toBe('2024-06-16');
    expect(upper[0].date).toBe('2024-06-15');
    expect(upper[1].date).toBe('2024-06-16');
  });

  it('handles empty residuals gracefully', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 100 },
    ];
    // Empty residuals: quantile([]) returns 0 for both q25 and q75
    const { lower, upper } = calculateConfidenceIntervals(predictions, []);

    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    // With q25=0 and q75=0, lower = max(0, 100+0) = 100, upper = max(0, 100+0) = 100
    expect(lower[0].value).toBe(100);
    expect(upper[0].value).toBe(100);
  });

  it('uses Q25 for lower bound and Q75 for upper bound of residuals', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 1000 },
    ];
    // Sorted residuals: [-40, -20, 0, 20, 40]
    // Q25: pos = 4*0.25 = 1 => -20
    // Q75: pos = 4*0.75 = 3 => 20
    const residuals = [-40, -20, 0, 20, 40];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    // lower = max(0, 1000 + (-20)) = 980
    expect(lower[0].value).toBe(980);
    // upper = max(0, 1000 + 20) = 1020
    expect(upper[0].value).toBe(1020);
  });

  it('handles all-positive residuals', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 100 },
    ];
    const residuals = [5, 10, 15, 20, 25];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    // Both bounds should be >= predictions since all residuals are positive
    expect(lower[0].value).toBeGreaterThanOrEqual(100);
    expect(upper[0].value).toBeGreaterThanOrEqual(100);
  });

  it('handles all-negative residuals (both bounds shift down)', () => {
    const predictions: TimeSeriesPoint[] = [
      { date: '2024-01-01', value: 500 },
    ];
    const residuals = [-50, -40, -30, -20, -10];

    const { lower, upper } = calculateConfidenceIntervals(predictions, residuals);

    // Both bounds should be <= predictions since all residuals are negative
    expect(lower[0].value).toBeLessThanOrEqual(500);
    expect(upper[0].value).toBeLessThanOrEqual(500);
  });
});
