# ADR 0001 — One shared contract package for API and client

**Status:** Accepted · **Date:** 2026-10-03

## Context

The original scaffold had three descriptions of the same data: Mongoose
models in the API, hand-written interfaces in the web client, and a
`@taskverse/types` package that described a different application entirely
(statuses `pending`/`in-progress`, a `name` field the API never had). The
client imported types that did not exist. Nothing prevented drift because
nothing consumed the package.

## Decision

`packages/types` is the single source of truth for the HTTP contract. It
exports Zod schemas for every request body and query string, the inferred
TypeScript types, and the serialised shapes of each resource. The API
validates with these schemas; the client types its calls with the inferred
types (`import type`, so no runtime cost). The package ships CommonJS for
Node and ESM for the Vite bundle from one source.

## Alternatives considered

* **Generate types from OpenAPI** — attractive, but the OpenAPI document is
  hand-maintained and would then be the source of truth for validation as
  well; Zod gives runtime validation for free.
* **tRPC** — would remove the REST surface that external clients and the
  research harness rely on.

## Consequences

* A route change that alters a payload is a compile error in the client.
* The OpenAPI document is still separate; its completeness is enforced by a
  test (ADR 0006 covers the docs route), not by generation.
