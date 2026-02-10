import { mean, smape } from './metrics';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ForecastResult {
  predictions: TimeSeriesPoint[];
  lowerBound?: TimeSeriesPoint[];
  upperBound?: TimeSeriesPoint[];
  modelName: string;
}

export interface TrendVolatility {
  trend: number;
  volatility: number;
}

// Baseline 1: Naive (Last Value)
export const forecastNaive = (history: TimeSeriesPoint[], horizon: number): ForecastResult => {
  const lastVal = history[history.length - 1].value;
  const lastDate = new Date(history[history.length - 1].date);
  
  const predictions = Array.from({ length: horizon }, (_, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().split('T')[0], value: lastVal };
  });

  return { predictions, modelName: 'Naive' };
};

// Baseline 2: Seasonal Naive (Last week's value)
export const forecastSeasonalNaive = (history: TimeSeriesPoint[], horizon: number): ForecastResult => {
  const predictions: TimeSeriesPoint[] = [];
  const lastDate = new Date(history[history.length - 1].date);

  for (let i = 0; i < horizon; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    
    let val = history[history.length - 1].value;
    if (history.length >= 7) {
       // Correct logic: prediction for T+1 uses T-6
       const targetIdx = history.length - 7 + (i % 7);
       if (targetIdx < history.length) val = history[targetIdx].value;
    }

    predictions.push({ date: d.toISOString().split('T')[0], value: val });
  }

  return { predictions, modelName: 'SeasonalNaive' };
};

// Forecast V2: Trend + Seasonality + Momentum
export const forecastV2 = (history: TimeSeriesPoint[], horizon: number): ForecastResult => {
  if (history.length < 28) return forecastNaive(history, horizon);

  // 1. Trend (Linear Regression on last 28 days)
  const recent = history.slice(-28);
  const n = recent.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = recent.map(p => p.value);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, i) => a + i * y[i], 0);
  const sumXX = x.reduce((a, i) => a + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // 2. Seasonality (Day of Week factors)
  const dowFactors = new Array(7).fill(0).map(() => ({ sum: 0, count: 0 }));
  const globalAvg = mean(history.map(p => p.value));
  
  history.forEach(p => {
    const dow = new Date(p.date).getDay();
    dowFactors[dow].sum += p.value;
    dowFactors[dow].count++;
  });
  
  const seasonality = dowFactors.map(d => d.count > 0 ? (d.sum / d.count) / (globalAvg || 1) : 1);

  // 3. Momentum (Last 3 days vs Last 28 days)
  const last3 = history.slice(-3).map(p => p.value);
  const last28 = history.slice(-28).map(p => p.value);
  const momentum = mean(last28) > 0 ? mean(last3) / mean(last28) : 1;
  
  // Dampen momentum over horizon
  const predictions: TimeSeriesPoint[] = [];
  const lastDate = new Date(history[history.length - 1].date);

  for (let i = 0; i < horizon; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const dow = d.getDay();

    // Trend component
    const trendVal = intercept + slope * (n + i);
    
    // Combine
    const val = trendVal * seasonality[dow] * (1 + (momentum - 1) * Math.pow(0.9, i));
    
    predictions.push({ date: d.toISOString().split('T')[0], value: Math.max(0, val) });
  }

  return { predictions, modelName: 'ForecastV2' };
};

// ---------- Holt-Winters (Triple Exponential Smoothing, Additive) ----------

export const forecastHoltWinters = (
  history: TimeSeriesPoint[],
  horizon: number,
  seasonLength = 7
): ForecastResult => {
  // Need at least 3 full seasons (2 for init + some for fitting)
  if (history.length < seasonLength * 3) {
    return forecastV2(history, horizon);
  }

  const y = history.map(p => p.value);
  const n = y.length;

  // --- Initialization using the first 2 seasons ---

  // Initial level: average of the first season
  const firstSeasonAvg =
    y.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;

  // Initial trend: average difference between corresponding points in
  // the first two seasons, divided by season length
  let trendSum = 0;
  for (let i = 0; i < seasonLength; i++) {
    trendSum += (y[seasonLength + i] - y[i]) / seasonLength;
  }
  const initialTrend = trendSum / seasonLength;

  // Initial seasonal indices: deviation from first-season average
  const initialSeasonals: number[] = [];
  for (let i = 0; i < seasonLength; i++) {
    initialSeasonals.push(y[i] - firstSeasonAvg);
  }

  // --- Grid search for alpha, beta, gamma ---
  const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestGamma = 0.3;
  let bestError = Infinity;

  for (const alpha of grid) {
    for (const beta of grid) {
      for (const gamma of grid) {
        const err = hwOneStepError(
          y, seasonLength, alpha, beta, gamma,
          firstSeasonAvg, initialTrend, initialSeasonals
        );
        if (err < bestError) {
          bestError = err;
          bestAlpha = alpha;
          bestBeta = beta;
          bestGamma = gamma;
        }
      }
    }
  }

  // --- Final fit with best parameters ---
  const { levels, trends, seasonals } = hwFit(
    y, seasonLength, bestAlpha, bestBeta, bestGamma,
    firstSeasonAvg, initialTrend, initialSeasonals
  );

  // --- Forecast ---
  const lastDate = new Date(history[history.length - 1].date);
  const predictions: TimeSeriesPoint[] = [];
  const lastLevel = levels[n - 1];
  const lastTrend = trends[n - 1];

  // Compute residuals for confidence intervals
  const residuals: number[] = [];
  for (let t = seasonLength; t < n; t++) {
    const fitted = levels[t - 1] + trends[t - 1] + seasonals[t - seasonLength];
    residuals.push(y[t] - fitted);
  }
  const residStd = stdDev(residuals);

  const lowerBound: TimeSeriesPoint[] = [];
  const upperBound: TimeSeriesPoint[] = [];

  for (let h = 1; h <= horizon; h++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + h);
    const dateStr = d.toISOString().split('T')[0];

    // The seasonal component for step h ahead uses the most recent seasonal
    // value for the corresponding position in the cycle
    const sIdx = n - seasonLength + ((h - 1) % seasonLength);
    const sComp = sIdx >= 0 && sIdx < seasonals.length ? seasonals[sIdx] : 0;

    const pointForecast = lastLevel + h * lastTrend + sComp;
    const val = Math.max(0, pointForecast);
    const margin = 1.96 * residStd * Math.sqrt(h);

    predictions.push({ date: dateStr, value: val });
    lowerBound.push({ date: dateStr, value: Math.max(0, val - margin) });
    upperBound.push({ date: dateStr, value: val + margin });
  }

  return { predictions, lowerBound, upperBound, modelName: 'HoltWinters' };
};

/** Run Holt-Winters smoothing and return all components */
function hwFit(
  y: number[],
  m: number,
  alpha: number,
  beta: number,
  gamma: number,
  initLevel: number,
  initTrend: number,
  initSeasonals: number[]
) {
  const n = y.length;
  const levels = new Array<number>(n);
  const trends = new Array<number>(n);
  const seasonals = new Array<number>(n);

  // Copy initial seasonals for the first season
  for (let i = 0; i < m && i < n; i++) {
    seasonals[i] = initSeasonals[i];
  }

  levels[0] = initLevel;
  trends[0] = initTrend;

  for (let t = 1; t < n; t++) {
    const prevSeasonal = t >= m ? seasonals[t - m] : initSeasonals[t % m];

    // Level
    levels[t] = alpha * (y[t] - prevSeasonal) + (1 - alpha) * (levels[t - 1] + trends[t - 1]);
    // Trend
    trends[t] = beta * (levels[t] - levels[t - 1]) + (1 - beta) * trends[t - 1];
    // Seasonal
    seasonals[t] = gamma * (y[t] - levels[t]) + (1 - gamma) * prevSeasonal;
  }

  return { levels, trends, seasonals };
}

/** Compute mean absolute 1-step-ahead error for parameter tuning */
function hwOneStepError(
  y: number[],
  m: number,
  alpha: number,
  beta: number,
  gamma: number,
  initLevel: number,
  initTrend: number,
  initSeasonals: number[]
): number {
  const { levels, trends, seasonals } = hwFit(
    y, m, alpha, beta, gamma, initLevel, initTrend, initSeasonals
  );

  let totalError = 0;
  let count = 0;

  // Start evaluating from after the initialization period
  for (let t = m; t < y.length - 1; t++) {
    const forecast = levels[t] + trends[t] + seasonals[t + 1 - m];
    totalError += Math.abs(y[t + 1] - forecast);
    count++;
  }

  return count > 0 ? totalError / count : Infinity;
}

// ---------- Ensemble Forecast ----------

export const forecastEnsemble = (
  history: TimeSeriesPoint[],
  horizon: number
): ForecastResult => {
  // Try both models
  let v2Result: ForecastResult | null = null;
  let hwResult: ForecastResult | null = null;

  try {
    v2Result = forecastV2(history, horizon);
  } catch {
    v2Result = null;
  }

  try {
    hwResult = forecastHoltWinters(history, horizon);
  } catch {
    hwResult = null;
  }

  // If one fails, return the other
  if (!v2Result && !hwResult) {
    return forecastNaive(history, horizon);
  }
  if (!v2Result) return { ...hwResult!, modelName: 'Ensemble' };
  if (!hwResult) return { ...v2Result!, modelName: 'Ensemble' };

  // --- Internal backtest to determine weights ---
  let weightV2 = 0.5;
  let weightHW = 0.5;
  const backtestDays = 14;

  if (history.length > backtestDays + 28) {
    const trainHistory = history.slice(0, -backtestDays);
    const holdout = history.slice(-backtestDays);
    const holdoutValues = holdout.map(p => p.value);

    try {
      const btV2 = forecastV2(trainHistory, backtestDays);
      const btHW = forecastHoltWinters(trainHistory, backtestDays);

      const smapeV2 = smape(holdoutValues, btV2.predictions.map(p => p.value));
      const smapeHW = smape(holdoutValues, btHW.predictions.map(p => p.value));

      // Inverse SMAPE weighting (lower error = higher weight)
      // Add small epsilon to avoid division by zero
      const eps = 0.01;
      const invV2 = 1 / (smapeV2 + eps);
      const invHW = 1 / (smapeHW + eps);
      const totalInv = invV2 + invHW;

      weightV2 = invV2 / totalInv;
      weightHW = invHW / totalInv;
    } catch {
      // If backtest fails, keep equal weights
      weightV2 = 0.5;
      weightHW = 0.5;
    }
  }

  // --- Weighted average predictions ---
  const lastDate = new Date(history[history.length - 1].date);
  const predictions: TimeSeriesPoint[] = [];
  const lowerBound: TimeSeriesPoint[] = [];
  const upperBound: TimeSeriesPoint[] = [];

  // Compute residuals for confidence intervals from in-sample fit
  const values = history.map(p => p.value);
  const residuals: number[] = [];
  if (history.length > horizon) {
    // Quick residual estimation: run both models on training minus last `horizon` points
    const trainSlice = history.slice(0, -horizon);
    try {
      const fitV2 = forecastV2(trainSlice, horizon);
      const fitHW = forecastHoltWinters(trainSlice, horizon);
      const actual = history.slice(-horizon);
      for (let i = 0; i < horizon && i < actual.length; i++) {
        const ensembleFitted =
          weightV2 * fitV2.predictions[i].value +
          weightHW * fitHW.predictions[i].value;
        residuals.push(actual[i].value - ensembleFitted);
      }
    } catch {
      // Fallback: use simple stddev of recent values
    }
  }

  const residStd = residuals.length > 2 ? stdDev(residuals) : stdDev(values.slice(-28));

  for (let i = 0; i < horizon; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const dateStr = d.toISOString().split('T')[0];

    const blended =
      weightV2 * v2Result.predictions[i].value +
      weightHW * hwResult.predictions[i].value;

    const val = Math.max(0, blended);
    const margin = 1.96 * residStd * Math.sqrt(i + 1);

    predictions.push({ date: dateStr, value: val });
    lowerBound.push({ date: dateStr, value: Math.max(0, val - margin) });
    upperBound.push({ date: dateStr, value: val + margin });
  }

  return { predictions, lowerBound, upperBound, modelName: 'Ensemble' };
};

// ---------- Trend & Volatility ----------

export const calculateTrendAndVolatility = (
  history: TimeSeriesPoint[]
): TrendVolatility => {
  if (history.length < 2) {
    return { trend: 0, volatility: 0 };
  }

  // Use last 14 days (or all data if shorter)
  const window = history.slice(-14);
  const y = window.map(p => p.value);
  const n = y.length;

  // --- Trend: Linear regression slope as percent change over period ---
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

  // Express as percent change over the period
  const avgY = sumY / n;
  const totalChange = slope * (n - 1); // predicted change from first to last
  const trend = avgY !== 0 ? (totalChange / avgY) * 100 : 0;

  // --- Volatility: Coefficient of variation ---
  const sd = stdDev(y);
  const volatility = avgY !== 0 ? (sd / Math.abs(avgY)) * 100 : 0;

  return { trend, volatility };
};

// ---------- Utility ----------

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}
