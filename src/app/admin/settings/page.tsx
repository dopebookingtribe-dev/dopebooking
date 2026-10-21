import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getSettingsForEdit,
  listLibraryImages,
} from "@/modules/cms/admin-queries";
import { SettingsEditor } from "@/modules/cms/components/settings-editor";

export const metadata: Metadata = { title: "Site settings" };

export default function SettingsPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Site settings" />
      <p className="mt-4 max-w-2xl text-muted">
        Menu, footer, contact details, social links and search defaults. These
        appear on every page.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Editor />
      </Suspense>
    </Container>
  );
}

async function Editor() {
  const { permissions } = await requirePermission(
    "settings.manage",
    "/admin/settings",
  );
  const [settings, library] = await Promise.all([
    getSettingsForEdit(),
    listLibraryImages(),
  ]);
  return (
    <div className="mt-8">
      <SettingsEditor
        initial={settings.settings}
        hasUnpublished={settings.hasUnpublished}
        canPublish={permissions.has("pages.publish")}
        library={library}
      />
    </div>
  );
}
