import { z } from "zod";

/*
 * Content model for editable pages. Every page is a list of sections from a
 * fixed set of types; each type has a strict schema. Admins pick types and
 * fill fields; they never write HTML or code. Images are referenced by the
 * id of a media_assets row and resolved when the page renders.
 */

const text = (max: number) =>
  z.string().trim().max(max, `Use at most ${max} characters.`);
const requiredText = (label: string, max: number) =>
  text(max).min(1, `Enter the ${label}.`);

/** Internal path, https link, mailto: or tel:. Never javascript: and friends. */
export const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      /^#[\w-]+$/.test(value) ||
      /^\/(?!\/)[\w\-./?=&#%~+]*$/.test(value) ||
      /^https:\/\/[^\s"'<>]+$/.test(value) ||
      /^mailto:[^\s"'<>]+$/.test(value) ||
      /^tel:\+?[\d\s()-]+$/.test(value),
    "Use a site path like /artists, #section, a full https:// link, mailto: or tel:.",
  );

export const linkSchema = z.object({
  label: text(60),
  href: hrefSchema,
});
export type CmsLink = z.infer<typeof linkSchema>;

const mediaId = z
  .string()
  .trim()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Choose an image from the media library.",
  });

const limit = (max: number) => z.coerce.number().int().min(1).max(max);

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

export const BUILTIN_BLOCKS = {
  "artist-directory": "Artist directory with filters",
  "event-list": "Upcoming and past events",
  "gallery-index": "Photo galleries",
  "video-index": "Video library",
  "shop-catalog": "Shop catalogue with categories",
  "request-form": "Quote request form",
  "sell-application": "Seller application form",
} as const;
export type BuiltinBlock = keyof typeof BUILTIN_BLOCKS;

const sectionContent = {
  hero: z.object({
    layout: z.enum(["image", "string-art", "split", "compact"]),
    heading: requiredText("headline", 140),
    body: text(400),
    primary: linkSchema,
    secondary: linkSchema,
    image: mediaId,
    overlay: z.coerce.number().int().min(0).max(90),
  }),
  artists: z.object({
    heading: text(120),
    body: text(400),
    link: linkSchema,
    source: z.enum(["featured", "all", "pick"]),
    artistIds: z.array(z.uuid()).max(24),
    limit: limit(24),
    layout: z.enum(["editorial", "grid"]),
  }),
  events: z.object({
    heading: text(120),
    body: text(400),
    link: linkSchema,
    when: z.enum(["upcoming", "past"]),
    limit: limit(12),
    layout: z.enum(["showcase", "list"]),
  }),
  gallery: z.object({
    heading: text(120),
    body: text(400),
    link: linkSchema,
    images: z.array(mediaId).max(24),
    layout: z.enum(["mosaic", "filmstrip"]),
  }),
  videos: z.object({
    heading: text(120),
    body: text(400),
    link: linkSchema,
    limit: limit(6),
    layout: z.enum(["feature", "grid"]),
  }),
  products: z.object({
    heading: text(120),
    body: text(400),
    link: linkSchema,
    source: z.enum(["featured", "latest", "category"]),
    categorySlug: text(80),
    limit: limit(12),
  }),
  services: z.object({
    heading: text(120),
    body: text(400),
    layout: z.enum(["rows", "tiles"]),
    items: z
      .array(
        z.object({
          title: requiredText("service name", 80),
          body: text(400),
          href: hrefSchema,
          image: mediaId,
        }),
      )
      .max(12),
  }),
  editorial: z.object({
    heading: requiredText("heading", 140),
    body: text(3000),
    image: mediaId,
    imageSide: z.enum(["left", "right"]),
    link: linkSchema,
  }),
  packages: z.object({
    heading: text(120),
    body: text(400),
    items: z
      .array(
        z.object({
          name: requiredText("package name", 60),
          price: text(40),
          summary: text(300),
          features: z.array(text(120)).max(12),
          cta: linkSchema,
          highlighted: z.boolean(),
        }),
      )
      .max(6),
  }),
  stats: z.object({
    heading: text(120),
    body: text(400),
    items: z
      .array(z.object({ value: requiredText("value", 24), label: text(80) }))
      .max(6),
  }),
  steps: z.object({
    heading: text(120),
    items: z
      .array(
        z.object({ title: requiredText("step title", 80), body: text(300) }),
      )
      .max(6),
  }),
  cta: z.object({
    layout: z.enum(["image", "string-art"]),
    heading: requiredText("heading", 140),
    body: text(400),
    primary: linkSchema,
    secondary: linkSchema,
    image: mediaId,
  }),
  portfolio: z.object({
    heading: text(120),
    body: text(400),
    items: z
      .array(
        z.object({
          name: requiredText("name", 80),
          role: text(80),
          body: text(400),
          image: mediaId,
          href: hrefSchema,
        }),
      )
      .max(12),
  }),
  faq: z.object({
    heading: text(120),
    items: z
      .array(
        z.object({
          question: requiredText("question", 200),
          answer: requiredText("answer", 1500),
        }),
      )
      .max(20),
  }),
  contact: z.object({
    heading: requiredText("heading", 120),
    body: text(600),
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
    phone: text(40),
    primary: linkSchema,
  }),
  builtin: z.object({
    block: z.enum(Object.keys(BUILTIN_BLOCKS) as [BuiltinBlock]),
  }),
} as const;

export type SectionType = keyof typeof sectionContent;
export type SectionContent<T extends SectionType> = z.infer<
  (typeof sectionContent)[T]
>;

export const SECTION_TYPES = Object.keys(sectionContent) as SectionType[];

const sectionBase = {
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  visible: z.boolean(),
};

export const sectionSchema = z.discriminatedUnion(
  "type",
  SECTION_TYPES.map((type) =>
    z.object({
      ...sectionBase,
      type: z.literal(type),
      content: sectionContent[type],
    }),
  ) as unknown as [
    z.ZodObject<{
      id: z.ZodString;
      visible: z.ZodBoolean;
      type: z.ZodLiteral<SectionType>;
      content: z.ZodType;
    }>,
  ],
);

export type Section = {
  [T in SectionType]: {
    id: string;
    visible: boolean;
    type: T;
    content: SectionContent<T>;
  };
}[SectionType];

export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

export const seoSchema = z.object({
  title: text(70),
  description: text(200),
  image: mediaId,
});
export type Seo = z.infer<typeof seoSchema>;

export const pageContentSchema = z.object({
  seo: seoSchema,
  sections: z
    .array(sectionSchema)
    .max(40, "A page can have up to 40 sections."),
});
export type PageContent = { seo: Seo; sections: Section[] };

/** Validates and narrows unknown JSON from the database or the editor. */
export function parsePageContent(value: unknown) {
  return pageContentSchema.safeParse(value) as
    | { success: true; data: PageContent }
    | { success: false; error: z.ZodError };
}

// ---------------------------------------------------------------------------
// Site settings: navigation, footer, contact, socials, SEO defaults
// ---------------------------------------------------------------------------

export const SOCIAL_PLATFORMS = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  tiktok: "TikTok",
  resident_advisor: "Resident Advisor",
  website: "Website",
} as const;

const navLink = z.object({
  label: requiredText("menu label", 40),
  href: hrefSchema.refine((v) => v !== "", "Enter where the link goes."),
});

export const settingsSchema = z.object({
  brand: z.object({
    name: requiredText("brand name", 60),
    tagline: text(160),
  }),
  nav: z
    .array(
      navLink.extend({
        children: z.array(navLink.extend({ description: text(120) })).max(8),
      }),
    )
    .min(1, "Keep at least one menu item.")
    .max(8),
  cta: linkSchema,
  footer: z.object({
    blurb: text(400),
    columns: z
      .array(
        z.object({
          heading: requiredText("column heading", 40),
          links: z.array(navLink).max(10),
        }),
      )
      .max(5),
    note: text(300),
  }),
  socials: z
    .array(
      z.object({
        platform: z.enum(
          Object.keys(SOCIAL_PLATFORMS) as [keyof typeof SOCIAL_PLATFORMS],
        ),
        url: z
          .string()
          .trim()
          .regex(/^https:\/\/[^\s"'<>]+$/, "Use a full https:// link.")
          .max(300),
      }),
    )
    .max(10),
  contact: z.object({
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
    phone: text(40),
    address: text(300),
  }),
  seo: z.object({
    title: requiredText("site title", 70),
    description: text(200),
    image: mediaId,
  }),
  showDemoLabels: z.boolean(),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

export function parseSettings(value: unknown) {
  return settingsSchema.safeParse(value);
}

/** Short random id for new sections, stable across saves. */
export function newSectionId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}
