import { describe, expect, it } from "vitest";
import { isGuestOnlyPath, isProtectedPath, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each(["/dashboard", "/admin/users?tab=roles", "/artists/some-artist"])(
    "keeps same-origin path %s",
    (path) => expect(safeNextPath(path)).toBe(path),
  );

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "dashboard",
    "/x\u0000y",
    "",
    undefined,
    42,
  ])("rejects %s", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});

describe("isProtectedPath", () => {
  it("guards dashboard and admin trees", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/orders")).toBe(true);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/users")).toBe(true);
    expect(isProtectedPath("/preview/home")).toBe(true);
  });

  it("leaves public look-alikes alone", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/artists")).toBe(false);
    expect(isProtectedPath("/administrators")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/previews")).toBe(false);
  });
});

describe("isGuestOnlyPath", () => {
  it("matches auth entry pages only", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/signup")).toBe(true);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
  });
});
