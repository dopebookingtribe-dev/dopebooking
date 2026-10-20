import "server-only";
import { requireRole, requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import type { ServiceStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { loadTimeline } from "@/modules/workflow/server";

// Reads use the signed-in user's session; RLS limits requesters to their own
// requests and hides internal notes and the provider directory from them.

const UUID = /^[0-9a-f-]{36}$/i;
const LIST_COLUMNS =
  "id, reference, service_type, event_name, event_start, city, country, status, assigned_staff_id, created_at";

export async function listMyServiceRequests() {
  const user = await requireUser("/dashboard/requests");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(LIST_COLUMNS)
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load requests: ${error.message}`);
  return data;
}

export async function getMyServiceRequest(id: string) {
  const user = await requireUser(`/dashboard/requests/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .eq("requester_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load request: ${error.message}`);
  if (!request) return null;
  const timeline = await loadTimeline<ServiceStatus>(supabase, "service", id);
  return { request, timeline, userId: user.id };
}

export async function listServiceRequestsForAdmin(
  filter: "open" | "confirmed" | "completed" | "all",
) {
  await requireRole(STAFF_ROLES, "/admin/services");
  const supabase = await createClient();
  let query = supabase.from("service_requests").select(LIST_COLUMNS);
  if (filter === "open") {
    query = query.in("status", [
      "submitted",
      "under_review",
      "quoted",
      "accepted",
    ]);
  } else if (filter !== "all") {
    query = query.eq("status", filter);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load requests: ${error.message}`);
  return data;
}

export async function getServiceRequestForAdmin(id: string) {
  const user = await requireRole(STAFF_ROLES, `/admin/services/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load request: ${error.message}`);
  if (!request) return null;

  const [timeline, providers] = await Promise.all([
    loadTimeline<ServiceStatus>(supabase, "service", id),
    supabase
      .from("service_providers")
      .select("id, name, services, active")
      .contains("services", [request.service_type])
      .order("name"),
  ]);
  const personIds = [
    request.requester_id,
    request.assigned_staff_id,
    ...timeline.map((item) => item.by),
  ].filter((value): value is string => !!value);
  const { data: people } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...new Set(personIds)]);

  return {
    request,
    timeline,
    providers: providers.data ?? [],
    names: new Map(
      (people ?? []).map((person) => [person.id, person.display_name]),
    ),
    userId: user.id,
  };
}

export async function listProviders() {
  await requireRole(STAFF_ROLES, "/admin/providers");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_providers")
    .select("id, name, services, regions, active, updated_at")
    .order("name");
  if (error) throw new Error(`Failed to load providers: ${error.message}`);
  return data;
}

export async function getProvider(id: string) {
  await requireRole(STAFF_ROLES, `/admin/providers/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_providers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load provider: ${error.message}`);
  return data;
}
