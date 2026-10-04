# Experiment 2 — Forecast calibration

For each configuration, 300 independent latent throughput processes were generated (weekday seasonality, Poisson noise, optional slow drift). The forecaster saw only the history window, quoted completion horizons at 50/70/85/95 % confidence (4000 bootstrap trials), and the true process was then played forward. "Coverage" is the share of runs whose actual completion fell within the quoted horizon; a calibrated forecaster has coverage ≈ nominal.

## Stationary process

| History (days) | Backlog | Cov. @50 | Cov. @70 | Cov. @85 | Cov. @95 | Mean actual (d) | Mean P50 (d) | Mean P85 (d) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | 10 | 0.877 | 0.963 | 0.967 | 0.980 | 3.9 | 4.8 | 6.9 |
| 14 | 40 | 0.670 | 0.810 | 0.917 | 0.967 | 16.9 | 18.4 | 22.1 |
| 14 | 120 | 0.573 | 0.667 | 0.773 | 0.863 | 51.2 | 53.1 | 59.3 |
| 30 | 10 | 0.540 | 0.683 | 0.890 | 0.977 | 4.7 | 4.7 | 6.7 |
| 30 | 40 | 0.580 | 0.747 | 0.873 | 0.947 | 17.6 | 17.6 | 21.3 |
| 30 | 120 | 0.490 | 0.667 | 0.793 | 0.893 | 52.0 | 51.7 | 57.8 |
| 60 | 10 | 0.430 | 0.757 | 0.907 | 0.983 | 5.4 | 4.7 | 6.6 |
| 60 | 40 | 0.427 | 0.623 | 0.810 | 0.940 | 18.6 | 17.4 | 21.0 |
| 60 | 120 | 0.467 | 0.660 | 0.793 | 0.900 | 52.6 | 51.6 | 57.7 |
| 120 | 10 | 0.753 | 0.797 | 0.890 | 0.993 | 4.3 | 4.8 | 6.7 |
| 120 | 40 | 0.677 | 0.817 | 0.897 | 0.970 | 17.6 | 17.7 | 21.3 |
| 120 | 120 | 0.590 | 0.750 | 0.903 | 0.983 | 51.7 | 52.4 | 58.7 |

## Non-stationary process (drifting level)

| History (days) | Backlog | Cov. @50 | Cov. @70 | Cov. @85 | Cov. @95 | Mean actual (d) | Mean P50 (d) | Mean P85 (d) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | 10 | 0.867 | 0.927 | 0.950 | 0.993 | 4.0 | 4.9 | 6.9 |
| 14 | 40 | 0.637 | 0.780 | 0.890 | 0.950 | 17.3 | 18.5 | 22.3 |
| 14 | 120 | 0.570 | 0.667 | 0.730 | 0.830 | 52.8 | 54.5 | 60.9 |
| 30 | 10 | 0.570 | 0.720 | 0.877 | 0.980 | 4.8 | 4.9 | 6.8 |
| 30 | 40 | 0.463 | 0.677 | 0.807 | 0.930 | 18.5 | 17.7 | 21.3 |
| 30 | 120 | 0.463 | 0.620 | 0.713 | 0.780 | 54.3 | 52.8 | 59.0 |
| 60 | 10 | 0.380 | 0.693 | 0.880 | 0.957 | 5.7 | 4.7 | 6.6 |
| 60 | 40 | 0.497 | 0.627 | 0.747 | 0.887 | 18.8 | 17.7 | 21.4 |
| 60 | 120 | 0.453 | 0.593 | 0.690 | 0.780 | 55.6 | 51.8 | 58.0 |
| 120 | 10 | 0.700 | 0.773 | 0.903 | 0.973 | 4.6 | 4.8 | 6.9 |
| 120 | 40 | 0.600 | 0.733 | 0.827 | 0.920 | 18.8 | 18.5 | 22.3 |
| 120 | 120 | 0.483 | 0.610 | 0.697 | 0.780 | 57.0 | 53.7 | 60.2 |

Largest absolute deviation from nominal at the 85 % level across all configurations: 0.160.

## Reproduce

```bash
npm run bench:forecast --workspace=research -- --history=14,30,60,120 --backlog=10,40,120 --runs=300 --trials=4000
```

Generated 2026-10-04T00:58:08.730Z on darwin-arm64, Node v20.20.0.
