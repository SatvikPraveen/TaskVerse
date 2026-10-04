# Architecture Decision Records

Each record captures one significant decision, the context that forced it,
the options considered and the consequences we accepted. Records are
immutable once accepted; a change of mind is a new record that supersedes
the old one.

| #                                                          | Title                                                               | Status   |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| [0001](0001-shared-contract-package.md)                    | One shared contract package for API and client                      | Accepted |
| [0002](0002-pure-scheduler-package.md)                     | The planning engine is a pure, I/O-free package                     | Accepted |
| [0003](0003-in-process-domain-events.md)                   | Domain events on an in-process bus, not a broker                    | Accepted |
| [0004](0004-wsjf-default-policy.md)                        | WSJF is the default recommendation policy                           | Accepted |
| [0005](0005-dependency-edges-with-app-level-validation.md) | Dependencies as ObjectId arrays with application-level cycle checks | Accepted |
| [0006](0006-observability.md)                              | Correlation ids, structured logs and Prometheus metrics             | Accepted |
