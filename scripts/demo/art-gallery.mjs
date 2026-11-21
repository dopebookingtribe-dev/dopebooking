// Demo content for the Art Gallery: fictional artists, festivals and
// exhibitions with generated artwork. Every record is flagged is_demo and
// every name is invented; nothing here claims a real partnership, artist
// or exhibition. Used by seed.mjs.

import * as art from "./art.mjs";

const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const ART_FESTIVALS = [
  {
    key: "lumen",
    name: "Lumen Valley Gathering",
    slug: "demo-lumen-valley-gathering",
    city: "Alentejo",
    country: "PT",
    description: "Demo festival (fictional).",
  },
  {
    key: "moonwater",
    name: "Moonwater Festival",
    slug: "demo-moonwater-festival",
    city: "Lake Balaton",
    country: "HU",
    description: "Demo festival (fictional).",
  },
  {
    key: "drift",
    name: "Northern Drift",
    slug: "demo-northern-drift",
    city: "Lapland",
    country: "FI",
    description: "Demo festival (fictional).",
  },
];

export const ART_ARTISTS = [
  {
    key: "mira",
    name: "Mira Solenne",
    disciplines: ["painting", "visionary", "live_painting"],
    country: "PT",
    based_in: "Lisbon",
    tagline: "Large visionary canvases painted through the night.",
    specialization: "UV-reactive canvases up to six metres wide",
    statement:
      "I paint what the music opens. A canvas at a festival is never finished alone: the dancefloor leaves its rhythm in every layer.",
    bio: "Demo profile. Mira Solenne is a fictional painter used to show how an artist profile looks.\n\nShe works in acrylic and fluorescent pigment on raw canvas, building symmetrical worlds from the centre outwards over a whole festival night.",
    techniques:
      "Acrylic, UV pigment and gold leaf on raw cotton canvas. Works from the centre outwards, without sketches.",
    hair: "long",
    palette: "dawn",
    featured: true,
  },
  {
    key: "teo",
    name: "Teo Varga",
    disciplines: ["installation", "light"],
    country: "HU",
    based_in: "Budapest",
    tagline: "Light structures you can walk through.",
    specialization: "Site-specific light and string installations",
    statement: "Space is the material. Light only shows where it already is.",
    bio: "Demo profile. Teo Varga is a fictional installation artist. His pieces use thread, bamboo and programmed light to turn paths and domes into walk-through works.",
    techniques: "Bamboo frames, UV thread, DMX-controlled LED.",
    hair: "short",
    palette: "twilight",
    featured: true,
  },
  {
    key: "ayla",
    name: "Ayla Korhonen",
    stage_name: "Aurora Loop",
    disciplines: ["digital", "projection", "multimedia"],
    country: "FI",
    based_in: "Helsinki",
    tagline: "Generative visuals mapped onto forests and domes.",
    specialization: "Live generative projection mapping",
    statement:
      "I want images that breathe with the room, never the same twice.",
    bio: "Demo profile. Ayla Korhonen is a fictional digital artist who builds generative visuals that react to the music in real time.",
    techniques: "TouchDesigner, custom shaders, multi-projector mapping.",
    hair: "bun",
    palette: "twilight",
    featured: true,
  },
  {
    key: "juno",
    name: "Juno Okafor",
    disciplines: ["sculpture", "textile"],
    country: "GB",
    based_in: "London",
    tagline: "Soft sculpture and woven forms.",
    statement: "Every knot is a decision someone else can touch.",
    bio: "Demo profile. Juno Okafor is a fictional sculptor working with recycled festival textiles.",
    techniques: "Hand weaving, steel armatures, recycled fabric.",
    hair: "curls",
    palette: "ultraviolet",
  },
  {
    key: "lucia",
    name: "Lucía Ferrán",
    disciplines: ["mural", "psychedelic", "painting"],
    country: "ES",
    based_in: "Barcelona",
    tagline: "Murals in saturated colour.",
    statement: "A wall is the most generous canvas: everyone gets to see it.",
    bio: "Demo profile. Lucía Ferrán is a fictional muralist who paints stage backdrops and gallery walls on site.",
    techniques: "Spray paint and brush, large-format murals.",
    hair: "long",
    palette: "night",
  },
  {
    key: "sol",
    name: "Sol Ibarra",
    disciplines: ["photography", "multimedia"],
    country: "MX",
    based_in: "Oaxaca",
    tagline: "Long exposures of moving light.",
    statement: "I photograph time, not moments.",
    bio: "Demo profile. Sol Ibarra is a fictional photographer documenting festival nights through long exposures.",
    techniques: "Long-exposure photography, light painting.",
    hair: "short",
    palette: "dawn",
  },
  {
    key: "noor",
    name: "Noor Haddad",
    disciplines: ["textile", "installation"],
    country: "JO",
    based_in: "Amman",
    tagline: "Canopies of dyed silk.",
    statement: "Shade is a gift. I try to make it beautiful.",
    bio: "Demo profile. Noor Haddad is a fictional textile artist creating hanging canopies for chill-out spaces.",
    techniques: "Hand-dyed silk, natural pigments, rigging.",
    hair: "bun",
    palette: "ultraviolet",
  },
  {
    key: "kai",
    name: "Kai Brenner",
    disciplines: ["live_painting", "painting"],
    country: "DE",
    based_in: "Berlin",
    tagline: "Live painting from first set to last.",
    statement: "The painting and the party end at the same time.",
    bio: "Demo profile. Kai Brenner is a fictional live painter who works on stage beside the DJ.",
    techniques: "Oil stick and acrylic, painted live in one session.",
    hair: "short",
    palette: "night",
  },
  {
    key: "prism",
    name: "Prism Weavers",
    kind: "collective",
    disciplines: ["installation", "light", "textile"],
    country: "PT",
    based_in: "Touring",
    tagline: "A collective of light, thread and projection.",
    statement: "We build together so no single hand can be seen.",
    bio: "Demo profile. Prism Weavers is a fictional collective formed by three artists from the Art Gallery demo roster.",
    members: ["teo", "noor", "ayla"],
    palette: "ultraviolet",
  },
];

/** kind: painting | abstract | installation | sculpture | live */
export const ART_WORKS = [
  {
    key: "w1",
    title: "Garden of Returning Light",
    year: 2026,
    discipline: "visionary",
    medium: "Acrylic and UV pigment on canvas",
    h: 220,
    w: 160,
    by: ["mira"],
    kind: "painting",
    palette: "dawn",
    featured: true,
  },
  {
    key: "w2",
    title: "Threshold Dome",
    year: 2026,
    discipline: "installation",
    medium: "Bamboo, UV thread, programmed light",
    note: "Diameter 9 m",
    by: ["teo", "noor"],
    kind: "installation",
    palette: "ultraviolet",
    featured: true,
  },
  {
    key: "w3",
    title: "Signal Bloom",
    year: 2026,
    discipline: "projection",
    medium: "Generative projection on canopy",
    note: "Variable, site-specific",
    by: ["ayla"],
    kind: "abstract",
    palette: "twilight",
    featured: true,
  },
  {
    key: "w4",
    title: "Weave of Many Hands",
    year: 2025,
    discipline: "textile",
    medium: "Recycled festival fabric on steel",
    h: 180,
    w: 90,
    d: 90,
    by: ["juno"],
    kind: "sculpture",
    palette: "ultraviolet",
    featured: true,
  },
  {
    key: "w5",
    title: "Sunrise Wall",
    year: 2025,
    discipline: "mural",
    medium: "Spray paint on plywood",
    h: 300,
    w: 600,
    by: ["lucia", "mira"],
    kind: "abstract",
    palette: "dawn",
    featured: true,
  },
  {
    key: "w6",
    title: "Eleven Hours",
    year: 2026,
    discipline: "live_painting",
    medium: "Oil stick and acrylic, painted live",
    h: 200,
    w: 300,
    by: ["kai"],
    kind: "live",
    palette: "night",
    featured: true,
  },
  {
    key: "w7",
    title: "Orbit of Petals",
    year: 2025,
    discipline: "visionary",
    medium: "Acrylic on raw cotton",
    h: 150,
    w: 150,
    by: ["mira"],
    kind: "painting",
    palette: "ultraviolet",
    featured: true,
  },
  {
    key: "w8",
    title: "Long Exposure No. 4",
    year: 2026,
    discipline: "photography",
    medium: "Archival pigment print",
    h: 100,
    w: 150,
    by: ["sol"],
    kind: "abstract",
    palette: "night",
  },
  {
    key: "w9",
    title: "Silk Canopy for Slow Hours",
    year: 2026,
    discipline: "textile",
    medium: "Hand-dyed silk",
    note: "Variable, about 12 × 8 m",
    by: ["noor"],
    kind: "installation",
    palette: "dawn",
  },
  {
    key: "w10",
    title: "Frequencies",
    year: 2026,
    discipline: "light",
    medium: "LED, mirror, fog",
    note: "Walk-through, 4 × 4 × 3 m",
    by: ["teo", "ayla"],
    kind: "installation",
    palette: "twilight",
  },
  {
    key: "w11",
    title: "Night Grammar",
    year: 2025,
    discipline: "painting",
    medium: "Acrylic on canvas",
    h: 120,
    w: 90,
    by: ["kai", "lucia"],
    kind: "painting",
    palette: "night",
  },
  {
    key: "w12",
    title: "Pillar of Echoes",
    year: 2026,
    discipline: "sculpture",
    medium: "Steel and woven rope",
    h: 240,
    w: 60,
    d: 60,
    by: ["juno"],
    kind: "sculpture",
    palette: "twilight",
  },
];

export const ART_EXHIBITIONS = [
  {
    key: "mirrors",
    title: "Garden of Mirrors",
    subtitle: "A walk-through gallery between the stages",
    festival: "lumen",
    city: "Alentejo",
    country: "PT",
    venue: "Cork oak grove",
    starts: day(-2),
    ends: day(4),
    accent: "#ffb13b",
    featured: true,
    summary:
      "Demo exhibition. Eight artists turned a cork oak grove into a gallery of reflections, open day and night through the festival.",
    overview:
      "Demo exhibition (fictional). Garden of Mirrors shows how an exhibition page reads: overview, concept, artists with their roles, the collection, photography and partners.\n\nPaintings hang between the trees, installations glow after sunset, and a live painting stage faces the chill-out floor.",
    concept:
      "Every work answers another. The grove becomes a conversation between disciplines, and between artists and the people dancing past.",
    lineup: [
      [
        "mira",
        ["curator", "live_painter"],
        "Curated the grove; painted live each night",
      ],
      ["teo", ["installation"], "Threshold Dome"],
      ["noor", ["installation"], null],
      ["ayla", ["featured"], "Projection on the canopy"],
      ["kai", ["live_painter"], null],
      ["juno", ["artist"], null],
      ["lucia", ["artist"], null],
      ["prism", ["collaborator"], "Light and thread throughout"],
    ],
    works: ["w1", "w2", "w3", "w6", "w4", "w9", "w11"],
    partners: [
      ["Demo Pigment Co.", "sponsor"],
      ["Demo Arts Council", "supporter"],
    ],
  },
  {
    key: "tidal",
    title: "Tidal Signals",
    subtitle: "Light and water at the lake shore",
    festival: "moonwater",
    city: "Lake Balaton",
    country: "HU",
    venue: "Lakeside meadow",
    starts: "2027-07-08",
    ends: "2027-07-12",
    accent: "#5ce1d6",
    featured: true,
    summary:
      "Demo exhibition. Installations and projection that respond to the lake, the wind and the music.",
    overview:
      "Demo exhibition (fictional), shown as upcoming.\n\nLight structures stand in shallow water; projections run across the reeds after dark.",
    concept:
      "Signals travel across water the way music travels across a crowd.",
    lineup: [
      ["teo", ["curator", "installation"], null],
      ["ayla", ["featured"], null],
      ["sol", ["artist"], "Long-exposure series"],
      ["prism", ["installation"], null],
    ],
    works: ["w10", "w8"],
    partners: [],
  },
  {
    key: "bloom",
    title: "The Slow Bloom",
    festival: "lumen",
    city: "Alentejo",
    country: "PT",
    venue: "Gallery dome",
    starts: "2025-08-14",
    ends: "2025-08-18",
    accent: "#b39bff",
    summary:
      "Demo exhibition. A gallery dome of visionary painting and soft sculpture.",
    overview: "Demo exhibition (fictional), shown in the archive.",
    concept: "Growth you only notice when you come back.",
    lineup: [
      ["mira", ["featured"], null],
      ["juno", ["artist"], null],
      ["lucia", ["artist"], "Sunrise Wall"],
      ["kai", ["live_painter"], null],
    ],
    works: ["w7", "w5", "w4", "w11"],
    partners: [["Demo Community Radio", "media"]],
  },
  {
    key: "frequencies",
    title: "Frequencies of Light",
    festival: "drift",
    city: "Lapland",
    country: "FI",
    venue: "Forest clearing",
    starts: "2026-06-19",
    ends: "2026-06-22",
    accent: "#ff7a70",
    summary:
      "Demo exhibition. Midsummer light art under a sun that never sets.",
    overview: "Demo exhibition (fictional), shown in the archive.",
    concept: "What does light art mean when it never gets dark?",
    lineup: [
      ["ayla", ["curator", "featured"], null],
      ["teo", ["installation"], null],
      ["sol", ["artist"], null],
      ["juno", ["artist"], "Pillar of Echoes"],
    ],
    works: ["w10", "w12", "w8", "w3"],
    partners: [],
  },
];

export function artworkImage(work, seed) {
  const portrait = (work.h ?? 2) >= (work.w ?? 1);
  switch (work.kind) {
    case "painting":
      return art.visionaryPainting({
        seed,
        palette: work.palette,
        w: portrait ? 1800 : 2400,
        h: portrait ? 2400 : 1800,
      });
    case "abstract":
      return art.abstractCanvas({
        seed,
        palette: work.palette,
        w: portrait ? 1800 : 2400,
        h: portrait ? 2400 : 1350,
      });
    case "installation":
      return art.installationRoom({ seed, palette: work.palette });
    case "sculpture":
      return art.sculpturePiece({ seed, palette: work.palette });
    case "live":
      return art.livePaintingScene({ seed, palette: work.palette });
  }
  throw new Error(`Unknown kind ${work.kind}`);
}

export const PHOTO_SETS = [
  ["installation", (seed, p) => art.installationRoom({ seed, palette: p })],
  [
    "atmosphere",
    (seed, p) => art.festivalScene({ seed, palette: p, w: 2400, h: 1600 }),
  ],
  [
    "closeup",
    (seed, p) => art.visionaryPainting({ seed, palette: p, w: 1600, h: 2000 }),
  ],
  [
    "process",
    (seed, p) => art.livePaintingScene({ seed, palette: p, w: 1600, h: 2000 }),
  ],
];

const PHOTO_ALT = {
  installation: "Illustration: installation inside the gallery space",
  atmosphere: "Illustration: festival night around the gallery",
  closeup: "Illustration: close-up of a painting",
  process: "Illustration: an artist at work on a canvas",
};

/**
 * Seeds the Art Gallery. `ctx` comes from seed.mjs: { db, must, upload, CREDIT }.
 * Returns false (and seeds nothing) when the migration isn't applied yet.
 */
export async function seedArtGallery({ db, must, upload, CREDIT }) {
  const probe = await db.from("art_artists").select("id").limit(1);
  if (probe.error) {
    console.log(
      "Art Gallery tables not found: apply migration 20261121000100 to seed it. Skipped.",
    );
    return false;
  }

  const media = async (
    owner,
    ownerId,
    name,
    buffer,
    alt,
    extra = {},
    sort = 0,
  ) => {
    const folder = {
      art_artist_id: "art-artists",
      art_exhibition_id: "art-exhibitions",
      art_artwork_id: "art-artworks",
    }[owner];
    const file = await upload(`${folder}/${ownerId}/demo-${name}.webp`, buffer);
    return must(
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
          ...extra,
        })
        .select("id")
        .single(),
      `media ${name}`,
    ).id;
  };

  const festivalIds = {};
  for (const [i, f] of ART_FESTIVALS.entries()) {
    festivalIds[f.key] = must(
      await db
        .from("art_festivals")
        .insert({
          slug: f.slug,
          name: f.name,
          city: f.city,
          country: f.country,
          description: f.description,
          sort_order: i,
          is_demo: true,
        })
        .select("id")
        .single(),
      `festival ${f.name}`,
    ).id;
  }

  const artistIds = {};
  for (const [i, a] of ART_ARTISTS.entries()) {
    const id = must(
      await db
        .from("art_artists")
        .insert({
          slug: `demo-${a.name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-")}`,
          name: a.name,
          stage_name: a.stage_name ?? null,
          kind: a.kind ?? "individual",
          tagline: a.tagline,
          disciplines: a.disciplines,
          specialization: a.specialization ?? null,
          country: a.country,
          based_in: a.based_in,
          bio: a.bio,
          statement: a.statement,
          techniques: a.techniques ?? null,
          status: "published",
          featured: !!a.featured,
          sort_order: i,
          is_demo: true,
        })
        .select("id")
        .single(),
      `art artist ${a.name}`,
    ).id;
    artistIds[a.key] = id;
    const portrait = await media(
      "art_artist_id",
      id,
      "portrait",
      a.kind === "collective"
        ? await art.installationRoom({
            seed: 900 + i,
            palette: a.palette,
            w: 1200,
            h: 1600,
          })
        : await art.painterPortrait({
            seed: 900 + i,
            palette: a.palette,
            hair: a.hair,
          }),
      `Illustration: portrait of ${a.name} (demo artist)`,
    );
    const cover = await media(
      "art_artist_id",
      id,
      "cover",
      await art.abstractCanvas({
        seed: 940 + i,
        palette: a.palette,
        w: 2400,
        h: 1200,
      }),
      `Illustration: abstract colour study for ${a.name}`,
      {},
      1,
    );
    await db
      .from("art_artists")
      .update({ portrait_asset_id: portrait, cover_asset_id: cover })
      .eq("id", id);
  }
  for (const a of ART_ARTISTS.filter((x) => x.members)) {
    must(
      await db.from("art_collective_members").insert(
        a.members.map((m, i) => ({
          collective_id: artistIds[a.key],
          member_id: artistIds[m],
          sort_order: i,
        })),
      ),
      "collective members",
    );
  }

  const workIds = {};
  for (const [i, w] of ART_WORKS.entries()) {
    const id = must(
      await db
        .from("art_artworks")
        .insert({
          slug: `demo-${w.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-$/, "")}`,
          title: w.title,
          year: w.year,
          discipline: w.discipline,
          medium: w.medium,
          height_cm: w.h ?? null,
          width_cm: w.w ?? null,
          depth_cm: w.d ?? null,
          dimensions_note: w.note ?? null,
          description: `Demo artwork (fictional), generated as an illustration. ${w.medium}.`,
          status: "published",
          featured: !!w.featured,
          sort_order: i,
          is_demo: true,
        })
        .select("id")
        .single(),
      `artwork ${w.title}`,
    ).id;
    workIds[w.key] = id;
    const image = await media(
      "art_artwork_id",
      id,
      "main",
      await artworkImage(w, 1000 + i),
      `Illustration: ${w.title} (demo artwork)`,
    );
    await db
      .from("art_artworks")
      .update({ image_asset_id: image })
      .eq("id", id);
    must(
      await db.from("art_artwork_credits").insert(
        w.by.map((key, n) => ({
          artwork_id: id,
          art_artist_id: artistIds[key],
          sort_order: n,
        })),
      ),
      "credits",
    );
  }

  for (const [i, e] of ART_EXHIBITIONS.entries()) {
    const id = must(
      await db
        .from("art_exhibitions")
        .insert({
          slug: `demo-${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: e.title,
          subtitle: e.subtitle ?? null,
          festival_id: festivalIds[e.festival],
          venue_name: e.venue,
          city: e.city,
          country: e.country,
          starts_on: e.starts,
          ends_on: e.ends,
          summary: e.summary,
          overview: e.overview,
          concept: e.concept,
          accent_color: e.accent,
          status: "published",
          featured: !!e.featured,
          sort_order: i,
          is_demo: true,
        })
        .select("id")
        .single(),
      `exhibition ${e.title}`,
    ).id;
    const palette = ["dawn", "twilight", "ultraviolet", "night"][i % 4];
    const cover = await media(
      "art_exhibition_id",
      id,
      "cover",
      await art.installationRoom({ seed: 1100 + i, palette, w: 2400, h: 1350 }),
      `Illustration: ${e.title}, the gallery space at night`,
    );
    const phone = await media(
      "art_exhibition_id",
      id,
      "cover-phone",
      await art.installationRoom({ seed: 1100 + i, palette, w: 1440, h: 1800 }),
      `Illustration: ${e.title}, upright view`,
      {},
      1,
    );
    await db
      .from("art_exhibitions")
      .update({ cover_asset_id: cover, mobile_cover_asset_id: phone })
      .eq("id", id);
    let sort = 2;
    for (const [n, [collection, make]] of PHOTO_SETS.entries()) {
      for (let k = 0; k < (i === 0 ? 3 : 2); k++) {
        await media(
          "art_exhibition_id",
          id,
          `${collection}-${k}`,
          await make(1200 + i * 40 + n * 5 + k, palette),
          PHOTO_ALT[collection],
          { art_collection: collection },
          sort++,
        );
      }
    }
    must(
      await db.from("art_exhibition_artists").insert(
        e.lineup.map(([key, roles, note], n) => ({
          exhibition_id: id,
          art_artist_id: artistIds[key],
          roles,
          note,
          sort_order: n,
        })),
      ),
      "line-up",
    );
    must(
      await db.from("art_exhibition_artworks").insert(
        e.works.map((key, n) => ({
          exhibition_id: id,
          artwork_id: workIds[key],
          sort_order: n,
        })),
      ),
      "collection",
    );
    if (e.partners.length) {
      must(
        await db.from("art_exhibition_partners").insert(
          e.partners.map(([name, kind], n) => ({
            exhibition_id: id,
            name,
            kind,
            sort_order: n,
          })),
        ),
        "partners",
      );
    }
  }
  console.log(
    `Art Gallery: ${ART_ARTISTS.length} artists, ${ART_EXHIBITIONS.length} exhibitions, ${ART_WORKS.length} artworks, ${ART_FESTIVALS.length} festivals.`,
  );
  return true;
}
