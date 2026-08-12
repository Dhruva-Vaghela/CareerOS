import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtService } from './JwtService.js';
import { config } from '../config.js';

describe('JwtService', () => {
  const jwtService = new JwtService();
  const validUserId = 'user-123';

  it('accepts a valid JWT', () => {
    const token = jwt.sign({ userId: validUserId }, config.JWT_SECRET, { expiresIn: '15m' });
    expect(jwtService.verifyAccessToken(token)).toMatchObject({ userId: validUserId });
  });

  it('rejects an expired JWT', () => {
    const token = jwt.sign({ userId: validUserId }, config.JWT_SECRET, { expiresIn: '-1s' });
    expect(jwtService.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a JWT signed with the wrong secret', () => {
    const token = jwt.sign({ userId: validUserId }, 'wrong-secret', { expiresIn: '15m' });
    expect(jwtService.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a malformed JWT', () => {
    expect(jwtService.verifyAccessToken('this.is.not.a.jwt')).toBeNull();
  });

  it('rejects a token with missing or invalid userId', () => {
    const token = jwt.sign({ foo: 'bar' }, config.JWT_SECRET, { expiresIn: '15m' });
    expect(jwtService.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a forged JWT that contains a valid-looking userId', () => {
    const token = jwt.sign({ userId: validUserId }, 'another-wrong-secret', { expiresIn: '15m' });
    expect(jwtService.verifyAccessToken(token)).toBeNull();
  });
});
