# ADR 0003 — Domain events on an in-process bus, not a broker

**Status:** Accepted · **Date:** 2026-10-03

## Context

Mutations need to fan out to several concerns: an activity log, real-time
delivery over Socket.IO, and metrics. Wiring each concern into each
controller couples them and makes controllers untestable without mocking
the socket server.

## Decision

`events/domain-events.ts` is a typed publish/subscribe bus whose event map
*is* the contract. Controllers publish after a successful write. Subscribers
(activity log, socket bridge, metrics) register once at boot. `publish()`
awaits subscribers but isolates their failures, so a broken listener cannot
fail the HTTP request that triggered it.

## Alternatives considered

* **Message broker (Redis Streams, NATS, Kafka)** — needed for multi-instance
  deployments and durable delivery, but adds an operational dependency the
  project does not yet need. The bus interface is broker-shaped so this can
  be swapped behind `publish()`.
* **Mongoose middleware hooks** — fire on document saves, but lack the actor
  and the intent ("assigned" vs "updated").

## Consequences

* Events are delivered only within one process; horizontal scaling of the
  API requires the Socket.IO Redis adapter and a broker-backed bus.
* The activity log is written synchronously with the request, which keeps
  tests deterministic at the cost of a few milliseconds per mutation.
