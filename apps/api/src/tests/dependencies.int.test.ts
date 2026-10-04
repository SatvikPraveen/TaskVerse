// apps/api/src/tests/dependencies.int.test.ts
import { Task } from '@/modules/tasks/task.model';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

describe('Task dependencies', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser();
  });

  it('stores dependencies and populates them on read', async () => {
    const a = await createTask(session, { title: 'A' });
    const b = await createTask(session, { title: 'B', dependencies: [a._id] });

    const res = await session.auth(request(app).get(`/api/tasks/${b._id}`)).expect(200);
    expect(res.body.data.task.dependencies).toHaveLength(1);
    expect(res.body.data.task.dependencies[0]).toMatchObject({ _id: a._id, title: 'A' });
  });

  it('rejects a dependency on a task the user cannot see', async () => {
    const other = await registerUser();
    const foreign = await createTask(other, { title: 'Foreign' });

    const res = await session
      .auth(request(app).post('/api/tasks'))
      .send({ title: 'Mine', dependencies: [foreign._id] })
      .expect(400);
    expect(res.body.message).toMatch(/not found or are not accessible/);
  });

  it('rejects a self dependency', async () => {
    const a = await createTask(session, { title: 'A' });
    const res = await session
      .auth(request(app).put(`/api/tasks/${a._id}`))
      .send({ dependencies: [a._id] })
      .expect(400);
    expect(res.body.message).toMatch(/depend on itself/);
  });

  it('rejects an edge that would close a cycle', async () => {
    const a = await createTask(session, { title: 'A' });
    const b = await createTask(session, { title: 'B', dependencies: [a._id] });
    const c = await createTask(session, { title: 'C', dependencies: [b._id] });

    const res = await session
      .auth(request(app).put(`/api/tasks/${a._id}`))
      .send({ dependencies: [c._id] })
      .expect(409);
    expect(res.body.message).toMatch(/cycle/);
    expect(res.body.details).toMatchObject({ taskId: a._id, dependencyId: c._id });
  });

  it('detaches dependents when a prerequisite is deleted', async () => {
    const a = await createTask(session, { title: 'A' });
    const b = await createTask(session, { title: 'B', dependencies: [a._id] });

    await session.auth(request(app).delete(`/api/tasks/${a._id}`)).expect(200);
    const stored = await Task.findById(b._id);
    expect(stored?.dependencies).toHaveLength(0);
  });

  it('records status transitions and start/complete timestamps', async () => {
    const a = await createTask(session, { title: 'A' });
    await session
      .auth(request(app).put(`/api/tasks/${a._id}`))
      .send({ status: 'in_progress' })
      .expect(200);
    const done = await session
      .auth(request(app).put(`/api/tasks/${a._id}`))
      .send({ status: 'completed' })
      .expect(200);

    const task = done.body.data.task;
    expect(task.startedAt).toBeTruthy();
    expect(task.completedAt).toBeTruthy();
    expect(task.statusHistory.map((t: { to: string }) => t.to)).toEqual(['todo', 'in_progress', 'completed']);
    expect(new Date(task.startedAt).getTime()).toBeLessThanOrEqual(new Date(task.completedAt).getTime());
  });

  it('does not log a transition when the status is unchanged', async () => {
    const a = await createTask(session, { title: 'A' });
    const res = await session
      .auth(request(app).put(`/api/tasks/${a._id}`))
      .send({ status: 'todo', title: 'A2' })
      .expect(200);
    expect(res.body.data.task.statusHistory).toHaveLength(1);
  });
});
