// apps/api/src/tests/users.int.test.ts
import { User } from '@/modules/users/user.model';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

describe('Users API', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await registerUser({ username: 'alice_w' });
  });

  describe('profile', () => {
    it('returns the full profile without the password', async () => {
      const res = await session.auth(request(app).get('/api/users/profile')).expect(200);
      expect(res.body.data.user).toMatchObject({ username: 'alice_w', isActive: true });
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.fullName).toBe('alice_w');
    });

    it('updates profile fields and derives fullName', async () => {
      const res = await session
        .auth(request(app).put('/api/users/profile'))
        .send({ firstName: 'Alice', lastName: 'Wong', bio: 'Researcher', timezone: 'Europe/London' })
        .expect(200);
      expect(res.body.data.user).toMatchObject({ firstName: 'Alice', lastName: 'Wong', bio: 'Researcher' });
      expect(res.body.data.user.fullName).toBe('Alice Wong');
    });

    it('rejects an invalid avatar URL', async () => {
      const res = await session
        .auth(request(app).put('/api/users/profile'))
        .send({ avatar: 'not-a-url' })
        .expect(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('accepts an empty avatar to clear it', async () => {
      await session.auth(request(app).put('/api/users/profile')).send({ avatar: '' }).expect(200);
    });
  });

  describe('preferences', () => {
    it('merges nested preference updates without clobbering siblings', async () => {
      await session
        .auth(request(app).put('/api/users/preferences'))
        .send({ theme: 'dark', notifications: { email: false } })
        .expect(200);
      const res = await session
        .auth(request(app).put('/api/users/preferences'))
        .send({ defaultView: 'kanban', notifications: { push: false } })
        .expect(200);
      expect(res.body.data.user.preferences).toMatchObject({
        theme: 'dark',
        defaultView: 'kanban',
        notifications: { email: false, push: false, taskReminders: true, taskAssignments: true },
      });
    });

    it('rejects unknown enum values', async () => {
      await session.auth(request(app).put('/api/users/preferences')).send({ theme: 'sepia' }).expect(400);
    });
  });

  describe('search and lookup', () => {
    it('finds users by partial name, case-insensitively, with pagination', async () => {
      await registerUser({ username: 'bob_builder' });
      await registerUser({ username: 'bobby_tables' });

      const res = await session.auth(request(app).get('/api/users/search?query=BOB&limit=1')).expect(200);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: true,
      });

      const all = await session.auth(request(app).get('/api/users/search')).expect(200);
      expect(all.body.data.users.length).toBeGreaterThanOrEqual(3);
      expect(all.body.data.users[0].email).toBeUndefined(); // projection hides email
    });

    it('treats regex metacharacters in the query literally', async () => {
      const res = await session.auth(request(app).get('/api/users/search?query=.*')).expect(200);
      expect(res.body.data.users).toHaveLength(0);
    });

    it('returns a public profile by id and 404 for unknown ids', async () => {
      const other = await registerUser({ username: 'carol_x' });
      const res = await session.auth(request(app).get(`/api/users/${other.userId}`)).expect(200);
      expect(res.body.data.user.username).toBe('carol_x');
      expect(res.body.data.user.email).toBeUndefined();

      await session.auth(request(app).get('/api/users/507f1f77bcf86cd799439011')).expect(404);
    });

    it('reports an invalid id format as a 400 rather than a crash', async () => {
      const res = await session.auth(request(app).get('/api/users/not-an-object-id')).expect(400);
      expect(res.body.message).toBe('Invalid ID format');
    });
  });

  describe('stats', () => {
    it('counts tasks and categories for the caller', async () => {
      await session.auth(request(app).post('/api/categories')).send({ name: 'Work' }).expect(201);
      const t = await createTask(session, { title: 'Open' });
      await createTask(session, { title: 'Done', status: 'completed' });
      await session
        .auth(request(app).put(`/api/tasks/${t._id}`))
        .send({ status: 'in_progress' })
        .expect(200);

      const res = await session.auth(request(app).get('/api/users/stats')).expect(200);
      expect(res.body.data.stats).toEqual({
        tasksCompleted: 1,
        tasksActive: 1,
        tasksCreated: 2,
        categoriesCreated: 1,
      });
    });
  });

  describe('account deactivation', () => {
    it('deactivates the account, frees the identifiers and revokes access', async () => {
      await session.auth(request(app).delete('/api/users/account')).expect(200);

      const stored = await User.findById(session.userId);
      expect(stored?.isActive).toBe(false);
      expect(stored?.email).toMatch(/^deleted_/);

      // Existing access token no longer resolves to an active user.
      await session.auth(request(app).get('/api/users/profile')).expect(401);

      // The original identifiers can be registered again.
      await registerUser({ username: 'alice_w' });
    });
  });
});
