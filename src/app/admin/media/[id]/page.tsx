import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import {
  formatBytes,
  formatDuration,
  MEDIA_KINDS,
} from "@/modules/media/constants";
import { LibraryUploader } from "@/modules/media/components/library-uploader";
import {
  CopyButton,
  DeleteFileButton,
  MediaDetailsForm,
} from "@/modules/media/components/media-details";
import { MediaPreview } from "@/modules/media/components/media-preview";
import {
  getMediaItem,
  MEDIA_SOURCES,
  requireMediaEditor,
} from "@/modules/media/library-server";

export const metadata: Metadata = { title: "Media file" };

export default function MediaItemPage({
  params,
}: PageProps<"/admin/media/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Item params={params} />
      </Suspense>
    </Container>
  );
}

async function Item({
  params,
}: {
  params: PageProps<"/admin/media/[id]">["params"];
}) {
  const { id } = await params;
  await requireMediaEditor(`/admin/media/${id}`);
  const item = await getMediaItem(id);
  if (!item) notFound();
  const library = item.owner.source === "library";
  const rule = MEDIA_KINDS[item.kind];

  const facts: [string, string | null][] = [
    ["Type", `${rule.label}${item.mimeType ? ` (${item.mimeType})` : ""}`],
    ["Size", item.sizeBytes ? formatBytes(item.sizeBytes) : null],
    [
      "Dimensions",
      item.width && item.height ? `${item.width} × ${item.height} px` : null,
    ],
    [
      "Running time",
      item.durationSeconds ? formatDuration(item.durationSeconds) : null,
    ],
    ["Original file", item.originalName],
    ["Uploaded", shortDate(item.createdAt)],
    ["Last changed", item.updatedAt ? shortDate(item.updatedAt) : null],
  ];

  return (
    <>
      <AdminHeader
        title={item.alt}
        eyebrow={rule.label}
        backHref="/admin/media"
        backLabel="Media library"
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <MediaPreview
            kind={item.kind}
            url={item.url}
            alt={item.alt}
            focal={{ x: item.focalX, y: item.focalY }}
            size="large"
            mimeType={item.mimeType}
          />
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value={item.url} label="Copy public link" />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4"
            >
              Open file ↗
            </a>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-6 gap-y-2 rounded-(--radius) border border-line p-5 text-sm">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="break-all">{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="mt-14 flex flex-col gap-14">
        <EditSection
          title="Where it's used"
          description={
            library
              ? "Pages, settings, news posts, videos and press kits that use this file."
              : "This photo belongs to one record and is managed there."
          }
        >
          {item.usage.length ? (
            <ul className="flex flex-col gap-2">
              {item.usage.map((ref) => (
                <li key={ref.label}>
                  <Link
                    href={ref.href}
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    {ref.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Not used anywhere yet.</p>
          )}
          {!library && item.owner.href ? (
            <p className="mt-4 text-sm">
              <Link
                href={item.owner.href}
                className="underline underline-offset-4"
              >
                Open the {MEDIA_SOURCES[item.owner.source].label.toLowerCase()}{" "}
                record
              </Link>{" "}
              to change, reorder or delete this photo.
            </p>
          ) : null}
        </EditSection>

        <EditSection
          title="Details"
          description={
            item.kind === "image"
              ? "Description for screen readers, credit and the focus point used when the photo is cropped."
              : "Title and credit shown with the file."
          }
        >
          <MediaDetailsForm
            id={item.id}
            kind={item.kind}
            url={item.url}
            alt={item.alt}
            credit={item.credit}
            focalX={item.focalX}
            focalY={item.focalY}
            width={item.width}
            height={item.height}
            editable
          />
        </EditSection>

        {library ? (
          <>
            <EditSection
              title="Replace file"
              description={`Upload a new ${rule.label.toLowerCase()} in its place. Everything using it shows the new file straight away.`}
            >
              <LibraryUploader
                kinds={[item.kind]}
                replaceId={item.id}
                multiple={false}
              />
            </EditSection>
            <EditSection
              title="Delete"
              description="Removes the file from storage for good."
            >
              <DeleteFileButton id={item.id} used={item.usage.length > 0} />
            </EditSection>
          </>
        ) : null}
      </div>
    </>
  );
}
