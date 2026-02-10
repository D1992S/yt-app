import { TimeSeriesPoint } from './forecasting';

export interface AnomalyResult {
  date: string;
  value: number;
  zScore: number;
  type: 'spike' | 'drop';
  severity: 'warning' | 'critical';
}

export interface TrendBreakResult {
  breakDate: string;
  meanBefore: number;
  meanAfter: number;
  changePercent: number;
}

// ---------- Rolling Z-Score Anomaly Detection ----------

export const detectAnomalies = (
  data: TimeSeriesPoint[],
  sensitivity = 2.5
): AnomalyResult[] => {
  const windowSize = 14;

  if (data.length <= windowSize) {
    return [];
  }

  const anomalies: AnomalyResult[] = [];

  for (let i = windowSize; i < data.length; i++) {
    // Rolling window: the 14 points preceding this one
    const window = data.slice(i - windowSize, i).map(p => p.value);

    const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
    const windowStd = sampleStdDev(window);

    // Skip if stddev is effectively zero (constant window)
    if (windowStd < 1e-10) continue;

    const zScore = (data[i].value - windowMean) / windowStd;
    const absZ = Math.abs(zScore);

    if (absZ > sensitivity) {
      anomalies.push({
        date: data[i].date,
        value: data[i].value,
        zScore,
        type: zScore > 0 ? 'spike' : 'drop',
        severity: absZ > 3.5 ? 'critical' : 'warning',
      });
    }
  }

  return anomalies;
};

// ---------- Trend Break Detection via CUSUM ----------

export const detectTrendBreak = (
  data: TimeSeriesPoint[]
): TrendBreakResult | null => {
  if (data.length < 10) return null;

  const values = data.map(p => p.value);
  const n = values.length;
  const globalMean = values.reduce((a, b) => a + b, 0) / n;

  // Compute CUSUM (cumulative sum of deviations from the global mean)
  const cusum = new Array<number>(n);
  cusum[0] = values[0] - globalMean;
  for (let i = 1; i < n; i++) {
    cusum[i] = cusum[i - 1] + (values[i] - globalMean);
  }

  // Find the point of maximum absolute deviation in the CUSUM
  // This indicates the most likely structural break point
  let maxAbsDev = 0;
  let breakIdx = -1;

  for (let i = 1; i < n - 1; i++) {
    const absDev = Math.abs(cusum[i]);
    if (absDev > maxAbsDev) {
      maxAbsDev = absDev;
      breakIdx = i;
    }
  }

  if (breakIdx < 0) return null;

  // Compute means before and after the break
  const before = values.slice(0, breakIdx + 1);
  const after = values.slice(breakIdx + 1);

  if (before.length === 0 || after.length === 0) return null;

  const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
  const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;

  // Statistical significance check:
  // The break must represent a meaningful change relative to overall variance
  const globalStd = sampleStdDev(values);
  const changeMagnitude = Math.abs(meanAfter - meanBefore);

  // Require the change to be at least 1 standard deviation
  if (globalStd > 0 && changeMagnitude < globalStd) {
    return null;
  }

  const changePercent =
    meanBefore !== 0 ? ((meanAfter - meanBefore) / Math.abs(meanBefore)) * 100 : 0;

  return {
    breakDate: data[breakIdx + 1].date,
    meanBefore,
    meanAfter,
    changePercent,
  };
};

// ---------- Utility ----------

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}
