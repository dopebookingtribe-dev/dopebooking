import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/modules/auth/actions";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password">
        We&apos;ll email you a link to choose a new password.
      </AuthHeading>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
          },
        ]}
      />
      <p className="mt-8 text-sm text-muted">
        <Link href="/login" className="text-text underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
