import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { getDb } from './db/index.js';
import { testConnection } from '@careeros/database';
import { profileRouter } from './routes/profile.js';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { profiles } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { config } from './config.js';
import crypto from 'crypto';

describe('Profile Service Integration Tests', () => {
  let app: express.Application;
  const testUserId = crypto.randomUUID();
  const testToken = jwt.sign({ userId: testUserId }, config.JWT_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(parseAuth());
    app.use('/api/v1/profile', profileRouter);
    app.use(globalErrorHandler);

    const { pool } = getDb();
    const isConnected = await testConnection(pool);
    expect(isConnected).toBe(true);
  });

  afterAll(async () => {
    const { db, pool } = getDb();
    await db.delete(profiles).where(eq(profiles.userId, testUserId));
    await pool.end();
  });

  it('should return empty/incomplete status for non-existent profile', async () => {
    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile).toBeNull();
    expect(res.body.data.completion.isComplete).toBe(false);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/profile');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject profile creation without required targetRole', async () => {
    const res = await request(app)
      .put('/api/v1/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        fullName: 'Jane Doe',
        // targetRole omitted
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should create profile with custom role, availability hours (per day), and base64 avatar image', async () => {
    const mockBase64Avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await request(app)
      .put('/api/v1/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        fullName: 'Jane Doe',
        profilePictureUrl: mockBase64Avatar,
        country: 'India',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'en',
        college: 'IIT Bombay',
        degree: 'B.Tech',
        branch: 'Computer Science',
        currentSemester: 6,
        graduationYear: 2026,
        currentStatus: 'STUDENT',
        targetRole: 'Robotics Engineer', // Custom written role
        experienceLevel: 'INTERMEDIATE',
        availabilityHours: 4,
        availabilityTimeframe: 'PER_DAY',
        interests: ['System Design', 'AI'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.fullName).toBe('Jane Doe');
    expect(res.body.data.profile.targetRole).toBe('Robotics Engineer');
    expect(res.body.data.profile.profilePictureUrl).toBe(mockBase64Avatar);
    expect(res.body.data.profile.availabilityHours).toBe(4);
    expect(res.body.data.profile.availabilityTimeframe).toBe('PER_DAY');
    expect(res.body.data.profile.profileCompleted).toBe(true);
    expect(res.body.data.completion.isComplete).toBe(true);
  });

  it('should retrieve profile (GET) successfully', async () => {
    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.userId).toBe(testUserId);
    expect(res.body.data.profile.targetRole).toBe('Robotics Engineer');
    expect(res.body.data.profile.availabilityHours).toBe(4);
    expect(res.body.data.profile.availabilityTimeframe).toBe('PER_DAY');
  });

  it('should partially update profile (PATCH) with PER_WEEK availability hours', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        targetRole: 'Quantum Engineer',
        experienceLevel: 'ADVANCED',
        availabilityHours: 25,
        availabilityTimeframe: 'PER_WEEK',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.targetRole).toBe('Quantum Engineer');
    expect(res.body.data.profile.experienceLevel).toBe('ADVANCED');
    expect(res.body.data.profile.availabilityHours).toBe(25);
    expect(res.body.data.profile.availabilityTimeframe).toBe('PER_WEEK');
    expect(res.body.data.profile.fullName).toBe('Jane Doe');
  });

  it('should get completion status (/completion)', async () => {
    const res = await request(app)
      .get('/api/v1/profile/completion')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isComplete).toBe(true);
    expect(res.body.data.percentage).toBeGreaterThanOrEqual(60);
  });
});
