import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.js';
import { testConnection } from '@careeros/database';
import { authRouter } from './routes/auth.js';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

describe('Auth Service Integration Tests', () => {
  let app: express.Application;
  let accessToken: string;
  let refreshToken: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Setup Express App for testing
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(parseAuth());
    app.use('/api/v1/auth', authRouter);
    app.use(globalErrorHandler);

    // Verify DB connection
    const { pool } = getDb();
    const isConnected = await testConnection(pool);
    expect(isConnected).toBe(true);
  });

  afterAll(async () => {
    const { db, pool } = getDb();
    // Clean up test data
    await db.delete(users).where(eq(users.email, testEmail));
    await pool.end();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.id).toBeDefined();
  });

  it('should reject registration with existing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });

  it('should login successfully and return tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should access protected route /me with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();
  });

  it('should reject protected route /me without token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should refresh tokens successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken); // Token rotation
    
    // Update tokens for logout test
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should logout successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail to refresh token after logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
