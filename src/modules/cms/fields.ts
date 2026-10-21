import { BUILTIN_BLOCKS, SOCIAL_PLATFORMS, type SectionType } from "./schema";

/*
 * What the admin editor shows for each section type. The schema in
 * schema.ts is the source of truth for validation; these specs only drive
 * the form. Names are dot paths into the section content.
 */

type Base = {
  name: string;
  label: string;
  hint?: string;
  /** Only show when another field (same level) has one of these values. */
  when?: { field: string; is: string[] };
};

export type FieldSpec =
  | (Base & { kind: "text"; long?: boolean; max: number })
  | (Base & { kind: "link" })
  | (Base & { kind: "select"; options: Record<string, string> })
  | (Base & { kind: "number"; min: number; max: number })
  | (Base & { kind: "toggle" })
  | (Base & { kind: "image" })
  | (Base & { kind: "images"; max: number })
  | (Base & { kind: "artists" })
  | (Base & { kind: "category" })
  | (Base & { kind: "strings"; max: number })
  | (Base & {
      kind: "list";
      itemLabel: string;
      titleField: string;
      max: number;
      fields: FieldSpec[];
      empty: Record<string, unknown>;
    });

const heading = (label = "Heading"): FieldSpec => ({
  kind: "text",
  name: "heading",
  label,
  max: 120,
});
const intro: FieldSpec = {
  kind: "text",
  name: "body",
  label: "Intro text",
  long: true,
  max: 400,
};
const sectionLink: FieldSpec = {
  kind: "link",
  name: "link",
  label: "Link next to the heading",
  hint: "Leave empty for no link.",
};

export const SECTION_INFO: Record<
  SectionType,
  { label: string; description: string; addable: boolean }
> = {
  hero: {
    label: "Hero banner",
    description: "Large opening headline with a photo or the string-art star.",
    addable: true,
  },
  artists: {
    label: "Artists",
    description: "Featured, all or hand-picked artists from the roster.",
    addable: true,
  },
  events: {
    label: "Events",
    description: "Upcoming or past events as a showcase or a list.",
    addable: true,
  },
  gallery: {
    label: "Photo gallery",
    description: "Photos from the media library in a mosaic or filmstrip.",
    addable: true,
  },
  videos: {
    label: "Videos",
    description: "Latest published videos.",
    addable: true,
  },
  products: {
    label: "Products",
    description: "Featured, latest or one category from the shop.",
    addable: true,
  },
  services: {
    label: "Services",
    description: "A set of services with text, image and link.",
    addable: true,
  },
  editorial: {
    label: "Text and image",
    description: "A story block: heading, paragraphs and a photo.",
    addable: true,
  },
  packages: {
    label: "Packages",
    description: "Service packages with price, features and a button.",
    addable: true,
  },
  stats: {
    label: "Key facts",
    description: "Up to six big figures with labels. Use only true facts.",
    addable: true,
  },
  steps: {
    label: "Steps",
    description: "A numbered process, e.g. how booking works.",
    addable: true,
  },
  cta: {
    label: "Call to action",
    description: "A closing banner with one or two buttons.",
    addable: true,
  },
  portfolio: {
    label: "Portfolio",
    description: "Work samples or people with photo, role and text.",
    addable: true,
  },
  faq: {
    label: "Questions and answers",
    description: "Expandable questions.",
    addable: true,
  },
  contact: {
    label: "Contact",
    description: "Email, phone and a button.",
    addable: true,
  },
  builtin: {
    label: "Built-in block",
    description: "A working part of this page, like a form or directory.",
    addable: false,
  },
};

export const SECTION_FIELDS: Record<SectionType, FieldSpec[]> = {
  hero: [
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: {
        image: "Full-screen photo",
        split: "Text beside a photo",
        "string-art": "String-art star (no photo)",
        compact: "Compact page header",
      },
      hint: "Photo layouts fall back to the string-art star until a photo is chosen.",
    },
    { kind: "text", name: "heading", label: "Headline", max: 140 },
    { kind: "text", name: "body", label: "Text", long: true, max: 400 },
    { kind: "link", name: "primary", label: "Main button" },
    { kind: "link", name: "secondary", label: "Second button" },
    { kind: "image", name: "image", label: "Photo" },
    {
      kind: "number",
      name: "overlay",
      label: "Darken the photo (0–90%)",
      min: 0,
      max: 90,
      hint: "Higher keeps the headline readable on bright photos.",
      when: { field: "layout", is: ["image"] },
    },
  ],
  artists: [
    heading(),
    intro,
    sectionLink,
    {
      kind: "select",
      name: "source",
      label: "Which artists",
      options: {
        featured: "Featured artists",
        all: "All published artists",
        pick: "Choose artists",
      },
    },
    {
      kind: "artists",
      name: "artistIds",
      label: "Artists",
      when: { field: "source", is: ["pick"] },
    },
    { kind: "number", name: "limit", label: "How many", min: 1, max: 24 },
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: {
        editorial: "Editorial: one large, others smaller",
        grid: "Even grid",
      },
    },
  ],
  events: [
    heading(),
    intro,
    sectionLink,
    {
      kind: "select",
      name: "when",
      label: "Which events",
      options: { upcoming: "Upcoming", past: "Past" },
    },
    { kind: "number", name: "limit", label: "How many", min: 1, max: 12 },
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: { showcase: "Showcase with large photos", list: "Compact list" },
    },
  ],
  gallery: [
    heading(),
    intro,
    sectionLink,
    { kind: "images", name: "images", label: "Photos", max: 24 },
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: { mosaic: "Mosaic", filmstrip: "Filmstrip (scrolls sideways)" },
    },
  ],
  videos: [
    heading(),
    intro,
    sectionLink,
    { kind: "number", name: "limit", label: "How many", min: 1, max: 6 },
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: { feature: "One large, others beside it", grid: "Even grid" },
    },
  ],
  products: [
    heading(),
    intro,
    sectionLink,
    {
      kind: "select",
      name: "source",
      label: "Which products",
      options: {
        featured: "Featured products",
        latest: "Latest products",
        category: "One category",
      },
      hint: "Feature products under Admin, Products.",
    },
    {
      kind: "category",
      name: "categorySlug",
      label: "Category",
      when: { field: "source", is: ["category"] },
    },
    { kind: "number", name: "limit", label: "How many", min: 1, max: 12 },
  ],
  services: [
    heading(),
    intro,
    {
      kind: "select",
      name: "layout",
      label: "Layout",
      options: { tiles: "Tiles with photos", rows: "Rows" },
    },
    {
      kind: "list",
      name: "items",
      label: "Services",
      itemLabel: "service",
      titleField: "title",
      max: 12,
      empty: { title: "New service", body: "", href: "", image: "" },
      fields: [
        { kind: "text", name: "title", label: "Name", max: 80 },
        { kind: "text", name: "body", label: "Text", long: true, max: 400 },
        {
          kind: "text",
          name: "href",
          label: "Link",
          max: 500,
          hint: "A site path like /services/catering, or empty.",
        },
        { kind: "image", name: "image", label: "Photo" },
      ],
    },
  ],
  editorial: [
    heading(),
    {
      kind: "text",
      name: "body",
      label: "Text",
      long: true,
      max: 3000,
      hint: "Leave an empty line between paragraphs.",
    },
    { kind: "image", name: "image", label: "Photo" },
    {
      kind: "select",
      name: "imageSide",
      label: "Photo side",
      options: { right: "Right", left: "Left" },
    },
    { kind: "link", name: "link", label: "Button" },
  ],
  packages: [
    heading(),
    intro,
    {
      kind: "list",
      name: "items",
      label: "Packages",
      itemLabel: "package",
      titleField: "name",
      max: 6,
      empty: {
        name: "New package",
        price: "",
        summary: "",
        features: [],
        cta: { label: "", href: "" },
        highlighted: false,
      },
      fields: [
        { kind: "text", name: "name", label: "Name", max: 60 },
        {
          kind: "text",
          name: "price",
          label: "Price",
          max: 40,
          hint: "E.g. “From €900” or “Quote on request”.",
        },
        {
          kind: "text",
          name: "summary",
          label: "Summary",
          long: true,
          max: 300,
        },
        {
          kind: "strings",
          name: "features",
          label: "What's included",
          max: 12,
          hint: "One item per line.",
        },
        { kind: "link", name: "cta", label: "Button" },
        {
          kind: "toggle",
          name: "highlighted",
          label: "Highlight this package",
        },
      ],
    },
  ],
  stats: [
    heading(),
    intro,
    {
      kind: "list",
      name: "items",
      label: "Facts",
      itemLabel: "fact",
      titleField: "value",
      max: 6,
      empty: { value: "", label: "" },
      fields: [
        { kind: "text", name: "value", label: "Figure", max: 24 },
        { kind: "text", name: "label", label: "Label", max: 80 },
      ],
    },
  ],
  steps: [
    heading(),
    {
      kind: "list",
      name: "items",
      label: "Steps",
      itemLabel: "step",
      titleField: "title",
      max: 6,
      empty: { title: "New step", body: "" },
      fields: [
        { kind: "text", name: "title", label: "Title", max: 80 },
        { kind: "text", name: "body", label: "Text", long: true, max: 300 },
      ],
    },
  ],
  cta: [
    {
      kind: "select",
      name: "layout",
      label: "Background",
      options: { "string-art": "String-art star", image: "Photo" },
    },
    heading(),
    { kind: "text", name: "body", label: "Text", long: true, max: 400 },
    { kind: "link", name: "primary", label: "Main button" },
    { kind: "link", name: "secondary", label: "Second button" },
    {
      kind: "image",
      name: "image",
      label: "Photo",
      when: { field: "layout", is: ["image"] },
    },
  ],
  portfolio: [
    heading(),
    intro,
    {
      kind: "list",
      name: "items",
      label: "Items",
      itemLabel: "item",
      titleField: "name",
      max: 12,
      empty: { name: "New item", role: "", body: "", image: "", href: "" },
      fields: [
        { kind: "text", name: "name", label: "Name", max: 80 },
        { kind: "text", name: "role", label: "Role or type", max: 80 },
        { kind: "text", name: "body", label: "Text", long: true, max: 400 },
        { kind: "image", name: "image", label: "Photo" },
        { kind: "text", name: "href", label: "Link (optional)", max: 500 },
      ],
    },
  ],
  faq: [
    heading(),
    {
      kind: "list",
      name: "items",
      label: "Questions",
      itemLabel: "question",
      titleField: "question",
      max: 20,
      empty: { question: "New question", answer: "Answer" },
      fields: [
        { kind: "text", name: "question", label: "Question", max: 200 },
        {
          kind: "text",
          name: "answer",
          label: "Answer",
          long: true,
          max: 1500,
        },
      ],
    },
  ],
  contact: [
    heading(),
    { kind: "text", name: "body", label: "Text", long: true, max: 600 },
    { kind: "text", name: "email", label: "Email", max: 254 },
    { kind: "text", name: "phone", label: "Phone", max: 40 },
    { kind: "link", name: "primary", label: "Button" },
  ],
  builtin: [],
};

export const BUILTIN_INFO = BUILTIN_BLOCKS;

export const SEO_FIELDS: FieldSpec[] = [
  {
    kind: "text",
    name: "title",
    label: "Search title",
    max: 70,
    hint: "Shown in browser tabs and search results. Empty uses the page name.",
  },
  {
    kind: "text",
    name: "description",
    label: "Search description",
    long: true,
    max: 200,
  },
  { kind: "image", name: "image", label: "Share image" },
];

const navLinkFields: FieldSpec[] = [
  { kind: "text", name: "label", label: "Label", max: 40 },
  { kind: "text", name: "href", label: "Link", max: 500 },
];

export const SETTINGS_FIELDS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "Brand",
    fields: [
      { kind: "text", name: "brand.name", label: "Site name", max: 60 },
      { kind: "text", name: "brand.tagline", label: "Tagline", max: 160 },
    ],
  },
  {
    title: "Main menu",
    fields: [
      {
        kind: "list",
        name: "nav",
        label: "Menu items",
        itemLabel: "menu item",
        titleField: "label",
        max: 8,
        empty: { label: "New item", href: "/", children: [] },
        fields: [
          ...navLinkFields,
          {
            kind: "list",
            name: "children",
            label: "Dropdown links",
            itemLabel: "dropdown link",
            titleField: "label",
            max: 8,
            empty: { label: "New link", href: "/", description: "" },
            fields: [
              ...navLinkFields,
              {
                kind: "text",
                name: "description",
                label: "Short description",
                max: 120,
              },
            ],
          },
        ],
      },
      { kind: "link", name: "cta", label: "Header button" },
    ],
  },
  {
    title: "Footer",
    fields: [
      {
        kind: "text",
        name: "footer.blurb",
        label: "About text",
        long: true,
        max: 400,
      },
      {
        kind: "list",
        name: "footer.columns",
        label: "Link columns",
        itemLabel: "column",
        titleField: "heading",
        max: 5,
        empty: { heading: "New column", links: [] },
        fields: [
          { kind: "text", name: "heading", label: "Column heading", max: 40 },
          {
            kind: "list",
            name: "links",
            label: "Links",
            itemLabel: "link",
            titleField: "label",
            max: 10,
            empty: { label: "New link", href: "/" },
            fields: navLinkFields,
          },
        ],
      },
      { kind: "text", name: "footer.note", label: "Small print", max: 300 },
    ],
  },
  {
    title: "Contact and social",
    fields: [
      { kind: "text", name: "contact.email", label: "Email", max: 254 },
      { kind: "text", name: "contact.phone", label: "Phone", max: 40 },
      {
        kind: "text",
        name: "contact.address",
        label: "Address",
        long: true,
        max: 300,
      },
      {
        kind: "list",
        name: "socials",
        label: "Social links",
        itemLabel: "social link",
        titleField: "platform",
        max: 10,
        empty: { platform: "instagram", url: "https://" },
        fields: [
          {
            kind: "select",
            name: "platform",
            label: "Platform",
            options: SOCIAL_PLATFORMS,
          },
          { kind: "text", name: "url", label: "Link", max: 300 },
        ],
      },
    ],
  },
  {
    title: "Search and sharing defaults",
    fields: [
      { kind: "text", name: "seo.title", label: "Site title", max: 70 },
      {
        kind: "text",
        name: "seo.description",
        label: "Description",
        long: true,
        max: 200,
      },
      { kind: "image", name: "seo.image", label: "Default share image" },
    ],
  },
  {
    title: "Demo content",
    fields: [
      {
        kind: "toggle",
        name: "showDemoLabels",
        label: "Show a “Demo” label on sample artists, events and products",
      },
    ],
  },
];
