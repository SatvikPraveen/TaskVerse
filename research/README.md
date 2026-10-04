# TaskVerse research harness

Reproducible experiments on the planning engine in `packages/scheduler`.
Every experiment is deterministic: workloads and Monte Carlo trials are
driven by explicit seeds, and each report records the Node version,
platform and timestamp it was produced with.

| Script           | Question                                                                                                                                         | Output                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `bench:policies` | Which prioritisation policy minimises priority-weighted tardiness, and how does that depend on backlog size, parallelism and deadline tightness? | `results/policy-comparison.{md,json,csv}` |
| `bench:forecast` | Is the bootstrap Monte Carlo forecast calibrated, i.e. does an 85 % horizon cover ~85 % of outcomes, with and without drift?                     | `results/forecast-calibration.{md,json}`  |
| `bench:scaling`  | How do topological sort, critical path, WSJF ranking and the simulator scale with backlog size?                                                  | `results/scaling.{md,json}`               |

```bash
npm run build --workspace=packages/scheduler   # the harness runs against the built package
npm run bench --workspace=research             # all three experiments
npm run bench:policies --workspace=research -- --sizes=50,200 --seeds=1,2,3
```

See `docs/research/methodology.md` for the experimental design, the
synthetic workload model and threats to validity.
