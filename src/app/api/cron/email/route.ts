import { NextResponse, type NextRequest } from "next/server";
import { processEmailOutbox } from "@/lib/email/outbox";
import { getServerEnv } from "@/lib/env.server";

// Backup sender for the email outbox (emails are normally sent right after
// the action that queued them). Called by Vercel Cron with CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processEmailOutbox(50);
  return NextResponse.json(result, {
    status: result.configured ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
