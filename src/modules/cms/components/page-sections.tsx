import { Fragment, type ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { collectImageIds, getImagesByIds, getSiteSettings } from "../queries";
import { BUILTIN_BLOCKS, type BuiltinBlock, type PageContent } from "../schema";
import {
  ArtistsSection,
  ContactSection,
  CtaSection,
  EditorialSection,
  EventsSection,
  FaqSection,
  GallerySection,
  HeroSection,
  PackagesSection,
  PortfolioSection,
  ProductsSection,
  ServicesSection,
  StatsSection,
  StepsSection,
  VideosSection,
} from "./sections";

/**
 * Renders a page's visible sections in order. Built-in blocks (directories,
 * forms) are supplied by the route, because they depend on the request.
 */
export async function PageSections({
  content,
  title,
  builtins = {},
  preview = false,
}: {
  content: PageContent;
  title: string;
  builtins?: Partial<Record<BuiltinBlock, ReactNode>>;
  preview?: boolean;
}) {
  const [images, settings] = await Promise.all([
    getImagesByIds(collectImageIds(content)),
    getSiteSettings(),
  ]);
  const visible = content.sections.filter((section) => section.visible);
  const startsWithHero = visible[0]?.type === "hero";

  return (
    <>
      {startsWithHero ? null : <h1 className="sr-only">{title}</h1>}
      {visible.map((section, index) => {
        const props = {
          images,
          showDemo: settings.showDemoLabels,
          preview,
          first: index === 0,
        };
        switch (section.type) {
          case "hero":
            return (
              <HeroSection key={section.id} section={section} {...props} />
            );
          case "artists":
            return (
              <ArtistsSection key={section.id} section={section} {...props} />
            );
          case "events":
            return (
              <EventsSection key={section.id} section={section} {...props} />
            );
          case "gallery":
            return (
              <GallerySection key={section.id} section={section} {...props} />
            );
          case "videos":
            return (
              <VideosSection key={section.id} section={section} {...props} />
            );
          case "products":
            return (
              <ProductsSection key={section.id} section={section} {...props} />
            );
          case "services":
            return (
              <ServicesSection key={section.id} section={section} {...props} />
            );
          case "editorial":
            return (
              <EditorialSection key={section.id} section={section} {...props} />
            );
          case "packages":
            return (
              <PackagesSection key={section.id} section={section} {...props} />
            );
          case "stats":
            return (
              <StatsSection key={section.id} section={section} {...props} />
            );
          case "steps":
            return (
              <StepsSection key={section.id} section={section} {...props} />
            );
          case "cta":
            return <CtaSection key={section.id} section={section} {...props} />;
          case "portfolio":
            return (
              <PortfolioSection key={section.id} section={section} {...props} />
            );
          case "faq":
            return <FaqSection key={section.id} section={section} {...props} />;
          case "contact":
            return (
              <ContactSection key={section.id} section={section} {...props} />
            );
          case "builtin": {
            const block = builtins[section.content.block];
            if (block) {
              return (
                <div key={section.id} id={section.id} className="scroll-mt-20">
                  {block}
                </div>
              );
            }
            return preview ? (
              <Container key={section.id} className="py-10">
                <p className="rounded-(--radius) border border-dashed border-line-strong p-6 text-sm text-muted">
                  {BUILTIN_BLOCKS[section.content.block]} appears here.
                </p>
              </Container>
            ) : (
              <Fragment key={section.id} />
            );
          }
        }
      })}
    </>
  );
}
