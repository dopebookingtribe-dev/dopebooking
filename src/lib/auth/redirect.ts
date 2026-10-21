/**
 * Returns a safe same-origin path for post-login redirects.
 * Rejects absolute URLs, protocol-relative URLs and backslash tricks
 * so `?next=` can't be used as an open redirect.
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/preview"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const;

export function isGuestOnlyPath(pathname: string): boolean {
  return (GUEST_ONLY_PATHS as readonly string[]).includes(pathname);
}
