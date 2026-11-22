import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { DeleteRecordForm } from "@/components/admin/delete-record-form";
import { Container } from "@/components/ui/container";
import { deletePost, updatePost } from "@/modules/posts/actions";
import {
  getPostForAdmin,
  getPostFormOptions,
} from "@/modules/posts/admin-queries";
import { PostForm } from "@/modules/posts/components/post-form";
import { PostStatusActions } from "@/modules/posts/components/post-status-actions";

export const metadata: Metadata = { title: "Edit post" };

export default function EditPostPage({
  params,
}: PageProps<"/admin/posts/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading post…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/posts/[id]">["params"];
}) {
  const { id } = await params;
  const [post, options] = await Promise.all([
    getPostForAdmin(id),
    getPostFormOptions(),
  ]);
  if (!post) notFound();
  const scheduled =
    post.status === "published" &&
    post.published_at &&
    post.published_at > new Date().toISOString();

  return (
    <>
      <AdminHeader
        title={post.title}
        eyebrow="Edit post"
        backHref="/admin/posts"
        backLabel="All news"
      >
        {scheduled ? (
          <span className="inline-flex rounded-full border border-uv/60 px-2.5 py-0.5 font-label text-xs text-uv">
            Scheduled
          </span>
        ) : (
          <StatusBadge status={post.status} />
        )}
        <Link
          href={`/admin/posts/${post.id}/preview`}
          className="text-sm underline underline-offset-4"
        >
          Preview
        </Link>
        {post.status === "published" && !scheduled ? (
          <Link
            href={`/news/${post.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-6">
        <PostStatusActions postId={post.id} status={post.status} />
      </div>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Post"
          description="Everything here is public once the post is published."
        >
          <PostForm
            post={post}
            publishedAtInput={post.publishedAtInput}
            artists={options.artists}
            events={options.events}
            images={options.images}
            files={options.files}
            action={updatePost.bind(null, post.id)}
          />
        </EditSection>
        <EditSection
          title="Delete"
          description="Removes the post for good. Photos and files stay in the media library."
        >
          <DeleteRecordForm
            label="Delete post"
            confirm={`Delete “${post.title}”? This can't be undone.`}
            action={deletePost.bind(null, post.id)}
          />
        </EditSection>
      </div>
    </>
  );
}
