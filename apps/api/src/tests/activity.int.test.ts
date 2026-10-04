// apps/api/src/tests/activity.int.test.ts
import { Activity } from '@/modules/activity/activity.model';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

describe('Activity log', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser();
  });

  it('records task lifecycle events with the actor and audience', async () => {
    const task = await createTask(session, { title: 'Write paper' });
    await session
      .auth(request(app).put(`/api/tasks/${task._id}`))
      .send({ status: 'in_progress' })
      .expect(200);
    await session
      .auth(request(app).put(`/api/tasks/${task._id}`))
      .send({ title: 'Write the paper', priority: 'high' })
      .expect(200);
    await session
      .auth(request(app).post(`/api/tasks/${task._id}/comments`))
      .send({ content: 'Draft ready' })
      .expect(201);

    const entries = await Activity.find({ entityId: task._id }).sort({ _id: 1 });
    expect(entries.map(e => e.event)).toEqual([
      'task.created',
      'task.status_changed',
      'task.updated',
      'task.comment_added',
    ]);
    expect(entries[1].metadata).toMatchObject({ oldStatus: 'todo', newStatus: 'in_progress' });
    expect(entries[2].changes.sort()).toEqual(['priority', 'title']);
    expect(entries[2].summary).toMatch(/updated .*priority/);
    expect(entries.every(e => e.actor.toString() === session.userId)).toBe(true);
    expect(entries.every(e => e.audience.map(String).includes(session.userId))).toBe(true);
  });

  it('serves a personal feed newest first with cursor pagination', async () => {
    for (let i = 1; i <= 3; i += 1) await createTask(session, { title: `T${i}` });

    const first = await session.auth(request(app).get('/api/activity?limit=2')).expect(200);
    expect(first.body.data.activity).toHaveLength(2);
    expect(first.body.data.activity[0].summary).toMatch(/T3/);
    expect(first.body.data.hasMore).toBe(true);
    expect(first.body.data.activity[0].actor.username).toBeDefined();

    const second = await session
      .auth(request(app).get(`/api/activity?limit=2&before=${first.body.data.nextCursor}`))
      .expect(200);
    expect(second.body.data.activity).toHaveLength(1);
    expect(second.body.data.activity[0].summary).toMatch(/T1/);
    expect(second.body.data.hasMore).toBe(false);
  });

  it('puts assignments into the assignee feed and emits task.assigned', async () => {
    const assignee = await registerUser();
    const task = await createTask(session, { title: 'Pair task', assignedTo: assignee.userId });

    const feed = await assignee.auth(request(app).get('/api/activity')).expect(200);
    const events = feed.body.data.activity.map((a: { event: string }) => a.event);
    expect(events).toEqual(expect.arrayContaining(['task.created', 'task.assigned']));

    const history = await assignee.auth(request(app).get(`/api/activity/tasks/${task._id}`)).expect(200);
    expect(history.body.data.activity.length).toBeGreaterThanOrEqual(2);
  });

  it('hides task history from users without access', async () => {
    const stranger = await registerUser();
    const task = await createTask(session, { title: 'Private' });
    await stranger.auth(request(app).get(`/api/activity/tasks/${task._id}`)).expect(404);
  });

  it('records deletions', async () => {
    const task = await createTask(session, { title: 'Temp' });
    await session.auth(request(app).delete(`/api/tasks/${task._id}`)).expect(200);
    const entry = await Activity.findOne({ entityId: task._id, event: 'task.deleted' });
    expect(entry?.summary).toBe('deleted task "Temp"');
  });
});
