import { z } from 'zod/v4';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRICE_BASIC: z.string().startsWith('price_'),
  STRIPE_PRICE_PRO: z.string().startsWith('price_'),
});

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Environment validation failed:\n${JSON.stringify(result.error.format(), null, 2)}`,
    );
  }

  return result.data;
}
