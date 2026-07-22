import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createLogger } from '@careeros/logger';
import crypto from 'crypto';

const logger = createLogger('request-logger');

export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();
    req.headers['x-trace-id'] = traceId;
    res.setHeader('x-trace-id', traceId);

    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
        traceId,
      });
    });

    next();
  };
}
