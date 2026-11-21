import { DISCIPLINES, isDiscipline } from "./schemas";

/** Wall-label lines for an artwork: year, discipline, medium, size. */
export function artworkLines(work: {
  year: number | null;
  discipline: string | null;
  medium: string | null;
  dimensions: string | null;
}) {
  return [
    work.year ? String(work.year) : null,
    work.discipline && isDiscipline(work.discipline)
      ? DISCIPLINES[work.discipline]
      : null,
    work.medium,
    work.dimensions,
  ].filter((line): line is string => !!line);
}
