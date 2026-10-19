import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";

const PILLARS = [
  {
    href: "/artists",
    index: "01",
    title: "Artists",
    body: "A curated roster of international psytrance acts, from progressive sunrise sets to full-on night journeys.",
  },
  {
    href: "/gallery",
    index: "02",
    title: "Events & media",
    body: "Festival photography, aftermovies and the stories behind the stages we help build.",
  },
  {
    href: "/services",
    index: "03",
    title: "Festival services",
    body: "Promotion campaigns, festival catering, and photo, video and aftermovie production.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        {/* Placeholder for cinematic festival photography (Phase 03). */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_10%,#1f2a0b_0%,transparent_55%),radial-gradient(90%_70%_at_10%_90%,#1a1430_0%,transparent_60%)]"
        />
        <Container className="flex min-h-[78svh] flex-col justify-end pt-24 pb-16 sm:pb-24">
          <Meta>International psytrance agency · Est. Germany</Meta>
          <h1 className="mt-6 max-w-5xl font-display text-display">
            Artists for the <em className="text-accent">dancefloor</em> at the
            edge of the night.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted">
            DopeBooking connects festivals and promoters with international
            psytrance artists, and the people who make the weekend happen.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/artists">Book an artist</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              Festival services
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section aria-labelledby="pillars-heading" className="py-20 sm:py-28">
        <Container>
          <h2 id="pillars-heading" className="sr-only">
            What we do
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <li key={pillar.href} className="bg-bg">
                <Link
                  href={pillar.href}
                  className="group flex h-full flex-col p-8 transition-colors duration-300 hover:bg-surface-1"
                >
                  <Meta>{pillar.index}</Meta>
                  <h3 className="mt-10 font-display text-4xl transition-colors group-hover:text-accent">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-muted">{pillar.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
