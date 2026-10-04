import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import { initDb } from './db/index.js';
import { testConnection, disconnectDatabase } from '@careeros/database';
import { config } from './config.js';
import { InterviewSessionModel } from './db/models/interviewSession.model.js';
import { InterviewQuestionModel } from './db/models/interviewQuestion.model.js';
import { InterviewResponseModel } from './db/models/interviewResponse.model.js';
import { InterviewFeedbackModel } from './db/models/interviewFeedback.model.js';
import { CompanyInterviewProfileModel } from './db/models/companyInterviewProfile.model.js';
import { InterviewRoundType } from '@careeros/shared-types';

describe('Interview Service Integration Tests', () => {
  const app = createApp();
  const testUserId = `test-user-interview-${Date.now()}`;
  let token: string;
  let createdSessionId: string;
  let firstQuestionId: string;

  beforeAll(async () => {
    token = jwt.sign({ userId: testUserId, sub: testUserId }, config.JWT_SECRET, { expiresIn: '1h' });
    const { connection } = await initDb();
    const isConnected = await testConnection(connection);
    expect(isConnected).toBe(true);
  });

  afterAll(async () => {
    // Clean up test data
    const sessions = await InterviewSessionModel.find({ userId: testUserId });
    const sessionIds = sessions.map((s) => s._id.toString());
    await InterviewQuestionModel.deleteMany({ sessionId: { $in: sessionIds } });
    await InterviewResponseModel.deleteMany({ sessionId: { $in: sessionIds } });
    await InterviewFeedbackModel.deleteMany({ sessionId: { $in: sessionIds } });
    await InterviewSessionModel.deleteMany({ userId: testUserId });
    await disconnectDatabase();
  });

  it('GET /api/v1/interviews/health should return ok', async () => {
    const res = await request(app).get('/api/v1/interviews/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('interview-service');
  });

  it('GET /api/v1/interviews/company/profiles should return seeded company profiles', async () => {
    const res = await request(app)
      .get('/api/v1/interviews/company/profiles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profiles).toBeDefined();
    expect(Array.isArray(res.body.profiles)).toBe(true);
    expect(res.body.profiles.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/interviews/company/start should start a company interview session', async () => {
    const res = await request(app)
      .post('/api/v1/interviews/company/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'Google',
        jobRole: 'Software Engineer',
        experienceLevel: 'INTERMEDIATE',
        roundType: InterviewRoundType.CODING_ALGORITHMS,
        questionsCount: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.session.mode).toBe('COMPANY');
    expect(res.body.firstQuestion).toBeDefined();
    expect(res.body.totalQuestions).toBeGreaterThanOrEqual(1);

    createdSessionId = res.body.sessionId;
    firstQuestionId = res.body.firstQuestion._id;
  }, 20000);

  it('GET /api/v1/interviews/company/:id should return interview session state', async () => {
    const res = await request(app)
      .get(`/api/v1/interviews/company/${createdSessionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.session._id).toBe(createdSessionId);
    expect(res.body.questions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.currentQuestion._id).toBe(firstQuestionId);
  });

  it('POST /api/v1/interviews/company/:id/respond should evaluate question 1 and advance', async () => {
    const res = await request(app)
      .post(`/api/v1/interviews/company/${createdSessionId}/respond`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        questionId: firstQuestionId,
        responseText:
          'I would use a sliding window approach with a hash map to keep track of the most recent index of each character, achieving O(N) time complexity and O(K) space complexity.',
      });

    expect(res.status).toBe(200);
    expect(res.body.evaluation).toBeDefined();
    expect(res.body.evaluation.score).toBeGreaterThan(0);
    expect(res.body.evaluation.feedback).toBeDefined();
  }, 20000);

  it('POST /api/v1/interviews/company/:id/respond for the last question should finalize session and generate feedback', async () => {
    // Get state to find the next question
    const stateRes = await request(app)
      .get(`/api/v1/interviews/company/${createdSessionId}`)
      .set('Authorization', `Bearer ${token}`);

    if (stateRes.body.currentQuestion) {
      const qId = stateRes.body.currentQuestion._id;
      const res = await request(app)
        .post(`/api/v1/interviews/company/${createdSessionId}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          questionId: qId,
          responseText:
            'To detect cycles in a directed microservice dependency graph, I will use Depth-First Search with 3-color vertex tracking (White for unvisited, Gray for currently exploring in recursion stack, Black for fully processed). If a Gray node is encountered, a cycle exists.',
        });

      expect(res.status).toBe(200);
      expect(res.body.evaluation).toBeDefined();
      if (res.body.isFinished) {
        expect(res.body.feedback).toBeDefined();
        expect(res.body.feedback.overallScore).toBeGreaterThan(0);
      }
    }
  }, 25000);

  it('GET /api/v1/interviews/company/:id/evaluation should return the final feedback report', async () => {
    const res = await request(app)
      .get(`/api/v1/interviews/company/${createdSessionId}/evaluation`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.summary).toBeDefined();
    expect(res.body.feedback.strengths.length).toBeGreaterThan(0);
  }, 20000);

  it('GET /api/v1/interviews/history should list user interview history', async () => {
    const res = await request(app)
      .get('/api/v1/interviews/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toBeDefined();
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
    expect(res.body.history[0].session._id).toBe(createdSessionId);
  });
});
