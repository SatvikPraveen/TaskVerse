// research/benchmarks/scaling.ts
//
// Experiment 3 — How do the graph algorithms and the simulator scale?
//
// Measures wall-clock time of topological ordering, critical path, WSJF
// ranking and the single-worker simulation as the backlog grows. The graph
// routines are O(V + E) and should grow linearly; the list scheduler re-ranks
// the ready set at every decision and is expected to be super-linear, which
// is the motivation for capping /api/planning/simulate at per-user backlogs.
import {
  buildGraph,
  criticalPath,
  generateWorkload,
  simulate,
  topologicalOrder,
  wsjf,
} from '@taskverse/scheduler';

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
const SIZES = numberList(args.sizes, [100, 1000, 5000, 20000]);
const REPEATS = Number(typeof args.repeats === 'string' ? args.repeats : 5);
const START = new Date('2026-01-05T09:00:00.000Z');

const time = (fn: () => void): number => {
  const t0 = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - t0) / 1e6;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

interface Row {
  size: number;
  edges: number;
  topologicalMs: number;
  criticalPathMs: number;
  wsjfMs: number;
  simulateMs: number | null;
}

const rows: Row[] = [];
for (const size of SIZES) {
  const tasks = generateWorkload({ size, seed: 11, now: START });
  const graph = buildGraph(tasks);
  const edges = [...graph.prerequisites.values()].reduce((s, set) => s + set.size, 0);
  const rep = (fn: () => void) => median(Array.from({ length: REPEATS }, () => time(fn)));

  rows.push({
    size,
    edges,
    topologicalMs: rep(() => topologicalOrder(buildGraph(tasks))),
    criticalPathMs: rep(() => criticalPath(tasks)),
    wsjfMs: rep(() => wsjf(tasks, { now: START })),
    // The simulator is quadratic in the ready set; skip very large sizes to keep the run short.
    simulateMs: size <= 5000 ? rep(() => simulate(tasks, { policy: 'wsjf', start: START })) : null,
  });
}

const sections: string[] = [];
sections.push('# Experiment 3 — Scaling');
sections.push(`Median of ${REPEATS} repetitions per cell, single thread. Times in milliseconds.`);
sections.push(
  markdownTable(
    ['Tasks', 'Edges', 'Topological sort', 'Critical path', 'WSJF ranking', 'Simulation (1 worker)'],
    rows.map(r => [
      r.size,
      r.edges,
      fmt(r.topologicalMs, 2),
      fmt(r.criticalPathMs, 2),
      fmt(r.wsjfMs, 2),
      r.simulateMs === null ? 'skipped' : fmt(r.simulateMs, 1),
    ])
  )
);
sections.push('## Reproduce');
sections.push(
  '```bash\nnpm run bench:scaling --workspace=research -- --sizes=100,1000,5000,20000 --repeats=5\n```'
);
const stamp = environmentStamp();
sections.push(`Generated ${stamp.generatedAt} on ${stamp.platform}, Node ${stamp.node}.`);

const md = writeMarkdown('scaling', sections.join('\n\n'));
const json = writeJson('scaling', { ...stamp, repeats: REPEATS, rows });
// eslint-disable-next-line no-console
console.log(`Wrote\n  ${md}\n  ${json}`);
