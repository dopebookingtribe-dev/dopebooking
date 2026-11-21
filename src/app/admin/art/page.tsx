import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getArtOverview } from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { SERVICE_STATUS_LABELS } from "@/modules/services/schemas";

export const metadata: Metadata = { title: "Art Gallery" };

export default function ArtAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Art Gallery" eyebrow="Catalogue">
        <Link
          href="/art-gallery"
          className="text-sm underline underline-offset-4"
        >
          View the Art Gallery
        </Link>
      </AdminHeader>
      <ArtAdminNav current="/admin/art" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Overview />
      </Suspense>
    </Container>
  );
}

const PAGES = [
  {
    key: "art-gallery",
    label: "Landing page",
    body: "Hero wall, story, sections and their order.",
  },
  {
    key: "art-exhibitions",
    label: "Exhibitions page",
    body: "Header and closing banner.",
  },
  {
    key: "art-artists",
    label: "Artists page",
    body: "Header and the collaboration map.",
  },
  {
    key: "art-collaborate",
    label: "Collaborate page",
    body: "Offer, process, questions and the form.",
  },
];

async function Overview() {
  const data = await getArtOverview();
  if (!data) return <MigrationNotice />;

  const tiles = [
    {
      label: "Exhibitions",
      href: "/admin/art/exhibitions",
      stats: data.exhibitions,
      add: "/admin/art/exhibitions/new",
    },
    {
      label: "Artists",
      href: "/admin/art/artists",
      stats: data.artists,
      add: "/admin/art/artists/new",
    },
    {
      label: "Artworks",
      href: "/admin/art/artworks",
      stats: data.works,
      add: "/admin/art/artworks/new",
    },
  ];

  return (
    <div className="mt-12 flex flex-col gap-14">
      <section aria-labelledby="content-heading">
        <h2 id="content-heading" className="font-label text-sm text-accent">
          Content
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {tiles.map((tile) => (
            <li
              key={tile.label}
              className="rounded-(--radius) border border-line bg-surface-1 p-6"
            >
              <Link
                href={tile.href}
                className="font-display text-2xl hover:text-accent"
              >
                {tile.label}
              </Link>
              <p className="mt-3 font-display text-5xl text-accent">
                {tile.stats.published}
              </p>
              <p className="font-label text-sm text-muted">
                published · {tile.stats.draft} draft · {tile.stats.total} total
              </p>
              <ButtonLink href={tile.add} variant="secondary" className="mt-5">
                Add
              </ButtonLink>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {data.festivals} festival{data.festivals === 1 ? "" : "s"} on file ·{" "}
          <Link
            href="/admin/art/festivals"
            className="underline underline-offset-4"
          >
            Manage festivals
          </Link>
        </p>
      </section>

      <section aria-labelledby="inquiries-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="inquiries-heading" className="font-label text-sm text-accent">
            Latest collaboration inquiries
          </h2>
          <Link
            href="/admin/art/inquiries"
            className="text-sm underline underline-offset-4"
          >
            All inquiries
          </Link>
        </div>
        {data.inquiries.length ? (
          <ul className="mt-4 divide-y divide-line rounded-(--radius) border border-line">
            {data.inquiries.map((inquiry) => (
              <li key={inquiry.id}>
                <Link
                  href={`/admin/services/${inquiry.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-1"
                >
                  <span>
                    <span className="font-medium">{inquiry.event_name}</span>
                    <span className="ml-3 font-label text-xs text-muted">
                      {inquiry.reference}
                    </span>
                  </span>
                  <span className="font-label text-xs text-muted">
                    {SERVICE_STATUS_LABELS[inquiry.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No inquiries yet. They arrive from the Collaborate page and from
            “Invite to your festival” on artist profiles.
          </p>
        )}
      </section>

      <section aria-labelledby="pages-heading">
        <h2 id="pages-heading" className="font-label text-sm text-accent">
          Page content, hero visuals and SEO
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm text-muted">
          The Art Gallery pages are edited in the page builder: headings, texts,
          photos, which sections show, their order, and search titles and
          descriptions.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAGES.map((page) => (
            <li key={page.key}>
              <Link
                href={`/admin/pages/${page.key}`}
                className="group block h-full rounded-(--radius) border border-line bg-surface-1 p-5 hover:border-accent"
              >
                <span className="font-display text-xl group-hover:text-accent">
                  {page.label}
                </span>
                <span className="mt-2 block text-sm text-muted">
                  {page.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="images-heading"
        className="rounded-(--radius) border border-line p-6"
      >
        <h2 id="images-heading" className="font-display text-2xl">
          Preparing images
        </h2>
        <p className="mt-2 max-w-[70ch] text-muted">
          Every upload field shows the recommended size, shape, formats, file
          size and how the photo is cropped on desktop and mobile. The full list
          of Art Gallery sizes is in the Media &amp; Image Guidelines.
        </p>
        <ButtonLink
          href={`${GUIDELINES_PATH}#group-art`}
          variant="secondary"
          className="mt-5"
        >
          Art Gallery image sizes
        </ButtonLink>
      </section>
    </div>
  );
}
