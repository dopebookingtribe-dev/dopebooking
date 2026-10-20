import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signup } from "@/modules/auth/actions";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { AuthHeading } from "../auth-heading";
import { NextInput } from "../next-input";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <>
      <AuthHeading eyebrow="Account" title="Create an account">
        Book artists, request festival services and track your orders.
      </AuthHeading>
      <AuthForm
        action={signup}
        submitLabel="Create account"
        fields={[
          {
            name: "displayName",
            label: "Name",
            type: "text",
            autoComplete: "name",
          },
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
            autoComplete: "new-password",
            hint: "At least 10 characters.",
          },
        ]}
      >
        <Suspense fallback={null}>
          <NextInput searchParams={searchParams} />
        </Suspense>
      </AuthForm>
      <p className="mt-8 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-text underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
