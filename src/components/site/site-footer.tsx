import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/modules/cms/queries";
import { SOCIAL_PLATFORMS } from "@/modules/cms/schema";

export async function SiteFooter() {
  const { brand, footer, socials, contact } = await getSiteSettings();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-surface-1">
      <Container className="pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-display text-3xl">{brand.name}</p>
            {brand.tagline ? (
              <p className="mt-3 font-label text-muted">{brand.tagline}</p>
            ) : null}
            {footer.blurb ? (
              <p className="mt-6 max-w-sm text-muted">{footer.blurb}</p>
            ) : null}
            {contact.email || contact.phone ? (
              <ul className="mt-6 flex flex-col gap-1">
                {contact.email ? (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex min-h-11 items-center underline decoration-accent underline-offset-4 hover:text-accent"
                    >
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact.phone ? (
                  <li>
                    <a
                      href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex min-h-11 items-center hover:text-accent"
                    >
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            {contact.address ? (
              <p className="mt-2 text-sm whitespace-pre-line text-muted">
                {contact.address}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footer.columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h2 className="font-label text-sm text-accent">
                  {column.heading}
                </h2>
                <ul className="mt-3 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-text"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {socials.length ? (
          <ul className="mt-12 flex flex-wrap gap-2">
            {socials.map((social) => (
              <li key={social.url}>
                <a
                  href={social.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:border-accent hover:text-accent"
                >
                  {SOCIAL_PLATFORMS[social.platform]}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Decorative wordmark: drawn from an attribute, not page text. */}
        <div
          aria-hidden
          data-wordmark={brand.name}
          className="mt-16 -mb-[0.22em] font-display text-[clamp(3rem,1rem+13vw,13rem)] leading-none text-line select-none before:content-[attr(data-wordmark)]"
        />
        {footer.note ? (
          <p className="relative mt-6 text-sm text-muted">{footer.note}</p>
        ) : null}
      </Container>
    </footer>
  );
}
