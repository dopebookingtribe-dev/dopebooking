import Image from "next/image";
import { buttonClasses } from "@/components/ui/button";
import type { Image as ImageData } from "@/lib/media";
import { deleteArtistImage, setArtistPortrait } from "../../actions";
import { ConfirmSubmit } from "./confirm-submit";

export function ImageGrid({
  artistId,
  images,
  portraitId,
}: {
  artistId: string;
  images: ImageData[];
  portraitId: string | null;
}) {
  if (!images.length) {
    return <p className="text-sm text-muted">No photos yet.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((image) => {
        const isPortrait = image.id === portraitId;
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
              {isPortrait ? (
                <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 font-mono text-[0.65rem] tracking-widest text-accent-ink uppercase">
                  Portrait
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-xs text-muted">{image.alt}</p>
            <div className="flex flex-wrap gap-2">
              {!isPortrait ? (
                <form action={setArtistPortrait.bind(null, artistId, image.id)}>
                  <button
                    type="submit"
                    className={buttonClasses(
                      "secondary",
                      "min-h-9 px-3 text-xs",
                    )}
                  >
                    Make portrait
                  </button>
                </form>
              ) : null}
              <form action={deleteArtistImage.bind(null, artistId, image.id)}>
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
