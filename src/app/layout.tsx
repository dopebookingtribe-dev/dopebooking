import type { Metadata, Viewport } from "next";
import { Onest, Tilt_Warp } from "next/font/google";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getImagesByIds, getSiteSettings } from "@/modules/cms/queries";
import "./globals.css";

// Tilt Warp: heavy, rounded letters whose XROT/YROT axes turn them in 3D,
// like signage seen through a lens. Onest keeps reading text calm.
const display = Tilt_Warp({
  variable: "--font-tilt-warp",
  subsets: ["latin"],
  axes: ["XROT", "YROT"],
});

const sans = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { brand, seo } = await getSiteSettings();
  const images = seo.image ? await getImagesByIds([seo.image]) : {};
  const share = images[seo.image];
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: { default: seo.title, template: `%s | ${brand.name}` },
    description: seo.description,
    ...(share
      ? {
          openGraph: {
            images: [
              { url: share.url, width: share.width, height: share.height },
            ],
          },
        }
      : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#06171a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
