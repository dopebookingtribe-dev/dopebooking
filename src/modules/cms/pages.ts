import type {
  BuiltinBlock,
  CmsLink,
  PageContent,
  Section,
  SectionContent,
  SectionType,
  SiteSettings,
} from "./schema";

/*
 * Every editable page, where it lives, which built-in blocks it carries, and
 * the content it starts with before an admin saves anything. Defaults keep
 * the site complete even when the database has no page rows yet.
 */

export const PAGES = {
  home: { title: "Home page", path: "/", builtins: [] },
  about: { title: "About", path: "/about", builtins: [] },
  artists: {
    title: "Artists",
    path: "/artists",
    builtins: ["artist-directory"],
  },
  events: { title: "Events", path: "/events", builtins: ["event-list"] },
  gallery: { title: "Photos", path: "/gallery", builtins: ["gallery-index"] },
  videos: { title: "Videos", path: "/videos", builtins: ["video-index"] },
  services: { title: "Festival services", path: "/services", builtins: [] },
  promotion: {
    title: "Event promotion",
    path: "/services/promotion",
    builtins: ["request-form"],
  },
  catering: {
    title: "Festival catering",
    path: "/services/catering",
    builtins: ["request-form"],
  },
  production: {
    title: "Photo, video & aftermovies",
    path: "/services/production",
    builtins: ["request-form"],
  },
  shop: { title: "Shop", path: "/shop", builtins: ["shop-catalog"] },
  sell: {
    title: "Sell with us",
    path: "/sell",
    builtins: ["sell-application"],
  },
} as const satisfies Record<
  string,
  { title: string; path: string; builtins: BuiltinBlock[] }
>;

export type PageKey = keyof typeof PAGES;
export const PAGE_KEYS = Object.keys(PAGES) as PageKey[];

export function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && value in PAGES;
}

// ---------------------------------------------------------------------------
// Builders: keep the defaults below readable
// ---------------------------------------------------------------------------

const link = (label = "", href = ""): CmsLink => ({ label, href });

function section<T extends SectionType>(
  id: string,
  type: T,
  content: SectionContent<T>,
): Section {
  return { id, type, visible: true, content } as Section;
}

const builtin = (id: string, block: BuiltinBlock) =>
  section(id, "builtin", { block });

function page(sections: Section[], title = "", description = ""): PageContent {
  return { seo: { title, description, image: "" }, sections };
}

/** Blank content for a section an admin adds in the page builder. */
export function emptySectionContent(type: SectionType): Section["content"] {
  switch (type) {
    case "hero":
      return {
        layout: "image",
        heading: "New headline",
        body: "",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      };
    case "artists":
      return {
        heading: "Artists",
        body: "",
        link: link("All artists", "/artists"),
        source: "featured",
        artistIds: [],
        limit: 4,
        layout: "editorial",
      };
    case "events":
      return {
        heading: "Upcoming events",
        body: "",
        link: link("All events", "/events"),
        when: "upcoming",
        limit: 3,
        layout: "showcase",
      };
    case "gallery":
      return {
        heading: "Photos",
        body: "",
        link: link(),
        images: [],
        layout: "mosaic",
      };
    case "videos":
      return {
        heading: "Videos",
        body: "",
        link: link("All videos", "/videos"),
        limit: 3,
        layout: "feature",
      };
    case "products":
      return {
        heading: "From the shop",
        body: "",
        link: link("Visit the shop", "/shop"),
        source: "featured",
        categorySlug: "",
        limit: 4,
      };
    case "services":
      return { heading: "Services", body: "", layout: "tiles", items: [] };
    case "editorial":
      return {
        heading: "New story",
        body: "",
        image: "",
        imageSide: "right",
        link: link(),
      };
    case "packages":
      return { heading: "Packages", body: "", items: [] };
    case "stats":
      return { heading: "", body: "", items: [] };
    case "steps":
      return { heading: "How it works", items: [] };
    case "cta":
      return {
        layout: "string-art",
        heading: "New call to action",
        body: "",
        primary: link(),
        secondary: link(),
        image: "",
      };
    case "portfolio":
      return { heading: "Portfolio", body: "", items: [] };
    case "faq":
      return { heading: "Questions", items: [] };
    case "contact":
      return {
        heading: "Contact",
        body: "",
        email: "",
        phone: "",
        primary: link(),
      };
    case "builtin":
      return { block: "artist-directory" };
  }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const BOOKING_STEPS = section("booking-steps", "steps", {
  heading: "How booking works",
  items: [
    {
      title: "Send a request",
      body: "Pick an artist and tell us the date, city, stage and budget.",
    },
    {
      title: "Get a quote",
      body: "We check availability with the artist and reply with a fee and terms.",
    },
    {
      title: "Confirm the booking",
      body: "Accept the quote in your dashboard and we confirm the date with the artist.",
    },
  ],
});

const SERVICE_STEPS = section("service-steps", "steps", {
  heading: "How a service request works",
  items: [
    {
      title: "Tell us about the event",
      body: "Dates, capacity, location and what you need. Rough numbers are fine.",
    },
    {
      title: "Get a quote",
      body: "We match the right crew and reply with scope, timing and price.",
    },
    {
      title: "Plan it together",
      body: "Accept the quote in your dashboard and we work through the details with you.",
    },
  ],
});

const PLANNING_CTA = section("planning-cta", "cta", {
  layout: "string-art",
  heading: "Planning a festival?",
  body: "Tell us your date and stage. We reply with available artists and a quote.",
  primary: link("Start a booking request", "/artists"),
  secondary: link("Festival services", "/services"),
  image: "",
});

const SERVICE_ITEMS = [
  {
    title: "Event promotion",
    body: "Campaigns that put your event in front of the global psytrance audience: paid social, creators, artist shout-outs, press and our own channels.",
    href: "/services/promotion",
    image: "",
  },
  {
    title: "Festival catering",
    body: "Crew catering, artist hospitality and guest food stalls, with vegan-first menus and teams who know festival logistics.",
    href: "/services/catering",
    image: "",
  },
  {
    title: "Photo, video & aftermovies",
    body: "Photographers and videographers who shoot dancefloors, not weddings. From same-day social selects to the aftermovie that sells next year's tickets.",
    href: "/services/production",
    image: "",
  },
];

// ---------------------------------------------------------------------------
// Default page content
// ---------------------------------------------------------------------------

export const DEFAULT_PAGES: Record<PageKey, PageContent> = {
  home: page([
    section("hero", "hero", {
      layout: "string-art",
      heading: "Book psytrance artists for your festival.",
      body: "DopeBooking represents international acts from Goa and progressive to forest and hi-tech, and runs promotion, catering and aftermovie production for open airs and club nights.",
      primary: link("Book an artist", "/artists"),
      secondary: link("Festival services", "/services"),
      image: "",
      overlay: 55,
    }),
    section("featured-artists", "artists", {
      heading: "Artists on the roster",
      body: "",
      link: link("All artists", "/artists"),
      source: "featured",
      artistIds: [],
      limit: 4,
      layout: "editorial",
    }),
    BOOKING_STEPS,
    section("upcoming", "events", {
      heading: "Upcoming events",
      body: "",
      link: link("All events", "/events"),
      when: "upcoming",
      limit: 3,
      layout: "showcase",
    }),
    section("dancefloor", "gallery", {
      heading: "From the dancefloor",
      body: "",
      link: link("All photos", "/gallery"),
      images: [],
      layout: "mosaic",
    }),
    section("services", "services", {
      heading: "Festival services",
      body: "Beyond booking artists, we run the parts that make a festival weekend work.",
      layout: "tiles",
      items: SERVICE_ITEMS,
    }),
    section("agency", "editorial", {
      heading: "One agency for the lineup and the weekend around it",
      body: "DopeBooking is a booking agency and festival services team based in Germany. We work with promoters on lineups, travel and riders, and bring the crews that keep a festival running: promotion, food, photo and film.\n\nEvery booking has one contact person from first request to the last set.",
      image: "",
      imageSide: "right",
      link: link("About us", "/about"),
    }),
    section("videos", "videos", {
      heading: "Aftermovies and sets",
      body: "",
      link: link("All videos", "/videos"),
      limit: 3,
      layout: "feature",
    }),
    section("shop", "products", {
      heading: "From the shop",
      body: "",
      link: link("Visit the shop", "/shop"),
      source: "featured",
      categorySlug: "",
      limit: 4,
    }),
    PLANNING_CTA,
  ]),

  about: page(
    [
      section("hero", "hero", {
        layout: "split",
        heading: "About DopeBooking",
        body: "A psytrance booking agency and festival services team, based in Germany and working with promoters worldwide.",
        primary: link("Book an artist", "/artists"),
        secondary: link("Contact us", "#contact"),
        image: "",
        overlay: 40,
      }),
      section("story", "editorial", {
        heading: "Built around the dancefloor",
        body: "We book international psytrance artists for festivals, open airs and club nights, and we handle what comes with a booking: contracts, travel, riders and hospitality.\n\nAround the lineup we run the services a festival needs: promotion campaigns, catering for crew, artists and guests, and photo and film crews who know how to shoot a dancefloor.",
        image: "",
        imageSide: "left",
        link: link(),
      }),
      section("offer", "stats", {
        heading: "What we cover",
        body: "",
        items: [
          {
            value: "5",
            label: "services: booking, promotion, catering, photo and film",
          },
          {
            value: "12",
            label: "psytrance styles we book, from Goa to hi-tech",
          },
          { value: "1", label: "contact person for each booking" },
        ],
      }),
      BOOKING_STEPS,
      section("contact", "contact", {
        heading: "Contact",
        body: "For bookings, start a request on the artist's page so all details stay in one place. For anything else, write to us.",
        email: "",
        phone: "",
        primary: link("Send a booking request", "/artists"),
      }),
    ],
    "About",
    "A psytrance booking agency and festival services team based in Germany.",
  ),

  artists: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Artists",
        body: "International psytrance acts for festivals, open airs and club nights, from progressive sunrise sets to night-time full-on.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("directory", "artist-directory"),
      PLANNING_CTA,
    ],
    "Artists",
    "Book international psytrance artists for festivals and club nights.",
  ),

  events: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Events",
        body: "Festivals and nights with DopeBooking artists and crews.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("list", "event-list"),
    ],
    "Events",
    "Festivals and club nights with DopeBooking artists.",
  ),

  gallery: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Photos",
        body: "Festival photography from the stages, dancefloors and campsites we work on.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("index", "gallery-index"),
    ],
    "Photos",
    "Festival photography from DopeBooking events.",
  ),

  videos: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Videos",
        body: "Aftermovies, live sets and stories from the weekend.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("index", "video-index"),
    ],
    "Videos",
    "Aftermovies and live sets.",
  ),

  services: page(
    [
      section("hero", "hero", {
        layout: "image",
        heading: "Everything around the dancefloor.",
        body: "Beyond booking artists, we run the parts that make a festival weekend work. Tell us what you need and get a quote.",
        primary: link("Request a quote", "#services"),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      section("services", "services", {
        heading: "",
        body: "",
        layout: "rows",
        items: SERVICE_ITEMS,
      }),
      SERVICE_STEPS,
      section("faq", "faq", {
        heading: "Questions",
        items: [
          {
            question: "Do you only work with psytrance events?",
            answer:
              "Mostly. Our crews know open-air festivals and club nights in the electronic scene best, and that is where we take on work.",
          },
          {
            question: "Can I book a service without booking an artist?",
            answer: "Yes. Each service has its own request form and quote.",
          },
          {
            question: "Where do you work?",
            answer:
              "We are based in Germany and travel for festivals in Europe and beyond. Travel costs are part of the quote.",
          },
        ],
      }),
      PLANNING_CTA,
    ],
    "Festival services",
    "Event promotion, festival catering, and photo, video and aftermovie production.",
  ),

  promotion: page(
    [
      section("hero", "hero", {
        layout: "split",
        heading: "Event promotion",
        body: "Campaigns that put your event in front of the global psytrance audience: paid social, creators, artist shout-outs, press and our own channels.",
        primary: link("Request a quote", "#request"),
        secondary: link("All services", "/services"),
        image: "",
        overlay: 40,
      }),
      section("packages", "packages", {
        heading: "Campaign packages",
        body: "Every campaign is quoted for your event. These packages show the usual scope.",
        items: [
          {
            name: "Announcement",
            price: "Quote on request",
            summary: "A focused push for a lineup or ticket release.",
            features: [
              "Campaign plan and timeline",
              "Paid social setup and targeting",
              "Artist shout-out coordination",
            ],
            cta: link("Ask about this", "#request"),
            highlighted: false,
          },
          {
            name: "Season campaign",
            price: "Quote on request",
            summary: "From first announcement to sold-out, across channels.",
            features: [
              "Everything in Announcement",
              "Creator and community partnerships",
              "Press outreach",
              "Weekly reporting",
            ],
            cta: link("Ask about this", "#request"),
            highlighted: true,
          },
          {
            name: "Festival partner",
            price: "Quote on request",
            summary: "An ongoing promotion team for your festival brand.",
            features: [
              "Everything in Season campaign",
              "Content calendar all year",
              "Aftermovie and recap distribution",
            ],
            cta: link("Ask about this", "#request"),
            highlighted: false,
          },
        ],
      }),
      SERVICE_STEPS,
      builtin("request", "request-form"),
    ],
    "Event promotion",
    "Promotion campaigns for psytrance festivals and events.",
  ),

  catering: page(
    [
      section("hero", "hero", {
        layout: "split",
        heading: "Festival catering",
        body: "Crew catering, artist hospitality and guest food stalls, with vegan-first menus and teams who know festival logistics.",
        primary: link("Request a quote", "#request"),
        secondary: link("All services", "/services"),
        image: "",
        overlay: 40,
      }),
      section("offer", "services", {
        heading: "What we cook for",
        body: "",
        layout: "tiles",
        items: [
          {
            title: "Crew catering",
            body: "Regular hot meals for build-up, show days and breakdown, timed around shifts.",
            href: "#request",
            image: "",
          },
          {
            title: "Artist hospitality",
            body: "Backstage food and drinks that follow each artist's rider.",
            href: "#request",
            image: "",
          },
          {
            title: "Guest food stalls",
            body: "Stalls for festival guests, from breakfast to late-night food.",
            href: "#request",
            image: "",
          },
        ],
      }),
      section("menus", "editorial", {
        heading: "Vegan-first menus",
        body: "Our menus start plant-based and add options where an event needs them. We plan quantities, allergens and water and power needs with your production team before the gates open.",
        image: "",
        imageSide: "right",
        link: link(),
      }),
      builtin("request", "request-form"),
    ],
    "Festival catering",
    "Crew catering, artist hospitality and guest food for festivals.",
  ),

  production: page(
    [
      section("hero", "hero", {
        layout: "split",
        heading: "Photo, video & aftermovies",
        body: "Photographers and videographers who shoot dancefloors, not weddings. From same-day social selects to the aftermovie that sells next year's tickets.",
        primary: link("Request a quote", "#request"),
        secondary: link("All services", "/services"),
        image: "",
        overlay: 40,
      }),
      section("work", "portfolio", {
        heading: "What we deliver",
        body: "",
        items: [
          {
            name: "Festival photography",
            role: "Photo",
            body: "Stages, crowd, decor and the quiet moments in between.",
            image: "",
            href: "",
          },
          {
            name: "Same-day social selects",
            role: "Photo and video",
            body: "Edited picks delivered during the festival, ready to post.",
            image: "",
            href: "",
          },
          {
            name: "Aftermovie",
            role: "Film",
            body: "A cut that captures the weekend and sells the next one.",
            image: "",
            href: "",
          },
        ],
      }),
      section("frames", "gallery", {
        heading: "",
        body: "",
        link: link(),
        images: [],
        layout: "filmstrip",
      }),
      builtin("request", "request-form"),
    ],
    "Photo, video & aftermovies",
    "Festival photography, video and aftermovie production.",
  ),

  shop: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Shop",
        body: "Merch, art and music from DopeBooking artists, crews and partners.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("catalog", "shop-catalog"),
    ],
    "Shop",
    "Merch, art and music from the psytrance scene.",
  ),

  sell: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Sell with us",
        body: "Artists, labels and makers from the scene can open a shop on DopeBooking.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      section("steps", "steps", {
        heading: "How selling works",
        items: [
          {
            title: "Apply",
            body: "Tell us who you are and what you want to sell.",
          },
          {
            title: "Get approved",
            body: "We review every application before a shop goes live.",
          },
          {
            title: "List and get paid",
            body: "Add products, set up payouts, and we pay out your share of each sale.",
          },
        ],
      }),
      builtin("apply", "sell-application"),
    ],
    "Sell with us",
    "Open a shop on DopeBooking.",
  ),
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "DopeBooking",
    tagline: "International psytrance agency, based in Germany",
  },
  nav: [
    { label: "Artists", href: "/artists", children: [] },
    { label: "Events", href: "/events", children: [] },
    {
      label: "Media",
      href: "/gallery",
      children: [
        {
          label: "Photos",
          href: "/gallery",
          description: "Festival photography",
        },
        {
          label: "Videos",
          href: "/videos",
          description: "Aftermovies and live sets",
        },
      ],
    },
    {
      label: "Services",
      href: "/services",
      children: [
        {
          label: "Event promotion",
          href: "/services/promotion",
          description: "Campaigns for your event",
        },
        {
          label: "Festival catering",
          href: "/services/catering",
          description: "Crew, artists and guests",
        },
        {
          label: "Photo, video & aftermovies",
          href: "/services/production",
          description: "Crews who shoot dancefloors",
        },
      ],
    },
    { label: "Shop", href: "/shop", children: [] },
    { label: "About", href: "/about", children: [] },
  ],
  cta: { label: "Book an artist", href: "/artists" },
  footer: {
    blurb:
      "Booking, promotion, catering and film for psytrance festivals and club nights.",
    columns: [
      {
        heading: "Explore",
        links: [
          { label: "Artists", href: "/artists" },
          { label: "Events", href: "/events" },
          { label: "Photos", href: "/gallery" },
          { label: "Videos", href: "/videos" },
        ],
      },
      {
        heading: "Work with us",
        links: [
          { label: "Festival services", href: "/services" },
          { label: "Shop", href: "/shop" },
          { label: "Sell with us", href: "/sell" },
          { label: "About", href: "/about" },
        ],
      },
      {
        heading: "Legal",
        links: [
          { label: "Imprint", href: "/legal/imprint" },
          { label: "Privacy", href: "/legal/privacy" },
          { label: "Terms", href: "/legal/terms" },
          { label: "Shop terms", href: "/legal/shop-terms" },
          { label: "Seller terms", href: "/legal/seller-terms" },
          { label: "Cookies", href: "/legal/cookies" },
        ],
      },
    ],
    note: "",
  },
  socials: [],
  contact: { email: "", phone: "", address: "" },
  seo: {
    title: "DopeBooking, international psytrance artist agency",
    description:
      "Book international psytrance artists and festival services: promotion, catering, photography and aftermovie production.",
    image: "",
  },
  showDemoLabels: true,
};
