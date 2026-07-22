import bcrypt from 'bcrypt';
import { createLogger } from '@careeros/logger';

const logger = createLogger('password-service');

export class PasswordService {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error({ err: error }, 'Error hashing password');
      throw new Error('Failed to hash password');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error({ err: error }, 'Error verifying password');
      return false;
    }
  }
}
