# ADR 0006 — Correlation ids, structured logs and Prometheus metrics

**Status:** Accepted · **Date:** 2026-10-03

## Context

The scaffold logged free-text lines with emoji through a half-configured
pino instance and had no way to correlate a client-visible failure with a
server log line, nor to measure latency per endpoint.

## Decision

- Every request gets an `X-Request-Id` (inbound value honoured when
  well-formed, otherwise a UUID), echoed in the response, attached to each
  log line and returned inside error bodies.
- `pino-http` emits one structured access-log line per request; secrets are
  redacted at the logger level.
- `prom-client` exposes `/metrics`: request latency histogram and counter
  labelled by the matched route _template_ (so cardinality is bounded),
  domain events published by name, live socket connections and Node runtime
  defaults. `METRICS_ENABLED=false` removes the endpoint and the middleware.
- The OpenAPI document is served at `/api/docs` and a test guarantees it
  lists exactly the routes the application serves.

## Alternatives considered

- **OpenTelemetry** — the right long-term answer for traces; deferred until
  there is more than one service to trace.

## Consequences

- A bug report can quote a request id and be matched to a log line and the
  metric bucket it landed in.
- Health (`/health`) and readiness (`/health/ready`, checks MongoDB) are
  separate so orchestrators can distinguish "process up" from "can serve".
