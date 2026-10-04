// apps/api/src/tests/helpers.ts
import request from 'supertest';

import app from '../app';

export interface TestSession {
  accessToken: string;
  userId: string;
  auth: (req: request.Test) => request.Test;
}

let counter = 0;

/** Registers a fresh user and returns a helper that attaches its bearer token. */
export const registerUser = async (
  overrides: Partial<{ username: string; email: string; password: string }> = {}
): Promise<TestSession> => {
  counter += 1;
  const body = {
    username: overrides.username ?? `user${counter}_${Date.now().toString(36)}`,
    email: overrides.email ?? `user${counter}_${Date.now().toString(36)}@example.com`,
    password: overrides.password ?? 'Str0ngPassw0rd!',
  };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  const accessToken: string = res.body.data.tokens.accessToken;
  return {
    accessToken,
    userId: res.body.data.user._id ?? res.body.data.user.id,
    auth: req => req.set('Authorization', `Bearer ${accessToken}`),
  };
};

export const createTask = async (session: TestSession, body: Record<string, unknown>) => {
  const res = await session.auth(request(app).post('/api/tasks')).send(body);
  if (res.status !== 201) {
    throw new Error(`createTask failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data.task as { _id: string; [key: string]: unknown };
};

export { app, request };
