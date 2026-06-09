import { z } from 'zod';
import path from 'path';
import fs from 'fs';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  let text: string = "";
  try {
    text = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGINS: z.string().default('http://localhost:8080,https://roundu-app.vercel.app'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('ROUNDU'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  CASHFREE_CLIENT_ID: z.string(),
  CASHFREE_CLIENT_SECRET: z.string(),
  CASHFREE_BASE_URL: z.string().default('https://sandbox.cashfree.com/verification'),
  CASHFREE_WEBHOOK_SECRET: z.string().optional(),
  CASHFREE_PUBLIC_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

if (!parsed.data.JWT_ACCESS_SECRET && !parsed.data.JWT_SECRET) {
  throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET) must be set');
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
};

export type Env = typeof env;
