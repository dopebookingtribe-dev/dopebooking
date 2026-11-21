import Link from "next/link";
import { Suspense } from "react";
import { StringArt } from "@/components/site/string-art";
import { TiltHeading } from "@/components/site/tilt-heading";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES, countryName } from "@/lib/countries";
import { getSiteSettings } from "@/modules/cms/queries";
import type { SectionOf } from "@/modules/cms/schema";
import { ServiceRequestForm } from "@/modules/services/components/service-request-form";
import { createArtInquiry } from "../inquiry-actions";
import {
  collaborationWeight,
  collaborations,
  getArtCatalog,
  getArtHighlights,
  type ArtCatalog,
} from "../queries";
import { disciplineLabels, TIMING_LABELS, type Timing } from "../schemas";
import { ArtHeader, ArtShell, EmptyArt, TimingBadge } from "./art-ui";
import { ArtArtistCardView } from "./artist-arch";
import { ArtistFilter } from "./artist-filter";
import { ArtworkGrid } from "./artwork-grid";
import { Constellation } from "./constellation";
import { ExhibitionCardView } from "./exhibition-card";
import { HeroWall } from "./hero-wall";
import { PhotoCollections } from "./photo-collections";

type Props = {
  section: SectionOf<"art">;
  showDemo: boolean;
  preview: boolean;
  first: boolean;
};

function PreviewNote({ preview, text }: { preview: boolean; text: string }) {
  if (!preview) return null;
  return (
    <Container className="py-10">
      <p className="rounded-(--radius) border border-dashed border-uv/60 p-6 text-sm text-uv">
        {text}
      </p>
    </Container>
  );
}

const artistMap = (catalog: ArtCatalog) =>
  new Map(catalog.artists.map((a) => [a.id, a]));
const memberCounts = (catalog: ArtCatalog) =>
  Object.fromEntries(
    Object.entries(catalog.members).map(([id, list]) => [id, list.length]),
  );

/** A CMS section showing live Art Gallery content. */
export async function ArtSection({ section, showDemo, preview, first }: Props) {
  const c = section.content;
  const catalog = await getArtCatalog();
  const notReady =
    "The Art Gallery tables are not in the database yet. Apply migration 20261121000100_art_gallery.sql.";

  switch (c.show) {
    case "wall": {
      const works = catalog.works
        .filter((work) => work.image)
        .slice(0, c.limit);
      const Tag = first ? "h1" : "h2";
      const text = (
        <div className="relative z-10">
          <p className="font-label text-sm text-accent">
            DopeBooking Art Gallery
          </p>
          <TiltHeading
            as={Tag}
            strength={22}
            className="mt-5 text-[clamp(2.75rem,1rem+4.4vw,5.75rem)] leading-[0.95] text-balance"
          >
            {c.heading || "Art Gallery"}
          </TiltHeading>
          {c.body ? (
            <p className="mt-7 max-w-[54ch] text-lg text-text/85 sm:text-xl">
              {c.body}
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            {c.link.label && c.link.href ? (
              <ButtonLink href={c.link.href} size="lg">
                {c.link.label}
              </ButtonLink>
            ) : null}
            {c.secondary.label && c.secondary.href ? (
              <ButtonLink href={c.secondary.href} variant="secondary" size="lg">
                {c.secondary.label}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      );
      return (
        <section
          id={section.id}
          className="relative isolate overflow-hidden border-b border-line"
        >
          {works.length >= 3 ? (
            <Container className="grid min-h-[86svh] grid-cols-[minmax(0,1fr)] items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              {text}
              <HeroWall works={works} />
            </Container>
          ) : (
            <>
              <StringArt className="pointer-events-none absolute top-1/2 -right-48 -z-10 w-[52rem] max-w-none -translate-y-1/2 opacity-50" />
              <Container className="flex min-h-[70svh] items-center py-20">
                <div className="max-w-3xl">{text}</div>
              </Container>
              <PreviewNote
                preview={preview}
                text={
                  catalog.ready
                    ? "The salon wall appears once at least three published artworks have images."
                    : notReady
                }
              />
            </>
          )}
        </section>
      );
    }

    case "exhibitions": {
      const list = catalog.exhibitions.slice(0, c.limit);
      if (!list.length) {
        return (
          <PreviewNote
            preview={preview}
            text={catalog.ready ? "No published exhibitions yet." : notReady}
          />
        );
      }
      const [lead, ...rest] = list;
      const artists = artistMap(catalog);
      return (
        <ArtShell id={section.id} label={c.heading || "Exhibitions"}>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <ExhibitionCardView
            exhibition={lead}
            artists={artists}
            variant="feature"
            showDemo={showDemo}
          />
          {rest.length ? (
            <ul className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((exhibition) => (
                <li key={exhibition.id} className="art-reveal">
                  <ExhibitionCardView
                    exhibition={exhibition}
                    artists={artists}
                    showDemo={showDemo}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </ArtShell>
      );
    }

    case "artists": {
      const list = catalog.artists.slice(0, c.limit);
      if (!list.length) {
        return (
          <PreviewNote
            preview={preview}
            text={catalog.ready ? "No published artists yet." : notReady}
          />
        );
      }
      const counts = memberCounts(catalog);
      return (
        <ArtShell id={section.id} label={c.heading || "Artists"} band>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {list.map((artist) => (
              <li key={artist.id} className="art-reveal">
                <ArtArtistCardView
                  artist={artist}
                  memberCount={counts[artist.id]}
                  showDemo={showDemo}
                />
              </li>
            ))}
          </ul>
        </ArtShell>
      );
    }

    case "works": {
      const list = catalog.works.slice(0, c.limit);
      if (!list.length) {
        return (
          <PreviewNote
            preview={preview}
            text={catalog.ready ? "No published artworks yet." : notReady}
          />
        );
      }
      return (
        <ArtShell id={section.id} label={c.heading || "Artworks"}>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <ArtworkGrid works={list} showDemo={showDemo} />
        </ArtShell>
      );
    }

    case "highlights": {
      const photos = await getArtHighlights(c.limit);
      if (!photos.length) {
        return (
          <PreviewNote
            preview={preview}
            text={
              catalog.ready
                ? "Highlights appear once exhibition photos are sorted into sets (installations, close-ups, atmosphere, behind the scenes)."
                : notReady
            }
          />
        );
      }
      return (
        <ArtShell id={section.id} label={c.heading || "Gallery highlights"}>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <PhotoCollections photos={photos} showSource />
        </ArtShell>
      );
    }

    case "collaborations": {
      const all = collaborations(catalog);
      const degree = new Map<string, number>();
      for (const link of all) {
        const w = collaborationWeight(link);
        degree.set(link.a, (degree.get(link.a) ?? 0) + w);
        degree.set(link.b, (degree.get(link.b) ?? 0) + w);
      }
      const picked = catalog.artists
        .filter((artist) => degree.has(artist.id))
        .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
        .slice(0, c.limit);
      const ids = new Set(picked.map((artist) => artist.id));
      const links = all.filter((link) => ids.has(link.a) && ids.has(link.b));
      if (picked.length < 3 || !links.length) {
        return (
          <PreviewNote
            preview={preview}
            text={
              catalog.ready
                ? "The collaboration map appears once at least three artists share exhibitions or works."
                : notReady
            }
          />
        );
      }
      // Keep ring order stable and readable: alphabetical.
      picked.sort((a, b) => a.name.localeCompare(b.name));
      return (
        <ArtShell id={section.id} label={c.heading || "Made together"} band>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <Constellation
            nodes={picked.map((artist) => ({
              id: artist.id,
              slug: artist.slug,
              name: artist.name,
              portrait: artist.portrait?.url ?? null,
              meta:
                disciplineLabels(artist.disciplines).slice(0, 2).join(", ") ||
                "Artist",
            }))}
            links={links.map((link) => ({
              a: link.a,
              b: link.b,
              exhibitions: link.exhibitions,
              works: link.works,
            }))}
          />
        </ArtShell>
      );
    }

    case "festivals": {
      const shows = catalog.festivals
        .map((festival) => ({
          festival,
          exhibitions: catalog.exhibitions
            .filter((e) => e.festival?.id === festival.id)
            .sort((a, b) =>
              (b.startsOn ?? "9999").localeCompare(a.startsOn ?? "9999"),
            ),
        }))
        .filter((row) => row.exhibitions.length);
      if (!shows.length) {
        return (
          <PreviewNote
            preview={preview}
            text={
              catalog.ready
                ? "Festivals appear here once a published exhibition names one."
                : notReady
            }
          />
        );
      }
      return (
        <ArtShell id={section.id} label={c.heading || "Festivals"}>
          <ArtHeader heading={c.heading} body={c.body} link={c.link} />
          <ul className="divide-y divide-line border-y border-line">
            {shows.map(({ festival, exhibitions }) => (
              <li
                key={festival.id}
                className="grid gap-4 py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-baseline"
              >
                <div>
                  <h3 className="font-display text-3xl">{festival.name}</h3>
                  <p className="mt-1 font-label text-sm text-muted">
                    {[festival.city, countryName(festival.country)]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {exhibitions.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/art-gallery/exhibitions/${e.slug}`}
                        className="inline-flex min-h-11 items-center gap-3 rounded-full border border-line-strong px-4 text-sm transition-colors hover:border-accent hover:text-accent"
                      >
                        <span className="font-label text-accent">
                          {e.startsOn?.slice(0, 4) ?? "TBA"}
                        </span>
                        {e.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </ArtShell>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Built-in blocks
// ---------------------------------------------------------------------------

const VIEWS: ("all" | Timing)[] = ["all", "current", "upcoming", "past"];

export async function ArtExhibitionIndex({ view }: { view?: string }) {
  const [catalog, settings] = await Promise.all([
    getArtCatalog(),
    getSiteSettings(),
  ]);
  const artists = artistMap(catalog);
  const active = (VIEWS as string[]).includes(view ?? "")
    ? (view as "all" | Timing)
    : "all";
  const groups = {
    current: catalog.exhibitions.filter((e) => e.timing === "current"),
    upcoming: catalog.exhibitions.filter((e) => e.timing === "upcoming"),
    past: catalog.exhibitions.filter((e) => e.timing === "past"),
  };
  const years = [
    ...new Set(groups.past.map((e) => e.startsOn?.slice(0, 4) ?? "Undated")),
  ];
  const label = (key: "all" | Timing) =>
    key === "all" ? "All" : key === "past" ? "Archive" : TIMING_LABELS[key];
  const count = (key: "all" | Timing) =>
    key === "all" ? catalog.exhibitions.length : groups[key].length;

  return (
    <Container className="py-14 sm:py-20">
      <nav
        aria-label="Exhibitions by time"
        className="-mx-(--gutter) mb-14 [scrollbar-width:none] overflow-x-auto px-(--gutter)"
      >
        <ul className="flex gap-2">
          {VIEWS.map((key) => (
            <li key={key} className="shrink-0">
              <Link
                href={
                  key === "all"
                    ? "/art-gallery/exhibitions"
                    : `/art-gallery/exhibitions?view=${key}`
                }
                aria-current={active === key ? "page" : undefined}
                scroll={false}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors ${
                  active === key
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line-strong hover:border-uv hover:text-uv"
                }`}
              >
                {label(key)}
                <span
                  className={`font-label text-xs ${active === key ? "text-accent-ink/70" : "text-muted"}`}
                >
                  {count(key)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!catalog.exhibitions.length ? (
        <EmptyArt
          title="Exhibitions are on their way"
          body="The first exhibitions will appear here once they are published. Planning a festival? Tell us about it."
        />
      ) : null}

      {(active === "all" || active === "current") && groups.current.length ? (
        <section aria-labelledby="now-heading" className="mb-20">
          <h2
            id="now-heading"
            className="mb-8 flex items-center gap-3 font-display text-3xl"
          >
            <TimingBadge timing="current" />{" "}
            <span className="sr-only">Now on view</span>
          </h2>
          <div className="flex flex-col gap-10">
            {groups.current.map((e, i) => (
              <ExhibitionCardView
                key={e.id}
                exhibition={e}
                artists={artists}
                variant="feature"
                priority={i === 0}
                showDemo={settings.showDemoLabels}
              />
            ))}
          </div>
        </section>
      ) : null}

      {(active === "all" || active === "upcoming") && groups.upcoming.length ? (
        <section aria-labelledby="upcoming-heading" className="mb-20">
          <ArtHeader heading="Upcoming" id="upcoming-heading" />
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {groups.upcoming.map((e) => (
              <li key={e.id} className="art-reveal">
                <ExhibitionCardView
                  exhibition={e}
                  artists={artists}
                  showDemo={settings.showDemoLabels}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(active === "all" || active === "past") && groups.past.length ? (
        <section aria-labelledby="archive-heading">
          <ArtHeader
            heading="Archive"
            id="archive-heading"
            body="Every exhibition we have curated, with its artists, works and photography."
          />
          {years.map((year) => (
            <div
              key={year}
              className="grid gap-6 border-t border-line py-10 lg:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <h3 className="font-display text-5xl text-accent lg:sticky lg:top-24 lg:self-start">
                {year}
              </h3>
              <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
                {groups.past
                  .filter(
                    (e) => (e.startsOn?.slice(0, 4) ?? "Undated") === year,
                  )
                  .map((e) => (
                    <li key={e.id} className="art-reveal">
                      <ExhibitionCardView
                        exhibition={e}
                        artists={artists}
                        showDemo={settings.showDemoLabels}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {catalog.exhibitions.length && active !== "all" && !count(active) ? (
        <EmptyArt
          title={`Nothing ${active === "past" ? "in the archive" : label(active).toLowerCase()} right now`}
          body="See all exhibitions for the full list."
        />
      ) : null}
    </Container>
  );
}

export async function ArtArtistIndex({ discipline }: { discipline?: string }) {
  const [catalog, settings] = await Promise.all([
    getArtCatalog(),
    getSiteSettings(),
  ]);
  return (
    <Container className="py-14 sm:py-20">
      {catalog.artists.length ? (
        <ArtistFilter
          artists={catalog.artists}
          memberCounts={memberCounts(catalog)}
          initial={discipline ?? null}
          showDemo={settings.showDemoLabels}
        />
      ) : (
        <EmptyArt
          title="Artist profiles are on their way"
          body="Profiles appear here as soon as they are published."
        />
      )}
    </Container>
  );
}

async function InquiryForm({ artist }: { artist?: string }) {
  const user = await getCurrentUser();
  const catalog = await getArtCatalog();
  const invited = artist
    ? catalog.artists.find((a) => a.slug === artist)
    : undefined;
  if (!user) {
    const next = encodeURIComponent(
      `/art-gallery/collaborate${invited ? `?artist=${invited.slug}` : ""}#inquiry`,
    );
    return (
      <div className="mt-8">
        {invited ? (
          <p className="mb-4 max-w-lg text-lg">
            You&apos;re inviting{" "}
            <span className="text-accent">{invited.name}</span>. We&apos;ll add
            them to your inquiry.
          </p>
        ) : null}
        <p className="max-w-lg text-lg text-muted">
          Create a free account or sign in to send your inquiry. You&apos;ll
          follow its status and talk to our team in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/signup?next=${next}`}>Create account</ButtonLink>
          <ButtonLink href={`/login?next=${next}`} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-10">
      <ServiceRequestForm
        types={["art_gallery"]}
        countries={COUNTRIES}
        action={createArtInquiry}
        initial={invited ? { "d.preferred_artists": invited.name } : {}}
        eventLegend="Your festival or project"
        submitLabel="Send inquiry"
      />
    </div>
  );
}

export function ArtInquiryArea({ artist }: { artist?: string }) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-3xl rounded-(--radius) border border-line bg-surface-1 p-6 sm:p-10">
        <p className="font-label text-sm text-accent">Collaboration inquiry</p>
        <h2 className="mt-3 font-display text-headline">
          Tell us about your event
        </h2>
        <p className="mt-4 max-w-[56ch] text-muted">
          The date, the place and what you imagine. Approximate answers are
          fine; we reply with a concept, artists and a quote.
        </p>
        <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
          <InquiryForm artist={artist} />
        </Suspense>
      </div>
    </Container>
  );
}
