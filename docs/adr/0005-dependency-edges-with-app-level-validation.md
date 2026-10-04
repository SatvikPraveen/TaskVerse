# ADR 0005 — Dependencies as ObjectId arrays with application-level cycle checks

**Status:** Accepted · **Date:** 2026-10-03

## Context

Critical path and "ready set" recommendations need prerequisite edges
between tasks. MongoDB has no referential integrity and no graph
constraints, so acyclicity must be enforced somewhere.

## Decision

Each task stores `dependencies: ObjectId[]` (its prerequisites). On create
and update the service layer verifies that every referenced task exists and
is visible to the caller, rejects self-reference, loads the user's graph and
runs the scheduler's `wouldCreateCycle` check for each new edge, returning
409 with the offending edge. Deleting a task pulls it from every dependent's
list so the graph never references a missing node.

## Alternatives considered

- **Separate edges collection** — cleaner for very large graphs and
  bidirectional queries, but adds a join to every task read; the per-user
  graphs here are small (hundreds of nodes).
- **Graph database** — disproportionate for the scale.
- **Validate only at read time** — would let cycles into storage and push
  the failure to the planning endpoints.

## Consequences

- Validation costs one query over the user's planning projection per edit
  with dependencies; acceptable at current scale and measured in
  `research/results/scaling.md`.
- Cross-user dependencies are limited to tasks the caller can see.
