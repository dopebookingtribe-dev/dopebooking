import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-text";

export function SignInLink() {
  return (
    <Link href="/login" className={linkClass}>
      Sign in
    </Link>
  );
}

/** Reads the session — render inside <Suspense fallback={<SignInLink />}>. */
export async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) return <SignInLink />;
  return (
    <Link href="/dashboard" className={linkClass}>
      Dashboard
    </Link>
  );
}
