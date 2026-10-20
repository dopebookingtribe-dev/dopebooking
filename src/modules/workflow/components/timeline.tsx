import type { TimelineItem } from "../types";

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));

/**
 * Status changes and messages in order. `nameOf` decides how authors are
 * shown (requesters see "You" / "DopeBooking team").
 */
export function Timeline({
  items,
  labels,
  nameOf,
}: {
  items: TimelineItem[];
  labels: Record<string, string>;
  nameOf: (userId: string | null) => string;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) =>
        item.kind === "status" ? (
          <li key={item.id} className="flex gap-3 text-sm">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
            />
            <div>
              <p>
                <span className="font-medium">
                  {labels[item.to] ?? item.to}
                </span>
                <span className="text-muted">
                  {" "}
                  · {nameOf(item.by)} · {time(item.at)}
                </span>
              </p>
              {item.note ? (
                <p className="mt-1 whitespace-pre-line text-muted">
                  {item.note}
                </p>
              ) : null}
            </div>
          </li>
        ) : (
          <li
            key={item.id}
            className={`rounded-(--radius) border p-4 ${item.internal ? "border-uv/50 bg-uv/5" : "border-line bg-surface-1"}`}
          >
            <p className="text-xs text-muted">
              {item.internal ? (
                <span className="mr-2 font-mono tracking-[0.12em] text-uv uppercase">
                  Internal note
                </span>
              ) : null}
              {nameOf(item.by)} · {time(item.at)}
            </p>
            <p className="mt-2 text-sm whitespace-pre-line">{item.body}</p>
          </li>
        ),
      )}
    </ol>
  );
}
