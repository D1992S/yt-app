export const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export const mae = (actual: number[], predicted: number[]) => {
  if (actual.length !== predicted.length) throw new Error("Length mismatch");
  return mean(actual.map((a, i) => Math.abs(a - predicted[i])));
};

export const mape = (actual: number[], predicted: number[]) => {
  if (actual.length !== predicted.length) throw new Error("Length mismatch");
  const errors = actual.map((a, i) => {
    if (a === 0) return 0; // Avoid division by zero
    return Math.abs((a - predicted[i]) / a);
  });
  return mean(errors) * 100;
};

export const smape = (actual: number[], predicted: number[]) => {
  if (actual.length !== predicted.length) throw new Error("Length mismatch");
  const errors = actual.map((a, i) => {
    const denom = Math.abs(a) + Math.abs(predicted[i]);
    if (denom === 0) return 0;
    return (2 * Math.abs(a - predicted[i])) / denom;
  });
  return mean(errors) * 100;
};

export const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const quantile = (values: number[], q: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};
