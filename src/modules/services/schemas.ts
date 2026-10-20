import { z } from "zod";
import type { ServiceStatus, ServiceType } from "@/lib/supabase/database.types";
import { countrySchema, optionalText, requiredText } from "@/lib/validation";
import type { WorkflowConfig } from "@/modules/workflow/types";

// ---------------------------------------------------------------------------
// Offers and service types
// ---------------------------------------------------------------------------

export const SERVICE_LABELS: Record<ServiceType, string> = {
  promotion: "Event promotion",
  catering: "Festival catering",
  photography: "Photography",
  videography: "Videography",
  aftermovie: "Aftermovie",
};

/** Public offers; production groups the three media services. */
export const OFFERS = {
  promotion: {
    title: "Event promotion",
    eyebrow: "Promotion",
    pitch:
      "Campaigns that put your event in front of the global psytrance audience: paid social, creators, artist shout-outs, press and our own channels.",
    types: ["promotion"],
  },
  catering: {
    title: "Festival catering",
    eyebrow: "Catering",
    pitch:
      "Crew catering, artist hospitality and guest food stalls, with vegan-first menus and teams who know festival logistics.",
    types: ["catering"],
  },
  production: {
    title: "Photo, video & aftermovies",
    eyebrow: "Production",
    pitch:
      "Photographers and videographers who shoot dancefloors, not weddings. From same-day social selects to the aftermovie that sells next year's tickets.",
    types: ["photography", "videography", "aftermovie"],
  },
} as const satisfies Record<
  string,
  {
    title: string;
    eyebrow: string;
    pitch: string;
    types: readonly ServiceType[];
  }
>;

export type Offer = keyof typeof OFFERS;

export function isOffer(value: unknown): value is Offer {
  return typeof value === "string" && value in OFFERS;
}

// ---------------------------------------------------------------------------
// Type-specific questions, declared once for form, validation and display
// ---------------------------------------------------------------------------

type Options = Record<string, string>;
export type DetailField =
  | { name: string; label: string; kind: "text"; max: number; hint?: string }
  | { name: string; label: string; kind: "url"; hint?: string }
  | { name: string; label: string; kind: "date"; hint?: string }
  | {
      name: string;
      label: string;
      kind: "number";
      min: number;
      max: number;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      kind: "select";
      options: Options;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      kind: "multi";
      options: Options;
      required?: boolean;
      hint?: string;
    }
  | { name: string; label: string; kind: "yesno"; hint?: string };

const DIETARY = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  gluten_free: "Gluten-free",
  halal: "Halal",
  kosher: "Kosher",
  nut_free: "Nut-free",
};

export const DETAIL_FIELDS: Record<ServiceType, DetailField[]> = {
  promotion: [
    {
      name: "channels",
      label: "Channels",
      kind: "multi",
      required: true,
      options: {
        social_ads: "Paid social ads",
        creators: "Instagram / TikTok creators",
        artist_posts: "Artist shout-outs",
        newsletter: "DopeBooking newsletter",
        press: "Press & blogs",
        posters: "Posters & flyers",
      },
    },
    { name: "campaign_start", label: "Campaign start", kind: "date" },
    {
      name: "target_regions",
      label: "Where is your audience?",
      kind: "text",
      max: 200,
      hint: "Countries or cities to reach.",
    },
    { name: "event_url", label: "Event or ticket page", kind: "url" },
    {
      name: "ticket_goal",
      label: "Ticket sales goal",
      kind: "number",
      min: 1,
      max: 1_000_000,
    },
  ],
  catering: [
    {
      name: "service_style",
      label: "What do you need?",
      kind: "multi",
      required: true,
      options: {
        crew: "Crew catering",
        artist: "Artist hospitality",
        stalls: "Food stalls for guests",
        bar: "Bar / chai shop",
      },
    },
    {
      name: "people_per_meal",
      label: "People per meal",
      kind: "number",
      min: 1,
      max: 100_000,
    },
    {
      name: "meals_per_day",
      label: "Meals per day",
      kind: "number",
      min: 1,
      max: 10,
    },
    {
      name: "dietary",
      label: "Dietary needs",
      kind: "multi",
      options: DIETARY,
    },
    { name: "power_water", label: "Power and water on site?", kind: "yesno" },
  ],
  photography: [
    {
      name: "photographers",
      label: "Photographers",
      kind: "number",
      min: 1,
      max: 20,
    },
    {
      name: "hours_per_day",
      label: "Hours per day",
      kind: "number",
      min: 1,
      max: 24,
    },
    {
      name: "deliverables",
      label: "Deliverables",
      kind: "select",
      options: {
        highlights: "~50 edited highlights per day",
        full_set: "Full edited set",
        same_day: "Same-day social selects + full set",
      },
    },
    {
      name: "usage",
      label: "How will you use the photos?",
      kind: "multi",
      options: {
        social: "Social media",
        press: "Press",
        commercial: "Ads / commercial",
      },
    },
  ],
  videography: [
    {
      name: "videographers",
      label: "Videographers",
      kind: "number",
      min: 1,
      max: 20,
    },
    {
      name: "hours_per_day",
      label: "Hours per day",
      kind: "number",
      min: 1,
      max: 24,
    },
    {
      name: "deliverables",
      label: "Deliverables",
      kind: "multi",
      required: true,
      options: {
        highlight_reel: "Highlight reel",
        dj_sets: "Full DJ set recordings",
        social_clips: "Social clips",
        livestream: "Livestream",
      },
    },
    { name: "drone", label: "Drone footage?", kind: "yesno" },
  ],
  aftermovie: [
    {
      name: "target_length",
      label: "Length",
      kind: "select",
      options: {
        short: "1–2 minutes",
        standard: "3–5 minutes",
        long: "10+ minutes",
      },
    },
    {
      name: "delivery_weeks",
      label: "Deliver within (weeks after the event)",
      kind: "number",
      min: 1,
      max: 26,
    },
    {
      name: "music",
      label: "Music",
      kind: "select",
      options: {
        have_track: "We have a licensed track",
        artist_track: "Use a lineup artist's track",
        need_help: "Help us license music",
      },
    },
    { name: "drone", label: "Drone footage?", kind: "yesno" },
  ],
};

function fieldSchema(field: DetailField) {
  const empty = (value: string) => value === "";
  switch (field.kind) {
    case "text":
      return optionalText(field.max);
    case "url":
      return z
        .string()
        .trim()
        .max(500)
        .refine(
          (value) =>
            empty(value) ||
            z.url({ protocol: /^https$/ }).safeParse(value).success,
          { message: "Use a full https:// link." },
        )
        .transform((value) => (empty(value) ? null : value));
    case "date":
      return z
        .string()
        .refine((value) => empty(value) || /^\d{4}-\d{2}-\d{2}$/.test(value), {
          message: "Choose a date.",
        })
        .transform((value) => (empty(value) ? null : value));
    case "number":
      return z
        .string()
        .trim()
        .transform((value) => (empty(value) ? null : Number(value)))
        .refine(
          (value) =>
            value === null ||
            (Number.isInteger(value) &&
              value >= field.min &&
              value <= field.max),
          { message: `Use a whole number from ${field.min} to ${field.max}.` },
        );
    case "select":
      return z
        .string()
        .refine((value) => empty(value) || value in field.options, {
          message: "Choose an option.",
        })
        .transform((value) => (empty(value) ? null : value));
    case "multi": {
      const list = z.array(
        z.string().refine((value) => value in field.options, {
          message: "Choose from the list.",
        }),
      );
      return field.required ? list.min(1, "Choose at least one.") : list;
    }
    case "yesno":
      return z
        .enum(["", "yes", "no"])
        .transform((value) => (value === "" ? null : value === "yes"));
  }
}

export function detailsSchema(type: ServiceType) {
  return z.object(
    Object.fromEntries(
      DETAIL_FIELDS[type].map((field) => [field.name, fieldSchema(field)]),
    ),
  );
}

/** Reads one service type's answers from FormData (prefixed `d.`). */
export function readDetails(type: ServiceType, formData: FormData) {
  return Object.fromEntries(
    DETAIL_FIELDS[type].map((field) => [
      field.name,
      field.kind === "multi"
        ? formData.getAll(`d.${field.name}`).map(String)
        : String(formData.get(`d.${field.name}`) ?? ""),
    ]),
  );
}

/** Human-readable answers for summaries: [label, value] pairs. */
export function describeDetails(
  type: ServiceType,
  details: Record<string, unknown>,
): [string, string][] {
  return DETAIL_FIELDS[type].flatMap((field): [string, string][] => {
    const value = details[field.name];
    if (value === null || value === undefined || value === "") return [];
    if (Array.isArray(value)) {
      if (!value.length) return [];
      const options: Options = "options" in field ? field.options : {};
      return [
        [
          field.label,
          value.map((item) => options[String(item)] ?? String(item)).join(", "),
        ],
      ];
    }
    if (typeof value === "boolean")
      return [[field.label, value ? "Yes" : "No"]];
    if (field.kind === "select") {
      return [[field.label, field.options[String(value)] ?? String(value)]];
    }
    return [[field.label, String(value)]];
  });
}

// ---------------------------------------------------------------------------
// Request (common fields)
// ---------------------------------------------------------------------------

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= min && value <= max),
      { message },
    );

const isoDate = (message: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const serviceRequestSchema = z
  .object({
    service_type: z.enum(Object.keys(SERVICE_LABELS) as [ServiceType]),
    event_name: requiredText("event name", 160),
    organisation: optionalText(160),
    event_start: isoDate("Choose the start date.").refine(
      (value) => value >= new Date().toISOString().slice(0, 10),
      { message: "The date must be today or later." },
    ),
    event_end: z
      .string()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: "Choose the end date.",
      })
      .transform((value) => (value === "" ? null : value)),
    city: requiredText("city", 80),
    country: countrySchema.refine((value) => value !== null, {
      message: "Choose a country.",
    }),
    venue_name: optionalText(160),
    expected_attendance: optionalInt(1, 1_000_000, "Use a whole number."),
    budget_amount: optionalInt(0, 100_000_000, "Use a whole amount."),
    budget_currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Choose a currency."),
    message: optionalText(4000),
    contact_phone: z
      .string()
      .trim()
      .max(32)
      .refine((value) => value === "" || /^\+?[0-9 ()-]{6,}$/.test(value), {
        message: "Use digits, spaces and an optional leading +.",
      })
      .transform((value) => (value === "" ? null : value)),
  })
  .refine((data) => !data.event_end || data.event_end >= data.event_start, {
    message: "The end must be on or after the start.",
    path: ["event_end"],
  });

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  quoted: "Quote sent",
  accepted: "Quote accepted",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const SERVICE_WORKFLOW: WorkflowConfig<ServiceStatus> = {
  labels: SERVICE_STATUS_LABELS,
  tones: {
    submitted: "neutral",
    under_review: "uv",
    quoted: "accent",
    accepted: "accent",
    confirmed: "success",
    completed: "muted",
    declined: "danger",
    cancelled: "muted",
    expired: "muted",
  },
  actions: {
    under_review: "Start review",
    quoted: "Send quote",
    confirmed: "Confirm",
    completed: "Mark completed",
    declined: "Decline",
    cancelled: "Cancel",
    expired: "Mark expired",
  },
};

/** Mirror of public.transition_service_request() (the database decides). */
export const SERVICE_STAFF_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> =
  {
    submitted: ["under_review", "declined"],
    under_review: ["quoted", "declined"],
    quoted: ["quoted", "confirmed", "declined", "expired"],
    accepted: ["quoted", "confirmed", "declined"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    declined: [],
    cancelled: [],
    expired: [],
  };

export const SERVICE_OPEN_STATUSES: ServiceStatus[] = [
  "submitted",
  "under_review",
  "quoted",
  "accepted",
];

export const providerSchema = z.object({
  name: requiredText("name", 160),
  services: z
    .array(z.enum(Object.keys(SERVICE_LABELS) as [ServiceType]))
    .min(1, "Choose at least one service."),
  contact_name: optionalText(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email address.",
    })
    .transform((value) => (value === "" ? null : value)),
  phone: optionalText(32),
  regions: optionalText(300),
  website: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        value === "" || z.url({ protocol: /^https$/ }).safeParse(value).success,
      { message: "Use a full https:// link." },
    )
    .transform((value) => (value === "" ? null : value)),
  notes: optionalText(4000),
  active: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((value) => value === "on"),
});
