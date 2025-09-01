// apps/api/src/tests/tasks.int.test.ts
import request from 'supertest';
import app from '../app';
import { User } from '@/modules/users/user.model';
import { Category } from '@/modules/categories/category.model';
import { Task } from '@/modules/tasks/task.model';

describe('Tasks Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let categoryId: string;

  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123',
  };

  beforeEach(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    accessToken = registerResponse.body.data.tokens.accessToken;
    userId = registerResponse.body.data.user.id;

    // Create a test category
    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Category',
        color: '#ff0000',
      });

    categoryId = categoryResponse.body.data.category._id;
  });

  describe('POST /api/tasks', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high',
        category: categoryId,
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        tags: ['test', 'important'],
        subtasks: [
          { title: 'Subtask 1', isCompleted: false },
          { title: 'Subtask 2', isCompleted: true },
        ],
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Task created successfully',
        data: {
          task: {
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            status: 'todo',
            tags: taskData.tags,
            subtasks: expect.arrayContaining([
              expect.objectContaining({ title: 'Subtask 1' }),
              expect.objectContaining({ title: 'Subtask 2' }),
            ]),
          },
        },
      });
    });

    it('should create a minimal task', async () => {
      const taskData = {
        title: 'Minimal Task',
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.data.task).toMatchObject({
        title: taskData.title,
        status: 'todo',
        priority: 'medium',
        tags: [],
        subtasks: [],
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        { title: 'Task 1', priority: 'high', status: 'todo' },
        { title: 'Task 2', priority: 'medium', status: 'in_progress' },
        { title: 'Task 3', priority: 'low', status: 'completed' },
      ];

      for (const task of tasks) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(task);
      }
    });

    it('should get all tasks for user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].status).toBe('completed');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].priority).toBe('high');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.tasks).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        hasNext: true,
        hasPrev: false,
      });
    });
  });

  describe('GET /api/tasks/:taskId', () => {
    let taskId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Task',
          description: 'Test description',
        });

      taskId = createResponse.body.data.task._id;
    });

    it('should get task by id', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          task: {
            _id: taskId,
            title: 'Test Task',
            description: 'Test description',
          },
        },
      });
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('PUT /api/tasks/:taskId', () => {
    let taskId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Original Title',
          status: 'todo',
        });

      taskId = createResponse.body.data.task._id;
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'high',
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Task updated successfully',
        data: {
          task: {
            title: updateData.title,
            status: updateData.status,
            priority: updateData.priority,
          },
        },
      });
    });

    it('should set completedAt when status changes to completed', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.task.completedAt).toBeTruthy();
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    let taskId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task to Delete' });

      taskId = createResponse.body.data.task._id;
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Task deleted successfully',
      });

      // Verify task is deleted
      const task = await Task.findById(taskId);
      expect(task).toBeNull();
    });
  });

  describe('POST /api/tasks/:taskId/comments', () => {
    let taskId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task with Comments' });

      taskId = createResponse.body.data.task._id;
    });

    it('should add comment to task', async () => {
      const comment = { content: 'This is a test comment' };

      const response = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(comment)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Comment added successfully',
        data: {
          comment: {
            content: comment.content,
            author: expect.objectContaining({
              username: testUser.username,
            }),
          },
        },
      });
    });
  });

  describe('GET /api/tasks/stats', () => {
    beforeEach(async () => {
      // Create tasks with different statuses
      const tasks = [
        { title: 'Todo Task', status: 'todo' },
        { title: 'In Progress Task', status: 'in_progress' },
        { title: 'Completed Task', status: 'completed' },
        { title: 'Cancelled Task', status: 'cancelled' },
      ];

      for (const task of tasks) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(task);
      }
    });

    it('should get task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: {
            todo: 1,
            in_progress: 1,
            completed: 1,
            cancelled: 1,
            overdue: 0,
          },
        },
      });
    });
  });
});