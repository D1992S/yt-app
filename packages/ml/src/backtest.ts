import { TimeSeriesPoint, ForecastResult } from './forecasting';
import { smape, mae, quantile } from './metrics';

export interface BacktestResult {
  modelName: string;
  smape: number;
  mae: number;
  residuals: number[];
}

export const runBacktest = (
  data: TimeSeriesPoint[], 
  forecastFn: (history: TimeSeriesPoint[], horizon: number) => ForecastResult,
  windowSize = 28,
  horizon = 7,
  step = 7
): BacktestResult => {
  const errorsSmape: number[] = [];
  const errorsMae: number[] = [];
  const residuals: number[] = [];

  // Rolling Window
  // Start when we have enough history (windowSize)
  // Stop when we can't verify full horizon
  for (let i = windowSize; i <= data.length - horizon; i += step) {
    const history = data.slice(0, i);
    const actual = data.slice(i, i + horizon);
    
    const result = forecastFn(history, horizon);
    const predicted = result.predictions;

    const actVals = actual.map(p => p.value);
    const predVals = predicted.map(p => p.value);

    errorsSmape.push(smape(actVals, predVals));
    errorsMae.push(mae(actVals, predVals));
    
    // Collect residuals for quantile estimation
    actVals.forEach((a, idx) => residuals.push(a - predVals[idx]));
  }

  return {
    modelName: forecastFn([], 1).modelName, // Hack to get name
    smape: errorsSmape.length > 0 ? errorsSmape.reduce((a,b)=>a+b,0)/errorsSmape.length : 0,
    mae: errorsMae.length > 0 ? errorsMae.reduce((a,b)=>a+b,0)/errorsMae.length : 0,
    residuals
  };
};

export const calculateConfidenceIntervals = (
  predictions: TimeSeriesPoint[], 
  residuals: number[]
) => {
  const q25 = quantile(residuals, 0.25);
  const q75 = quantile(residuals, 0.75);

  const lower = predictions.map(p => ({ ...p, value: Math.max(0, p.value + q25) }));
  const upper = predictions.map(p => ({ ...p, value: Math.max(0, p.value + q75) }));

  return { lower, upper };
};
