// research/benchmarks/policy-comparison.ts
//
// Experiment 1 — Which prioritisation policy minimises priority-weighted
// tardiness on realistic backlogs?
//
// Design: a full factorial over backlog size × worker count × deadline
// horizon, replicated over independent seeds. Every policy sees the exact
// same workload instance, so differences are attributable to the policy
// alone (a paired design). Reported: mean ± sample SD across seeds, and the
// number of instances each policy "wins" (lowest weighted tardiness).
import {
  generateWorkload,
  POLICY_NAMES,
  type PolicyName,
  simulate,
  type SimulationMetrics,
} from '@taskverse/scheduler';

import {
  environmentStamp,
  fmt,
  markdownTable,
  meanStd,
  numberList,
  parseArgs,
  writeCsv,
  writeJson,
  writeMarkdown,
} from '../lib/report';

const args = parseArgs(process.argv.slice(2));
const SIZES = numberList(args.sizes, [50, 200, 1000]);
const WORKERS = numberList(args.workers, [1, 3]);
const HORIZONS = numberList(args.horizons, [120, 240, 480]);
const SEEDS = numberList(
  args.seeds,
  Array.from({ length: 10 }, (_, i) => i + 1)
);
const START = new Date('2026-01-05T09:00:00.000Z');

type MetricKey = keyof SimulationMetrics;
const REPORTED: Array<{ key: MetricKey; label: string; lowerIsBetter: boolean }> = [
  { key: 'weightedTardiness', label: 'Weighted tardiness (h)', lowerIsBetter: true },
  { key: 'totalTardiness', label: 'Total tardiness (h)', lowerIsBetter: true },
  { key: 'onTimeRate', label: 'On-time rate', lowerIsBetter: false },
  { key: 'lateTasks', label: 'Late tasks', lowerIsBetter: true },
  { key: 'meanFlowTime', label: 'Mean flow time (h)', lowerIsBetter: true },
  { key: 'makespan', label: 'Makespan (h)', lowerIsBetter: true },
];

type Row = SimulationMetrics & {
  size: number;
  workers: number;
  horizonHours: number;
  seed: number;
  policy: PolicyName;
  elapsedMs: number;
};

const rows: Row[] = [];
const started = Date.now();

for (const size of SIZES) {
  for (const horizonHours of HORIZONS) {
    for (const seed of SEEDS) {
      const tasks = generateWorkload({ size, seed, now: START, horizonHours });
      for (const workers of WORKERS) {
        for (const policy of POLICY_NAMES) {
          const t0 = process.hrtime.bigint();
          const result = simulate(tasks, { policy, start: START, workers });
          const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
          if (result.unscheduled.length > 0)
            throw new Error(`${policy} left ${result.unscheduled.length} tasks unscheduled`);
          rows.push({
            size,
            workers,
            horizonHours,
            seed,
            policy,
            elapsedMs: Number(elapsedMs.toFixed(3)),
            ...result.metrics,
          });
        }
      }
    }
  }
}

// ---- Aggregation --------------------------------------------------------

interface Cell {
  size: number;
  workers: number;
  horizonHours: number;
  policy: PolicyName;
  n: number;
  metrics: Record<MetricKey, { mean: number; std: number }>;
  wins: number;
}

const groupKey = (r: { size: number; workers: number; horizonHours: number }) =>
  `${r.size}|${r.workers}|${r.horizonHours}`;
const cells = new Map<string, Cell>();

for (const size of SIZES) {
  for (const workers of WORKERS) {
    for (const horizonHours of HORIZONS) {
      const instanceRows = rows.filter(
        r => r.size === size && r.workers === workers && r.horizonHours === horizonHours
      );
      for (const policy of POLICY_NAMES) {
        const mine = instanceRows.filter(r => r.policy === policy);
        const metrics = {} as Cell['metrics'];
        for (const { key } of REPORTED) metrics[key] = meanStd(mine.map(r => r[key] as number));
        cells.set(`${groupKey({ size, workers, horizonHours })}|${policy}`, {
          size,
          workers,
          horizonHours,
          policy,
          n: mine.length,
          metrics,
          wins: 0,
        });
      }
      // Paired wins: per seed, the policy with the lowest weighted tardiness (ties share the win).
      for (const seed of SEEDS) {
        const perSeed = instanceRows.filter(r => r.seed === seed);
        const best = Math.min(...perSeed.map(r => r.weightedTardiness));
        for (const r of perSeed) {
          if (r.weightedTardiness === best) cells.get(`${groupKey(r)}|${r.policy}`)!.wins += 1;
        }
      }
    }
  }
}

// Overall ranking: mean rank of each policy on weighted tardiness across all instances.
const rankSums = new Map<PolicyName, number>(POLICY_NAMES.map(p => [p, 0]));
let instances = 0;
for (const size of SIZES)
  for (const workers of WORKERS)
    for (const horizonHours of HORIZONS)
      for (const seed of SEEDS) {
        const perInstance = rows
          .filter(
            r =>
              r.size === size && r.workers === workers && r.horizonHours === horizonHours && r.seed === seed
          )
          .sort((a, b) => a.weightedTardiness - b.weightedTardiness);
        perInstance.forEach((r, i) => rankSums.set(r.policy, rankSums.get(r.policy)! + i + 1));
        instances += 1;
      }
const overall = POLICY_NAMES.map(policy => ({
  policy,
  meanRank: rankSums.get(policy)! / instances,
  wins: [...cells.values()].filter(c => c.policy === policy).reduce((s, c) => s + c.wins, 0),
  meanElapsedMs: meanStd(rows.filter(r => r.policy === policy).map(r => r.elapsedMs)).mean,
})).sort((a, b) => a.meanRank - b.meanRank);

// ---- Reporting ----------------------------------------------------------

const sections: string[] = [];
sections.push('# Experiment 1 — Prioritisation policy comparison');
sections.push(
  `Paired design: every policy schedules the identical workload instance. ` +
    `Sizes ${SIZES.join('/')}, workers ${WORKERS.join('/')}, deadline horizons ${HORIZONS.join('/')} h, ` +
    `${SEEDS.length} seeds → ${instances} instances × ${POLICY_NAMES.length} policies = ${rows.length} simulations. ` +
    `Values are mean ± sample SD over seeds. Lower is better unless stated.`
);
sections.push('## Overall ranking (by mean rank on weighted tardiness)');
sections.push(
  markdownTable(
    ['Rank', 'Policy', 'Mean rank', 'Instance wins', 'Mean runtime (ms)'],
    overall.map((o, i) => [
      i + 1,
      o.policy,
      fmt(o.meanRank),
      `${o.wins}/${instances}`,
      fmt(o.meanElapsedMs, 3),
    ])
  )
);

for (const size of SIZES) {
  for (const workers of WORKERS) {
    for (const horizonHours of HORIZONS) {
      sections.push(`## n = ${size}, workers = ${workers}, horizon = ${horizonHours} h`);
      const groupCells = POLICY_NAMES.map(p =>
        cells.get(`${groupKey({ size, workers, horizonHours })}|${p}`)!
      ).sort((a, b) => a.metrics.weightedTardiness.mean - b.metrics.weightedTardiness.mean);
      sections.push(
        markdownTable(
          ['Policy', ...REPORTED.map(m => m.label + (m.lowerIsBetter ? '' : ' ↑')), 'Wins'],
          groupCells.map(c => [
            c.policy,
            ...REPORTED.map(
              m =>
                `${fmt(c.metrics[m.key].mean, m.key === 'onTimeRate' ? 3 : 1)} ± ${fmt(c.metrics[m.key].std, m.key === 'onTimeRate' ? 3 : 1)}`
            ),
            `${c.wins}/${SEEDS.length}`,
          ])
        )
      );
    }
  }
}

sections.push('## Reproduce');
sections.push(
  '```bash\nnpm run bench:policies --workspace=research -- --sizes=50,200,1000 --workers=1,3 --horizons=120,240,480 --seeds=1,2,3,4,5,6,7,8,9,10\n```'
);
const stamp = environmentStamp();
sections.push(
  `Generated ${stamp.generatedAt} on ${stamp.platform}, Node ${stamp.node}, in ${((Date.now() - started) / 1000).toFixed(1)} s.`
);

const md = writeMarkdown('policy-comparison', sections.join('\n\n'));
const json = writeJson('policy-comparison', {
  ...stamp,
  design: { sizes: SIZES, workers: WORKERS, horizons: HORIZONS, seeds: SEEDS, policies: POLICY_NAMES },
  overall,
  cells: [...cells.values()],
});
const csv = writeCsv('policy-comparison', rows as unknown as Array<Record<string, string | number>>);

// eslint-disable-next-line no-console
console.log(`Wrote\n  ${md}\n  ${json}\n  ${csv}`);
// eslint-disable-next-line no-console
console.log(`\nOverall ranking: ${overall.map(o => `${o.policy} (${fmt(o.meanRank)})`).join(' > ')}`);
