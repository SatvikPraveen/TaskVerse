// apps/api/src/tests/uploads.int.test.ts
// Object storage is deliberately unconfigured in tests; these cover the
// request validation, authorisation and task-attachment bookkeeping that run
// before (or instead of) any storage call.
import { app, createTask, registerUser, request, type TestSession } from './helpers';

describe('Uploads API', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser();
  });

  it('requires authentication', async () => {
    await request(app).post('/api/uploads/presign').send({}).expect(401);
  });

  it('validates the presign payload before touching storage', async () => {
    const res = await session
      .auth(request(app).post('/api/uploads/presign'))
      .send({ filename: 'a.pdf', contentType: 'application/pdf', fileSize: 50 * 1024 * 1024 })
      .expect(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('reports storage as unavailable when it is not configured', async () => {
    const res = await session
      .auth(request(app).post('/api/uploads/presign'))
      .send({ filename: 'a.pdf', contentType: 'application/pdf', fileSize: 1024 })
      .expect(503);
    expect(res.body.message).toBe('Object storage is not configured');
  });

  it('rejects a direct upload without files and with a disallowed type', async () => {
    const empty = await session.auth(request(app).post('/api/uploads/direct')).expect(400);
    expect(empty.body.message).toBe('No files provided');

    const bad = await session
      .auth(request(app).post('/api/uploads/direct'))
      .attach('files', Buffer.from('#!/bin/sh'), { filename: 'x.sh', contentType: 'application/x-sh' })
      .expect(400);
    expect(bad.body.message).toMatch(/not allowed/);
  });

  it('rejects an avatar request without a file', async () => {
    const res = await session.auth(request(app).post('/api/uploads/avatar')).expect(400);
    expect(res.body.message).toBe('No avatar file provided');
  });

  it('refuses to delete objects outside the caller’s namespace', async () => {
    const res = await session
      .auth(request(app).delete('/api/uploads/uploads/someone-else/123_file.txt'))
      .expect(403);
    expect(res.body.message).toBe('Access denied');
  });

  describe('task attachments', () => {
    const attachment = {
      fileKey: 'uploads/u/1_abcd_notes.txt',
      originalName: 'notes.txt',
      mimeType: 'text/plain',
      size: 42,
      url: 'https://files.example.com/uploads/u/1_abcd_notes.txt',
    };

    it('attaches metadata to an accessible task and removes it again', async () => {
      const task = await createTask(session, { title: 'With files' });
      const added = await session
        .auth(request(app).post(`/api/uploads/tasks/${task._id}/attachments`))
        .send(attachment)
        .expect(201);
      expect(added.body.data.attachment).toMatchObject({
        filename: attachment.fileKey,
        originalName: 'notes.txt',
      });

      const detail = await session.auth(request(app).get(`/api/tasks/${task._id}`)).expect(200);
      expect(detail.body.data.task.attachments).toHaveLength(1);

      await session
        .auth(
          request(app).delete(`/api/uploads/tasks/${task._id}/attachments/${added.body.data.attachment._id}`)
        )
        .expect(200);
      const after = await session.auth(request(app).get(`/api/tasks/${task._id}`)).expect(200);
      expect(after.body.data.task.attachments).toHaveLength(0);
    });

    it('returns 404 for tasks the caller cannot see and for unknown attachments', async () => {
      const other = await registerUser();
      const foreign = await createTask(other, { title: 'Foreign' });
      await session
        .auth(request(app).post(`/api/uploads/tasks/${foreign._id}/attachments`))
        .send(attachment)
        .expect(404);

      const mine = await createTask(session, { title: 'Mine' });
      await session
        .auth(request(app).delete(`/api/uploads/tasks/${mine._id}/attachments/507f1f77bcf86cd799439011`))
        .expect(404);
    });
  });
});
