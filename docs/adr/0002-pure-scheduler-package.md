# ADR 0002 — The planning engine is a pure, I/O-free package

**Status:** Accepted · **Date:** 2026-10-03

## Context

Prioritisation, critical path, forecasting and flow metrics are the part of
the system we want to study scientifically: compare policies, measure
calibration, cite results. That requires the algorithms to be runnable
without a database or network, deterministic, and testable against textbook
examples with known answers.

## Decision

`packages/scheduler` contains only pure functions over a storage-agnostic
`SchedulableTask` shape. It has no runtime dependencies. Every routine that
cares about time takes `now` as an argument; every stochastic routine takes
a seed and uses the package's own PRNG (mulberry32). The API adapts Mongoose
documents to `SchedulableTask`; the research harness generates them.

## Alternatives considered

- **Implement planning inside API services** — simplest, but then benchmarks
  need a database and results depend on `Date.now()`.
- **Use `Math.random()`** — not reproducible across runs or platforms.

## Consequences

- Unit tests cover the CPM example with known slack values, EDF beating FIFO
  under deadline conflicts, cycle handling and determinism in milliseconds.
- The same code path serves `/api/planning/*`, the research benchmarks and,
  potentially, the browser.
- Adapting data is an explicit step (`toSchedulable`), which is where any
  mismatch between storage and algorithm assumptions becomes visible.
