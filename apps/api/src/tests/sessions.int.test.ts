// apps/api/src/tests/sessions.int.test.ts
import { RefreshToken } from '@/modules/auth/auth.model';

import { app, registerUser, request } from './helpers';

const credentials = { email: 'sessions@example.com', password: 'Str0ngPassw0rd!' };

const login = () => request(app).post('/api/auth/login').send(credentials).expect(200);

describe('Auth sessions', () => {
  beforeEach(async () => {
    await registerUser({ username: 'sess_user', ...credentials });
  });

  it('lists active sessions newest first and revokes one', async () => {
    const first = await login();
    const second = await login();
    const token = second.body.data.tokens.accessToken;

    const list = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // register + two logins
    expect(list.body.data.sessions).toHaveLength(3);
    const [newest] = list.body.data.sessions;
    expect(newest.token).toBeUndefined();

    await request(app)
      .delete(`/api/auth/sessions/${newest._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const after = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.data.sessions).toHaveLength(2);

    // The revoked session's refresh token is dead.
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: second.body.data.tokens.refreshToken })
      .expect(403);
    // The other login's refresh token still works.
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.data.tokens.refreshToken })
      .expect(200);
  });

  it('returns 404 when revoking a session that is not the caller’s', async () => {
    const mine = await login();
    const other = await registerUser();
    const theirs = await RefreshToken.findOne({ token: other.refreshToken });
    expect(theirs).not.toBeNull();
    await request(app)
      .delete(`/api/auth/sessions/${theirs!._id}`)
      .set('Authorization', `Bearer ${mine.body.data.tokens.accessToken}`)
      .expect(404);
  });

  it('logout-all revokes every refresh token', async () => {
    const a = await login();
    const b = await login();
    await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${a.body.data.tokens.accessToken}`)
      .expect(200);
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: a.body.data.tokens.refreshToken })
      .expect(403);
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: b.body.data.tokens.refreshToken })
      .expect(403);
  });

  it('rejects a replayed refresh token after rotation', async () => {
    const { body } = await login();
    const original = body.data.tokens.refreshToken;
    const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken: original }).expect(200);
    await request(app).post('/api/auth/refresh').send({ refreshToken: original }).expect(403);
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rotated.body.data.tokens.refreshToken })
      .expect(200);
  });

  it('refuses a refresh token presented as an access token', async () => {
    const { body } = await login();
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${body.data.tokens.refreshToken}`)
      .expect(403);
    expect(res.body.message).toBe('Invalid token');
  });

  it('ignores malformed Authorization schemes', async () => {
    const { body } = await login();
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Token ${body.data.tokens.accessToken}`)
      .expect(401);
  });

  describe('change-password', () => {
    it('rejects a wrong current password and short new passwords', async () => {
      const { body } = await login();
      const auth = `Bearer ${body.data.tokens.accessToken}`;
      const wrong = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', auth)
        .send({ currentPassword: 'nope-nope-nope', newPassword: 'An0therStr0ng!' })
        .expect(400);
      expect(wrong.body.message).toBe('Current password is incorrect');

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', auth)
        .send({ currentPassword: credentials.password, newPassword: 'short' })
        .expect(400);
    });

    it('changes the password, revokes sessions and allows login with the new one', async () => {
      const { body } = await login();
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${body.data.tokens.accessToken}`)
        .send({ currentPassword: credentials.password, newPassword: 'An0therStr0ng!' })
        .expect(200);

      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: body.data.tokens.refreshToken })
        .expect(403);
      await request(app).post('/api/auth/login').send(credentials).expect(401);
      await request(app)
        .post('/api/auth/login')
        .send({ ...credentials, password: 'An0therStr0ng!' })
        .expect(200);
    });
  });

  it('logout with an unknown refresh token is a no-op', async () => {
    await request(app).post('/api/auth/logout').send({ refreshToken: 'unknown' }).expect(200);
  });

  it('rejects a disallowed CORS origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example').expect(403);
    expect(res.body.message).toBe('Not allowed by CORS policy');
  });

  it('allows a configured origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body).toMatchObject({ error: 'Not Found' });
  });
});
