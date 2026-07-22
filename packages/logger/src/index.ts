import pino, { Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

const isProduction = process.env.NODE_ENV === 'production';
const defaultLogLevel = process.env.LOG_LEVEL || 'info';

const transport = !isProduction
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger: Logger = pino({
  level: defaultLogLevel,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  transport,
});

export function createLogger(serviceName: string): Logger {
  return logger.child({ service: serviceName });
}

export default logger;
