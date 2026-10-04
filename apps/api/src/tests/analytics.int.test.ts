// apps/api/src/tests/analytics.int.test.ts
import mongoose from 'mongoose';

import { Task } from '@/modules/tasks/task.model';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

/** Mongoose keeps createdAt immutable through the model API; history must be seeded raw. */
const seedRaw = (id: string, fields: Record<string, unknown>) =>
  Task.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: fields });

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('Analytics API', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser();
  });

  const seedHistory = async () => {
    // Two completed (A on time, B late), one in progress, one todo, one cancelled.
    const a = await createTask(session, { title: 'A', dueDate: new Date(Date.now() - 1 * DAY).toISOString() });
    await seedRaw(a._id, { status: 'completed', createdAt: new Date(Date.now() - 5 * DAY), startedAt: new Date(Date.now() - 4 * DAY), completedAt: new Date(Date.now() - 2 * DAY) });
    const b = await createTask(session, { title: 'B', dueDate: new Date(Date.now() - 3 * DAY).toISOString() });
    await seedRaw(b._id, { status: 'completed', createdAt: new Date(Date.now() - 6 * DAY), startedAt: new Date(Date.now() - 3 * DAY), completedAt: new Date(Date.now() - 1 * DAY) });
    const c = await createTask(session, { title: 'C' });
    await seedRaw(c._id, { status: 'in_progress', startedAt: new Date(Date.now() - 10 * HOUR) });
    await createTask(session, { title: 'D' });
    const e = await createTask(session, { title: 'E' });
    await seedRaw(e._id, { status: 'cancelled' });
  };

  it('requires authentication', async () => {
    await request(app).get('/api/analytics/flow').expect(401);
  });

  it('summarises flow for the window', async () => {
    await seedHistory();
    const res = await session.auth(request(app).get('/api/analytics/flow?days=14')).expect(200);
    const d = res.body.data;
    expect(d.completed).toBe(2);
    expect(d.wip).toBe(2);
    expect(d.cycleTimeHours.n).toBe(2);
    expect(d.cycleTimeHours.min).toBe(48);
    expect(d.cycleTimeHours.max).toBe(48);
    expect(d.leadTimeHours.p50).toBe(96);
    expect(d.onTimeRate).toBe(0.5); // A finished a day early, B two days late
    expect(d.littlesLawLeadTimeDays).toBe(14); // 2 WIP / (2 per 14 days)
  });

  it('returns a throughput series with one point per bucket', async () => {
    await seedHistory();
    const res = await session.auth(request(app).get('/api/analytics/throughput?days=7&bucket=day')).expect(200);
    const series = res.body.data.series as Array<{ completed: number; created: number }>;
    expect(series.length).toBeGreaterThanOrEqual(7);
    expect(series.reduce((sum, p) => sum + p.completed, 0)).toBe(2);
  });

  it('reconstructs a cumulative flow diagram that excludes cancelled work', async () => {
    await seedHistory();
    const res = await session.auth(request(app).get('/api/analytics/cfd?days=7')).expect(200);
    const last = res.body.data.series.at(-1);
    expect(last).toMatchObject({ todo: 1, in_progress: 1, completed: 2 });
  });

  it('lists aging work in progress, oldest first', async () => {
    await seedHistory();
    const res = await session.auth(request(app).get('/api/analytics/aging')).expect(200);
    const items = res.body.data.items as Array<{ title: string; status: string; inProgressHours: number | null }>;
    expect(items.map(i => i.title).sort()).toEqual(['C', 'D']);
    expect(items.find(i => i.title === 'C')!.inProgressHours).toBeGreaterThanOrEqual(10);
    expect(items.find(i => i.title === 'D')!.inProgressHours).toBeNull();
  });

  it('validates the window', async () => {
    await session.auth(request(app).get('/api/analytics/flow?days=0')).expect(400);
    await session.auth(request(app).get('/api/analytics/cfd?bucket=month')).expect(400);
  });
});
