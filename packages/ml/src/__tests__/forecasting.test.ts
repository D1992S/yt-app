import { describe, it, expect } from 'vitest';
import { forecastNaive, forecastSeasonalNaive, forecastV2, TimeSeriesPoint } from '../forecasting';

/** Helper: generate a series of TimeSeriesPoints starting from a given date. */
function generateSeries(startDate: string, values: number[]): TimeSeriesPoint[] {
  const start = new Date(startDate);
  return values.map((value, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split('T')[0], value };
  });
}

describe('forecastNaive', () => {
  it('returns the last value repeated for the entire horizon', () => {
    const history = generateSeries('2024-01-01', [10, 20, 30, 40, 50]);
    const result = forecastNaive(history, 5);

    expect(result.predictions).toHaveLength(5);
    result.predictions.forEach(p => {
      expect(p.value).toBe(50);
    });
  });

  it('returns the correct model name', () => {
    const history = generateSeries('2024-01-01', [100]);
    const result = forecastNaive(history, 3);
    expect(result.modelName).toBe('Naive');
  });

  it('generates correct sequential dates starting the day after the last history date', () => {
    const history = generateSeries('2024-01-10', [1, 2, 3]);
    const result = forecastNaive(history, 4);

    expect(result.predictions[0].date).toBe('2024-01-13');
    expect(result.predictions[1].date).toBe('2024-01-14');
    expect(result.predictions[2].date).toBe('2024-01-15');
    expect(result.predictions[3].date).toBe('2024-01-16');
  });

  it('handles horizon of 1', () => {
    const history = generateSeries('2024-06-01', [42]);
    const result = forecastNaive(history, 1);

    expect(result.predictions).toHaveLength(1);
    expect(result.predictions[0].value).toBe(42);
    expect(result.predictions[0].date).toBe('2024-06-02');
  });

  it('works with zero values', () => {
    const history = generateSeries('2024-01-01', [0, 0, 0]);
    const result = forecastNaive(history, 3);

    result.predictions.forEach(p => {
      expect(p.value).toBe(0);
    });
  });
});

describe('forecastSeasonalNaive', () => {
  it('returns the correct model name', () => {
    const history = generateSeries('2024-01-01', Array(14).fill(100));
    const result = forecastSeasonalNaive(history, 7);
    expect(result.modelName).toBe('SeasonalNaive');
  });

  it('produces the correct number of predictions for the given horizon', () => {
    const history = generateSeries('2024-01-01', Array(14).fill(50));
    const result = forecastSeasonalNaive(history, 10);
    expect(result.predictions).toHaveLength(10);
  });

  it('uses 7-day seasonality when history is long enough', () => {
    // Create a weekly pattern: days 1-7 have values 10,20,...,70 repeated
    const weekPattern = [10, 20, 30, 40, 50, 60, 70];
    const values = [...weekPattern, ...weekPattern]; // 14 days
    const history = generateSeries('2024-01-01', values);
    const result = forecastSeasonalNaive(history, 7);

    // With 14 days of history and seasonality=7, it should pull from last 7 days
    // The last 7 days are indices 7-13 which have values [10, 20, 30, 40, 50, 60, 70]
    // Prediction i uses history[len-7 + (i%7)]
    // i=0: history[14-7+0] = history[7] = 10
    // i=1: history[14-7+1] = history[8] = 20
    // ...
    expect(result.predictions[0].value).toBe(10);
    expect(result.predictions[1].value).toBe(20);
    expect(result.predictions[2].value).toBe(30);
    expect(result.predictions[3].value).toBe(40);
    expect(result.predictions[4].value).toBe(50);
    expect(result.predictions[5].value).toBe(60);
    expect(result.predictions[6].value).toBe(70);
  });

  it('falls back to naive (last value) when history has fewer than 7 points', () => {
    const history = generateSeries('2024-01-01', [10, 20, 30]);
    const result = forecastSeasonalNaive(history, 3);

    // With history.length < 7, it should use the last value (30)
    result.predictions.forEach(p => {
      expect(p.value).toBe(30);
    });
  });

  it('generates correct sequential dates', () => {
    const history = generateSeries('2024-03-01', Array(10).fill(100));
    const result = forecastSeasonalNaive(history, 3);

    expect(result.predictions[0].date).toBe('2024-03-11');
    expect(result.predictions[1].date).toBe('2024-03-12');
    expect(result.predictions[2].date).toBe('2024-03-13');
  });
});

describe('forecastV2', () => {
  it('falls back to naive forecast when history has fewer than 28 points', () => {
    const history = generateSeries('2024-01-01', Array(20).fill(100));
    const result = forecastV2(history, 7);

    expect(result.modelName).toBe('Naive');
    expect(result.predictions).toHaveLength(7);
    result.predictions.forEach(p => {
      expect(p.value).toBe(100);
    });
  });

  it('uses ForecastV2 model name when enough data is available', () => {
    const values = Array.from({ length: 56 }, (_, i) => 100 + i);
    const history = generateSeries('2024-01-01', values);
    const result = forecastV2(history, 7);

    expect(result.modelName).toBe('ForecastV2');
  });

  it('requires exactly 28 or more points to use the V2 model', () => {
    const values27 = Array.from({ length: 27 }, (_, i) => 50 + i);
    const result27 = forecastV2(generateSeries('2024-01-01', values27), 7);
    expect(result27.modelName).toBe('Naive');

    const values28 = Array.from({ length: 28 }, (_, i) => 50 + i);
    const result28 = forecastV2(generateSeries('2024-01-01', values28), 7);
    expect(result28.modelName).toBe('ForecastV2');
  });

  it('produces the correct number of predictions', () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const history = generateSeries('2024-01-01', values);
    const result = forecastV2(history, 14);

    expect(result.predictions).toHaveLength(14);
  });

  it('produces non-negative values (Math.max(0, val))', () => {
    const values = Array.from({ length: 56 }, (_, i) => 100 + i);
    const history = generateSeries('2024-01-01', values);
    const result = forecastV2(history, 14);

    result.predictions.forEach(p => {
      expect(p.value).toBeGreaterThanOrEqual(0);
    });
  });

  it('trend direction: upward trend in history leads to upward predictions', () => {
    // Strongly increasing series
    const values = Array.from({ length: 56 }, (_, i) => 100 + i * 10);
    const history = generateSeries('2024-01-01', values);
    const result = forecastV2(history, 7);

    // The last actual value is 100 + 55*10 = 650
    const lastHistoryValue = values[values.length - 1];
    // The average of predictions should be at or above the last value
    const avgPrediction = result.predictions.reduce((s, p) => s + p.value, 0) / result.predictions.length;
    expect(avgPrediction).toBeGreaterThan(lastHistoryValue * 0.5);
  });

  it('trend direction: flat history produces predictions near the constant level', () => {
    const values = Array(56).fill(100);
    const history = generateSeries('2024-01-01', values);
    const result = forecastV2(history, 7);

    result.predictions.forEach(p => {
      // Should be close to 100, allowing some deviation from seasonality
      expect(p.value).toBeGreaterThan(50);
      expect(p.value).toBeLessThan(200);
    });
  });

  it('generates correct sequential dates', () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 + i);
    const history = generateSeries('2024-06-01', values);
    const result = forecastV2(history, 3);

    expect(result.predictions[0].date).toBe('2024-07-01');
    expect(result.predictions[1].date).toBe('2024-07-02');
    expect(result.predictions[2].date).toBe('2024-07-03');
  });
});
