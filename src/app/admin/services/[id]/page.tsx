import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  assignServiceProvider,
  assignServiceStaff,
  changeServiceStatus,
  sendServiceMessage,
} from "@/modules/services/actions";
import { ProviderAssignForm } from "@/modules/services/components/provider-assign-form";
import { ServiceStatusBadge } from "@/modules/services/components/service-status-badge";
import { ServiceSummary } from "@/modules/services/components/service-summary";
import { getServiceRequestForAdmin } from "@/modules/services/queries";
import {
  SERVICE_LABELS,
  SERVICE_STAFF_TRANSITIONS,
  SERVICE_WORKFLOW,
} from "@/modules/services/schemas";
import { MessageForm } from "@/modules/workflow/components/message-form";
import { StatusActions } from "@/modules/workflow/components/status-actions";
import { Timeline } from "@/modules/workflow/components/timeline";

export const metadata: Metadata = { title: "Service request" };

export default function AdminServicePage({
  params,
}: PageProps<"/admin/services/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading request…</p>}>
        <Detail params={params} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
}: {
  params: PageProps<"/admin/services/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getServiceRequestForAdmin(id);
  if (!data) notFound();
  const { request, timeline, providers, names, userId } = data;
  const nameOf = (person: string | null) =>
    person ? (names.get(person) ?? "Unknown") : "System";
  const assignedToMe = request.assigned_staff_id === userId;

  return (
    <>
      <AdminHeader
        title={request.event_name}
        eyebrow={`${SERVICE_LABELS[request.service_type]}, ${request.reference}`}
        backHref="/admin/services"
        backLabel="All service requests"
      >
        <ServiceStatusBadge status={request.status} />
      </AdminHeader>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Request"
          description={`From ${nameOf(request.requester_id)} on ${new Date(request.created_at).toLocaleDateString("en-GB")}.`}
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <ServiceSummary request={request} showPrivate />
            <div className="flex flex-col gap-8">
              <div>
                <Meta>Assigned to</Meta>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span>
                    {request.assigned_staff_id
                      ? nameOf(request.assigned_staff_id)
                      : "Nobody yet"}
                  </span>
                  <form
                    action={assignServiceStaff.bind(
                      null,
                      request.id,
                      assignedToMe ? null : userId,
                    )}
                  >
                    <button
                      type="submit"
                      className={buttonClasses(
                        "secondary",
                        "min-h-9 px-3 text-xs",
                      )}
                    >
                      {assignedToMe ? "Unassign me" : "Assign to me"}
                    </button>
                  </form>
                </div>
              </div>
              <div>
                <ProviderAssignForm
                  current={request.assigned_provider_id}
                  providers={providers}
                  action={assignServiceProvider.bind(null, request.id)}
                />
                <p className="mt-2 text-xs text-muted">
                  Internal only.{" "}
                  <Link
                    href="/admin/providers"
                    className="underline underline-offset-4"
                  >
                    Manage providers
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </EditSection>

        <EditSection
          title="Status"
          description="Every step is logged and the requester is notified by email."
        >
          <StatusActions
            key={request.status}
            allowed={SERVICE_STAFF_TRANSITIONS[request.status]}
            actionLabels={SERVICE_WORKFLOW.actions}
            defaultCurrency={request.budget_currency}
            action={changeServiceStatus.bind(null, request.id)}
          />
        </EditSection>

        <EditSection
          title="Conversation"
          description="Messages are emailed to the requester. Internal notes are staff-only."
        >
          <div className="flex flex-col gap-8">
            <Timeline
              items={timeline}
              labels={SERVICE_WORKFLOW.labels}
              nameOf={nameOf}
            />
            <MessageForm
              action={sendServiceMessage.bind(null, request.id)}
              allowInternal
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}
