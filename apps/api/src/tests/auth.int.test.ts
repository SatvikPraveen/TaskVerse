// apps/api/src/tests/auth.int.test.ts
import request from 'supertest';
import app from '../app';
import { User } from '@/modules/users/user.model';
import { RefreshToken } from '@/modules/auth/auth.model';

describe('Auth Integration Tests', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            username: testUser.username,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });

      // Verify user was created in database
      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(testUser.username);
    });

    it('should reject registration with existing email', async () => {
      // Create user first
      await request(app).post('/api/auth/register').send(testUser);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Conflict',
        message: 'User already exists with this email or username',
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register user for login tests
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            username: testUser.username,
            email: testUser.email,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });

      // Old refresh token should be revoked
      const oldToken = await RefreshToken.findOne({ token: refreshToken });
      expect(oldToken?.isRevoked).toBe(true);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Forbidden',
        message: 'Invalid refresh token',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      });

      // Refresh token should be revoked
      const token = await RefreshToken.findOne({ token: refreshToken });
      expect(token?.isRevoked).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            username: testUser.username,
            email: testUser.email,
          },
        },
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access Denied',
        message: 'No token provided',
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access Denied',
        message: 'Invalid token',
      });
    });
  });
});