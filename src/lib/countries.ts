const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Codes Intl knows that aren't countries.
const NOT_COUNTRIES = new Set([
  ...["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ"],
  // Exceptionally reserved codes (not ISO 3166-1 countries).
  ...["AC", "CP", "CQ", "DG", "EA", "IC", "TA"],
]);

/** Country name for an ISO 3166-1 alpha-2 code, or the code itself. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** All ISO alpha-2 regions Intl can name, sorted by name. */
export const COUNTRIES: { code: string; name: string }[] = (() => {
  const result: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (NOT_COUNTRIES.has(code)) continue;
      const name = countryName(code);
      if (name !== code) result.push({ code, name });
    }
  }
  return result.sort((x, y) => x.name.localeCompare(y.name, "en"));
})();
