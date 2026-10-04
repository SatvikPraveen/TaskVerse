## Summary

<!-- What changes and why. Link the issue if there is one. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor / tech debt
- [ ] Documentation
- [ ] Research (benchmarks, methodology, results)

## Checklist

- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass locally
- [ ] New behaviour is covered by tests (unit for `packages/*`, integration for `apps/api`)
- [ ] `apps/api/openapi/openapi.yaml` updated for any route change (the contract test enforces this)
- [ ] Scheduler changes: benchmark results regenerated if the algorithm changed
- [ ] `CHANGELOG.md` updated under _Unreleased_
