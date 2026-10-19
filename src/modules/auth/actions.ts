"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, type FormState } from "@/lib/forms";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./schemas";

function confirmUrl(next: string) {
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const url = new URL("/auth/confirm", NEXT_PUBLIC_SITE_URL);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsOf(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for every failure so accounts can't be enumerated.
    return {
      status: "error",
      message:
        "Email or password is incorrect, or the email is not verified yet.",
      values,
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  const values = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsOf(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: confirmUrl("/dashboard"),
    },
  });
  if (error?.code === "weak_password") {
    return {
      status: "error",
      fieldErrors: {
        password: ["This password is too easy to guess. Try a longer one."],
      },
      values,
    };
  }
  if (error) {
    return {
      status: "error",
      message: "We couldn't create your account. Please try again shortly.",
      values,
    };
  }

  // Shown whether or not the email was already registered.
  return {
    status: "success",
    message: "Check your inbox for a confirmation link to finish signing up.",
  };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsOf(parsed.error),
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl("/reset-password"),
  });

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return {
      status: "error",
      message: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      status: "error",
      message: "We couldn't update your password. Try a different one.",
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
