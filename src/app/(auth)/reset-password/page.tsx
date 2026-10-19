import type { Metadata } from "next";
import { resetPassword } from "@/modules/auth/actions";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the recovery email via /auth/confirm, which signs the user in.
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading eyebrow="Account" title="Choose a new password" />
      <AuthForm
        action={resetPassword}
        submitLabel="Update password"
        fields={[
          {
            name: "password",
            label: "New password",
            type: "password",
            autoComplete: "new-password",
            hint: "At least 10 characters.",
          },
          {
            name: "confirmPassword",
            label: "Confirm new password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
    </>
  );
}
