import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  respondToServiceRequest,
  sendServiceMessage,
} from "@/modules/services/actions";
import { ServiceStatusBadge } from "@/modules/services/components/service-status-badge";
import { ServiceSummary } from "@/modules/services/components/service-summary";
import { getMyServiceRequest } from "@/modules/services/queries";
import {
  SERVICE_LABELS,
  SERVICE_OPEN_STATUSES,
  SERVICE_WORKFLOW,
} from "@/modules/services/schemas";
import { MessageForm } from "@/modules/workflow/components/message-form";
import { Timeline } from "@/modules/workflow/components/timeline";

export const metadata: Metadata = { title: "Service request" };

type Props = PageProps<"/dashboard/requests/[id]">;

export default function MyRequestPage({ params, searchParams }: Props) {
  return (
    <Container className="py-12">
      <Link
        href="/dashboard/requests"
        className="text-sm text-muted hover:text-text"
      >
        ← All requests
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading request…</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const data = await getMyServiceRequest(id);
  if (!data) notFound();
  const { request, timeline, userId } = data;

  return (
    <>
      {sent ? (
        <p
          role="status"
          className="mt-8 rounded-(--radius) border border-success/40 bg-surface-1 p-4 text-sm"
        >
          Request sent. We&apos;ll reply here with a quote, usually within 2
          working days.
        </p>
      ) : null}
      <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Meta>Request {request.reference}</Meta>
          <h1 className="mt-3 font-display text-headline">
            {SERVICE_LABELS[request.service_type]}
          </h1>
        </div>
        <ServiceStatusBadge status={request.status} />
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-6">
          <ServiceSummary request={request} />
          {request.status === "quoted" ? (
            <form
              action={respondToServiceRequest.bind(
                null,
                request.id,
                "accepted",
              )}
            >
              <ConfirmSubmit
                message="Accept this quote? Our team will then confirm and get in touch about next steps."
                className={buttonClasses("primary", "w-full sm:w-auto")}
              >
                Accept quote
              </ConfirmSubmit>
            </form>
          ) : null}
          {SERVICE_OPEN_STATUSES.includes(request.status) ? (
            <form
              action={respondToServiceRequest.bind(
                null,
                request.id,
                "cancelled",
              )}
            >
              <ConfirmSubmit
                message="Cancel this request? This can't be undone."
                className={buttonClasses(
                  "ghost",
                  "px-0 text-danger hover:text-danger",
                )}
              >
                Cancel request
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
        <section
          aria-labelledby="conversation-heading"
          className="flex flex-col gap-8"
        >
          <h2 id="conversation-heading" className="font-display text-3xl">
            Conversation
          </h2>
          <Timeline
            items={timeline}
            labels={SERVICE_WORKFLOW.labels}
            nameOf={(by: string | null) =>
              by === userId ? "You" : "DopeBooking team"
            }
          />
          <MessageForm action={sendServiceMessage.bind(null, request.id)} />
        </section>
      </div>
    </>
  );
}
