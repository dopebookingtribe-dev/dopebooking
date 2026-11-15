import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { getImageUsage } from "@/modules/cms/admin-queries";
import { GuidelinesBrowser } from "@/modules/media/components/guidelines-browser";
import {
  DEVICES,
  FORMAT_LABEL,
  GUIDELINES_PATH,
  MAX_SIZE_LABEL,
} from "@/modules/media/image-specs";

export const metadata: Metadata = { title: "Media & Image Guidelines" };

export default function ImageGuidelinesPage() {
  return (
    <Container className="py-16">
      <AdminHeader
        title="Media & Image Guidelines"
        backHref="/admin/media"
        backLabel="Media library"
      />
      <div className="mt-6 grid max-w-5xl gap-6 text-muted lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <p>
            The size to design for every image on the site, measured from the
            live layouts. Every upload field shows the same guide, and checks
            your photo before it uploads.
          </p>
          <p className="text-sm">
            Sizes are about twice what a screen shows, so photos stay sharp on
            high-density displays. Photos are cropped to fit their frame, never
            stretched or squashed; keep the subject inside the safe area. Where
            phones need a different shape, there is a separate phone image, and
            the main image is used when it&apos;s empty.
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 self-start rounded-(--radius) border border-line p-4 text-sm">
          <dt className="font-label text-xs">Files</dt>
          <dd>{FORMAT_LABEL}</dd>
          <dt className="font-label text-xs">Max size</dt>
          <dd>{MAX_SIZE_LABEL} per photo</dd>
          <dt className="font-label text-xs">Screens</dt>
          <dd>
            {Object.values(DEVICES)
              .map((device) => `${device.label} ${device.width} px`)
              .join(" · ")}
          </dd>
          <dt className="font-label text-xs">Focus</dt>
          <dd>
            Set what stays in view when cropping in the{" "}
            <Link href="/admin/media" className="underline underline-offset-4">
              media library
            </Link>
            .
          </dd>
        </dl>
      </div>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Guidelines />
      </Suspense>
    </Container>
  );
}

async function Guidelines() {
  await requireRole(STAFF_ROLES, GUIDELINES_PATH);
  const usage = await getImageUsage();
  return <GuidelinesBrowser usage={usage} />;
}
