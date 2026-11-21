"use client";

import { useId, useState } from "react";
import type { ArtCollection } from "@/lib/supabase/database.types";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import type { ImageResult, RegisterImageInput } from "@/modules/media/server";
import { COLLECTIONS, PHOTO_COLLECTIONS } from "../../schemas";

type Register = (input: RegisterImageInput) => Promise<ImageResult>;

/**
 * Upload exhibition photography straight into a curated set. Each set has
 * its own server action (bound on the server), so the set travels with
 * the upload and can't be forged into another exhibition.
 */
export function PhotoSetUploader({
  folder,
  registers,
  guidelinesHref,
}: {
  folder: string;
  registers: Record<(typeof PHOTO_COLLECTIONS)[number], Register>;
  guidelinesHref: string;
}) {
  const id = useId();
  const [set, setSet] =
    useState<(typeof PHOTO_COLLECTIONS)[number]>("installation");
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">
          Add photos to the set
        </legend>
        <div className="flex flex-wrap gap-2">
          {PHOTO_COLLECTIONS.map((key: ArtCollection) => (
            <label
              key={key}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent"
            >
              <input
                type="radio"
                name={`${id}-set`}
                value={key}
                checked={set === key}
                onChange={() =>
                  setSet(key as (typeof PHOTO_COLLECTIONS)[number])
                }
                className="accent-(--accent)"
              />
              {COLLECTIONS[key]}
            </label>
          ))}
        </div>
      </fieldset>
      <ImageUploader
        key={set}
        folder={folder}
        register={registers[set]}
        multiple
        guidelinesHref={guidelinesHref}
        roles={[{ spec: "art-exhibition-photo", label: COLLECTIONS[set] }]}
      />
    </div>
  );
}
