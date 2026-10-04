# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] — 2026-10-03

### Added

- `@taskverse/scheduler`: pure planning engine with dependency graphs
  (topological sort, cycle detection), Critical Path Method, six
  prioritisation policies (FIFO, priority, SPT, EDF, WSJF, Eisenhower), a
  dependency-aware list scheduler, bootstrap Monte Carlo forecasting and
  flow metrics (cycle/lead time, throughput, cumulative flow, aging WIP,
  Little's Law). 52 unit tests.
- Task dependencies with cycle rejection, status transition log,
  `startedAt`/`completedAt` tracking.
- Planning API: `/api/planning/{policies,recommendations,critical-path,eisenhower,forecast,simulate}`.
- Analytics API: `/api/analytics/{flow,throughput,cfd,aging}`.
- Typed domain-event bus; persisted activity log with a personal feed and
  per-task history; Socket.IO bridge that actually delivers events.
- Request correlation ids, structured access logs, Prometheus `/metrics`,
  readiness probe.
- OpenAPI 3.1 document served at `/api/docs`, with a test that keeps it in
  sync with the served routes.
- Research harness (`research/`) with three reproducible experiments and
  generated results; methodology write-up and architecture decision records.
- CI: lint/typecheck/build, scheduler tests on Node 18/20/22, API tests with
  coverage, benchmark smoke run, CodeQL, Dependabot, weekly E2E.
- Root-context Dockerfiles for API and web, nginx config, full-stack compose
  file with MinIO bootstrap.

### Changed

- `@taskverse/types` now mirrors the real API contract (statuses
  `todo|in_progress|completed|cancelled`, `username`, populated references)
  and ships CJS + ESM builds.
- Refresh-token rotation is atomic; expired access tokens return 403 and the
  client refreshes once with coalesced concurrent requests.
- Uploads use AWS SDK v3; objects are no longer requested as public-read.
- Web client aligned with the contract; corrupted components rewritten;
  pagination and query-string prefilters added.
- ESLint moved to a flat config covering the whole monorepo.

### Fixed

- The repository could not be installed (`workspace:*` under npm), the API
  could not compile or connect (invalid Mongoose option), the jest alias
  was misspelled, and the web build failed on truncated CSS and unparsable
  components. All test suites are green.

## [1.0.0] — 2025

Initial scaffold.

[Unreleased]: https://github.com/SatvikPraveen/TaskVerse/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/SatvikPraveen/TaskVerse/releases/tag/v2.0.0
