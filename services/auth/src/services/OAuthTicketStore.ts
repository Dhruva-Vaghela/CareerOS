import crypto from 'crypto';

export interface OAuthTicketPayload {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
  name?: string;
  picture?: string;
  isNewUser?: boolean;
}

interface StoredTicket {
  payload: OAuthTicketPayload;
  expiresAt: number;
}

/**
 * Single-use, short-lived (60s) ticket store for secure frontend delivery
 * of authentication tokens without exposing sensitive JWTs in redirect query parameters.
 */
class OAuthTicketStore {
  private tickets = new Map<string, StoredTicket>();
  private readonly TTL_MS = 60 * 1000; // 60 seconds

  constructor() {
    // Periodically prune expired tickets every 30 seconds
    setInterval(() => this.pruneExpired(), 30 * 1000).unref();
  }

  /**
   * Stores an authentication payload and returns a single-use random ticket.
   */
  public createTicket(payload: OAuthTicketPayload): string {
    const ticket = crypto.randomBytes(32).toString('hex');
    this.tickets.set(ticket, {
      payload,
      expiresAt: Date.now() + this.TTL_MS,
    });
    return ticket;
  }

  /**
   * Consumes and immediately invalidates a ticket, returning the payload if valid.
   */
  public consumeTicket(ticket: string): OAuthTicketPayload | null {
    const item = this.tickets.get(ticket);
    if (!item) {
      return null;
    }

    // Immediately remove from store to prevent replay attacks
    this.tickets.delete(ticket);

    if (Date.now() > item.expiresAt) {
      return null;
    }

    return item.payload;
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [key, value] of this.tickets.entries()) {
      if (now > value.expiresAt) {
        this.tickets.delete(key);
      }
    }
  }
}

export const oAuthTicketStore = new OAuthTicketStore();
