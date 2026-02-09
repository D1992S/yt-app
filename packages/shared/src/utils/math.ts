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
