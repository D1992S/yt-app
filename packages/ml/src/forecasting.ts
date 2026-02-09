import { mean, median, quantile } from './metrics';

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
    
    // Look back 7 days
    const lookbackIdx = history.length - 1 - (7 - ((i % 7))); 
    // Simplified: just take value from 7 days ago relative to prediction date
    // If history is short, fallback to naive
    const histIdx = history.length - 7 + (i % 7);
    
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
