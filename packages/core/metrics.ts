import { DataPoint, MetricResult } from '../../types';

export const calculateMetrics = (data: DataPoint[]): MetricResult => {
  if (data.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0, trend: 0, volatility: 0 };
  }

  const values = data.map((d) => d.value);
  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate Trend (First half vs Second half)
  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);
  
  const avgFirst = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const avgSecond = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  
  const trend = avgFirst === 0 ? 0 : ((avgSecond - avgFirst) / avgFirst) * 100;

  // Calculate Volatility (Standard Deviation)
  const squareDiffs = values.map((value) => {
    const diff = value - average;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  const volatility = Math.sqrt(avgSquareDiff);

  return {
    total,
    average,
    min,
    max,
    trend,
    volatility,
  };
};
