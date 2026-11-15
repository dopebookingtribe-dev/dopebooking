import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { registerLibraryImage } from "@/modules/cms/actions";
import { listLibraryImages } from "@/modules/cms/admin-queries";
import { LibraryGrid } from "@/modules/cms/components/library-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import {
  GUIDELINES_PATH,
  IMAGE_SPECS,
  IMAGE_SPEC_LIST,
  ratioLabel,
  sizeLabel,
} from "@/modules/media/image-specs";

/** Placements filled from the library, phone versions folded in. */
const LIBRARY_SPECS = IMAGE_SPEC_LIST.filter(
  (spec) =>
    !spec.fallbackFor &&
    (spec.group === "headers" ||
      spec.group === "sections" ||
      spec.group === "sharing"),
);

function LibrarySizes() {
  return (
    <section aria-labelledby="library-sizes" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="library-sizes" className="font-display text-2xl">
          Sizes for library photos
        </h2>
        <Link
          href={GUIDELINES_PATH}
          className="text-sm underline underline-offset-4 hover:text-accent"
        >
          Media &amp; Image Guidelines
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Design for where the photo will go. When you choose a photo for a
        section, the page builder shows its guide and checks the fit.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {LIBRARY_SPECS.map((spec) => {
          const phone = spec.mobile ? IMAGE_SPECS[spec.mobile] : null;
          return (
            <li key={spec.id}>
              <Link
                href={`${GUIDELINES_PATH}#${spec.id}`}
                className="block h-full rounded-(--radius) border border-line bg-surface-1 px-4 py-3 text-sm transition-colors hover:border-accent"
              >
                <span className="block font-medium">{spec.title}</span>
                <span className="font-label text-xs text-muted">
                  {sizeLabel(spec.size)} ·{" "}
                  {spec.anyRatio ? "any shape" : ratioLabel(...spec.size)}
                  {phone
                    ? ` · phones ${phone.size[0]} × ${phone.size[1]} (${ratioLabel(...phone.size)})`
                    : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const metadata: Metadata = { title: "Media library" };

export default function MediaLibraryPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Media library" />
      <p className="mt-4 max-w-2xl text-muted">
        Photos for page sections: heroes, galleries, services and share images.
        Artist, event and product photos are managed on their own pages.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Library />
      </Suspense>
    </Container>
  );
}

async function Library() {
  await requirePermission("pages.edit", "/admin/media");
  const images = await listLibraryImages();
  return (
    <>
      <LibrarySizes />
      <div className="mt-10 max-w-2xl">
        <ImageUploader
          folder="library/site"
          multiple
          register={registerLibraryImage}
        />
      </div>
      <h2 className="mt-14 font-display text-2xl">
        {images.length} {images.length === 1 ? "photo" : "photos"}
      </h2>
      <LibraryGrid images={images} />
    </>
  );
}
