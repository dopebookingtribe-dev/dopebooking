"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ContentStatus } from "@/lib/supabase/database.types";
import { setPostStatus } from "../actions";

/** One-click publish, unpublish and archive. */
export function PostStatusActions({
  postId,
  status,
}: {
  postId: string;
  status: ContentStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (next: ContentStatus, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      await setPostStatus(postId, next);
      router.refresh();
    });
  };
  const button =
    "min-h-10 rounded-full border px-4 text-sm transition-colors disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("published")}
          className={`${button} border-accent bg-accent text-accent-ink`}
        >
          Publish
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run("draft", "Unpublish this post? It goes back to draft.")
          }
          className={`${button} border-line-strong hover:border-accent`}
        >
          Unpublish
        </button>
      )}
      {status !== "archived" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("archived")}
          className={`${button} border-line-strong text-muted hover:text-text`}
        >
          Archive
        </button>
      ) : null}
    </div>
  );
}
