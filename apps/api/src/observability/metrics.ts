// apps/api/src/observability/metrics.ts
import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

import { domainEvents } from '@/events/domain-events';

export const registry = new Registry();
registry.setDefaultLabels({ service: 'taskverse-api' });
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Tuned for an API whose p99 should sit well under a second.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const domainEventsTotal = new Counter({
  name: 'domain_events_total',
  help: 'Domain events published, by name',
  labelNames: ['event'] as const,
  registers: [registry],
});

export const socketConnections = new Gauge({
  name: 'socket_connections',
  help: 'Currently connected Socket.IO clients',
  registers: [registry],
});

let eventsRegistered = false;
export const registerMetricsSubscribers = (): void => {
  if (eventsRegistered) return;
  eventsRegistered = true;
  domainEvents.subscribeAll((_payload, name) => {
    domainEventsTotal.inc({ event: name });
  });
};

/** Uses the matched Express route template so label cardinality stays bounded. */
const routeLabel = (req: Request): string => {
  const route = (req.route as { path?: string } | undefined)?.path;
  if (!route) return req.path.startsWith('/api') ? 'unmatched' : req.path;
  return `${req.baseUrl ?? ''}${route}`;
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: routeLabel(req), status_code: String(res.statusCode) };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
};

export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};
