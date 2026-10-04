# Methodology

This document describes how the planning engine in `packages/scheduler` is
evaluated, so that the numbers in `research/results/` can be interpreted,
reproduced and criticised. The experiments are implemented in
`research/benchmarks/` and are deterministic given their seeds.

## 1. Problem statement

A user has a backlog of tasks, each with a priority (ordinal, 1–4), an optional
deadline, an optional effort estimate in hours, and optional prerequisite
tasks. One or more workers process tasks non-preemptively. A _prioritisation
policy_ decides, whenever a worker is free, which ready task to start. We ask:

1. Which policy minimises the harm of lateness, and how does the answer depend
   on backlog size, parallelism and deadline tightness? (Experiment 1)
2. When forecasting completion dates from historical throughput, are the
   quoted confidence levels honest? (Experiment 2)
3. Do the graph algorithms and the simulator scale to realistic backlogs?
   (Experiment 3)

## 2. Synthetic workload model

Real task data is private and rarely carries ground-truth effort. We therefore
use a seeded generator (`generateWorkload` in `packages/scheduler/src/fixtures.ts`)
whose distributions mimic observed backlogs:

| Attribute       | Distribution                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Priority weight | Categorical, skewed to medium: P(1)=1/7, P(2)=3/7, P(3)=2/7, P(4)=1/7                                                                            |
| Effort estimate | Present with probability 0.8; `0.5 + exp(U·2.2)` hours rounded to 0.5 (right-skewed, 1.5–10 h)                                                   |
| Deadline        | Present with probability 0.7; 15 % of dated tasks are already overdue by up to 72 h, the rest due uniformly within the _horizon_ (120/240/480 h) |
| Age             | Created uniformly within the last 30 days                                                                                                        |
| Dependencies    | 0–3 prerequisites per task drawn from earlier tasks only, so the graph is acyclic by construction; mean ≈ 0.6 edges per task                     |
| State           | All open at the start of the simulation (Experiment 1); `completedShare` controls history for analytics tests                                    |

Limitations of this model are discussed in §6.

## 3. Policies under test

| Policy       | Rule                                                | Reference             |
| ------------ | --------------------------------------------------- | --------------------- |
| `fifo`       | Oldest task first                                   | Queueing baseline     |
| `priority`   | Highest priority weight; ties by deadline, then age | Issue-tracker default |
| `spt`        | Shortest estimated job first                        | Smith (1956)          |
| `edf`        | Earliest deadline first; undated tasks last         | Liu & Layland (1973)  |
| `wsjf`       | (value + time criticality + unblocking) ÷ job size  | Reinertsen (2009)     |
| `eisenhower` | Important × urgent quadrants, then deadline         | Covey (1989)          |

WSJF's components are mapped as follows: _value_ is the priority weight;
_time criticality_ ramps linearly from 0 at the horizon to 4 at the deadline
and saturates at 5 when overdue; _unblocking_ is the transitive number of
dependents, capped at 4; _job size_ is the estimate (default 2 h, floor 0.25 h).
These are documented heuristics, not fitted parameters.

## 4. Simulation and metrics

`simulate()` is a non-preemptive list scheduler: at every decision point the
policy ranks the _ready set_ (prerequisites complete, not started) and the
top task is assigned to the free worker. Durations are the estimates.

For a schedule with completion times $C_i$ and deadlines $d_i$:

| Metric                 | Definition                                      | Why it matters                                                         |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| Tardiness              | $T_i = \max(0, C_i - d_i)$                      | Lateness that actually hurts; earliness is not rewarded                |
| **Weighted tardiness** | $\sum_i w_i T_i$ with $w_i$ the priority weight | Primary objective: lateness on important work costs more               |
| Total tardiness        | $\sum_i T_i$                                    | Unweighted view                                                        |
| On-time rate           | share of dated tasks with $T_i = 0$             | Service-level view                                                     |
| Late tasks             | count of $T_i > 0$                              |                                                                        |
| Mean flow time         | mean $C_i$                                      | Responsiveness; SPT is optimal for this on one machine                 |
| Makespan               | $\max_i C_i$                                    | Total duration; identical across policies on one worker with no idling |

## 5. Experimental design and statistics

**Experiment 1** is a full factorial over size {50, 200, 1000} × workers
{1, 3} × horizon {120, 240, 480 h}, replicated over 10 seeds. Every policy
schedules the _identical_ instance, i.e. a paired design: differences between
policies are not confounded by workload variance. We report mean ± sample
standard deviation over seeds for each cell, the number of instances each
policy wins (lowest weighted tardiness, ties shared), and the mean rank of
each policy across all 180 instances. We deliberately avoid null-hypothesis
significance tests on synthetic data where the number of seeds is a free
parameter; the paired wins and the spread of the SDs are the honest summary.

**Experiment 2** generates a latent throughput process (Poisson counts with
weekday seasonality, optionally with a slowly drifting level), reveals only a
history window to the forecaster, and then plays the true process forward.
_Coverage_ at level $q$ is the fraction of runs whose actual completion time
is at or below the forecast's $q$-th percentile. A calibrated forecaster has
coverage ≈ $q$. We report coverage at 50/70/85/95 % across history lengths
{14, 30, 60, 120 days} and backlog sizes {10, 40, 120}, with and without drift.

**Experiment 3** reports the median wall-clock time of three repetitions for
topological sort, critical path, WSJF ranking and the simulator at sizes
{100, 1 000, 5 000, 20 000}.

## 6. Threats to validity

- **Construct**: the synthetic generator encodes assumptions (skewed effort,
  uniform deadlines, sparse acyclic dependencies). A policy that exploits
  those assumptions may not transfer to a real team. Mitigation: all
  distribution parameters are exposed as options so the study can be re-run
  under other assumptions; the API's `/api/planning/simulate` runs the same
  comparison on a user's _actual_ backlog.
- **Internal**: estimates are treated as true durations. In practice estimates
  are noisy and biased; SPT and WSJF, which divide by estimates, are the most
  exposed to this. A follow-up should perturb durations with multiplicative
  noise and re-rank.
- **External**: a single-queue, non-preemptive model ignores interruptions,
  context switching and re-prioritisation mid-flight.
- **Statistical**: 10 seeds give a sense of spread, not confidence intervals.
  Increase `--seeds` to tighten.
- **Forecast**: the bootstrap assumes exchangeable throughput samples. The
  drifting-level condition in Experiment 2 shows how coverage degrades when
  this is violated and motivates shorter windows under change.

## 7. Reproducibility

```bash
npm ci
npm run build --workspace=packages/scheduler
npm run bench --workspace=research
```

Each report in `research/results/` records the Node version, platform and
generation time. All randomness flows through `createRng(seed)` (mulberry32),
so results are identical across machines and operating systems.

## References

- Covey, S. R. (1989). _The 7 Habits of Highly Effective People_. Free Press.
- Kahn, A. B. (1962). Topological sorting of large networks. _Communications of the ACM_, 5(11), 558–562.
- Kelley, J. E., & Walker, M. R. (1959). Critical-path planning and scheduling. _Proceedings of the Eastern Joint Computer Conference_, 160–173.
- Little, J. D. C. (1961). A proof for the queuing formula: L = λW. _Operations Research_, 9(3), 383–387.
- Liu, C. L., & Layland, J. W. (1973). Scheduling algorithms for multiprogramming in a hard-real-time environment. _Journal of the ACM_, 20(1), 46–61.
- Reinertsen, D. G. (2009). _The Principles of Product Development Flow_. Celeritas.
- Smith, W. E. (1956). Various optimizers for single-stage production. _Naval Research Logistics Quarterly_, 3(1–2), 59–66.
- Vacanti, D. S. (2015). _Actionable Agile Metrics for Predictability_. ActionableAgile Press.
