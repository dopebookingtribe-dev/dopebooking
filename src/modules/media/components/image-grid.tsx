import Image from "next/image";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import type { Image as ImageData } from "@/lib/media";

/**
 * Admin grid of an owner's photos. `makeLead` and `remove` are server
 * actions already bound to the owner; each button binds the asset id.
 */
export function ImageGrid({
  images,
  leadId,
  leadLabel,
  makeLead,
  remove,
}: {
  images: ImageData[];
  leadId: string | null;
  leadLabel: string;
  makeLead: (assetId: string) => Promise<void>;
  remove: (assetId: string) => Promise<void>;
}) {
  if (!images.length) {
    return <p className="text-sm text-muted">No photos yet.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((image) => {
        const isLead = image.id === leadId;
        return (
          <li key={image.id} className="flex flex-col gap-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 20vw, 45vw"
                className="object-cover"
              />
              {isLead ? (
                <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 font-label text-xs text-accent-ink">
                  {leadLabel}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-xs text-muted">{image.alt}</p>
            <div className="flex flex-wrap gap-2">
              {!isLead ? (
                <form action={makeLead.bind(null, image.id)}>
                  <button
                    type="submit"
                    className={buttonClasses(
                      "secondary",
                      "min-h-9 px-3 text-xs",
                    )}
                  >
                    Make {leadLabel.toLowerCase()}
                  </button>
                </form>
              ) : null}
              <form action={remove.bind(null, image.id)}>
                <ConfirmSubmit
                  message="Delete this photo? This can't be undone."
                  className={buttonClasses("ghost", "min-h-9 px-3 text-xs")}
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
