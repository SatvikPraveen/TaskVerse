// apps/api/src/tests/sockets.int.test.ts
import http from 'http';
import type { AddressInfo } from 'net';

import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket } from 'socket.io-client';

import { initSocketIO } from '@/sockets/init';

import { app, createTask, registerUser, request, type TestSession } from './helpers';

const waitFor = <T>(socket: Socket, event: string, timeoutMs = 3000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

describe('Socket.IO bridge', () => {
  let server: http.Server;
  let io: SocketIOServer;
  let url: string;
  let session: TestSession;
  const clients: Socket[] = [];

  beforeAll(async () => {
    server = http.createServer(app);
    io = new SocketIOServer(server);
    initSocketIO(io);
    await new Promise<void>(resolve => server.listen(0, resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(async () => {
    session = await registerUser();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  const connect = async (token: string): Promise<Socket> => {
    const client = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
    clients.push(client);
    await waitFor(client, 'connect');
    return client;
  };

  it('rejects connections without a valid token', async () => {
    const client = ioClient(url, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toMatch(/token required/);
  });

  it('delivers task:created to the creator room', async () => {
    const client = await connect(session.accessToken);
    const received = waitFor<{ taskId: string; title: string; actorId: string }>(client, 'task:created');
    const task = await createTask(session, { title: 'Realtime' });
    const payload = await received;
    expect(payload.taskId).toBe(task._id);
    expect(payload.title).toBe('Realtime');
    expect(payload.actorId).toBe(session.userId);
  });

  it('delivers status changes to the assignee and to task-room viewers', async () => {
    const assignee = await registerUser();
    const task = await createTask(session, { title: 'Shared', assignedTo: assignee.userId });

    const assigneeClient = await connect(assignee.accessToken);
    const viewer = await registerUser();
    const viewerClient = await connect(viewer.accessToken);
    viewerClient.emit('task:join', task._id);
    await new Promise(resolve => setTimeout(resolve, 50));

    const fromAssignee = waitFor<{ oldStatus: string; newStatus: string }>(
      assigneeClient,
      'task:status_changed'
    );
    const fromViewer = waitFor<{ taskId: string }>(viewerClient, 'task:status_changed');
    await session
      .auth(request(app).put(`/api/tasks/${task._id}`))
      .send({ status: 'completed' })
      .expect(200);

    expect(await fromAssignee).toMatchObject({ oldStatus: 'todo', newStatus: 'completed' });
    expect((await fromViewer).taskId).toBe(task._id);
  });

  it('does not leak events to unrelated users', async () => {
    const stranger = await registerUser();
    const strangerClient = await connect(stranger.accessToken);
    let leaked = false;
    strangerClient.on('task:created', () => {
      leaked = true;
    });
    await createTask(session, { title: 'Private' });
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(leaked).toBe(false);
  });
});
