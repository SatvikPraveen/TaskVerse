// packages/scheduler/src/stats.ts

/**
 * Percentile with linear interpolation between closest ranks (the "type 7"
 * estimator used by R, NumPy and Excel). Returns NaN for an empty sample.
 */
export const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return Number.NaN;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;

/** Sample standard deviation (n − 1 denominator). */
export const stddev = (values: readonly number[]): number => {
  if (values.length < 2) return Number.NaN;
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1));
};

export interface DistributionSummary {
  n: number;
  mean: number;
  stddev: number;
  min: number;
  p50: number;
  p85: number;
  p95: number;
  max: number;
}

export const summarize = (values: readonly number[]): DistributionSummary => ({
  n: values.length,
  mean: mean(values),
  stddev: stddev(values),
  min: values.length ? Math.min(...values) : Number.NaN,
  p50: percentile(values, 50),
  p85: percentile(values, 85),
  p95: percentile(values, 95),
  max: values.length ? Math.max(...values) : Number.NaN,
});

/** Rounds to a fixed number of decimals; keeps NaN as NaN. */
export const round = (value: number, decimals = 2): number =>
  Number.isFinite(value) ? Number(value.toFixed(decimals)) : value;
