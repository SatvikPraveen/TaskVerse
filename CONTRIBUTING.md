# Contributing to TaskVerse

Thank you for taking the time. This document explains how the repository is
organised, how to run everything locally and what a good change looks like.

## Repository layout

| Path                 | What lives there                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `apps/api`           | Express + Mongoose API, Socket.IO, planning and analytics endpoints, OpenAPI document         |
| `apps/web`           | React + Vite client                                                                           |
| `packages/types`     | Zod schemas and types: the API contract (ADR 0001)                                            |
| `packages/scheduler` | Pure planning engine: graphs, CPM, policies, simulation, forecasting, flow metrics (ADR 0002) |
| `packages/utils`     | Shared helpers                                                                                |
| `research`           | Benchmark harness and generated results                                                       |
| `docs/adr`           | Architecture decision records                                                                 |
| `docs/research`      | Experimental methodology                                                                      |

## Getting started

```bash
npm ci
npm run build --workspace=packages/types --workspace=packages/scheduler
cp apps/api/.env.example apps/api/.env      # fill in JWT secrets (openssl rand -hex 32)
npm run dev                                  # API on :3001, web on :5173
```

The API needs a MongoDB instance; `docker compose -f docker/docker-compose.yml up mongodb`
starts one.

## Quality gates

All of these run in CI and must pass before merge:

```bash
npm run lint
npm run typecheck
npm test --workspace=packages/scheduler        # unit tests, Node test runner
npm run test:coverage --workspace=apps/api     # integration tests on mongodb-memory-server
```

- The API suite includes a contract test: every served route must appear in
  `apps/api/openapi/openapi.yaml`, and the document may not list routes that
  no longer exist. Update the YAML with any route change.
- Coverage thresholds for the API are enforced by `jest.config.cjs`.

## Making changes

- **Branches**: `feat/…`, `fix/…`, `docs/…`, `research/…`.
- **Commits**: Conventional Commits (`feat(api): …`, `fix(web): …`,
  `research: …`). Explain _why_ in the body when the diff does not.
- **Schema changes** go in `packages/types` first; the compiler then points
  at every place that must follow.
- **Scheduler changes** need unit tests with known answers. If a policy or
  metric changes behaviour, regenerate `research/results/` with
  `npm run bench` and commit the new results alongside the code.
- **New endpoints** need an integration test, an OpenAPI entry and, if they
  mutate state, a domain event.

## Research contributions

Proposals for new policies, metrics or experiments are welcome; open an issue
with the _Research proposal_ template. Read `docs/research/methodology.md`
first, especially the threats-to-validity section, so the proposal addresses
them.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
