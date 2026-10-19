import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>) {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    // Only variable names are reported, never values.
    const names = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Missing or invalid environment variables: ${[...new Set(names)].join(", ")}. ` +
        "Copy .env.example to .env.local and fill them in.",
    );
  }
  return result.data;
}

let cached: PublicEnv | undefined;

// Validated lazily so builds without secrets (CI) still succeed;
// the first request that needs a value fails fast with a clear message.
export function getPublicEnv(): PublicEnv {
  // NEXT_PUBLIC_* must be referenced literally so Next.js can inline them.
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
