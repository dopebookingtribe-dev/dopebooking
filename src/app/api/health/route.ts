import { connection, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";

// Uptime check: the app is up and the database answers. No secrets, no data.
export async function GET() {
  await connection(); // always run at request time
  const started = Date.now();
  let database = "down";
  try {
    const env = getPublicEnv();
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/artists?select=id&limit=1`,
      {
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      },
    );
    database = response.ok ? "up" : "down";
  } catch {
    database = "down";
  }
  const ok = database === "up";
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      database,
      latency_ms: Date.now() - started,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
