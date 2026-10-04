// packages/scheduler/src/forecast.ts
import { createRng } from './random';
import { percentile, round } from './stats';

export interface ForecastOptions {
  /** Items still to be completed. */
  remainingItems: number;
  /** Historical throughput samples, e.g. items completed per day, one entry per period. */
  throughputSamples: readonly number[];
  /** Simulation trials. Default 10 000. */
  trials?: number;
  /** PRNG seed for reproducibility. Default 42. */
  seed?: number;
  /** Safety cap on simulated periods per trial. Default 3650. */
  maxPeriods?: number;
}

export interface ForecastResult {
  trials: number;
  /** Periods needed, at the given confidence levels. */
  percentiles: { p50: number; p70: number; p85: number; p95: number };
  meanPeriods: number;
  /** Histogram of periods → number of trials that finished in exactly that many periods. */
  histogram: Array<{ periods: number; count: number }>;
  /** Fraction of trials that hit maxPeriods without finishing. */
  truncatedShare: number;
}

/**
 * Monte Carlo completion forecast by bootstrap resampling of historical
 * throughput (Vacanti, 2015). Each trial draws a throughput value per period
 * with replacement until the remaining work is exhausted. Unlike a velocity
 * average, this preserves the empirical variance of delivery.
 */
export const forecastCompletion = (options: ForecastOptions): ForecastResult | null => {
  const samples = options.throughputSamples.filter(v => Number.isFinite(v) && v >= 0);
  if (samples.length === 0 || !samples.some(v => v > 0)) return null;
  if (options.remainingItems <= 0) {
    return {
      trials: 0,
      percentiles: { p50: 0, p70: 0, p85: 0, p95: 0 },
      meanPeriods: 0,
      histogram: [],
      truncatedShare: 0,
    };
  }

  const trials = Math.max(1, Math.floor(options.trials ?? 10_000));
  const maxPeriods = options.maxPeriods ?? 3650;
  const rng = createRng(options.seed ?? 42);
  const outcomes = new Array<number>(trials);
  let truncated = 0;

  for (let t = 0; t < trials; t += 1) {
    let remaining = options.remainingItems;
    let periods = 0;
    while (remaining > 0 && periods < maxPeriods) {
      remaining -= rng.pick(samples);
      periods += 1;
    }
    if (remaining > 0) truncated += 1;
    outcomes[t] = periods;
  }

  const counts = new Map<number, number>();
  for (const value of outcomes) counts.set(value, (counts.get(value) ?? 0) + 1);
  const histogram = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([periods, count]) => ({ periods, count }));

  return {
    trials,
    percentiles: {
      p50: Math.ceil(percentile(outcomes, 50)),
      p70: Math.ceil(percentile(outcomes, 70)),
      p85: Math.ceil(percentile(outcomes, 85)),
      p95: Math.ceil(percentile(outcomes, 95)),
    },
    meanPeriods: round(outcomes.reduce((a, b) => a + b, 0) / trials),
    histogram,
    truncatedShare: round(truncated / trials, 4),
  };
};
