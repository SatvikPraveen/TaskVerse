# ADR 0004 — WSJF is the default recommendation policy

**Status:** Accepted · **Date:** 2026-10-03

## Context

`GET /api/planning/recommendations` needs a default. Candidates were static
priority (what most trackers do), Earliest Deadline First (optimal for
feasible deadline sets on one worker) and Weighted Shortest Job First.

## Decision

Default to WSJF. It is the only candidate that combines all three signals
the data model carries: priority (value), deadline (time criticality) and
dependency fan-out (risk reduction / opportunity enablement), and it divides
by effort so that small, cheap wins surface. Each recommendation returns the
component breakdown and a rationale string so the ranking is explainable.

The mapping of model fields to WSJF components is a documented heuristic,
see `docs/research/methodology.md` §3; it is not fitted to data.

## Alternatives considered

* **EDF** — ignores value and effort; a trivial overdue task outranks a
  critical one due in an hour.
* **Priority** — ignores deadlines and effort; starves small urgent work.

## Consequences

* Users with no estimates get the default 2 h job size, so WSJF degrades to
  value + urgency + unblocking. This is stated in the API docs.
* The policy choice is a query parameter; the benchmark in
  `research/results/policy-comparison.md` is the evidence base for revisiting
  the default.
