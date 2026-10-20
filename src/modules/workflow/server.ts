import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { TimelineItem } from "./types";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Merged, time-ordered history + messages for a request (RLS applies). */
export async function loadTimeline<Status extends string>(
  supabase: Client,
  source: "booking" | "service",
  id: string,
): Promise<TimelineItem<Status>[]> {
  const [history, messages] =
    source === "booking"
      ? await Promise.all([
          supabase
            .from("booking_status_history")
            .select("id, from_status, to_status, changed_by, note, created_at")
            .eq("booking_id", id),
          supabase
            .from("booking_messages")
            .select("id, author_id, body, internal, created_at")
            .eq("booking_id", id),
        ])
      : await Promise.all([
          supabase
            .from("service_request_status_history")
            .select("id, from_status, to_status, changed_by, note, created_at")
            .eq("request_id", id),
          supabase
            .from("service_request_messages")
            .select("id, author_id, body, internal, created_at")
            .eq("request_id", id),
        ]);
  if (history.error || messages.error) {
    throw new Error("Failed to load the conversation.");
  }

  return [
    ...history.data.map((row): TimelineItem<Status> => ({
      kind: "status",
      id: `s${row.id}`,
      at: row.created_at,
      from: row.from_status as Status | null,
      to: row.to_status as Status,
      note: row.note,
      by: row.changed_by,
    })),
    ...messages.data.map((row): TimelineItem<Status> => ({
      kind: "message",
      id: row.id,
      at: row.created_at,
      body: row.body,
      internal: row.internal,
      by: row.author_id,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}
