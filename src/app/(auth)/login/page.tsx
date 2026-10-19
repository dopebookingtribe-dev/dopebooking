import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { login } from "@/modules/auth/actions";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = PageProps<"/login">["searchParams"];

// The form is part of the static shell; only the bits that depend on the
// URL stream in, so the form is never swapped out under the user.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading eyebrow="Account" title="Sign in" />
      <Suspense fallback={null}>
        <LinkError searchParams={searchParams} />
      </Suspense>
      <AuthForm
        action={login}
        submitLabel="Sign in"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      >
        <Suspense fallback={null}>
          <NextInput searchParams={searchParams} />
        </Suspense>
      </AuthForm>
      <div className="mt-8 flex flex-col gap-2 text-sm text-muted">
        <Link
          href="/forgot-password"
          className="underline-offset-4 hover:text-text hover:underline"
        >
          Forgot your password?
        </Link>
        <p>
          New here?{" "}
          <Link
            href="/signup"
            className="text-text underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}

async function NextInput({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <input type="hidden" name="next" value={safeNextPath(next)} />;
}

async function LinkError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return (
    <p role="alert" className="mb-6 text-sm text-danger">
      That link is invalid or has expired. Sign in, or request a new link.
    </p>
  );
}
