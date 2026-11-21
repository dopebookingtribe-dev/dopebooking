import Image from "next/image";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import type { Image as ImageData } from "@/lib/media";
import type { ArtCollection } from "@/lib/supabase/database.types";
import { ratioLabel } from "@/modules/media/image-specs";
import {
  deleteArtImage,
  makeArtLeadImage,
  setExhibitionMobileCover,
  setPhotoCollection,
} from "../../actions";
import { COLLECTIONS } from "../../schemas";

const small = (variant: "secondary" | "ghost") =>
  buttonClasses(variant, "min-h-9 px-3 text-xs");

/** Exhibition images: cover, phone cover, and the curated set of each photo. */
export function ExhibitionImages({
  exhibitionId,
  images,
  coverId,
  mobileCoverId,
}: {
  exhibitionId: string;
  images: (ImageData & { collection: ArtCollection | null })[];
  coverId: string | null;
  mobileCoverId: string | null;
}) {
  if (!images.length)
    return <p className="text-sm text-muted">No images yet.</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((image) => {
        const isCover = image.id === coverId;
        const isPhone = image.id === mobileCoverId;
        return (
          <li key={image.id} className="flex flex-col gap-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 20vw, 45vw"
                className={
                  image.collection === "logo"
                    ? "object-contain p-4"
                    : "object-cover"
                }
              />
              <span className="absolute top-2 left-2 flex flex-wrap gap-1">
                {isCover ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 font-label text-xs text-accent-ink">
                    Cover
                  </span>
                ) : null}
                {isPhone ? (
                  <span className="rounded-full bg-uv px-2 py-0.5 font-label text-xs text-accent-ink">
                    Phone cover
                  </span>
                ) : null}
              </span>
            </div>
            <p className="line-clamp-2 text-xs text-muted">{image.alt}</p>
            <p className="font-label text-[11px] text-muted">
              {image.width} × {image.height} px ·{" "}
              {ratioLabel(image.width, image.height)}
            </p>
            <form
              action={setPhotoCollection.bind(null, exhibitionId, image.id)}
              className="flex gap-2"
            >
              <label className="sr-only" htmlFor={`collection-${image.id}`}>
                Photo set
              </label>
              <select
                id={`collection-${image.id}`}
                name="collection"
                defaultValue={image.collection ?? ""}
                className="min-h-9 min-w-0 flex-1 rounded-(--radius) border border-line-strong bg-surface-1 px-2 text-xs"
              >
                <option value="">No set (cover only)</option>
                {Object.entries(COLLECTIONS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="submit" className={small("secondary")}>
                Move
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {!isCover ? (
                <form
                  action={makeArtLeadImage.bind(
                    null,
                    "exhibition",
                    exhibitionId,
                    image.id,
                  )}
                >
                  <button type="submit" className={small("secondary")}>
                    Make cover
                  </button>
                </form>
              ) : null}
              {isPhone ? (
                <form
                  action={setExhibitionMobileCover.bind(
                    null,
                    exhibitionId,
                    null,
                  )}
                >
                  <button type="submit" className={small("ghost")}>
                    Not the phone cover
                  </button>
                </form>
              ) : (
                <form
                  action={setExhibitionMobileCover.bind(
                    null,
                    exhibitionId,
                    image.id,
                  )}
                >
                  <button type="submit" className={small("secondary")}>
                    Make phone cover
                  </button>
                </form>
              )}
              <form
                action={deleteArtImage.bind(
                  null,
                  "exhibition",
                  exhibitionId,
                  image.id,
                )}
              >
                <ConfirmSubmit
                  message="Delete this image? This can't be undone."
                  className={small("ghost")}
                >
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
