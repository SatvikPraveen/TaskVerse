// apps/api/src/tests/observability.int.test.ts
import { app, createTask, registerUser, request } from './helpers';

describe('Observability', () => {
  it('assigns a request id and echoes a well-formed inbound one', async () => {
    const minted = await request(app).get('/health').expect(200);
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app).get('/health').set('x-request-id', 'trace-abc.123').expect(200);
    expect(echoed.headers['x-request-id']).toBe('trace-abc.123');

    const rejected = await request(app).get('/health').set('x-request-id', 'bad id with spaces').expect(200);
    expect(rejected.headers['x-request-id']).not.toBe('bad id with spaces');
  });

  it('includes the request id in error bodies', async () => {
    const res = await request(app).get('/api/tasks').set('x-request-id', 'err-1').expect(401);
    expect(res.headers['x-request-id']).toBe('err-1');
  });

  it('exposes Prometheus metrics with route templates and domain event counts', async () => {
    const session = await registerUser();
    await createTask(session, { title: 'Measured' });
    await session.auth(request(app).get('/api/tasks')).expect(200);

    const res = await request(app).get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/http_request_duration_seconds_bucket/);
    expect(res.text).toMatch(/http_requests_total\{[^}]*route="\/api\/tasks\/"/);
    expect(res.text).toMatch(/domain_events_total\{[^}]*event="task.created"/);
    expect(res.text).toMatch(/process_cpu_user_seconds_total/);
  });

  it('reports readiness from the database connection state', async () => {
    const res = await request(app).get('/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ready', database: true });
  });
});
