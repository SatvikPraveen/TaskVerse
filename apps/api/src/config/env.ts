// apps/api/src/config/env.ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().default('http://localhost:3001'),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_TEST_URI: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  /** Refresh-token lifetime in days; must agree with JWT_REFRESH_EXPIRES_IN. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform(val => val.split(',').map(origin => origin.trim()).filter(Boolean)),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().default(20),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Cloudflare R2 / S3-compatible endpoints (MinIO)
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  METRICS_ENABLED: z
    .string()
    .default('true')
    .transform(v => v !== 'false' && v !== '0'),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Environment validation failed:');
    result.error.errors.forEach(err => {
      // eslint-disable-next-line no-console
      console.error(`  • ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
