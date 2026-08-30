import { z } from 'zod';

/**
 * Type-safe environment variable validation.
 * Fails fast at startup if required variables are missing.
 */

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .min(1)
    .transform((val) => val.split(',').map((id) => id.trim()).filter(Boolean)),

  // Encryption
  INVENTORY_ENCRYPTION_KEY: z.string().min(1),

  // VietQR
  VIETQR_BANK_CODE: z.string().min(1),
  VIETQR_ACCOUNT_NUMBER: z.string().min(1),
  VIETQR_ACCOUNT_NAME: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(1),
  ORDER_EXPIRE_MINUTES: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  // SePay
  SEPAY_WEBHOOK_SECRET: z.string().min(1),
  SEPAY_EXPECTED_ACCOUNT_NUMBER: z.string().min(1),
  SEPAY_EXPECTED_GATEWAYS: z
    .string()
    .default('')
    .transform((val) =>
      val
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    ),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Get validated environment variables.
 * Caches the result after first successful parse.
 * Only call this in server-side code.
 */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `❌ Missing or invalid environment variables:\n${missing}\n\nCheck your .env.local or .env file.`
    );
  }

  _env = result.data;
  return _env;
}

/**
 * Get a single server env var without full validation.
 * Use sparingly — prefer getEnv() for type safety.
 */
export function getServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}
