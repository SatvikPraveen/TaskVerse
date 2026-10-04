# @taskverse/scheduler

A pure, dependency-free TypeScript planning engine. Nothing in this package
touches a database, the network or the system clock: every routine takes `now`
as an argument and every stochastic routine takes a seed, so results are
reproducible bit-for-bit.

## What it provides

| Module | Algorithm | Reference |
| --- | --- | --- |
| `graph` | Dependency DAG, Kahn topological sort, three-colour cycle detection, cycle-safe edge insertion, transitive fan-out | Kahn (1962) |
| `criticalPath` | Critical Path Method: forward/backward pass, slack, critical chain | Kelley & Walker (1959) |
| `policies` | FIFO, static priority, Shortest Processing Time, Earliest Deadline First, Weighted Shortest Job First, Eisenhower matrix | Smith (1956); Liu & Layland (1973); Reinertsen (2009); Covey (1989) |
| `simulate` | Non-preemptive list scheduling on *k* workers with dependency constraints; makespan, flow time, (weighted) tardiness, on-time rate | Graham (1966) |
| `forecast` | Monte Carlo completion forecast by bootstrap resampling of throughput | Vacanti (2015) |
| `metrics` | Cycle time, lead time, throughput, cumulative flow, aging WIP, Little's Law | Little (1961) |

## Usage

```ts
import { criticalPath, wsjf, simulate, forecastCompletion } from '@taskverse/scheduler';

const ranked = wsjf(tasks, { now: new Date() });
const cpm = criticalPath(tasks);
const run = simulate(tasks, { policy: 'edf', workers: 2 });
const eta = forecastCompletion({ remainingItems: 40, throughputSamples: [3, 1, 4, 0, 2], seed: 42 });
```

`tasks` is any array of `SchedulableTask` objects; the API adapts its Mongoose
documents, the research harness generates synthetic workloads with
`generateWorkload`.

## Testing

```bash
npm test --workspace=packages/scheduler
```

Tests use the Node test runner and cover textbook examples (the CPM example
with known slack values, EDF beating FIFO under deadline conflicts), invariants
(dependencies never violated, determinism) and degenerate input (cycles,
empty history).
