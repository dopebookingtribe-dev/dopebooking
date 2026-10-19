import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toImage, type Image } from "@/lib/media";
import type { Database } from "@/lib/supabase/database.types";
import { MEDIA_COLUMNS } from "./server";

/** Loads images by id in one query (e.g. covers for a list of cards). */
export async function fetchImagesById(
  supabase: SupabaseClient<Database>,
  ids: (string | null)[],
): Promise<Map<string, Image>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const images = new Map<string, Image>();
  if (!wanted.length) return images;

  const { data, error } = await supabase
    .from("media_assets")
    .select(MEDIA_COLUMNS)
    .in("id", wanted);
  if (error) throw new Error(`Failed to load images: ${error.message}`);
  for (const row of data) images.set(row.id, toImage(row));
  return images;
}
