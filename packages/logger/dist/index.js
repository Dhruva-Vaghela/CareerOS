import pino from 'pino';
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
export const logger = pino({
    level: defaultLogLevel,
    base: {
        env: process.env.NODE_ENV || 'development',
    },
    transport,
});
export function createLogger(serviceName) {
    return logger.child({ service: serviceName });
}
export default logger;
//# sourceMappingURL=index.js.map