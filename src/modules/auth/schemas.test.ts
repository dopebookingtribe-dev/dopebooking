import { describe, expect, it } from "vitest";
import { fieldErrorsOf } from "@/lib/forms";
import { resetPasswordSchema, signupSchema } from "./schemas";

describe("signupSchema", () => {
  it("normalises email and accepts a valid signup", () => {
    const result = signupSchema.parse({
      displayName: "  Astral Projection ",
      email: " Booking@Example.COM ",
      password: "correct horse battery",
    });
    expect(result.email).toBe("booking@example.com");
    expect(result.displayName).toBe("Astral Projection");
  });

  it("reports field errors for short passwords and bad emails", () => {
    const result = signupSchema.safeParse({
      displayName: "A",
      email: "nope",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrorsOf(result.error);
    expect(Object.keys(errors).sort()).toEqual([
      "displayName",
      "email",
      "password",
    ]);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "long enough password",
      confirmPassword: "different password",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsOf(result.error).confirmPassword).toEqual([
      "Passwords do not match.",
    ]);
  });
});
