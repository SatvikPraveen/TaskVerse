// apps/api/src/tests/planning.int.test.ts
import { Task } from '@/modules/tasks/task.model';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe('Planning API', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser();
  });

  it('requires authentication', async () => {
    await request(app).get('/api/planning/recommendations').expect(401);
  });

  it('lists the available policies with references', async () => {
    const res = await session.auth(request(app).get('/api/planning/policies')).expect(200);
    const names = res.body.data.policies.map((p: { name: string }) => p.name);
    expect(names).toEqual(expect.arrayContaining(['fifo', 'edf', 'wsjf', 'eisenhower']));
    expect(res.body.data.policies.find((p: { name: string }) => p.name === 'edf').reference).toMatch(/Liu/);
  });

  it('rejects an unknown policy', async () => {
    const res = await session
      .auth(request(app).get('/api/planning/recommendations?policy=magic'))
      .expect(400);
    expect(res.body.error).toBe('Validation Error');
  });

  describe('recommendations', () => {
    it('ranks ready tasks and hides blocked ones by default', async () => {
      const prereq = await createTask(session, {
        title: 'Prereq',
        estimatedHours: 1,
        dueDate: hoursFromNow(100),
      });
      await createTask(session, {
        title: 'Blocked',
        dependencies: [prereq._id],
        priority: 'urgent',
        dueDate: hoursFromNow(1),
      });
      await createTask(session, { title: 'Overdue small', estimatedHours: 0.5, dueDate: hoursFromNow(-5) });

      const res = await session
        .auth(request(app).get('/api/planning/recommendations?policy=wsjf'))
        .expect(200);
      const { totals, recommendations } = res.body.data;
      expect(totals).toEqual({ open: 3, ready: 2, blocked: 1 });
      expect(recommendations.map((r: { title: string }) => r.title)).toEqual(['Overdue small', 'Prereq']);
      expect(recommendations[0].rationale).toMatch(/CoD/);
      expect(recommendations[1].unblocks).toBe(1);
    });

    it('can include blocked tasks and flags them', async () => {
      const prereq = await createTask(session, { title: 'Prereq' });
      await createTask(session, { title: 'Blocked', dependencies: [prereq._id] });

      const res = await session
        .auth(request(app).get('/api/planning/recommendations?policy=fifo&includeBlocked=true'))
        .expect(200);
      const blocked = res.body.data.recommendations.find((r: { title: string }) => r.title === 'Blocked');
      expect(blocked.isBlocked).toBe(true);
    });

    it('scopes recommendations to the requesting user', async () => {
      const other = await registerUser();
      await createTask(other, { title: 'Not mine' });
      const res = await session.auth(request(app).get('/api/planning/recommendations')).expect(200);
      expect(res.body.data.recommendations).toHaveLength(0);
    });
  });

  describe('critical path', () => {
    it('returns the longest dependency chain and slack per task', async () => {
      const a = await createTask(session, { title: 'A', estimatedHours: 3 });
      const b = await createTask(session, { title: 'B', estimatedHours: 2, dependencies: [a._id] });
      const c = await createTask(session, { title: 'C', estimatedHours: 1, dependencies: [a._id] });
      await createTask(session, { title: 'D', estimatedHours: 4, dependencies: [b._id, c._id] });

      const res = await session.auth(request(app).get('/api/planning/critical-path')).expect(200);
      expect(res.body.data.makespanHours).toBe(9);
      expect(res.body.data.criticalPath.map((n: { title: string }) => n.title)).toEqual(['A', 'B', 'D']);
      const cNode = res.body.data.nodes.find((n: { title: string }) => n.title === 'C');
      expect(cNode.slackHours).toBe(1);
      expect(cNode.isCritical).toBe(false);
      expect(res.body.data.cycle).toBeNull();
    });
  });

  describe('eisenhower', () => {
    it('groups open tasks into quadrants', async () => {
      await createTask(session, { title: 'Q1', priority: 'urgent', dueDate: hoursFromNow(5) });
      await createTask(session, { title: 'Q2', priority: 'high', dueDate: hoursFromNow(500) });
      await createTask(session, { title: 'Q3', priority: 'low', dueDate: hoursFromNow(5) });
      await createTask(session, { title: 'Q4', priority: 'low' });

      const res = await session.auth(request(app).get('/api/planning/eisenhower')).expect(200);
      const q = res.body.data.quadrants;
      expect(q.do_first.map((t: { title: string }) => t.title)).toEqual(['Q1']);
      expect(q.schedule.map((t: { title: string }) => t.title)).toEqual(['Q2']);
      expect(q.delegate.map((t: { title: string }) => t.title)).toEqual(['Q3']);
      expect(q.eliminate.map((t: { title: string }) => t.title)).toEqual(['Q4']);
    });
  });

  describe('forecast', () => {
    it('explains when there is no history', async () => {
      await createTask(session, { title: 'Open' });
      const res = await session.auth(request(app).get('/api/planning/forecast')).expect(200);
      expect(res.body.data.forecast).toBeNull();
      expect(res.body.data.remainingItems).toBe(1);
      expect(res.body.data.note).toMatch(/Not enough/);
    });

    it('forecasts from completed history and is reproducible for a seed', async () => {
      // Three tasks completed on three different recent days, two still open.
      const day = 24 * 3_600_000;
      for (let i = 1; i <= 3; i += 1) {
        const t = await createTask(session, { title: `Done ${i}` });
        await Task.updateOne(
          { _id: t._id },
          {
            status: 'completed',
            startedAt: new Date(Date.now() - i * day - 3_600_000),
            completedAt: new Date(Date.now() - i * day),
          }
        );
      }
      await createTask(session, { title: 'Open 1' });
      await createTask(session, { title: 'Open 2' });

      const first = await session
        .auth(request(app).get('/api/planning/forecast?lookbackDays=7&seed=7&trials=500'))
        .expect(200);
      const second = await session
        .auth(request(app).get('/api/planning/forecast?lookbackDays=7&seed=7&trials=500'))
        .expect(200);

      expect(first.body.data.remainingItems).toBe(2);
      expect(first.body.data.throughput.samples.reduce((a: number, b: number) => a + b, 0)).toBe(3);
      const f = first.body.data.forecast;
      expect(f.periods.p50).toBeGreaterThanOrEqual(1);
      expect(f.periods.p50).toBeLessThanOrEqual(f.periods.p95);
      expect(new Date(f.dates.p85).getTime()).toBeGreaterThan(Date.now());
      expect(second.body.data.forecast.histogram).toEqual(f.histogram);
    });
  });

  describe('simulate', () => {
    it('compares policies on the user backlog and recommends one', async () => {
      await createTask(session, { title: 'Old big', estimatedHours: 8, dueDate: hoursFromNow(40) });
      await createTask(session, { title: 'New tiny urgent', estimatedHours: 0.5, dueDate: hoursFromNow(1) });

      const res = await session
        .auth(request(app).get('/api/planning/simulate?policies=fifo,edf&workers=1'))
        .expect(200);
      expect(res.body.data.pendingTasks).toBe(2);
      expect(res.body.data.runs.map((r: { policy: string }) => r.policy)).toEqual(['edf', 'fifo']);
      expect(res.body.data.recommendedPolicy).toBe('edf');
      const fifoRun = res.body.data.runs.find((r: { policy: string }) => r.policy === 'fifo');
      expect(fifoRun.metrics.lateTasks).toBe(1);
    });

    it('validates the policy list', async () => {
      await session.auth(request(app).get('/api/planning/simulate?policies=fifo,bogus')).expect(400);
    });
  });
});
