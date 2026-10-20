import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { markNotificationsRead } from "@/modules/bookings/actions";
import { getMyNotifications } from "@/modules/bookings/queries";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Container className="py-16">
      <Meta>Dashboard</Meta>
      <h1 className="mt-3 font-display text-headline">Notifications</h1>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));

async function List() {
  const notifications = await getMyNotifications();
  if (!notifications.length) {
    return <p className="mt-10 text-muted">Nothing yet.</p>;
  }
  const unread = notifications.some((item) => !item.read_at);

  return (
    <>
      {unread ? (
        <form action={markNotificationsRead} className="mt-6">
          <Button type="submit" variant="secondary">
            Mark all as read
          </Button>
        </form>
      ) : null}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {notifications.map((item) => (
          <li key={item.id}>
            <Link
              href={item.link ?? "/dashboard"}
              className="group flex gap-4 py-4"
            >
              <span
                aria-hidden
                className={`mt-2 size-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-accent"}`}
              />
              <span>
                <span className="block font-medium transition-colors group-hover:text-accent">
                  {item.title}
                  {!item.read_at ? (
                    <span className="sr-only"> (unread)</span>
                  ) : null}
                </span>
                {item.body ? (
                  <span className="mt-1 block text-sm text-muted">
                    {item.body}
                  </span>
                ) : null}
                <span className="mt-1 block font-mono text-xs text-muted">
                  {when(item.created_at)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
