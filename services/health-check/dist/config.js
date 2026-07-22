import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();
const envSchema = z.object({
    PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
    DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/careeros'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    GEMINI_API_KEY: z.string().default('mock'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.format());
    process.exit(1);
}
export const config = parsed.data;
//# sourceMappingURL=config.js.map