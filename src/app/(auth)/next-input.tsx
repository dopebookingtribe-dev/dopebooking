import { safeNextPath } from "@/lib/auth/redirect";

/** Hidden "return to" field, streamed in because it reads the URL. */
export async function NextInput({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return <input type="hidden" name="next" value={safeNextPath(next)} />;
}
