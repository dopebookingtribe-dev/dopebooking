import "server-only";
import { z } from "zod";

// Server-only secrets. All optional so the app runs before each service is
// set up; features that need them check `has*()` and stay off until then.
const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function getServerEnv() {
  cached ??= schema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
  });
  return cached;
}

export function hasEmailSending() {
  const env = getServerEnv();
  return Boolean(
    env.SUPABASE_SECRET_KEY && env.RESEND_API_KEY && env.EMAIL_FROM,
  );
}
