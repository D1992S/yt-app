export const sum = (values: number[]): number => 
  values.reduce((a, b) => a + b, 0);

export const mean = (values: number[]): number => 
  values.length === 0 ? 0 : sum(values) / values.length;

export const variance = (values: number[]): number => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return sum(values.map(v => Math.pow(v - avg, 2))) / values.length;
};

export const stdDev = (values: number[]): number => 
  Math.sqrt(variance(values));

export const percentChange = (current: number, prev: number): number => {
  if (!prev || prev === 0) return 0;
  return ((current - prev) / prev) * 100;
};

export const roundTo = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

export interface MetricResult {
  total: number;
  average: number;
  min: number;
  max: number;
  trend: number;
  volatility: number;
}

export const calculateMetrics = (data: { value: number }[]): MetricResult => {
  if (data.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0, trend: 0, volatility: 0 };
  }

  const values = data.map((d) => d.value);
  const total = sum(values);
  const average = mean(values);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);

  const avgFirst = mean(firstHalf);
  const avgSecond = mean(secondHalf);

  const trend = avgFirst === 0 ? 0 : ((avgSecond - avgFirst) / avgFirst) * 100;
  const volatilityVal = stdDev(values);

  return {
    total,
    average,
    min: minVal,
    max: maxVal,
    trend,
    volatility: volatilityVal,
  };
};
