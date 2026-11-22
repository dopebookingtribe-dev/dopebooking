import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/modules/cms/queries";
import { getPublishedPosts } from "../queries";
import { PostCard } from "./post-card";

/** The /news listing: lead story, category filter, then the rest. */
export async function PostIndex({ category }: { category?: string }) {
  const [all, settings] = await Promise.all([
    getPublishedPosts({ limit: 100 }),
    getSiteSettings(),
  ]);
  const categories = [
    ...new Set(
      all.map((post) => post.category).filter((c): c is string => !!c),
    ),
  ].sort();
  const active =
    category && categories.includes(category) ? category : undefined;
  const posts = active ? all.filter((post) => post.category === active) : all;
  const lead = active
    ? undefined
    : (posts.find((post) => post.featured) ?? posts[0]);
  const rest = posts.filter((post) => post !== lead);
  const showDemo = settings.showDemoLabels;

  return (
    <Container className="py-12 sm:py-16">
      {categories.length > 1 ? (
        <nav
          aria-label="News categories"
          className="mb-10 flex flex-wrap gap-2"
        >
          {[undefined, ...categories].map((name) => (
            <Link
              key={name ?? "all"}
              href={
                name ? `/news?category=${encodeURIComponent(name)}` : "/news"
              }
              aria-current={name === active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors ${
                name === active
                  ? "border-accent text-text"
                  : "border-line-strong text-muted hover:text-text"
              }`}
            >
              {name ?? "All"}
            </Link>
          ))}
        </nav>
      ) : null}
      {!posts.length ? (
        <p className="text-lg text-muted">
          News is on its way. Check back soon.
        </p>
      ) : (
        <>
          {lead ? (
            <div className="mb-16">
              <PostCard post={lead} large priority showDemo={showDemo} />
            </div>
          ) : null}
          {rest.length ? (
            <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} showDemo={showDemo} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Container>
  );
}
