<div align="center">

# TaskVerse

**A task-management platform with a reproducible planning and flow-analytics engine.**

[![CI](https://github.com/SatvikPraveen/TaskVerse/actions/workflows/ci.yml/badge.svg)](https://github.com/SatvikPraveen/TaskVerse/actions/workflows/ci.yml)
[![CodeQL](https://github.com/SatvikPraveen/TaskVerse/actions/workflows/codeql.yml/badge.svg)](https://github.com/SatvikPraveen/TaskVerse/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](tsconfig.base.json)
[![Cite](https://img.shields.io/badge/cite-CITATION.cff-6f42c1)](CITATION.cff)

[Getting started](#getting-started) · [Architecture](#architecture) · [Planning engine](#the-planning-engine) · [Research results](#research-results) · [API](#api) · [Contributing](CONTRIBUTING.md)

</div>

---

TaskVerse pairs a conventional full-stack task manager (Express, MongoDB, Socket.IO, React) with
`@taskverse/scheduler`, a pure TypeScript library that implements the scheduling and forecasting
algorithms the application's recommendations are built on. The same code path serves the
`/api/planning/*` endpoints, the unit tests and a seeded benchmark harness whose results are
committed to the repository, so every "what should I work on next?" answer can be traced to a
documented, measured algorithm rather than a heuristic buried in a controller.

## Highlights

- **Explainable prioritisation.** Six policies, from FIFO to Weighted Shortest Job First and the
  Eisenhower matrix, each returning a score breakdown and a one-line rationale.
- **Dependency-aware planning.** Tasks declare prerequisites; the API rejects cycles, computes the
  critical path and slack per task, and recommends only work that is actually unblocked.
- **Probabilistic forecasting.** Monte Carlo completion dates from your own throughput history,
  with the forecaster's calibration measured in a published experiment.
- **Flow analytics.** Cycle time, lead time, throughput, cumulative flow, aging work-in-progress and
  Little's Law, computed from a per-task status transition log.
- **Real-time by design.** Every mutation publishes a typed domain event that is persisted to an
  activity feed and pushed to the right users over Socket.IO.
- **Operable.** Correlation ids on every request, structured logs, Prometheus metrics, readiness
  probes, an OpenAPI 3.1 document that a test keeps in sync with the routes.
- **Reproducible research.** Every stochastic routine is seeded; the benchmark harness regenerates
  `research/results/` bit-for-bit on any machine.

## Getting started

Prerequisites: Node.js ≥ 18.17, npm ≥ 9, and MongoDB 6+ (or Docker).

```bash
git clone https://github.com/SatvikPraveen/TaskVerse.git
cd TaskVerse
npm ci
npm run build --workspace=packages/types --workspace=packages/scheduler

cp apps/api/.env.example apps/api/.env
# set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -hex 32) and MONGODB_URI

npm run dev          # API http://localhost:3001 · web http://localhost:5173 · docs http://localhost:3001/api/docs
```

Full stack with Docker (MongoDB, MinIO object storage, API, nginx-served web):

```bash
cp docker/.env.example docker/.env     # fill in the secrets
npm run docker:up                      # web on http://localhost:8080
```

### Quality gates

| Command                                      | What it runs                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run lint`                               | ESLint flat config across the monorepo                                      |
| `npm run typecheck`                          | `tsc --noEmit` in every workspace                                           |
| `npm test --workspace=packages/scheduler`    | 52 unit tests on the planning engine (Node test runner)                     |
| `npm run test:coverage --workspace=apps/api` | 83 integration tests against an in-memory MongoDB, with coverage thresholds |
| `npm run bench`                              | Regenerates the three research experiments                                  |
| `npm run e2e`                                | Playwright end-to-end tests                                                 |

## Architecture

```
apps/
  api/          Express 4 · Mongoose 8 · Socket.IO 4 · Zod · pino · prom-client
  web/          React 18 · Vite 5 · React Query · Zustand · Tailwind · Recharts
packages/
  types/        Zod schemas + inferred types: the single source of truth for the API contract
  scheduler/    Pure planning engine (no I/O, explicit time, seeded randomness)
  utils/        Shared helpers
research/       Benchmark harness and committed results
docs/
  adr/          Architecture decision records
  research/     Experimental methodology
```

**Request flow.** `requestId → access log → metrics → helmet/CORS/rate-limit → routes → error handler`.
Controllers validate with the shared Zod schemas, call services, and on success publish a domain
event. Subscribers persist the activity entry, forward the event to Socket.IO rooms (per user and
per task) and increment metrics; a failing subscriber is logged and never fails the request.

**Data model.** Tasks embed subtasks, comments and attachments, carry `dependencies` as
prerequisite references, and keep a `statusHistory` of transitions with actor and timestamp.
`startedAt` and `completedAt` are derived from transitions and are what the flow metrics read.

The reasoning behind each of these choices is recorded in [`docs/adr/`](docs/adr/README.md).

## The planning engine

`@taskverse/scheduler` has no runtime dependencies and never reads the clock or a database.

| Capability       | Algorithm                                                                                                                     | Reference                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dependency graph | Kahn topological sort, three-colour cycle detection, cycle-safe edge insertion, ready set                                     | Kahn (1962)                                                         |
| Critical path    | Forward/backward pass, slack, critical chain                                                                                  | Kelley & Walker (1959)                                              |
| Prioritisation   | FIFO · static priority · Shortest Processing Time · Earliest Deadline First · Weighted Shortest Job First · Eisenhower matrix | Smith (1956); Liu & Layland (1973); Reinertsen (2009); Covey (1989) |
| Simulation       | Non-preemptive list scheduling on _k_ workers honouring dependencies; makespan, flow time, weighted tardiness, on-time rate   | Graham (1966)                                                       |
| Forecasting      | Bootstrap Monte Carlo over historical throughput; percentiles, histogram, truncation share                                    | Vacanti (2015)                                                      |
| Flow metrics     | Cycle/lead time distributions, throughput, cumulative flow reconstruction, aging WIP, Little's Law                            | Little (1961)                                                       |

```ts
import { criticalPath, wsjf, simulate, forecastCompletion } from '@taskverse/scheduler';

const ranked = wsjf(tasks, { now: new Date() }); // [{ task, score, rationale, components }, …]
const cpm = criticalPath(tasks); // { makespan, criticalPath, nodes (slack per task) }
const run = simulate(tasks, { policy: 'edf', workers: 2 }); // { schedule, metrics: { weightedTardiness, … } }
const eta = forecastCompletion({ remainingItems: 40, throughputSamples: [3, 1, 4, 0, 2], seed: 42 });
```

## Research results

The harness in [`research/`](research/README.md) runs three experiments. The methodology, including
the synthetic workload model and threats to validity, is in
[`docs/research/methodology.md`](docs/research/methodology.md). Results below are from
[`research/results/`](research/results/) and regenerate with `npm run bench`.

**Experiment 1 — which policy minimises priority-weighted tardiness?** Paired design over backlog
size {50, 200, 1000} × workers {1, 3} × deadline horizon {120, 240, 480 h} × 10 seeds; all six
policies schedule the identical instance.

| Rank | Policy          | Mean rank (1 = best) | Instance wins |
| ---- | --------------- | -------------------- | ------------- |
| 1    | WSJF            | 1.21                 | 162 / 180     |
| 2    | EDF             | 2.46                 | 14 / 180      |
| 3    | SPT             | 3.44                 | 0 / 180       |
| 4    | Eisenhower      | 3.66                 | 1 / 180       |
| 5    | Static priority | 4.41                 | 0 / 180       |
| 6    | FIFO            | 5.83                 | 3 / 180       |

WSJF wins 90 % of instances because it is the only policy that reads all three signals the data
model carries (priority, deadline, dependency fan-out) and normalises by effort. Static priority,
the default of most trackers, ranks fifth.

**Experiment 2 — is the forecaster calibrated?** Coverage of the quoted 85 % horizon ranges from
0.77 to 0.97 across history lengths and backlog sizes under a stationary throughput process, and
degrades to 0.69 for large backlogs when the underlying rate drifts, which is the expected failure
mode of bootstrap resampling under non-stationarity and the reason the API exposes the lookback
window as a parameter. Full tables: [`forecast-calibration.md`](research/results/forecast-calibration.md).

**Experiment 3 — does it scale?** Topological sort, critical path and WSJF ranking are linear in
practice (20 000 tasks in 16 / 51 / 61 ms). The list scheduler re-ranks the ready set per decision
and is quadratic (5 000 tasks in 6.8 s), which is why `/api/planning/simulate` is scoped to a
user's own backlog. Table: [`scaling.md`](research/results/scaling.md).

## API

Interactive reference at `/api/docs`; the document is at
[`apps/api/openapi/openapi.yaml`](apps/api/openapi/openapi.yaml). A test asserts that every served
route is documented and that the document lists no stale routes.

| Area       | Endpoints                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------- |
| Auth       | register, login, refresh (atomic rotation), logout, logout-all, change-password, sessions |
| Tasks      | CRUD with filters/search/pagination, comments, subtasks, dependencies, stats              |
| Categories | CRUD, reorder, stats                                                                      |
| Planning   | `policies` · `recommendations` · `critical-path` · `eisenhower` · `forecast` · `simulate` |
| Analytics  | `flow` · `throughput` · `cfd` · `aging`                                                   |
| Activity   | personal feed, per-task history                                                           |
| Uploads    | pre-signed URLs, direct upload, avatars, task attachments (S3 / R2 / MinIO)               |
| System     | `/health`, `/health/ready`, `/metrics`                                                    |

Example: what to work on next, with reasons.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3001/api/planning/recommendations?policy=wsjf&limit=3' | jq '.data.recommendations[] | {rank, title, score, rationale}'
```

```json
{
  "rank": 1,
  "title": "Fix login redirect",
  "score": 11.5,
  "rationale": "CoD 5.8 (value 3, urgency 2.8, unblocks 0) ÷ 0.5h"
}
```

## Security

Short-lived access tokens with atomically rotated refresh tokens, bcrypt(12) passwords, Zod
validation on every input, escaped search patterns, tiered rate limits, owner-namespaced object
keys and redacted logs. See [SECURITY.md](SECURITY.md) for the reporting process.

## Citing

If this project or its planning engine is useful in your work, please cite it using the metadata
in [`CITATION.cff`](CITATION.cff).

## License

[MIT](LICENSE) © Satvik Praveen
