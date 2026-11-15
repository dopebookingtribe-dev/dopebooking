import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";

/*
 * Every place on the site that shows an uploaded image, with the size to
 * design it at. The admin upload guides, the upload checks and the
 * Media & Image Guidelines page all read this file, and the front end takes
 * its fixed image frames from CONTAINERS below, so the advice and the real
 * layout can't drift apart. When a layout changes, change it here.
 *
 * Sizes on screen are CSS pixels at the reference widths below, measured in
 * the browser. Recommended sizes are about twice the largest size on screen,
 * so photos stay sharp on high-density (retina) displays.
 */

/** The Media & Image Guidelines page in the admin. */
export const GUIDELINES_PATH = "/admin/media/guidelines";

// ---------------------------------------------------------------------------
// Devices and breakpoints
// ---------------------------------------------------------------------------

export type Device = "desktop" | "tablet" | "mobile";

export const DEVICES: Record<Device, { label: string; width: number }> = {
  desktop: { label: "Desktop", width: 1440 },
  tablet: { label: "Tablet", width: 768 },
  mobile: { label: "Mobile", width: 390 },
};

/** Tailwind's default breakpoints, used by the CONTAINERS classes. */
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

// ---------------------------------------------------------------------------
// Fixed image frames used by the front end
// ---------------------------------------------------------------------------

/**
 * Aspect-ratio classes of every fixed-shape image frame on the site.
 * Components use these strings directly; the guides read the same strings.
 */
export const CONTAINERS = {
  artistLens: "aspect-square",
  lineupTile: "aspect-[4/5]",
  eventShowcase: "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]",
  eventCompact: "aspect-[4/3]",
  eventRow: "aspect-[3/2]",
  galleryCard: "aspect-[3/2]",
  video: "aspect-video",
  productCard: "aspect-[4/5]",
  productLead: "aspect-[4/5]",
  productThumb: "aspect-square",
  releaseCover: "aspect-square",
  serviceTile: "aspect-[4/3]",
  serviceRow: "aspect-[3/2]",
  portfolio: "aspect-[4/5]",
  lens: "aspect-square",
} as const;

export type ContainerKey = keyof typeof CONTAINERS;

function parseAspect(token: string): number | null {
  if (token === "aspect-square") return 1;
  if (token === "aspect-video") return 16 / 9;
  const match = /^aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]$/.exec(token);
  return match ? Number(match[1]) / Number(match[2]) : null;
}

/** The aspect ratio a CONTAINERS class string gives at a screen width. */
export function containerRatio(classes: string, width: number): number {
  let ratio: number | null = null;
  let applied = -1;
  for (const token of classes.split(/\s+/)) {
    const [prefix, rest] = token.includes(":")
      ? (token.split(":") as [keyof typeof BREAKPOINTS, string])
      : [null, token];
    const min = prefix ? BREAKPOINTS[prefix] : 0;
    const value = parseAspect(rest);
    if (value !== null && width >= min && min >= applied) {
      ratio = value;
      applied = min;
    }
  }
  if (ratio === null) throw new Error(`No aspect ratio in "${classes}"`);
  return ratio;
}

// ---------------------------------------------------------------------------
// Separate mobile images (art direction)
// ---------------------------------------------------------------------------

/**
 * When a placement has its own mobile image, this decides which screens get
 * it. `media` feeds <source media>, `focus` swaps the focus point to match.
 */
export const ART_DIRECTION = {
  portrait: {
    media: "(orientation: portrait)",
    focus: "portrait:[object-position:var(--focus-mobile)]",
    label: "phones and tablets held upright",
  },
  belowMd: {
    media: "(max-width: 767.98px)",
    focus: "max-md:[object-position:var(--focus-mobile)]",
    label: "screens narrower than 768 px (phones)",
  },
  belowSm: {
    media: "(max-width: 639.98px)",
    focus: "max-sm:[object-position:var(--focus-mobile)]",
    label: "screens narrower than 640 px (phones)",
  },
} as const;

export type ArtDirection = keyof typeof ART_DIRECTION;

/** Props for <Picture mobile>: the phone photo and where it applies. */
export function mobileSource<T extends { url: string; alt: string }>(
  image: T | null | undefined,
  when: ArtDirection,
) {
  return image
    ? {
        image,
        media: ART_DIRECTION[when].media,
        focusClass: ART_DIRECTION[when].focus,
      }
    : null;
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

export type Size = readonly [width: number, height: number];

export type Frame = {
  /** Where the frame appears, e.g. "Artist card". */
  label: string;
  device: Device;
  /**
   * Frame shape: a CONTAINERS key, a width ÷ height ratio, a [min, max]
   * range for frames that follow the screen height, or "natural" when the
   * photo keeps its own shape.
   */
  ratio: ContainerKey | number | readonly [number, number] | "natural";
  /** Size on screen in CSS pixels at the device's reference width. */
  shown?: Size | number;
  shape?: "circle";
  /** Hover zoom; whatever it pushes out of view counts as cropped. */
  zoom?: number;
  /** Not shown on this device. */
  hidden?: boolean;
  /** Only when the separate mobile image is missing. */
  fallback?: boolean;
  /** Which screens get the mobile image here (mobile specs only). */
  when?: ArtDirection;
};

export type Box = { x: number; y: number; w: number; h: number };

export type ImageSpec = {
  id: ImageSpecId;
  group: GroupKey;
  title: string;
  /** Where visitors see it. */
  where: string;
  /** Where staff upload or choose it. */
  upload: { label: string; href?: string };
  /** Size to design at. */
  size: Size;
  /** Below this the photo looks soft on large screens. */
  min: Size;
  /**
   * crop: fills a fixed frame, edges cut off.
   * full: shown whole at its own shape.
   * texture: drawn into the kaleidoscope; the shape doesn't matter.
   */
  fit: "crop" | "full" | "texture";
  /** Any shape is fine (only the size is checked). */
  anyRatio?: boolean;
  frames: Frame[];
  /** How it is cropped or resized, in plain words. */
  crop: string;
  /** Where text sits on top of the photo, in % of the design canvas. */
  text?: Box & { label: string };
  /** A separate upload for phones. */
  mobile?: ImageSpecId;
  /** This is the phone version of another spec, used instead of it. */
  fallbackFor?: ImageSpecId;
  /** Soft file-size limit: the original file is loaded as is. */
  heavy?: number;
  tips?: string[];
  /** Front-end files that draw it. */
  code: string[];
};

export const GROUPS = {
  headers: {
    title: "Page headers and banners",
    body: "Hero banners and call-to-action banners on every editable page (Home, About, Services, Shop, Music…). Chosen from the media library in Admin, Pages.",
  },
  sections: {
    title: "Page content sections",
    body: "Services, text-and-image, portfolio and photo gallery sections in the page builder.",
  },
  artists: {
    title: "Artists",
    body: "Artist directory, profile pages, featured artists and event lineups.",
  },
  events: {
    title: "Events",
    body: "Event showcase cards, event lists and the event page header.",
  },
  galleries: {
    title: "Photo galleries",
    body: "Festival photo sets on /gallery.",
  },
  videos: { title: "Videos", body: "Aftermovies and sets on /videos." },
  shop: {
    title: "Shop",
    body: "Products and seller storefronts. Uploaded by sellers in their dashboard.",
  },
  music: {
    title: "Music",
    body: "Release artwork in the music store. Uploaded by artists in their dashboard.",
  },
  sharing: {
    title: "Search and social sharing",
    body: "The preview image when a page is shared in chats and social apps.",
  },
} as const;

export type GroupKey = keyof typeof GROUPS;

const ids = [
  "hero-photo",
  "hero-photo-mobile",
  "hero-kaleidoscope",
  "hero-split",
  "hero-compact",
  "cta-photo",
  "cta-photo-mobile",
  "services-tile",
  "services-row",
  "editorial-photo",
  "portfolio-photo",
  "gallery-section",
  "artist-portrait",
  "artist-cover",
  "artist-photo",
  "event-cover",
  "event-cover-mobile",
  "gallery-photo",
  "video-poster",
  "product-photo",
  "seller-logo",
  "music-cover",
  "share-image",
] as const;

export type ImageSpecId = (typeof ids)[number];

const TEXTURE_LIMIT = 2 * 1024 * 1024;

const PAGES_UPLOAD = { label: "Admin → Pages → section", href: "/admin/pages" };

const specs: Omit<ImageSpec, "id">[] = [
  // ----- Page headers -----------------------------------------------------
  {
    group: "headers",
    title: "Hero banner: full-screen photo",
    where:
      "Top of a page when its Hero banner layout is “Full-screen photo”. Desktops, laptops and tablets held sideways.",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Hero banner → Photo" },
    size: [2560, 1280],
    min: [1920, 960],
    fit: "crop",
    frames: [
      {
        label: "Full screen",
        device: "desktop",
        ratio: [1.6, 2.4],
        shown: [1440, 843],
      },
      {
        label: "Full screen, held sideways",
        device: "tablet",
        ratio: [1.35, 1.6],
        shown: [1024, 720],
      },
      {
        label: "Full screen, if no phone photo",
        device: "mobile",
        ratio: [0.5, 0.7],
        shown: [390, 743],
        fallback: true,
      },
    ],
    crop: "Fills the whole screen and is cropped to fit, so the edges can be cut off. The focus point you set in the media library decides what stays in view. The lower left is darkened for the headline.",
    text: { x: 0, y: 48, w: 58, h: 52, label: "Headline and buttons" },
    mobile: "hero-photo-mobile",
    code: ["src/modules/cms/components/sections.tsx (HeroSection)"],
  },
  {
    group: "headers",
    title: "Hero banner: full-screen photo for phones",
    where:
      "Replaces the full-screen hero photo on phones and on tablets held upright. Optional: without it they show the desktop photo, cropped to the centre.",
    upload: {
      ...PAGES_UPLOAD,
      label: "Admin → Pages → Hero banner → Photo for phones",
    },
    size: [1440, 2160],
    min: [1080, 1620],
    fit: "crop",
    frames: [
      {
        label: "Full screen, upright",
        device: "tablet",
        ratio: [0.75, 0.9],
        shown: [768, 901],
        when: "portrait",
      },
      {
        label: "Full screen",
        device: "mobile",
        ratio: [0.5, 0.68],
        shown: [390, 743],
        when: "portrait",
      },
    ],
    crop: "Fills the screen and is cropped to fit; tall phones trim the sides, upright tablets trim the top and bottom. The bottom half is darkened for the headline, so keep the subject in the upper half.",
    text: { x: 0, y: 52, w: 100, h: 48, label: "Headline and buttons" },
    fallbackFor: "hero-photo",
    code: ["src/modules/cms/components/sections.tsx (HeroSection)"],
  },
  {
    group: "headers",
    title: "Hero banner: kaleidoscope",
    where:
      "Hero banner layout “Kaleidoscope made from a photo”: the photo becomes a moving kaleidoscope behind the headline (Home page by default).",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Hero banner → Photo" },
    size: [2000, 2000],
    min: [1200, 1200],
    fit: "texture",
    anyRatio: true,
    frames: [
      {
        label: "Full screen",
        device: "desktop",
        ratio: [1.6, 2.4],
        shown: [1440, 810],
      },
      {
        label: "Full screen",
        device: "tablet",
        ratio: 0.83,
        shown: [768, 922],
      },
      {
        label: "Full screen",
        device: "mobile",
        ratio: 0.51,
        shown: [390, 760],
      },
    ],
    crop: "Never shown as a normal photo. The middle of the photo is mirrored into turning wedges, so any shape works and faces won't be recognisable. The original file is loaded as is, so keep it under 2 MB.",
    heavy: TEXTURE_LIMIT,
    tips: [
      "Bold colours, bright light and fine detail make the best patterns.",
      "Avoid text and logos: they turn into noise.",
    ],
    code: [
      "src/modules/cms/components/sections.tsx (HeroSection)",
      "src/components/site/kaleidoscope.tsx",
    ],
  },
  {
    group: "headers",
    title: "Hero banner: text beside a photo",
    where:
      "Hero banner layout “Text beside a photo”: a round photo next to the headline (About page by default).",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Hero banner → Photo" },
    size: [1200, 1200],
    min: [800, 800],
    fit: "crop",
    frames: [
      {
        label: "Round photo",
        device: "desktop",
        ratio: "lens",
        shown: 480,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Round photo",
        device: "tablet",
        ratio: "lens",
        shown: 480,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Round photo",
        device: "mobile",
        ratio: "lens",
        shown: 358,
        shape: "circle",
        zoom: 1.1,
      },
    ],
    crop: "Cropped to a circle; the corners never show, and it zooms in a little on hover.",
    code: ["src/modules/cms/components/sections.tsx (Lens)"],
  },
  {
    group: "headers",
    title: "Compact page header",
    where:
      "Hero banner layout “Compact page header”: a small round kaleidoscope beside the title on inner pages (Artists, Events, Shop…). Hidden on phones.",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Hero banner → Photo" },
    size: [1200, 1200],
    min: [800, 800],
    fit: "texture",
    anyRatio: true,
    frames: [
      {
        label: "Round kaleidoscope",
        device: "desktop",
        ratio: 1,
        shown: 320,
        shape: "circle",
      },
      {
        label: "Round kaleidoscope",
        device: "tablet",
        ratio: 1,
        shown: 256,
        shape: "circle",
      },
      { label: "Not shown", device: "mobile", ratio: 1, hidden: true },
    ],
    crop: "Never shown as a normal photo: it is mirrored into a small round kaleidoscope. Any shape works. The original file is loaded as is, so keep it under 2 MB.",
    heavy: TEXTURE_LIMIT,
    code: ["src/modules/cms/components/sections.tsx (HeroSection)"],
  },
  {
    group: "headers",
    title: "Call to action: photo background",
    where:
      "Closing banner with buttons when its background is “Photo”. Screens 768 px and wider.",
    upload: {
      ...PAGES_UPLOAD,
      label: "Admin → Pages → Call to action → Photo",
    },
    size: [2560, 1024],
    min: [1920, 768],
    fit: "crop",
    frames: [
      {
        label: "Banner",
        device: "desktop",
        ratio: [2.4, 3.4],
        shown: [1440, 554],
      },
      {
        label: "Banner",
        device: "tablet",
        ratio: [1.4, 1.7],
        shown: [768, 504],
      },
      {
        label: "Banner, if no phone photo",
        device: "mobile",
        ratio: [0.72, 1.1],
        shown: [390, 494],
        fallback: true,
      },
    ],
    crop: "Spans the page behind the text; its height follows the text, so the photo is cropped to fit. The left side is darkened for the heading: put the subject on the right.",
    text: { x: 0, y: 18, w: 58, h: 64, label: "Heading and buttons" },
    mobile: "cta-photo-mobile",
    code: ["src/modules/cms/components/sections.tsx (CtaSection)"],
  },
  {
    group: "headers",
    title: "Call to action: photo for phones",
    where:
      "Replaces the call-to-action photo on screens narrower than 768 px. Optional: without it phones show the desktop photo, cropped to the centre.",
    upload: {
      ...PAGES_UPLOAD,
      label: "Admin → Pages → Call to action → Photo for phones",
    },
    size: [1080, 1350],
    min: [720, 900],
    fit: "crop",
    frames: [
      {
        label: "Banner",
        device: "mobile",
        ratio: [0.72, 1.1],
        shown: [390, 494],
        when: "belowMd",
      },
    ],
    crop: "Behind the text and cropped to fit; wider phones trim the top and bottom. Most of the width sits under the text, so keep the subject small and to the right.",
    text: { x: 0, y: 20, w: 82, h: 60, label: "Heading and buttons" },
    fallbackFor: "cta-photo",
    code: ["src/modules/cms/components/sections.tsx (CtaSection)"],
  },

  // ----- Page content sections ----------------------------------------------
  {
    group: "sections",
    title: "Services: tiles",
    where: "Each service in a Services section with the “Tiles” layout.",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Services → Photo" },
    size: [1200, 900],
    min: [800, 600],
    fit: "crop",
    frames: [
      {
        label: "Tile",
        device: "desktop",
        ratio: "serviceTile",
        shown: [379, 284],
      },
      {
        label: "Tile",
        device: "tablet",
        ratio: "serviceTile",
        shown: [220, 165],
      },
      {
        label: "Tile",
        device: "mobile",
        ratio: "serviceTile",
        shown: [358, 269],
      },
    ],
    crop: "Cropped to 4:3 on every screen; zooms in slightly on hover.",
    code: ["src/modules/cms/components/sections.tsx (ServicesSection)"],
  },
  {
    group: "sections",
    title: "Services: rows",
    where:
      "Small photo at the end of each row in a Services section with the “Rows” layout. Hidden on phones.",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Services → Photo" },
    size: [900, 600],
    min: [600, 400],
    fit: "crop",
    frames: [
      {
        label: "Row photo",
        device: "desktop",
        ratio: "serviceRow",
        shown: [224, 149],
        zoom: 1.05,
      },
      {
        label: "Row photo",
        device: "tablet",
        ratio: "serviceRow",
        shown: [224, 149],
        zoom: 1.05,
      },
      {
        label: "Not shown",
        device: "mobile",
        ratio: "serviceRow",
        hidden: true,
      },
    ],
    crop: "Cropped to 3:2. Phones show the text only.",
    code: ["src/modules/cms/components/sections.tsx (ServicesSection)"],
  },
  {
    group: "sections",
    title: "Text and image",
    where: "Round photo beside the text in a “Text and image” section.",
    upload: {
      ...PAGES_UPLOAD,
      label: "Admin → Pages → Text and image → Photo",
    },
    size: [1200, 1200],
    min: [800, 800],
    fit: "crop",
    frames: [
      {
        label: "Round photo",
        device: "desktop",
        ratio: "lens",
        shown: 480,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Round photo",
        device: "tablet",
        ratio: "lens",
        shown: 480,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Round photo",
        device: "mobile",
        ratio: "lens",
        shown: 358,
        shape: "circle",
        zoom: 1.1,
      },
    ],
    crop: "Cropped to a circle; the corners never show, and it zooms in a little on hover.",
    code: ["src/modules/cms/components/sections.tsx (EditorialSection, Lens)"],
  },
  {
    group: "sections",
    title: "Portfolio item",
    where: "Each item (work sample or person) in a Portfolio section.",
    upload: { ...PAGES_UPLOAD, label: "Admin → Pages → Portfolio → Photo" },
    size: [1080, 1350],
    min: [720, 900],
    fit: "crop",
    frames: [
      {
        label: "Card",
        device: "desktop",
        ratio: "portfolio",
        shown: [379, 473],
      },
      {
        label: "Card",
        device: "tablet",
        ratio: "portfolio",
        shown: [341, 426],
      },
      {
        label: "Card",
        device: "mobile",
        ratio: "portfolio",
        shown: [358, 448],
      },
    ],
    crop: "Cropped to 4:5 (portrait) on every screen.",
    code: ["src/modules/cms/components/sections.tsx (PortfolioSection)"],
  },
  {
    group: "sections",
    title: "Photo gallery section",
    where:
      "Photos in a page's Photo gallery section, as a mosaic or a sideways-scrolling filmstrip.",
    upload: {
      ...PAGES_UPLOAD,
      label: "Admin → Pages → Photo gallery → Photos",
    },
    size: [2400, 1600],
    min: [1600, 1067],
    fit: "crop",
    anyRatio: true,
    frames: [
      {
        label: "Mosaic tile",
        device: "desktop",
        ratio: 1.05,
        shown: [287, 272],
      },
      {
        label: "Mosaic wide tile",
        device: "desktop",
        ratio: 2.15,
        shown: [586, 272],
      },
      {
        label: "Filmstrip",
        device: "desktop",
        ratio: "natural",
        shown: [768, 512],
      },
      { label: "Mosaic tile", device: "tablet", ratio: 1, shown: [168, 169] },
      {
        label: "Mosaic wide tile",
        device: "tablet",
        ratio: 2.05,
        shown: [347, 169],
      },
      {
        label: "Mosaic tile",
        device: "mobile",
        ratio: 1.18,
        shown: [175, 148],
      },
      {
        label: "Mosaic wide tile",
        device: "mobile",
        ratio: 2.42,
        shown: [358, 148],
      },
    ],
    crop: "Mosaic tiles crop each photo to a near-square or a wide strip, around its focus point. The filmstrip and the full-screen viewer show the whole photo.",
    tips: ["Landscape and portrait photos can be mixed."],
    code: [
      "src/modules/cms/components/sections.tsx (GallerySection)",
      "src/modules/galleries/components/photo-grid.tsx",
    ],
  },

  // ----- Artists --------------------------------------------------------------
  {
    group: "artists",
    title: "Artist portrait",
    where:
      "Round portrait on artist cards, featured artists and the profile header; a 4:5 tile in event lineups; the share preview of the profile.",
    upload: {
      label: "Admin → Artists → artist → Photos → Portrait",
      href: "/admin/artists",
    },
    size: [1200, 1200],
    min: [800, 800],
    fit: "crop",
    frames: [
      {
        label: "Featured artist",
        device: "desktop",
        ratio: "artistLens",
        shown: 544,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Profile header",
        device: "desktop",
        ratio: "artistLens",
        shown: 416,
        shape: "circle",
      },
      {
        label: "Artist card",
        device: "desktop",
        ratio: "artistLens",
        shown: 352,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Event lineup",
        device: "desktop",
        ratio: "lineupTile",
        shown: [223, 279],
      },
      {
        label: "Artist card",
        device: "tablet",
        ratio: "artistLens",
        shown: 333,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Event lineup",
        device: "tablet",
        ratio: "lineupTile",
        shown: [225, 281],
      },
      {
        label: "Artist card",
        device: "mobile",
        ratio: "artistLens",
        shown: 352,
        shape: "circle",
        zoom: 1.1,
      },
      {
        label: "Event lineup",
        device: "mobile",
        ratio: "lineupTile",
        shown: [173, 216],
      },
    ],
    crop: "Cropped to a circle almost everywhere (corners hidden, slight zoom on hover). Event lineups show a 4:5 tile, which trims the sides. Keep the face centred.",
    code: [
      "src/modules/artists/components/artist-card.tsx (ArtistLens)",
      "src/app/events/[slug]/page.tsx (lineup)",
    ],
  },
  {
    group: "artists",
    title: "Artist cover",
    where:
      "The moving kaleidoscope behind the artist's name at the top of their profile. Without a cover, the portrait is used.",
    upload: {
      label: "Admin → Artists → artist → Photos → Cover",
      href: "/admin/artists",
    },
    size: [2400, 1600],
    min: [1600, 1067],
    fit: "texture",
    anyRatio: true,
    frames: [
      {
        label: "Profile header",
        device: "desktop",
        ratio: [1.8, 2.4],
        shown: [1440, 702],
      },
      {
        label: "Profile header",
        device: "tablet",
        ratio: 0.96,
        shown: [768, 799],
      },
      {
        label: "Profile header",
        device: "mobile",
        ratio: 0.59,
        shown: [390, 659],
      },
    ],
    crop: "Never shown as a normal photo: the middle of it is mirrored into the kaleidoscope. Any shape works. The original file is loaded as is, so keep it under 2 MB.",
    heavy: TEXTURE_LIMIT,
    tips: ["A colourful stage or crowd shot works better than a face."],
    code: [
      "src/app/artists/[slug]/page.tsx",
      "src/components/site/kaleidoscope.tsx",
    ],
  },
  {
    group: "artists",
    title: "Artist profile photos",
    where:
      "Every other artist photo: the photo mosaic on the profile, opening full screen.",
    upload: {
      label: "Admin → Artists → artist → Photos",
      href: "/admin/artists",
    },
    size: [2400, 1600],
    min: [1600, 1067],
    fit: "crop",
    anyRatio: true,
    frames: [
      {
        label: "Mosaic tile",
        device: "desktop",
        ratio: 1.05,
        shown: [287, 272],
      },
      {
        label: "Mosaic wide tile",
        device: "desktop",
        ratio: 2.15,
        shown: [586, 272],
      },
      { label: "Mosaic tile", device: "tablet", ratio: 1, shown: [168, 169] },
      {
        label: "Mosaic tile",
        device: "mobile",
        ratio: 1.18,
        shown: [175, 148],
      },
      {
        label: "Mosaic wide tile",
        device: "mobile",
        ratio: 2.42,
        shown: [358, 148],
      },
    ],
    crop: "Mosaic tiles crop to a near-square or a wide strip; the full-screen viewer shows the whole photo.",
    code: [
      "src/app/artists/[slug]/page.tsx",
      "src/modules/galleries/components/photo-grid.tsx",
    ],
  },

  // ----- Events ---------------------------------------------------------------
  {
    group: "events",
    title: "Event cover",
    where:
      "Showcase cards (Home, Events), two-up and list cards, the event page header and the event's share preview.",
    upload: {
      label: "Admin → Events → event → Cover image",
      href: "/admin/events",
    },
    size: [2400, 1350],
    min: [1600, 900],
    fit: "crop",
    frames: [
      {
        label: "Showcase card",
        device: "desktop",
        ratio: "eventShowcase",
        shown: [1184, 507],
      },
      {
        label: "Event page header",
        device: "desktop",
        ratio: [1.8, 2.4],
        shown: [1440, 702],
      },
      {
        label: "Two-up card",
        device: "desktop",
        ratio: "eventCompact",
        shown: [580, 435],
      },
      {
        label: "List row",
        device: "desktop",
        ratio: "eventRow",
        shown: [144, 96],
      },
      {
        label: "Showcase card",
        device: "tablet",
        ratio: "eventShowcase",
        shown: [707, 397],
      },
      {
        label: "Two-up card",
        device: "tablet",
        ratio: "eventCompact",
        shown: [341, 256],
      },
      {
        label: "Two-up card",
        device: "mobile",
        ratio: "eventCompact",
        shown: [358, 269],
      },
      {
        label: "Showcase card, if no phone cover",
        device: "mobile",
        ratio: "eventShowcase",
        shown: [358, 448],
        fallback: true,
      },
      {
        label: "Event page header, if no phone cover",
        device: "mobile",
        ratio: [0.55, 0.75],
        shown: [390, 659],
        fallback: true,
      },
    ],
    crop: "Cropped to many shapes, from a wide 21:9 strip to a 4:3 card, so the edges are often cut off. Date and title are printed over the lower left.",
    text: { x: 0, y: 62, w: 70, h: 38, label: "Date badge and title" },
    mobile: "event-cover-mobile",
    tips: ["Flyers with lots of text don't crop well: use a photo or artwork."],
    code: [
      "src/modules/events/components/event-feature.tsx",
      "src/modules/events/components/event-row.tsx",
      "src/app/events/[slug]/page.tsx",
    ],
  },
  {
    group: "events",
    title: "Event cover for phones",
    where:
      "Optional portrait cover for showcase cards on phones and the event page header on upright screens. Without it, the main cover is cropped to the centre.",
    upload: {
      label: "Admin → Events → event → Cover image → Phone cover",
      href: "/admin/events",
    },
    size: [1440, 1800],
    min: [1080, 1350],
    fit: "crop",
    frames: [
      {
        label: "Event page header, upright",
        device: "tablet",
        ratio: [0.85, 1],
        shown: [768, 799],
        when: "portrait",
      },
      {
        label: "Showcase card",
        device: "mobile",
        ratio: "eventShowcase",
        shown: [358, 448],
        when: "belowSm",
      },
      {
        label: "Event page header",
        device: "mobile",
        ratio: [0.55, 0.75],
        shown: [390, 659],
        when: "portrait",
      },
    ],
    crop: "4:5 card on phones; the taller page header trims the sides. Date and title sit over the bottom.",
    text: { x: 0, y: 58, w: 100, h: 42, label: "Date and title" },
    fallbackFor: "event-cover",
    code: [
      "src/modules/events/components/event-feature.tsx",
      "src/app/events/[slug]/page.tsx",
    ],
  },

  // ----- Galleries ------------------------------------------------------------
  {
    group: "galleries",
    title: "Gallery photo",
    where:
      "Photos in a festival gallery: a column layout on the gallery page and a full-screen viewer. The photo you make the cover also appears on gallery cards.",
    upload: {
      label: "Admin → Galleries → gallery → Photos",
      href: "/admin/galleries",
    },
    size: [2400, 1600],
    min: [1600, 1067],
    fit: "full",
    anyRatio: true,
    frames: [
      {
        label: "Gallery page",
        device: "desktop",
        ratio: "natural",
        shown: 384,
      },
      {
        label: "Cover card",
        device: "desktop",
        ratio: "galleryCard",
        shown: [580, 387],
      },
      { label: "Gallery page", device: "tablet", ratio: "natural", shown: 345 },
      {
        label: "Cover card",
        device: "tablet",
        ratio: "galleryCard",
        shown: [341, 227],
      },
      { label: "Gallery page", device: "mobile", ratio: "natural", shown: 358 },
      {
        label: "Cover card",
        device: "mobile",
        ratio: "galleryCard",
        shown: [358, 239],
      },
    ],
    crop: "Shown whole, never cropped, on the gallery page and in the viewer. The cover is cropped to 3:2 on gallery cards.",
    tips: [
      "Any shape works: 3:2 landscape (2400 × 1600) or portrait (1600 × 2400).",
    ],
    code: [
      "src/modules/galleries/components/photo-grid.tsx",
      "src/modules/galleries/components/gallery-card.tsx",
    ],
  },

  // ----- Videos ---------------------------------------------------------------
  {
    group: "videos",
    title: "Video poster",
    where:
      "Shown before a video plays, on video cards and on the video page. Vimeo videos need one; other sources use their own thumbnail.",
    upload: {
      label: "Admin → Videos → video → Poster image",
      href: "/admin/videos",
    },
    size: [1920, 1080],
    min: [1280, 720],
    fit: "crop",
    frames: [
      {
        label: "Player",
        device: "desktop",
        ratio: "video",
        shown: [1184, 666],
      },
      {
        label: "Video card",
        device: "desktop",
        ratio: "video",
        shown: [580, 326],
      },
      { label: "Player", device: "tablet", ratio: "video", shown: [707, 398] },
      { label: "Player", device: "mobile", ratio: "video", shown: [358, 201] },
    ],
    crop: "Matches the 16:9 player exactly, so nothing is cut off. The play button covers the centre.",
    text: { x: 40, y: 36, w: 20, h: 28, label: "Play button" },
    code: [
      "src/modules/videos/components/video-player.tsx",
      "src/modules/videos/components/video-card.tsx",
    ],
  },

  // ----- Shop -----------------------------------------------------------------
  {
    group: "shop",
    title: "Product photo",
    where:
      "Product cards in the shop, the product page and the cart. The cover photo leads.",
    upload: { label: "Seller dashboard → Products → product → Photos" },
    size: [1200, 1500],
    min: [800, 1000],
    fit: "crop",
    frames: [
      {
        label: "Product page, first photo",
        device: "desktop",
        ratio: "productLead",
        shown: [611, 764],
      },
      {
        label: "Shop card",
        device: "desktop",
        ratio: "productCard",
        shown: [278, 348],
      },
      {
        label: "Product page, more photos",
        device: "desktop",
        ratio: "productThumb",
        shown: 300,
      },
      {
        label: "Shop card",
        device: "tablet",
        ratio: "productCard",
        shown: [341, 427],
      },
      {
        label: "Product page, more photos",
        device: "tablet",
        ratio: "productThumb",
        shown: 347,
      },
      {
        label: "Shop card",
        device: "mobile",
        ratio: "productCard",
        shown: [171, 214],
      },
      {
        label: "Product page, more photos",
        device: "mobile",
        ratio: "productThumb",
        shown: 358,
      },
    ],
    crop: "Cropped to 4:5 in the shop and as the first photo on the product page. Further photos and the cart use a square crop, which trims the top and bottom.",
    code: [
      "src/modules/marketplace/components/product-card.tsx",
      "src/app/shop/[slug]/page.tsx",
    ],
  },
  {
    group: "shop",
    title: "Seller logo",
    where: "Round logo on the seller's storefront page.",
    upload: { label: "Seller dashboard → Shop → Logo" },
    size: [800, 800],
    min: [400, 400],
    fit: "crop",
    frames: [
      {
        label: "Storefront",
        device: "desktop",
        ratio: 1,
        shown: 80,
        shape: "circle",
      },
      {
        label: "Storefront",
        device: "tablet",
        ratio: 1,
        shown: 80,
        shape: "circle",
      },
      {
        label: "Storefront",
        device: "mobile",
        ratio: 1,
        shown: 80,
        shape: "circle",
      },
    ],
    crop: "Cropped to a small circle. Leave space around the logo so the circle doesn't cut it.",
    code: ["src/app/shop/sellers/[slug]/page.tsx"],
  },

  // ----- Music ----------------------------------------------------------------
  {
    group: "music",
    title: "Release artwork",
    where:
      "Release cards and pages in the music store, the charts and the mini player.",
    upload: { label: "Artist dashboard → My music → release → Artwork" },
    size: [3000, 3000],
    min: [1400, 1400],
    fit: "crop",
    frames: [
      {
        label: "Store feature",
        device: "desktop",
        ratio: "releaseCover",
        shown: 576,
      },
      {
        label: "Release page",
        device: "desktop",
        ratio: "releaseCover",
        shown: 512,
      },
      {
        label: "Release card",
        device: "desktop",
        ratio: "releaseCover",
        shown: 221,
      },
      {
        label: "Mini player",
        device: "desktop",
        ratio: 1,
        shown: 56,
        shape: "circle",
      },
      {
        label: "Release page",
        device: "tablet",
        ratio: "releaseCover",
        shown: 512,
      },
      {
        label: "Release card",
        device: "tablet",
        ratio: "releaseCover",
        shown: 222,
      },
      {
        label: "Release page",
        device: "mobile",
        ratio: "releaseCover",
        shown: 358,
      },
      {
        label: "Release card",
        device: "mobile",
        ratio: "releaseCover",
        shown: 169,
      },
    ],
    crop: "Square everywhere and never cropped; the mini player shows it as a spinning disc.",
    tips: [
      "3000 × 3000 is the size streaming stores ask for. Save as JPG (quality 85–90) to stay under 8 MB.",
    ],
    code: [
      "src/modules/music/components/release-card.tsx",
      "src/app/music/[artist]/[release]/page.tsx",
    ],
  },

  // ----- Sharing --------------------------------------------------------------
  {
    group: "sharing",
    title: "Share image",
    where:
      "The preview when a page link is shared in WhatsApp, Instagram, Facebook, LinkedIn, X or Slack. Not shown on the site itself. Artist, event, gallery, product and release pages use their own cover instead.",
    upload: {
      label:
        "Admin → Pages → Search and sharing → Share image (or Site settings → Default share image)",
      href: "/admin/pages",
    },
    size: [1200, 630],
    min: [600, 315],
    fit: "crop",
    frames: [
      {
        label: "Large link preview",
        device: "desktop",
        ratio: 1.91,
        shown: [500, 262],
      },
      { label: "X large card", device: "desktop", ratio: 2, shown: [500, 250] },
      {
        label: "Large link preview",
        device: "mobile",
        ratio: 1.91,
        shown: [320, 168],
      },
      {
        label: "Small square thumbnail",
        device: "mobile",
        ratio: 1,
        shown: 72,
      },
    ],
    crop: "Apps crop it a little differently; some chat apps show only a small square from the middle. Keep logos and words in the centre.",
    code: ["src/modules/cms/metadata.ts"],
  },
];

export const IMAGE_SPECS = Object.fromEntries(
  specs.map((spec, index) => [ids[index], { ...spec, id: ids[index] }]),
) as Record<ImageSpecId, ImageSpec>;

export const IMAGE_SPEC_LIST: ImageSpec[] = ids.map((id) => IMAGE_SPECS[id]);

export function isImageSpecId(value: unknown): value is ImageSpecId {
  return (
    typeof value === "string" && (ids as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Formats and limits (from the storage bucket)
// ---------------------------------------------------------------------------

const FORMAT_NAMES: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
};

export const FORMAT_LABEL = IMAGE_TYPES.map((type) => FORMAT_NAMES[type])
  .join(", ")
  .replace(/, ([^,]+)$/, " or $1");

export const MAX_SIZE_LABEL = formatBytes(MAX_IMAGE_BYTES);

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

const NAMED_RATIOS: [number, string][] = [
  [1, "1:1"],
  [4 / 5, "4:5"],
  [5 / 4, "5:4"],
  [2 / 3, "2:3"],
  [3 / 2, "3:2"],
  [3 / 4, "3:4"],
  [4 / 3, "4:3"],
  [9 / 16, "9:16"],
  [16 / 9, "16:9"],
  [21 / 9, "21:9"],
  [2, "2:1"],
  [5 / 2, "5:2"],
  [1.91, "1.91:1"],
];

/** "16:9" for 1920 × 1080; near-misses round to the nearest common ratio. */
export function ratioLabel(width: number, height: number) {
  const ratio = width / height;
  const named = NAMED_RATIOS.find(
    ([value]) => Math.abs(Math.log(ratio / value)) < 0.012,
  );
  if (named) return named[1];
  const divisor = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width) / divisor;
  const h = Math.round(height) / divisor;
  return w <= 32 && h <= 32
    ? `${w}:${h}`
    : ratio >= 1
      ? `${ratio.toFixed(2)}:1`
      : `1:${(1 / ratio).toFixed(2)}`;
}

export const sizeLabel = ([w, h]: Size) => `${w} × ${h} px`;

/** Width ÷ height range of a frame, or null when it keeps the photo's shape. */
export function frameRatios(frame: Frame): [number, number] | null {
  const { ratio } = frame;
  if (ratio === "natural") return null;
  if (typeof ratio === "number") return [ratio, ratio];
  if (typeof ratio === "string") {
    const value = containerRatio(
      CONTAINERS[ratio],
      DEVICES[frame.device].width,
    );
    return [value, value];
  }
  return [ratio[0], ratio[1]];
}

/** Display ratio label for a frame, e.g. "21:9" or "1.6–2.4 : 1". */
export function frameRatioLabel(frame: Frame) {
  const range = frameRatios(frame);
  if (!range) return "Own shape";
  if (range[0] === range[1]) {
    return ratioLabel(range[0] * 1000, 1000);
  }
  return `${range[0]}–${range[1]} : 1`;
}

/** Size on screen as [width, height] when known. */
export function frameShown(frame: Frame): Size | null {
  if (frame.shown === undefined) return null;
  if (typeof frame.shown !== "number") return frame.shown;
  const range = frameRatios(frame);
  if (!range) return null;
  return [frame.shown, Math.round(frame.shown / range[0])];
}

/**
 * The part of a canvas (as fractions) that stays visible when it fills a
 * frame of another ratio, cropped around a focus point (0..1).
 */
export function cropWindow(
  canvasRatio: number,
  frameRatio: number,
  zoom = 1,
  focus: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Box {
  let w = 1;
  let h = 1;
  if (frameRatio > canvasRatio) h = canvasRatio / frameRatio;
  else w = frameRatio / canvasRatio;
  w /= zoom;
  h /= zoom;
  const x = Math.min(Math.max(focus.x - w / 2, 0), 1 - w);
  const y = Math.min(Math.max(focus.y - h / 2, 0), 1 - h);
  return { x, y, w, h };
}

function intersect(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

/** Frames that crop this upload (not hidden, not fallback-only). */
export function croppingFrames(spec: ImageSpec) {
  return spec.frames.filter(
    (frame) => !frame.hidden && !frame.fallback && frameRatios(frame),
  );
}

/**
 * Where the subject stays visible in every frame that shows this upload, in
 * fractions of the design canvas. Circles also lose their corners: the
 * guide draws those as a circle inside this box.
 */
export function safeArea(spec: ImageSpec): Box {
  const canvas = spec.size[0] / spec.size[1];
  let box: Box = { x: 0, y: 0, w: 1, h: 1 };
  if (spec.fit === "texture") return box;
  for (const frame of croppingFrames(spec)) {
    const [low, high] = frameRatios(frame)!;
    for (const ratio of new Set([low, high])) {
      box = intersect(box, cropWindow(canvas, ratio, frame.zoom ?? 1));
    }
  }
  return box;
}

export function isRound(spec: ImageSpec) {
  const frames = croppingFrames(spec);
  return frames.length > 0 && frames.every((frame) => frame.shape === "circle");
}

/** Frames for one device, visible ones first. */
export function framesFor(spec: ImageSpec, device: Device) {
  return spec.frames.filter((frame) => frame.device === device);
}

export type DeviceView = {
  device: Device;
  /** Uploads seen on this device: the main image and/or the phone image. */
  uploads: ImageSpec[];
  /** Frames on this device, tagged with the upload they show. */
  frames: (Frame & { from: ImageSpec })[];
  /** The placement doesn't appear on this device. */
  hidden: boolean;
};

/**
 * What each device shows for a placement, folding a separate phone upload
 * into its main spec: the main image's fallback frames only count when
 * there is no phone spec.
 */
export function deviceViews(spec: ImageSpec): DeviceView[] {
  const main = spec.fallbackFor ? IMAGE_SPECS[spec.fallbackFor] : spec;
  const phone = main.mobile ? IMAGE_SPECS[main.mobile] : null;
  return (Object.keys(DEVICES) as Device[]).map((device) => {
    const frames = [
      ...framesFor(main, device)
        .filter((frame) => !(phone && frame.fallback))
        .map((frame) => ({ ...frame, from: main })),
      ...(phone ? framesFor(phone, device) : []).map((frame) => ({
        ...frame,
        from: phone!,
      })),
    ];
    const visible = frames.filter((frame) => !frame.hidden);
    const uploads = [...new Set(visible.map((frame) => frame.from))];
    return { device, uploads, frames, hidden: !visible.length };
  });
}

/** Plain-text brief for a designer, e.g. pasted into a chat or ticket. */
export function specBrief(spec: ImageSpec) {
  const phone = spec.mobile ? IMAGE_SPECS[spec.mobile] : null;
  const safe = safeArea(spec);
  const lines = [
    `${spec.title} (DopeBooking)`,
    `Where: ${spec.where}`,
    `Design at: ${sizeLabel(spec.size)} (${spec.anyRatio ? "any shape" : ratioLabel(...spec.size)}), at least ${sizeLabel(spec.min)}`,
    phone
      ? `Phones: separate image at ${sizeLabel(phone.size)} (${ratioLabel(...phone.size)}), at least ${sizeLabel(phone.min)}`
      : null,
    `Files: ${FORMAT_LABEL}, up to ${MAX_SIZE_LABEL}${spec.heavy ? `; aim for under ${formatBytes(spec.heavy)}` : ""}`,
    spec.fit === "texture"
      ? null
      : isRound(spec)
        ? "Safe area: keep the subject inside the central circle."
        : safe.w > 0.98 && safe.h > 0.98
          ? "Safe area: the whole image is visible."
          : `Safe area: keep faces, logos and words inside the central ${Math.round(safe.w * 100)}% of the width and ${Math.round(safe.h * 100)}% of the height.`,
    spec.text
      ? `Text on top: ${spec.text.label.toLowerCase()} cover part of the image.`
      : null,
    `Cropping: ${spec.crop}`,
  ];
  return lines.filter(Boolean).join("\n");
}
