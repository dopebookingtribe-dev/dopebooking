/**
 * True when a query failed because a table or column doesn't exist yet,
 * i.e. a newer migration hasn't been applied. Callers then fall back to the
 * older shape so the site keeps working between deploy and migration.
 */
export function isMissingSchema(error: { code?: string } | null | undefined) {
  return (
    !!error &&
    ["PGRST200", "PGRST204", "PGRST205", "42P01", "42703"].includes(
      error.code ?? "",
    )
  );
}

export const MIGRATION_NOTICE =
  "This feature needs the database update in supabase/migrations/20261122000000_cms_upgrade_enums.sql and 20261122000100_cms_upgrade.sql. Apply them (in order) in the Supabase SQL editor or with `npx supabase db push`.";
