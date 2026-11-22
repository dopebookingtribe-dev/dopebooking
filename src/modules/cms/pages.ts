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
  news: { title: "News", path: "/news", builtins: ["post-index"] },
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
  music: { title: "Music", path: "/music", builtins: ["music-store"] },
  sell: {
    title: "Sell with us",
    path: "/sell",
    builtins: ["sell-application"],
  },
  "art-gallery": { title: "Art Gallery", path: "/art-gallery", builtins: [] },
  "art-exhibitions": {
    title: "Art Gallery: exhibitions",
    path: "/art-gallery/exhibitions",
    builtins: ["art-exhibition-index"],
  },
  "art-artists": {
    title: "Art Gallery: artists",
    path: "/art-gallery/artists",
    builtins: ["art-artist-index"],
  },
  "art-collaborate": {
    title: "Art Gallery: collaborate",
    path: "/art-gallery/collaborate",
    builtins: ["art-inquiry-form"],
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
        layout: "kaleidoscope",
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
    case "posts":
      return {
        heading: "Latest news",
        body: "",
        link: link("All news", "/news"),
        category: "",
        limit: 3,
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
    case "art":
      return {
        show: "exhibitions",
        heading: "Exhibitions",
        body: "",
        link: link("All exhibitions", "/art-gallery/exhibitions"),
        secondary: link(),
        limit: 4,
      };
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
      layout: "kaleidoscope",
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

  news: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "News",
        body: "Announcements, festival reports, interviews and new releases from the DopeBooking family.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("index", "post-index"),
    ],
    "News",
    "Announcements, festival reports, interviews and releases from DopeBooking.",
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

  music: page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Music",
        body: "Tracks, EPs and albums straight from DopeBooking artists. Lossless downloads, and the artist gets most of every sale.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("store", "music-store"),
    ],
    "Music",
    "Buy psytrance tracks, EPs and albums from DopeBooking artists in WAV, FLAC and MP3.",
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

  "art-gallery": page(
    [
      section("wall", "art", {
        show: "wall",
        heading: "Art that lives inside the festival.",
        body: "The DopeBooking Art Gallery brings painters, sculptors, installation, digital and live artists together to build exhibitions that become part of the festival itself: open day and night, often made on site, shared with the dancefloor.",
        link: link("Explore exhibitions", "/art-gallery/exhibitions"),
        secondary: link("Collaborate with us", "/art-gallery/collaborate"),
        limit: 7,
      }),
      section("about", "editorial", {
        heading: "A gallery that moves with the music",
        body: "Festival culture has always been visual: the stage, the decor, the painted banners and the people who dress for the night. Our galleries give that energy a curated home, a space where visitors slow down between sets and meet the artists behind the work.\n\nEach exhibition is collaborative. Artists of different disciplines share one space, respond to one theme, and often create pieces together during the festival. When the music stops, the exhibition stays here as an archive of what was made.",
        image: "",
        imageSide: "right",
        link: link("Meet the artists", "/art-gallery/artists"),
      }),
      section("exhibitions", "art", {
        show: "exhibitions",
        heading: "Exhibitions",
        body: "Galleries curated for festivals and cultural gatherings: on view now, coming up next, and the archive.",
        link: link("All exhibitions", "/art-gallery/exhibitions"),
        secondary: link(),
        limit: 4,
      }),
      section("artists", "art", {
        show: "artists",
        heading: "Meet the artists",
        body: "One profile per artist, linked to every exhibition and every work they have been part of.",
        link: link("All artists", "/art-gallery/artists"),
        secondary: link(),
        limit: 8,
      }),
      section("made-together", "art", {
        show: "collaborations",
        heading: "Made together",
        body: "Our galleries are built by many hands. Each line joins two artists who exhibited side by side or created a work together.",
        link: link(),
        secondary: link(),
        limit: 24,
      }),
      section("highlights", "art", {
        show: "highlights",
        heading: "Gallery highlights",
        body: "Installations, close-ups, festival moments and the work behind them.",
        link: link(),
        secondary: link(),
        limit: 18,
      }),
      section("process", "steps", {
        heading: "How a festival gallery comes together",
        items: [
          {
            title: "Concept",
            body: "We shape a theme with the festival: the space, the audience and the music around it.",
          },
          {
            title: "Artists",
            body: "We invite a mix of disciplines and pair artists who create well together.",
          },
          {
            title: "Build, open, archive",
            body: "Artists install, paint live and host the space. Afterwards the exhibition keeps a permanent page here.",
          },
        ],
      }),
      section("festivals", "art", {
        show: "festivals",
        heading: "Where we have exhibited",
        body: "",
        link: link(),
        secondary: link(),
        limit: 24,
      }),
      section("collaborate", "cta", {
        layout: "string-art",
        heading: "Bring a gallery to your festival",
        body: "Tell us about your event, the space and the kind of art you imagine. We reply with a concept, a selection of artists and a quote.",
        primary: link("Start a collaboration", "/art-gallery/collaborate"),
        secondary: link(
          "Past exhibitions",
          "/art-gallery/exhibitions?view=archive",
        ),
        image: "",
      }),
    ],
    "Art Gallery",
    "Collaborative art galleries at music festivals: exhibitions, artists, installations and live painting by the DopeBooking Art Gallery.",
  ),

  "art-exhibitions": page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Exhibitions",
        body: "Collaborative art galleries at festivals and cultural gatherings. Each one is a digital archive of what was made there.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("index", "art-exhibition-index"),
      section("collaborate", "cta", {
        layout: "string-art",
        heading: "Planning a festival?",
        body: "We bring complete, collaborative art experiences to events of every size.",
        primary: link("Collaborate with us", "/art-gallery/collaborate"),
        secondary: link("Meet the artists", "/art-gallery/artists"),
        image: "",
      }),
    ],
    "Art exhibitions",
    "Past, current and upcoming art galleries curated by DopeBooking at music festivals.",
  ),

  "art-artists": page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Artists",
        body: "Painters, sculptors, installation, digital and live artists who create our festival galleries.",
        primary: link(),
        secondary: link(),
        image: "",
        overlay: 55,
      }),
      builtin("index", "art-artist-index"),
      section("made-together", "art", {
        show: "collaborations",
        heading: "Made together",
        body: "Each line joins two artists who exhibited side by side or created a work together.",
        link: link(),
        secondary: link(),
        limit: 24,
      }),
    ],
    "Visual artists",
    "Visual artists of the DopeBooking Art Gallery: painting, sculpture, installation, visionary, digital and live art.",
  ),

  "art-collaborate": page(
    [
      section("hero", "hero", {
        layout: "compact",
        heading: "Collaborate with us",
        body: "For festival organisers, curators, galleries and creative partners: we bring complete, collaborative art experiences to your event.",
        primary: link("Send an inquiry", "#inquiry"),
        secondary: link("See exhibitions", "/art-gallery/exhibitions"),
        image: "",
        overlay: 55,
      }),
      section("offer", "services", {
        heading: "What we can bring",
        body: "Every gallery is designed for its festival. These are the pieces we combine.",
        layout: "rows",
        items: [
          {
            title: "Curated group exhibitions",
            body: "A themed gallery space with artists across disciplines, planned, built and hosted by our team.",
            href: "",
            image: "",
          },
          {
            title: "Installations and site art",
            body: "Large-scale sculpture, light and projection that turn paths, domes and chill-out areas into artworks.",
            href: "",
            image: "",
          },
          {
            title: "Live painting",
            body: "Artists painting through the music, on canvases that grow from the first set to the last.",
            href: "",
            image: "",
          },
          {
            title: "Talks, workshops and documentation",
            body: "Artist talks and hands-on workshops, plus photography of every work for the festival and the archive.",
            href: "",
            image: "",
          },
        ],
      }),
      section("process", "steps", {
        heading: "How a collaboration works",
        items: [
          {
            title: "Tell us about the event",
            body: "Dates, place, audience, the space you have and what you imagine. Rough ideas are fine.",
          },
          {
            title: "Concept and artists",
            body: "We reply with a concept, a proposed selection of artists and a quote.",
          },
          {
            title: "Create it together",
            body: "We plan production, travel and install with your team, and open the gallery with the festival.",
          },
        ],
      }),
      builtin("inquiry", "art-inquiry-form"),
      section("faq", "faq", {
        heading: "Questions",
        items: [
          {
            question: "What does a festival gallery include?",
            answer:
              "It depends on your space and budget: from a curated tent with a handful of artists to installations across the site, live painting during the music, and talks or workshops. We propose a concept after the first conversation.",
          },
          {
            question: "How far ahead should we get in touch?",
            answer:
              "Ideally four to six months before the event, so artists can create new work for it. Shorter timelines are possible with existing works.",
          },
          {
            question: "Can artworks be sold during the festival?",
            answer:
              "If the festival allows it, yes. Tell us in the form and we plan pricing, payment and transport with the artists.",
          },
          {
            question: "Can our own local artists take part?",
            answer:
              "Gladly. A gallery can mix artists from our Art Gallery with artists from your festival's own community.",
          },
          {
            question: "Can we invite one specific artist?",
            answer:
              "Yes. Use the button on their profile or name them in the form, and we check their availability.",
          },
        ],
      }),
    ],
    "Collaborate with the Art Gallery",
    "Bring a curated, collaborative art gallery to your festival: exhibitions, installations, live painting and workshops.",
  ),
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "DopeBooking",
    tagline: "International psytrance agency, based in Germany",
    logo: "",
  },
  announcement: {
    enabled: false,
    text: "",
    link: { label: "", href: "" },
    tone: "accent",
  },
  nav: [
    { label: "Artists", href: "/artists", children: [] },
    { label: "Events", href: "/events", children: [] },
    {
      label: "Art Gallery",
      href: "/art-gallery",
      children: [
        {
          label: "The gallery",
          href: "/art-gallery",
          description: "Concept, highlights and collaborations",
        },
        {
          label: "Exhibitions",
          href: "/art-gallery/exhibitions",
          description: "Now on view, upcoming and archive",
        },
        {
          label: "Visual artists",
          href: "/art-gallery/artists",
          description: "Painters, sculptors, installation and digital",
        },
        {
          label: "Collaborate",
          href: "/art-gallery/collaborate",
          description: "Bring a gallery to your festival",
        },
      ],
    },
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
    { label: "Music", href: "/music", children: [] },
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
          { label: "Art Gallery", href: "/art-gallery" },
          { label: "Photos", href: "/gallery" },
          { label: "Videos", href: "/videos" },
          { label: "News", href: "/news" },
        ],
      },
      {
        heading: "Work with us",
        links: [
          { label: "Festival services", href: "/services" },
          { label: "Music", href: "/music" },
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
          { label: "Music licence", href: "/legal/music-license" },
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
