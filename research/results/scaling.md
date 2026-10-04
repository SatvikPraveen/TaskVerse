# Experiment 3 — Scaling

Median of 3 repetitions per cell, single thread. Times in milliseconds.

| Tasks | Edges | Topological sort | Critical path | WSJF ranking | Simulation (1 worker) |
| --- | --- | --- | --- | --- | --- |
| 100 | 103 | 0.06 | 0.15 | 0.68 | 4.9 |
| 1000 | 822 | 1.61 | 5.07 | 3.18 | 243.2 |
| 5000 | 4113 | 2.07 | 3.75 | 8.20 | 6816.5 |
| 20000 | 16361 | 15.72 | 50.63 | 60.94 | skipped |

## Reproduce

```bash
npm run bench:scaling --workspace=research -- --sizes=100,1000,5000,20000 --repeats=5
```

Generated 2026-10-04T00:57:55.215Z on darwin-arm64, Node v20.20.0.
