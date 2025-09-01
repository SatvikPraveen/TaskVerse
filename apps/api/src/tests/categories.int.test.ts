// apps/api/src/tests/categories.int.test.ts
import request from 'supertest';
import app from '../app';
import { Category } from '@/modules/categories/category.model';

describe('Categories Integration Tests', () => {
  let accessToken: string;
  let userId: string;

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
  });

  describe('POST /api/categories', () => {
    it('should create a category successfully', async () => {
      const categoryData = {
        name: 'Work',
        description: 'Work related tasks',
        color: '#ff0000',
        icon: 'briefcase',
        sortOrder: 1,
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Category created successfully',
        data: {
          category: {
            name: categoryData.name,
            description: categoryData.description,
            color: categoryData.color,
            icon: categoryData.icon,
            sortOrder: categoryData.sortOrder,
            isDefault: false,
            isActive: true,
          },
        },
      });
    });

    it('should create category with minimal data', async () => {
      const categoryData = {
        name: 'Simple Category',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data.category).toMatchObject({
        name: categoryData.name,
        color: '#6366f1', // Default color
        sortOrder: 0, // Default sort order
        isDefault: false,
        isActive: true,
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate color format', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Category',
          color: 'invalid-color',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should prevent duplicate category names for same user', async () => {
      const categoryData = { name: 'Unique Category' };

      // Create first category
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryData)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
    });
  });

  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create test categories
      const categories = [
        { name: 'Work', color: '#ff0000', sortOrder: 1 },
        { name: 'Personal', color: '#00ff00', sortOrder: 2 },
        { name: 'Shopping', color: '#0000ff', sortOrder: 3 },
      ];

      for (const category of categories) {
        await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(category);
      }
    });

    it('should get all categories for user', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(3);
      
      // Should be sorted by sortOrder
      expect(response.body.data.categories[0].name).toBe('Work');
      expect(response.body.data.categories[1].name).toBe('Personal');
      expect(response.body.data.categories[2].name).toBe('Shopping');
    });

    it('should only return active categories', async () => {
      // Deactivate one category
      const category = await Category.findOne({ name: 'Work' });
      if (category) {
        category.isActive = false;
        await category.save();
      }

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.categories.map((c: any) => c.name)).not.toContain('Work');
    });
  });

  describe('GET /api/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Category',
          description: 'Test description',
          color: '#ff0000',
        });

      categoryId = createResponse.body.data.category._id;
    });

    it('should get category by id', async () => {
      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          category: {
            _id: categoryId,
            name: 'Test Category',
            description: 'Test description',
            color: '#ff0000',
          },
        },
      });
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/categories/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('PUT /api/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Original Name',
          color: '#ff0000',
        });

      categoryId = createResponse.body.data.category._id;
    });

    it('should update category successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        color: '#00ff00',
        icon: 'star',
      };

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Category updated successfully',
        data: {
          category: {
            name: updateData.name,
            description: updateData.description,
            color: updateData.color,
            icon: updateData.icon,
          },
        },
      });
    });

    it('should validate unique name constraint', async () => {
      // Create another category
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Another Category' });

      // Try to update to existing name
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Another Category' })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
    });
  });

  describe('DELETE /api/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Category to Delete' });

      categoryId = createResponse.body.data.category._id;
    });

    it('should soft delete category successfully', async () => {
      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Category deleted successfully',
      });

      // Verify category is soft deleted
      const category = await Category.findById(categoryId);
      expect(category?.isActive).toBe(false);
    });
  });

  describe('PUT /api/categories/reorder', () => {
    let categoryIds: string[];

    beforeEach(async () => {
      categoryIds = [];
      const categories = [
        { name: 'First', sortOrder: 1 },
        { name: 'Second', sortOrder: 2 },
        { name: 'Third', sortOrder: 3 },
      ];

      for (const category of categories) {
        const createResponse = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(category);
        categoryIds.push(createResponse.body.data.category._id);
      }
    });

    it('should reorder categories successfully', async () => {
      const reorderData = {
        categories: [
          { id: categoryIds[2], sortOrder: 1 }, // Third -> 1
          { id: categoryIds[0], sortOrder: 2 }, // First -> 2
          { id: categoryIds[1], sortOrder: 3 }, // Second -> 3
        ],
      };

      const response = await request(app)
        .put('/api/categories/reorder')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reorderData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Categories reordered successfully',
      });

      // Verify new order
      const categories = await Category.find({ createdBy: userId, isActive: true })
        .sort({ sortOrder: 1 });

      expect(categories[0].name).toBe('Third');
      expect(categories[1].name).toBe('First');
      expect(categories[2].name).toBe('Second');
    });

    it('should validate category ownership', async () => {
      const response = await request(app)
        .put('/api/categories/reorder')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categories: [
            { id: '507f1f77bcf86cd799439011', sortOrder: 1 }, // Non-existent ID
          ],
        })
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
    });
  });

  describe('GET /api/categories/stats', () => {
    beforeEach(async () => {
      // Create test categories
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Work', color: '#ff0000' });

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Personal', color: '#00ff00' });
    });

    it('should get category statistics', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: expect.arrayContaining([
            expect.objectContaining({
              name: 'Work',
              color: '#ff0000',
              taskCount: 0,
              completedTasks: 0,
            }),
            expect.objectContaining({
              name: 'Personal',
              color: '#00ff00',
              taskCount: 0,
              completedTasks: 0,
            }),
          ]),
        },
      });
    });
  });
});