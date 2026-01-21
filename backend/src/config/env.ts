import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  
  // Trial
  DEFAULT_TRIAL_DAYS: z.string().default('7').transform(Number),
});

// Parse and validate environment
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
};

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
