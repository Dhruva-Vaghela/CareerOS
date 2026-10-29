import { describe, it, expect } from 'vitest';
import { oAuthTicketStore } from './OAuthTicketStore.js';

describe('OAuthTicketStore Unit Tests', () => {
  it('creates and consumes single-use ticket exactly once', () => {
    const payload = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: 'user-123',
        email: 'user@example.com',
      },
      name: 'Test User',
    };

    const ticket = oAuthTicketStore.createTicket(payload);
    expect(typeof ticket).toBe('string');
    expect(ticket.length).toBeGreaterThan(16);

    // First consumption succeeds
    const consumed = oAuthTicketStore.consumeTicket(ticket);
    expect(consumed).toEqual(payload);

    // Second consumption fails (preventing replay attack)
    const replayAttempt = oAuthTicketStore.consumeTicket(ticket);
    expect(replayAttempt).toBeNull();
  });

  it('returns null for non-existent ticket', () => {
    const result = oAuthTicketStore.consumeTicket('non-existent-ticket-random-value');
    expect(result).toBeNull();
  });
});
