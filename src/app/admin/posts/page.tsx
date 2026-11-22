import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { MIGRATION_NOTICE } from "@/lib/supabase/schema-errors";
import { STATUSES } from "@/lib/validation";
import { listPostsForAdmin } from "@/modules/posts/admin-queries";
import { POST_CATEGORIES } from "@/modules/posts/schemas";

export const metadata: Metadata = { title: "News" };

export default function AdminPostsPage({
  searchParams,
}: PageProps<"/admin/posts">) {
  return (
    <Container className="py-12">
      <AdminHeader
        title="News"
        action={{ href: "/admin/posts/new", label: "New post" }}
      />
      <p className="mt-4 max-w-2xl text-muted">
        Blog posts and announcements on /news. Save drafts, preview, publish now
        or schedule a date. Add a Latest news section to any page in Pages.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Posts searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const control =
  "min-h-11 rounded-lg border border-line-strong bg-bg px-3 text-sm";

async function Posts({
  searchParams,
}: {
  searchParams: PageProps<"/admin/posts">["searchParams"];
}) {
  const params = await searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const status =
    one("status") === "scheduled" || one("status") in STATUSES
      ? (one("status") as keyof typeof STATUSES | "scheduled")
      : undefined;
  const posts = await listPostsForAdmin({
    q: one("q") || undefined,
    status,
    category: one("category") || undefined,
  });
  if (posts === null) {
    return (
      <p
        role="note"
        className="mt-10 rounded-(--radius) border border-uv/50 bg-uv/5 p-4 text-sm"
      >
        {MIGRATION_NOTICE}
      </p>
    );
  }
  const filtered = Boolean(one("q") || status || one("category"));
  return (
    <>
      <form
        method="get"
        role="search"
        className="mt-8 grid gap-3 rounded-(--radius) border border-line bg-surface-1 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={one("q")}
            placeholder="Title"
            className={control}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Status</span>
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">Any</option>
            {Object.entries(STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Category</span>
          <input
            name="category"
            list="categories"
            defaultValue={one("category")}
            className={control}
          />
          <datalist id="categories">
            {POST_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="min-h-11 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
          >
            Apply
          </button>
          {filtered ? (
            <Link
              href="/admin/posts"
              className="min-h-11 content-center text-sm text-muted underline"
            >
              Reset
            </Link>
          ) : null}
        </div>
      </form>
      <AdminTable
        columns={["Post", "Status", "Category", "Publish date", "Updated"]}
        empty={
          filtered ? "No posts match." : "No posts yet. Write the first one."
        }
        rows={posts.map((post) => ({
          key: post.id,
          href: `/admin/posts/${post.id}`,
          cells: [
            <>
              {post.title}
              {post.featured ? (
                <span className="ml-2 text-xs text-accent">★ Featured</span>
              ) : null}
              {post.is_demo ? (
                <span className="ml-2 font-label text-xs text-uv">Demo</span>
              ) : null}
            </>,
            post.scheduled ? (
              <span
                key="s"
                className="inline-flex rounded-full border border-uv/60 px-2.5 py-0.5 font-label text-xs text-uv"
              >
                Scheduled
              </span>
            ) : (
              <StatusBadge key="s" status={post.status} />
            ),
            post.category ?? "—",
            post.published_at ? shortDate(post.published_at) : "—",
            shortDate(post.updated_at),
          ],
        }))}
      />
    </>
  );
}
