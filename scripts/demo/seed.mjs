// Seeds demonstration content: artists, events, galleries, a house shop with
// products, media-library artwork and published page layouts.
//
//   node --env-file=.env.local scripts/demo/seed.mjs
//
// Every record is flagged is_demo and every image is original generated
// artwork (scripts/demo/art.mjs) credited "Demo artwork". Re-running the
// script removes the previous demo records first. Remove all demo content
// from Admin, Demo content.

import { createClient } from "@supabase/supabase-js";
import * as art from "./art.mjs";
import { DEFAULT_PAGES, PAGES } from "../../src/modules/cms/pages.ts";
import { parsePageContent } from "../../src/modules/cms/schema.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (.env.local).",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "public-media";
const CREDIT = "Demo artwork";

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

// ---------------------------------------------------------------------------
// Cleanup of an earlier run
// ---------------------------------------------------------------------------

async function cleanup() {
  const ids = async (table) =>
    (
      must(await db.from(table).select("id").eq("is_demo", true), table) ?? []
    ).map((row) => row.id);
  const [artists, events, galleries, products, sellers] = await Promise.all([
    ids("artists"),
    ids("events"),
    ids("galleries"),
    ids("products"),
    ids("sellers"),
  ]);
  const media = must(
    await db
      .from("media_assets")
      .select(
        "storage_path, artist_id, event_id, gallery_id, product_id, seller_id, is_demo",
      ),
    "media",
  ).filter(
    (row) =>
      row.is_demo ||
      artists.includes(row.artist_id) ||
      events.includes(row.event_id) ||
      galleries.includes(row.gallery_id) ||
      products.includes(row.product_id) ||
      sellers.includes(row.seller_id),
  );
  const paths = media.map((row) => row.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
  }
  for (const table of [
    "products",
    "galleries",
    "events",
    "artists",
    "product_categories",
    "sellers",
  ]) {
    must(await db.from(table).delete().eq("is_demo", true), `delete ${table}`);
  }
  must(
    await db.from("media_assets").delete().eq("is_demo", true),
    "delete library",
  );
  console.log(`Removed earlier demo content (${paths.length} files).`);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

async function upload(path, buffer) {
  must(
    await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    }),
    `upload ${path}`,
  );
  const meta = await (await import("sharp")).default(buffer).metadata();
  return { path, width: meta.width, height: meta.height };
}

async function ownedImage(owner, ownerId, name, buffer, alt, sort = 0) {
  const folder = {
    artist_id: "artists",
    event_id: "events",
    gallery_id: "galleries",
    product_id: "products",
    seller_id: "sellers",
  }[owner];
  const file = await upload(`${folder}/${ownerId}/demo-${name}.webp`, buffer);
  const row = must(
    await db
      .from("media_assets")
      .insert({
        [owner]: ownerId,
        storage_path: file.path,
        alt_text: alt,
        credit: CREDIT,
        width: file.width,
        height: file.height,
        sort_order: sort,
        is_demo: true,
      })
      .select("id")
      .single(),
    `media ${name}`,
  );
  return row.id;
}

async function libraryImage(name, buffer, alt, focal = [50, 50]) {
  const file = await upload(`library/site/demo-${name}.webp`, buffer);
  const row = must(
    await db
      .from("media_assets")
      .insert({
        library: "site",
        storage_path: file.path,
        alt_text: alt,
        credit: CREDIT,
        width: file.width,
        height: file.height,
        focal_x: focal[0],
        focal_y: focal[1],
        is_demo: true,
      })
      .select("id")
      .single(),
    `library ${name}`,
  );
  return row.id;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const ARTISTS = [
  {
    slug: "kelvin-moth",
    stage_name: "Kelvin Moth",
    country: "DE",
    based_in: "Berlin",
    genres: ["progressive", "psychedelic"],
    featured: true,
    tagline: "Patient progressive builds for sunrise slots.",
    bio: "Kelvin Moth plays long, patient progressive sets that grow from deep, rolling grooves into bright melodic peaks.\n\nThe sets are made for sunrise slots and open-air stages where the crowd has time to settle in and travel with the music.",
    booking:
      "Set length: 90 to 150 minutes\nTravels from Berlin, Germany\nAvailable for festivals and club nights",
    art: { palette: "dawn", pose: "raise", hair: "short" },
  },
  {
    slug: "saffron-circuit",
    stage_name: "Saffron Circuit",
    country: "IN",
    based_in: "Goa",
    genres: ["goa", "full-on"],
    featured: true,
    tagline: "Classic Goa leads over a modern low end.",
    bio: "Saffron Circuit brings acid lines and melodic Goa leads back to the dancefloor, carried by a tight, modern full-on bass.\n\nExpect hands in the air, long breakdowns and the warmth of the old-school sound.",
    booking:
      "Set length: 90 to 120 minutes\nTravels from Goa, India\nLive act with own controller setup",
    art: { palette: "night", pose: "both", hair: "long" },
  },
  {
    slug: "mirrorleaf",
    stage_name: "Mirrorleaf",
    country: "PT",
    based_in: "Lisbon",
    genres: ["forest", "twilight"],
    featured: true,
    tagline: "Forest textures and hypnotic bass for late-night floors.",
    bio: "Mirrorleaf builds organic, textured soundscapes over a hypnotic rolling bass, made for the hours after midnight.\n\nSets move between twilight grooves and deeper forest sounds, reading the floor as the night goes on.",
    booking:
      "Set length: 120 minutes\nTravels from Lisbon, Portugal\nPrefers night slots",
    art: { palette: "twilight", pose: "down", hair: "bun" },
  },
  {
    slug: "nightjar-protocol",
    stage_name: "Nightjar Protocol",
    country: "IL",
    based_in: "Tel Aviv",
    genres: ["full-on", "hi-tech"],
    featured: true,
    tagline: "Precise full-on for peak time.",
    bio: "Nightjar Protocol plays tight, high-energy full-on that edges into hi-tech when the floor is ready.\n\nThe sets are built for main stages at peak time.",
    booking:
      "Set length: 75 to 90 minutes\nTravels from Tel Aviv, Israel\nAvailable worldwide",
    art: { palette: "ultraviolet", pose: "raise", hair: "cap" },
  },
  {
    slug: "tidal-lotus",
    stage_name: "Tidal Lotus",
    country: "BR",
    based_in: "Florianópolis",
    genres: ["progressive", "psybient"],
    featured: false,
    tagline: "Melodic progressive and ambient journeys.",
    bio: "Tidal Lotus moves between melodic progressive and slow psybient, often closing a festival or opening a chill-out stage.\n\nThe sets are calm, warm and built around long melodic lines.",
    booking:
      "Set length: 90 to 180 minutes\nTravels from Florianópolis, Brazil\nAmbient and chill-out sets on request",
    art: { palette: "dawn", pose: "down", hair: "long" },
  },
  {
    slug: "ochre-signal",
    stage_name: "Ochre Signal",
    country: "GR",
    based_in: "Athens",
    genres: ["psy-techno", "minimal"],
    featured: false,
    tagline: "Hypnotic psy-techno with a minimal edge.",
    bio: "Ochre Signal plays stripped-back psy-techno, minimal and hypnotic, for warehouse nights and second stages.\n\nFew elements, long blends and a steady pulse.",
    booking:
      "Set length: 120 to 180 minutes\nTravels from Athens, Greece\nClub and festival bookings",
    art: { palette: "night", pose: "down", hair: "short" },
  },
  {
    slug: "vanta-bloom",
    stage_name: "Vanta Bloom",
    country: "MX",
    based_in: "Mexico City",
    genres: ["dark", "forest"],
    featured: false,
    tagline: "Dark, organic night music.",
    bio: "Vanta Bloom plays dark, organic psytrance for the deep hours of the night, with strange textures and a relentless groove.\n\nBest in the forest, after 2 am.",
    booking:
      "Set length: 90 to 120 minutes\nTravels from Mexico City, Mexico\nNight slots only",
    art: { palette: "ultraviolet", pose: "both", hair: "bun" },
  },
  {
    slug: "solenoid-garden",
    stage_name: "Solenoid Garden",
    country: "JP",
    based_in: "Tokyo",
    genres: ["twilight", "zenonesque"],
    featured: false,
    tagline: "Twilight grooves and zenonesque detail.",
    bio: "Solenoid Garden plays detailed, groove-led twilight and zenonesque sets with lots of small rhythmic surprises.\n\nMade for the hours between the night and the morning.",
    booking:
      "Set length: 120 minutes\nTravels from Tokyo, Japan\nAvailable for Asia and Europe tours",
    art: { palette: "twilight", pose: "raise", hair: "cap" },
  },
];

// Festivals use summer dates; the club night stays a few weeks ahead.
const days = (n, from) =>
  new Date(
    (typeof from === "string" ? Date.parse(`${from}T00:00:00Z`) : Date.now()) +
      n * 86400000,
  );
const at = (date, hour) => {
  const d = new Date(date);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

const EVENTS = [
  {
    slug: "moth-and-moon-night",
    title: "Moth & Moon Night",
    start: 40,
    length: 0,
    hour: 21,
    end: 6,
    venue_name: "Hall Nine",
    city: "Berlin",
    country: "DE",
    timezone: "Europe/Berlin",
    summary:
      "A club night from dusk to morning with progressive and twilight sets.",
    description:
      "One room, one long night. Moth & Moon Night starts with deep progressive and moves into twilight grooves as the night goes on.\n\nDoors open at 22:00. Ends when the sun is up.",
    lineup: ["kelvin-moth", "solenoid-garden", "ochre-signal"],
    art: { palette: "ultraviolet", seed: 201 },
  },
  {
    slug: "lumen-valley-open-air",
    title: "Lumen Valley Open Air",
    start: "2027-06-24",
    length: 2,
    hour: 14,
    end: 22,
    venue_name: "Lumen Valley",
    city: "Leipzig",
    country: "DE",
    timezone: "Europe/Berlin",
    summary: "Three days of progressive and full-on in a forest valley.",
    description:
      "Three days in a forest valley, with a main stage, a forest floor and a chill-out dome by the lake.\n\nCamping on site, food from vegan-first stalls, and sunrise sets every morning.",
    lineup: [
      "nightjar-protocol",
      "saffron-circuit",
      "mirrorleaf",
      "kelvin-moth",
      "tidal-lotus",
    ],
    art: { palette: "night", seed: 202 },
  },
  {
    slug: "tidewater-gathering",
    title: "Tidewater Gathering",
    start: "2027-08-12",
    length: 3,
    hour: 12,
    end: 20,
    venue_name: "Tidewater Beach",
    city: "Sesimbra",
    country: "PT",
    timezone: "Europe/Lisbon",
    summary:
      "A gathering by the ocean, from sunrise progressive to night-time forest.",
    description:
      "Four days by the ocean with two stages, a market and workshops.\n\nThe beach stage runs from sunrise to sunset; the forest stage takes over at night.",
    lineup: ["tidal-lotus", "mirrorleaf", "vanta-bloom", "saffron-circuit"],
    art: { palette: "dawn", seed: 203, sun: true },
  },
  {
    slug: "orbit-forest-festival-2026",
    title: "Orbit Forest Festival 2026",
    start: "2026-08-20",
    length: 2,
    hour: 15,
    end: 23,
    venue_name: "Orbit Forest",
    city: "Ioannina",
    country: "GR",
    timezone: "Europe/Athens",
    summary: "Three days in the mountains with forest, full-on and twilight.",
    description:
      "A mountain forest, two stages and three nights of music.\n\nPhotos from the weekend are in the gallery.",
    lineup: [
      "vanta-bloom",
      "nightjar-protocol",
      "ochre-signal",
      "solenoid-garden",
    ],
    art: { palette: "twilight", seed: 204 },
  },
];

async function seedArtists() {
  const bySlug = {};
  for (const [index, a] of ARTISTS.entries()) {
    const artist = must(
      await db
        .from("artists")
        .insert({
          slug: a.slug,
          stage_name: a.stage_name,
          tagline: a.tagline,
          bio: a.bio,
          country: a.country,
          based_in: a.based_in,
          genres: a.genres,
          status: "published",
          featured: a.featured,
          sort_order: index,
          booking_info: a.booking,
          is_demo: true,
        })
        .select("id")
        .single(),
      `artist ${a.slug}`,
    );
    const portrait = await ownedImage(
      "artist_id",
      artist.id,
      "portrait",
      await art.djPortrait({ seed: 300 + index, ...a.art }),
      `Illustration of ${a.stage_name} as a backlit DJ silhouette in front of a string-art installation`,
    );
    const cover = await ownedImage(
      "artist_id",
      artist.id,
      "cover",
      await art.festivalScene({
        seed: 400 + index,
        palette: a.art.palette,
        sun: a.art.palette === "dawn",
        stageX: 0.35 + (index % 3) * 0.15,
      }),
      `Illustration of an open-air stage with lasers, used as the cover for ${a.stage_name}`,
      1,
    );
    must(
      await db
        .from("artists")
        .update({ portrait_asset_id: portrait, cover_asset_id: cover })
        .eq("id", artist.id),
      "artist images",
    );
    bySlug[a.slug] = artist.id;
    console.log(`Artist ${a.stage_name}`);
  }
  return bySlug;
}

async function seedEvents(artistIds) {
  const bySlug = {};
  for (const e of EVENTS) {
    const startDate =
      typeof e.start === "string" ? days(0, e.start) : days(e.start);
    const endDate =
      typeof e.start === "string"
        ? days(e.length, e.start)
        : days(e.start + e.length);
    const event = must(
      await db
        .from("events")
        .insert({
          slug: e.slug,
          title: e.title,
          summary: e.summary,
          description: e.description,
          starts_at: at(startDate, e.hour),
          ends_at: at(endDate, e.length === 0 ? e.end + 24 : e.end),
          timezone: e.timezone,
          venue_name: e.venue_name,
          city: e.city,
          country: e.country,
          status: "published",
          featured: startDate > new Date(),
          is_demo: true,
        })
        .select("id")
        .single(),
      `event ${e.slug}`,
    );
    const cover = await ownedImage(
      "event_id",
      event.id,
      "cover",
      await art.festivalScene({
        seed: e.art.seed,
        palette: e.art.palette,
        sun: !!e.art.sun,
      }),
      `Illustration of ${e.title}: a stage at night with lasers, forest and crowd`,
    );
    must(
      await db
        .from("events")
        .update({ cover_asset_id: cover })
        .eq("id", event.id),
      "event cover",
    );
    must(
      await db.from("event_artists").insert(
        e.lineup.map((slug, index) => ({
          event_id: event.id,
          artist_id: artistIds[slug],
          stage: index % 2 ? "Forest Floor" : "Main Stage",
          sort_order: index,
        })),
      ),
      "lineup",
    );
    bySlug[e.slug] = event.id;
    console.log(`Event ${e.title}`);
  }
  return bySlug;
}

async function seedGalleries(eventIds) {
  const sets = [
    {
      slug: "orbit-forest-festival-2026-photos",
      title: "Orbit Forest Festival 2026",
      description:
        "Stages, decor and the crowd over three nights in the mountains.",
      event: "orbit-forest-festival-2026",
      images: [
        () => art.festivalScene({ seed: 501, palette: "twilight" }),
        () => art.decorScene({ seed: 502, palette: "ultraviolet" }),
        () => art.festivalScene({ seed: 503, palette: "night", stageX: 0.3 }),
        () => art.filmScene({ seed: 504 }),
        () => art.festivalScene({ seed: 505, palette: "dawn", sun: true }),
        () => art.decorScene({ seed: 506, palette: "night" }),
        () => art.stallScene({ seed: 507 }),
        () =>
          art.festivalScene({ seed: 508, palette: "ultraviolet", stageX: 0.7 }),
      ],
    },
    {
      slug: "blacklight-decor",
      title: "Blacklight decor",
      description: "UV string-art installations hung over the dancefloor.",
      event: null,
      images: [
        () => art.decorScene({ seed: 601, palette: "ultraviolet" }),
        () => art.decorScene({ seed: 602, palette: "night" }),
        () => art.decorScene({ seed: 603, palette: "twilight" }),
        () =>
          art.decorScene({
            seed: 604,
            palette: "ultraviolet",
            w: 1600,
            h: 2000,
          }),
        () => art.decorScene({ seed: 605, palette: "dawn" }),
        () => art.decorScene({ seed: 606, palette: "night", w: 1600, h: 2000 }),
      ],
    },
  ];
  for (const set of sets) {
    const gallery = must(
      await db
        .from("galleries")
        .insert({
          slug: set.slug,
          title: set.title,
          description: set.description,
          event_id: set.event ? eventIds[set.event] : null,
          photographer: CREDIT,
          status: "published",
          is_demo: true,
        })
        .select("id")
        .single(),
      `gallery ${set.slug}`,
    );
    let first = null;
    for (const [index, make] of set.images.entries()) {
      const id = await ownedImage(
        "gallery_id",
        gallery.id,
        `photo-${index + 1}`,
        await make(),
        `Illustration from ${set.title}, image ${index + 1}`,
        index,
      );
      first ??= id;
    }
    must(
      await db
        .from("galleries")
        .update({ cover_asset_id: first })
        .eq("id", gallery.id),
      "gallery cover",
    );
    console.log(`Gallery ${set.title}`);
  }
}

async function seedShop() {
  const { data: admin } = await db
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!admin) throw new Error("No admin user found to own the demo shop.");
  const existing = must(
    await db
      .from("sellers")
      .select("id, is_demo")
      .eq("owner_user_id", admin.user_id)
      .maybeSingle(),
    "seller",
  );
  if (existing && !existing.is_demo) {
    console.log("The admin already has a real shop; skipping demo products.");
    return;
  }

  const categories = {};
  for (const [index, c] of [
    ["apparel", "Apparel", "Festival tees and wearables."],
    [
      "art-prints",
      "Art and prints",
      "Prints, stickers and artwork from the scene.",
    ],
    ["decor", "Decor", "UV decor for stages, camps and homes."],
    ["music", "Music and samples", "Downloads for producers and DJs."],
  ].entries()) {
    const row = must(
      await db
        .from("product_categories")
        .insert({
          slug: c[0],
          name: c[1],
          description: c[2],
          sort_order: index,
          is_demo: true,
        })
        .select("id")
        .single(),
      `category ${c[0]}`,
    );
    categories[c[0]] = row.id;
  }

  const seller = must(
    await db
      .from("sellers")
      .insert({
        owner_user_id: admin.user_id,
        slug: "dopebooking-store",
        display_name: "DopeBooking Store",
        bio: "The house shop: merch and artwork from the DopeBooking team.",
        country: "DE",
        status: "approved",
        is_demo: true,
      })
      .select("id")
      .single(),
    "seller",
  );

  const products = [
    {
      slug: "string-art-tee",
      title: "String Art Tee",
      category: "apparel",
      featured: true,
      description:
        "Heavy cotton tee with a UV-reactive string-art print that glows under blacklight.\n\nPrinted in small batches.",
      variants: [
        ["S", 3200, 20],
        ["M", 3200, 20],
        ["L", 3200, 20],
        ["XL", 3200, 12],
      ],
      images: [
        () => art.teeMockup({ seed: 701, palette: "night" }),
        () => art.teeMockup({ seed: 702, palette: "dawn", fabric: "#1d1530" }),
      ],
    },
    {
      slug: "blacklight-star-print",
      title: "Blacklight Star Print",
      category: "art-prints",
      featured: true,
      description:
        "A string-art star printed with fluorescent inks on heavy matte paper. Frame not included.",
      variants: [
        ["A3", 2800, 15],
        ["A2", 4200, 10],
      ],
      images: [
        () => art.framedPrint({ seed: 703, palette: "night" }),
        () =>
          art.framedPrint({ seed: 704, palette: "twilight", wall: "#16243a" }),
      ],
    },
    {
      slug: "uv-mandala-tapestry",
      title: "UV Mandala Tapestry",
      category: "decor",
      featured: true,
      description:
        "A large UV-reactive tapestry for stages, camps and living rooms. 150 x 200 cm.",
      variants: [["150 x 200 cm", 8900, 6]],
      images: [() => art.tapestry({ seed: 705, palette: "ultraviolet" })],
    },
    {
      slug: "sunrise-session-sample-pack",
      title: "Sunrise Session Sample Pack",
      category: "music",
      featured: true,
      digital: true,
      description:
        "Leads, pads and percussion loops for progressive sunrise tracks. WAV, 24-bit.",
      variants: [["Download", 1900, null]],
      images: [() => art.coverArt({ seed: 706, palette: "dawn" })],
    },
    {
      slug: "string-art-sticker-set",
      title: "String Art Sticker Set",
      category: "art-prints",
      featured: false,
      description: "Six weatherproof vinyl stickers with string-art designs.",
      variants: [["Set of 6", 800, 50]],
      images: [() => art.stickerSheet({ seed: 707, palette: "night" })],
    },
    {
      slug: "night-shift-tee",
      title: "Night Shift Tee",
      category: "apparel",
      featured: false,
      description:
        "Ultraviolet string-art tee from the first run. Sold out for now.",
      variants: [
        ["M", 3200, 0],
        ["L", 3200, 0],
      ],
      images: [
        () =>
          art.teeMockup({
            seed: 708,
            palette: "ultraviolet",
            fabric: "#0e0b18",
          }),
      ],
    },
  ];
  for (const [index, p] of products.entries()) {
    const product = must(
      await db
        .from("products")
        .insert({
          seller_id: seller.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          product_type: p.digital ? "digital" : "physical",
          status: "published",
          category_id: categories[p.category],
          featured: p.featured,
          sort_order: index,
          is_demo: true,
        })
        .select("id")
        .single(),
      `product ${p.slug}`,
    );
    must(
      await db.from("product_variants").insert(
        p.variants.map(([name, price, stock], order) => ({
          product_id: product.id,
          name,
          price_amount: price,
          stock,
          sort_order: order,
        })),
      ),
      "variants",
    );
    let cover = null;
    for (const [order, make] of p.images.entries()) {
      const id = await ownedImage(
        "product_id",
        product.id,
        `image-${order + 1}`,
        await make(),
        `Product illustration: ${p.title}`,
        order,
      );
      cover ??= id;
    }
    must(
      await db
        .from("products")
        .update({ cover_asset_id: cover })
        .eq("id", product.id),
      "product cover",
    );
    console.log(`Product ${p.title}`);
  }
}

async function seedPages() {
  const L = {};
  const add = async (name, make, alt, focal) =>
    (L[name] = await libraryImage(name, await make(), alt, focal));

  await add(
    "home-hero",
    () => art.festivalScene({ seed: 801, palette: "night", stageX: 0.66 }),
    "Illustration: open-air stage at night with lasers, forest and a dancing crowd",
    [62, 50],
  );
  await add(
    "services-hero",
    () =>
      art.festivalScene({ seed: 802, palette: "dawn", sun: true, stageX: 0.7 }),
    "Illustration: festival stage at sunrise",
    [65, 55],
  );
  await add(
    "promotion",
    () =>
      art.decorScene({ seed: 803, palette: "ultraviolet", w: 1600, h: 2000 }),
    "Illustration: UV string-art decor over a dancefloor",
  );
  await add(
    "catering",
    () => art.stallScene({ seed: 804, w: 1600, h: 2000 }),
    "Illustration: festival food stall at dusk under string lights",
  );
  await add(
    "production",
    () => art.filmScene({ seed: 805, w: 1600, h: 2000 }),
    "Illustration: camera operator filming a festival stage",
    [30, 60],
  );
  await add(
    "about",
    () =>
      art.festivalScene({ seed: 806, palette: "twilight", w: 1600, h: 2000 }),
    "Illustration: forest stage at twilight",
  );
  await add(
    "tile-promotion",
    () => art.decorScene({ seed: 807, palette: "night", w: 1600, h: 1200 }),
    "Illustration: string-art installations",
  );
  await add(
    "tile-catering",
    () => art.stallScene({ seed: 808, w: 1600, h: 1200 }),
    "Illustration: food stall with warm light",
  );
  await add(
    "tile-production",
    () => art.filmScene({ seed: 809, w: 1600, h: 1200 }),
    "Illustration: filming the main stage",
    [30, 60],
  );
  await add(
    "crew",
    () => art.stallScene({ seed: 810, palette: "night", w: 1600, h: 1200 }),
    "Illustration: crew food stall at night",
  );
  await add(
    "hospitality",
    () => art.stallScene({ seed: 811, palette: "twilight", w: 1600, h: 1200 }),
    "Illustration: backstage hospitality stall",
  );
  await add(
    "guest-stalls",
    () => art.stallScene({ seed: 812, palette: "dawn", w: 1600, h: 1200 }),
    "Illustration: guest food stalls at sunset",
  );
  await add(
    "agency",
    () => art.decorScene({ seed: 813, palette: "twilight", w: 1600, h: 2000 }),
    "Illustration: UV decor hanging between trees",
  );
  await add(
    "menus",
    () => art.stallScene({ seed: 814, palette: "dawn", w: 1600, h: 2000 }),
    "Illustration: food stall at sunrise",
  );
  await add(
    "story",
    () =>
      art.festivalScene({
        seed: 815,
        palette: "ultraviolet",
        w: 1600,
        h: 2000,
      }),
    "Illustration: festival stage under ultraviolet light",
  );
  await add(
    "portfolio-photo",
    () =>
      art.festivalScene({
        seed: 816,
        palette: "night",
        w: 1600,
        h: 2000,
        stageX: 0.55,
      }),
    "Illustration: stage and crowd at night",
  );
  await add(
    "portfolio-social",
    () =>
      art.decorScene({ seed: 817, palette: "ultraviolet", w: 1600, h: 2000 }),
    "Illustration: decor detail for social posts",
  );
  await add(
    "portfolio-film",
    () => art.filmScene({ seed: 818, palette: "night", w: 1600, h: 2000 }),
    "Illustration: film crew at the main stage",
    [30, 60],
  );
  const mosaic = [];
  for (let i = 0; i < 7; i++) {
    const make = [
      () =>
        art.festivalScene({
          seed: 820 + i,
          palette: ["night", "dawn", "twilight", "ultraviolet"][i % 4],
          sun: i % 4 === 1,
        }),
      () => art.decorScene({ seed: 820 + i }),
    ][i % 2];
    mosaic.push(
      await add(
        `mosaic-${i + 1}`,
        make,
        `Illustration: festival moment ${i + 1}`,
      ),
    );
  }
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const make = [
      () => art.filmScene({ seed: 840 + i, w: 1600, h: 2000 }),
      () =>
        art.festivalScene({
          seed: 840 + i,
          palette: "twilight",
          w: 2400,
          h: 1350,
        }),
      () => art.decorScene({ seed: 840 + i, w: 1600, h: 2000 }),
    ][i % 3];
    frames.push(
      await add(
        `frame-${i + 1}`,
        make,
        `Illustration: production frame ${i + 1}`,
      ),
    );
  }

  const pages = structuredClone(DEFAULT_PAGES);
  const section = (key, id) =>
    pages[key].sections.find((s) => s.id === id).content;

  Object.assign(section("home", "hero"), {
    layout: "image",
    image: L["home-hero"],
    overlay: 60,
  });
  section("home", "dancefloor").images = mosaic;
  section("home", "services").items.forEach(
    (item, i) =>
      (item.image = [
        L["tile-promotion"],
        L["tile-catering"],
        L["tile-production"],
      ][i]),
  );
  section("home", "agency").image = L.agency;
  pages.home.seo.image = L["home-hero"];

  Object.assign(section("services", "hero"), { image: L["services-hero"] });
  section("services", "services").items.forEach(
    (item, i) =>
      (item.image = [
        L["tile-promotion"],
        L["tile-catering"],
        L["tile-production"],
      ][i]),
  );

  section("promotion", "hero").image = L.promotion;
  section("catering", "hero").image = L.catering;
  section("catering", "offer").items.forEach(
    (item, i) => (item.image = [L.crew, L.hospitality, L["guest-stalls"]][i]),
  );
  section("catering", "menus").image = L.menus;
  section("production", "hero").image = L.production;
  section("production", "work").items.forEach(
    (item, i) =>
      (item.image = [
        L["portfolio-photo"],
        L["portfolio-social"],
        L["portfolio-film"],
      ][i]),
  );
  section("production", "frames").images = frames;
  section("about", "hero").image = L.about;
  section("about", "story").image = L.story;

  const now = new Date().toISOString();
  for (const [key, content] of Object.entries(pages)) {
    const parsed = parsePageContent(content);
    if (!parsed.success)
      throw new Error(`Page ${key} is invalid: ${parsed.error.message}`);
    must(
      await db.from("site_pages").upsert({
        key,
        title: PAGES[key].title,
        draft: parsed.data,
        published: parsed.data,
        published_at: now,
      }),
      `page ${key}`,
    );
  }
  console.log(
    `Pages published (${Object.keys(pages).length}), ${Object.keys(L).length} library images.`,
  );
}

await cleanup();
const artistIds = await seedArtists();
const eventIds = await seedEvents(artistIds);
await seedGalleries(eventIds);
await seedShop();
await seedPages();
console.log("Demo content ready.");
