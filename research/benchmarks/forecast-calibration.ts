// research/benchmarks/forecast-calibration.ts
//
// Experiment 2 — Is the Monte Carlo completion forecast calibrated?
//
// A forecast that says "85 % confidence" should be right about 85 % of the
// time. We generate a latent daily throughput process with weekday
// seasonality and random shocks, show the forecaster only a finite history
// window, ask it for the P50/P70/P85/P95 completion horizon of a backlog,
// then play the true process forward and record whether the backlog really
// finished within each quoted horizon. Coverage close to the nominal level
// means the bootstrap captures the real variance; coverage far below means
// the history was too short or the process non-stationary.
import { createRng, forecastCompletion } from '@taskverse/scheduler';

import {
  environmentStamp,
  fmt,
  markdownTable,
  numberList,
  parseArgs,
  writeJson,
  writeMarkdown,
} from '../lib/report';

const args = parseArgs(process.argv.slice(2));
const HISTORY_DAYS = numberList(args.history, [14, 30, 60, 120]);
const BACKLOGS = numberList(args.backlog, [10, 40, 120]);
const RUNS = Number(typeof args.runs === 'string' ? args.runs : 300);
const TRIALS = Number(typeof args.trials === 'string' ? args.trials : 4000);
const LEVELS = [50, 70, 85, 95] as const;

/**
 * Latent process: mean 3 items/day on weekdays, 0.6 at weekends, with a
 * slowly drifting multiplier and Poisson-like noise. Non-stationarity is
 * deliberate: it is what real teams look like.
 */
const makeProcess = (seed: number, drift: boolean) => {
  const rng = createRng(seed);
  let level = 1;
  return (day: number): number => {
    if (drift && day % 30 === 0) level = Math.max(0.4, Math.min(1.8, level + (rng.next() - 0.5) * 0.4));
    const weekday = day % 7 < 5;
    const lambda = (weekday ? 3 : 0.6) * level;
    // Knuth Poisson sampler.
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= rng.next();
    } while (p > limit);
    return k - 1;
  };
};

interface Outcome {
  historyDays: number;
  backlog: number;
  drift: boolean;
  covered: Record<(typeof LEVELS)[number], number>;
  meanActualDays: number;
  meanP50: number;
  meanP85: number;
  runs: number;
  skipped: number;
}

const outcomes: Outcome[] = [];

for (const drift of [false, true]) {
  for (const historyDays of HISTORY_DAYS) {
    for (const backlog of BACKLOGS) {
      const covered = { 50: 0, 70: 0, 85: 0, 95: 0 };
      let actualSum = 0;
      let p50Sum = 0;
      let p85Sum = 0;
      let runs = 0;
      let skipped = 0;

      for (let run = 1; run <= RUNS; run += 1) {
        const seed = 1000 * historyDays + 10 * backlog + run + (drift ? 500_000 : 0);
        const next = makeProcess(seed, drift);
        const history: number[] = [];
        for (let day = 0; day < historyDays; day += 1) history.push(next(day));

        const forecast = forecastCompletion({
          remainingItems: backlog,
          throughputSamples: history,
          trials: TRIALS,
          seed,
        });
        if (!forecast) {
          skipped += 1;
          continue;
        }

        let remaining = backlog;
        let actualDays = 0;
        while (remaining > 0 && actualDays < 10_000) {
          remaining -= next(historyDays + actualDays);
          actualDays += 1;
        }

        for (const level of LEVELS) {
          if (actualDays <= forecast.percentiles[`p${level}`]) covered[level] += 1;
        }
        actualSum += actualDays;
        p50Sum += forecast.percentiles.p50;
        p85Sum += forecast.percentiles.p85;
        runs += 1;
      }

      outcomes.push({
        historyDays,
        backlog,
        drift,
        covered: {
          50: covered[50] / runs,
          70: covered[70] / runs,
          85: covered[85] / runs,
          95: covered[95] / runs,
        },
        meanActualDays: actualSum / runs,
        meanP50: p50Sum / runs,
        meanP85: p85Sum / runs,
        runs,
        skipped,
      });
    }
  }
}

const sections: string[] = [];
sections.push('# Experiment 2 — Forecast calibration');
sections.push(
  `For each configuration, ${RUNS} independent latent throughput processes were generated (weekday seasonality, Poisson noise, ` +
    `optional slow drift). The forecaster saw only the history window, quoted completion horizons at 50/70/85/95 % confidence ` +
    `(${TRIALS} bootstrap trials), and the true process was then played forward. "Coverage" is the share of runs whose actual ` +
    `completion fell within the quoted horizon; a calibrated forecaster has coverage ≈ nominal.`
);

for (const drift of [false, true]) {
  sections.push(`## ${drift ? 'Non-stationary process (drifting level)' : 'Stationary process'}`);
  sections.push(
    markdownTable(
      [
        'History (days)',
        'Backlog',
        'Cov. @50',
        'Cov. @70',
        'Cov. @85',
        'Cov. @95',
        'Mean actual (d)',
        'Mean P50 (d)',
        'Mean P85 (d)',
      ],
      outcomes
        .filter(o => o.drift === drift)
        .map(o => [
          o.historyDays,
          o.backlog,
          fmt(o.covered[50], 3),
          fmt(o.covered[70], 3),
          fmt(o.covered[85], 3),
          fmt(o.covered[95], 3),
          fmt(o.meanActualDays, 1),
          fmt(o.meanP50, 1),
          fmt(o.meanP85, 1),
        ])
    )
  );
}

const worst = outcomes.reduce((acc, o) => Math.max(acc, Math.abs(o.covered[85] - 0.85)), 0);
sections.push(
  `Largest absolute deviation from nominal at the 85 % level across all configurations: ${fmt(worst, 3)}.`
);
sections.push('## Reproduce');
sections.push(
  '```bash\nnpm run bench:forecast --workspace=research -- --history=14,30,60,120 --backlog=10,40,120 --runs=300 --trials=4000\n```'
);
const stamp = environmentStamp();
sections.push(`Generated ${stamp.generatedAt} on ${stamp.platform}, Node ${stamp.node}.`);

const md = writeMarkdown('forecast-calibration', sections.join('\n\n'));
const json = writeJson('forecast-calibration', {
  ...stamp,
  design: { HISTORY_DAYS, BACKLOGS, RUNS, TRIALS },
  outcomes,
});
// eslint-disable-next-line no-console
console.log(`Wrote\n  ${md}\n  ${json}`);
