import { MetricRow, mean, variance, stdDev } from '@insight/shared';

export interface Anomaly {
  date: string;
  metric: string;
  value: number;
  expected: number;
  deviation: number; // Standard deviations
}

export const detectAnomalies = (data: MetricRow[], metricName: string, thresholdStdDev = 2.0): Anomaly[] => {
  const values = data.filter(d => d.metric === metricName).map(d => d.value);
  if (values.length < 5) return [];

  const avg = mean(values);
  const dev = stdDev(values);

  if (dev === 0) return [];

  return data
    .filter(d => d.metric === metricName)
    .map(d => {
      const deviation = (d.value - avg) / dev;
      return {
        date: d.date,
        metric: metricName,
        value: d.value,
        expected: avg,
        deviation
      };
    })
    .filter(a => Math.abs(a.deviation) > thresholdStdDev);
};
