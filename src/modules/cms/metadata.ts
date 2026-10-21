import "server-only";
import type { Metadata } from "next";
import { PAGES, type PageKey } from "./pages";
import { getImagesByIds, getPublishedPage, getSiteSettings } from "./queries";

/** Title, description and share image for an editable page. */
export async function pageMetadata(key: PageKey): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPublishedPage(key),
    getSiteSettings(),
  ]);
  const imageId = page.seo.image || settings.seo.image;
  const images = imageId ? await getImagesByIds([imageId]) : {};
  const image = images[imageId];
  const title = page.seo.title || (key === "home" ? "" : PAGES[key].title);
  const description = page.seo.description || settings.seo.description;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: PAGES[key].path },
    ...(image
      ? {
          openGraph: {
            images: [
              { url: image.url, width: image.width, height: image.height },
            ],
          },
        }
      : {}),
  };
}
