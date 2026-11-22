import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { getPostPreview } from "@/modules/posts/admin-queries";
import { PostArticle } from "@/modules/posts/components/post-article";

export const metadata: Metadata = { title: "Preview post" };

export default function PreviewPostPage({
  params,
}: PageProps<"/admin/posts/[id]/preview">) {
  return (
    <Suspense
      fallback={
        <Container className="py-12">
          <p className="text-muted">Loading preview…</p>
        </Container>
      }
    >
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({
  params,
}: {
  params: PageProps<"/admin/posts/[id]/preview">["params"];
}) {
  const { id } = await params;
  const data = await getPostPreview(id);
  if (!data) notFound();
  return (
    <>
      <div className="border-b border-uv/40 bg-uv/10">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <span>
            {data.live
              ? "Preview: visitors see this page."
              : "Preview of a draft or scheduled post: visitors can't see it yet."}
          </span>
          <Link
            href={`/admin/posts/${id}`}
            className="underline underline-offset-4"
          >
            Back to the editor
          </Link>
        </Container>
      </div>
      <PostArticle post={data.detail} />
    </>
  );
}
