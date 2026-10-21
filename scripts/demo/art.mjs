// Original demo artwork, drawn as SVG and rendered to WebP with sharp.
// Every image is generated from a seed, so runs are repeatable. Nothing is
// downloaded or copied: these are illustrations, not photos of real people.

import sharp from "sharp";

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTES = {
  night: {
    sky: ["#0b0820", "#22134a", "#6a2a6e"],
    glow: "#ff5ca8",
    threads: ["#ff5ca8", "#ffb23f", "#5be0e6"],
    ground: "#06040f",
  },
  dawn: {
    sky: ["#141238", "#7a3a6b", "#ff9a5a"],
    glow: "#ffb23f",
    threads: ["#ffb23f", "#ff5ca8", "#ffe08a"],
    ground: "#0a0614",
  },
  twilight: {
    sky: ["#0a0b26", "#1d2f6b", "#3fa7b5"],
    glow: "#5be0e6",
    threads: ["#5be0e6", "#ff5ca8", "#a58bff"],
    ground: "#050812",
  },
  ultraviolet: {
    sky: ["#07041a", "#2a0f5a", "#8a2fb0"],
    glow: "#c86bff",
    threads: ["#c8ff4a", "#ff5ca8", "#5be0e6"],
    ground: "#05030d",
  },
};

const f = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function defs(p, id) {
  return `
  <defs>
    <linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.sky[0]}"/>
      <stop offset="0.62" stop-color="${p.sky[1]}"/>
      <stop offset="1" stop-color="${p.sky[2]}"/>
    </linearGradient>
    <filter id="blur${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="soft${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="glow${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}

export function stringArt(
  cx,
  cy,
  r,
  spokes,
  nails,
  colors,
  opacity = 1,
  width = 1.6,
  rotate = 0,
) {
  const step = (Math.PI * 2) / spokes;
  let out = "";
  for (let s = 0; s < spokes; s++) {
    const a = s * step - Math.PI / 2 + rotate;
    const b = a + step;
    let lines = "";
    for (let i = 1; i <= nails; i++) {
      const ri = (r * i) / nails;
      const rj = (r * (nails + 1 - i)) / nails;
      lines += `<line x1="${f(cx + Math.cos(a) * ri)}" y1="${f(cy + Math.sin(a) * ri)}" x2="${f(cx + Math.cos(b) * rj)}" y2="${f(cy + Math.sin(b) * rj)}"/>`;
    }
    out += `<g stroke="${colors[s % colors.length]}" stroke-width="${width}" opacity="${opacity}">${lines}</g>`;
  }
  return out;
}

function stars(r, w, h, count) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const size = r() < 0.92 ? r() * 1.4 + 0.4 : r() * 2.4 + 1.2;
    out += `<circle cx="${f(r() * w)}" cy="${f(r() * h)}" r="${f(size)}" fill="#ffffff" opacity="${f(0.3 + r() * 0.7)}"/>`;
  }
  return out;
}

function ridge(r, w, baseY, amp, color, steps = 18) {
  let d = `M0 ${baseY}`;
  for (let i = 0; i <= steps; i++) {
    const x = (w * i) / steps;
    const y =
      baseY - amp * (0.4 + r() * 0.6) * Math.abs(Math.sin(i * 0.9 + r()));
    d += ` L${f(x)} ${f(y)}`;
  }
  d += ` L${w} ${baseY + 2000} L0 ${baseY + 2000} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

function pine(x, base, height, color) {
  const w = height * 0.32;
  let d = "";
  for (let k = 0; k < 4; k++) {
    const top = base - height + k * height * 0.18;
    const half = w * (0.45 + k * 0.2);
    const bottom = top + height * 0.38;
    d += `M${f(x)} ${f(top)} L${f(x + half)} ${f(bottom)} L${f(x - half)} ${f(bottom)} Z `;
  }
  d += `M${f(x - height * 0.03)} ${f(base - height * 0.1)} h${f(height * 0.06)} v${f(height * 0.12)} h${f(-height * 0.06)} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

function forest(r, w, base, color, density, minH, maxH, avoid) {
  let out = "";
  for (let i = 0; i < density; i++) {
    const x = r() * w;
    if (avoid && x > avoid[0] && x < avoid[1]) continue;
    out += pine(x, base + r() * 20, minH + r() * (maxH - minH), color);
  }
  return out;
}

function crowd(r, w, h, base, color, count, arms = 0.18) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const depth = r();
    const scale = 0.55 + depth * 0.9;
    const y = base + depth * (h - base) * 0.6;
    const head = 15 * scale;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(head)}" fill="${color}"/>`;
    out += `<rect x="${f(x - head * 1.7)}" y="${f(y + head * 0.8)}" width="${f(head * 3.4)}" height="${f(h)}" rx="${f(head * 1.2)}" fill="${color}"/>`;
    if (r() < arms) {
      const side = r() < 0.5 ? -1 : 1;
      const angle = side * (12 + r() * 30);
      out += `<rect x="${f(x + side * head * 1.2 - head * 0.3)}" y="${f(y - head * 3.2)}" width="${f(head * 0.6)}" height="${f(head * 4.2)}" rx="${f(head * 0.3)}" fill="${color}" transform="rotate(${f(angle)} ${f(x + side * head * 1.2)} ${f(y + head)})"/>`;
    }
  }
  return out;
}

function lasers(r, ox, oy, count, colors, w, h, id, spread = 1.3) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (r() - 0.5) * spread * 2;
    const len = Math.max(w, h) * 1.4;
    const x2 = ox + Math.cos(angle) * len;
    const y2 = oy + Math.sin(angle) * len;
    const color = colors[i % colors.length];
    out += `<line x1="${ox}" y1="${oy}" x2="${f(x2)}" y2="${f(y2)}" stroke="${color}" stroke-width="${f(1.5 + r() * 2.5)}" opacity="${f(0.35 + r() * 0.5)}" filter="url(#glow${id})"/>`;
  }
  return out;
}

function stage(cx, base, width, height, p, id) {
  const top = base - height;
  const roof = top - height * 0.45;
  return `
    <g>
      <linearGradient id="lit${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.glow}" stop-opacity="0.9"/>
        <stop offset="1" stop-color="${p.glow}" stop-opacity="0.15"/>
      </linearGradient>
      <path d="M${cx - width * 0.6} ${top} L${cx} ${roof} L${cx + width * 0.6} ${top} Z" fill="${p.ground}"/>
      <rect x="${cx - width / 2}" y="${top}" width="${width}" height="${height}" fill="${p.ground}"/>
      <rect x="${cx - width * 0.42}" y="${top + height * 0.1}" width="${width * 0.84}" height="${height * 0.5}" fill="url(#lit${id})"/>
      <ellipse cx="${cx}" cy="${top + height * 0.3}" rx="${width * 0.6}" ry="${height * 0.5}" fill="${p.glow}" opacity="0.3" filter="url(#blur${id})"/>
      <rect x="${cx - width * 0.14}" y="${top + height * 0.42}" width="${width * 0.28}" height="${height * 0.18}" fill="${p.ground}"/>
      <circle cx="${cx}" cy="${top + height * 0.36}" r="${height * 0.07}" fill="${p.ground}"/>
      <g filter="url(#glow${id})">${stringArt(cx, roof - height * 0.35, height * 0.75, 6, 16, p.threads, 0.95, 1.6)}</g>
    </g>`;
}

function haze(r, w, h, p, id, count = 5) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `<ellipse cx="${f(r() * w)}" cy="${f(h * (0.45 + r() * 0.35))}" rx="${f(w * (0.15 + r() * 0.25))}" ry="${f(h * (0.06 + r() * 0.08))}" fill="${p.threads[i % p.threads.length]}" opacity="${f(0.08 + r() * 0.12)}" filter="url(#blur${id})"/>`;
  }
  return out;
}

async function render(svg, w, h, quality = 78) {
  return sharp(Buffer.from(svg), { density: 72 })
    .resize(w, h)
    .webp({ quality, effort: 5 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Compositions
// ---------------------------------------------------------------------------

/** Open-air main stage at night or dawn: lasers, forest, crowd. */
export async function festivalScene({
  seed,
  palette = "night",
  w = 2400,
  h = 1350,
  sun = false,
  crowdCount = 260,
  stageX = 0.5,
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `s${seed}`;
  const horizon = h * 0.72;
  const cx = w * stageX;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="url(#sky${id})"/>
    ${palette === "dawn" ? "" : stars(r, w, horizon * 0.8, 220)}
    ${sun ? `<circle cx="${f(w * (0.25 + r() * 0.5))}" cy="${f(horizon - h * 0.04)}" r="${f(h * 0.12)}" fill="#ffd27a" opacity="0.9" filter="url(#soft${id})"/><circle cx="${f(w * 0.5)}" cy="${f(horizon)}" r="${f(h * 0.3)}" fill="#ff9a5a" opacity="0.35" filter="url(#blur${id})"/>` : ""}
    ${ridge(r, w, horizon - h * 0.02, h * 0.16, p.sky[1])}
    ${ridge(r, w, horizon + h * 0.03, h * 0.1, "#120a24")}
    ${lasers(r, cx, horizon - h * 0.12, 14, p.threads, w, h, id)}
    ${haze(r, w, h, p, id)}
    ${forest(r, w, horizon + h * 0.08, p.ground, 34, h * 0.18, h * 0.42, [cx - w * 0.16, cx + w * 0.16])}
    ${stage(cx, horizon + h * 0.1, w * 0.26, h * 0.2, p, id)}
    ${crowd(r, w, h, horizon + h * 0.12, p.ground, crowdCount)}
  </svg>`;
  return render(svg, w, h);
}

/** UV string-art installations hung between trees. */
export async function decorScene({
  seed,
  palette = "ultraviolet",
  w = 2400,
  h = 1600,
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `d${seed}`;
  let pieces = "";
  const count = 3 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    const cx =
      w * (0.15 + (0.7 * i) / Math.max(1, count - 1)) + (r() - 0.5) * w * 0.06;
    const cy = h * (0.25 + r() * 0.25);
    const radius = h * (0.12 + r() * 0.14);
    const spokes = 5 + Math.floor(r() * 5);
    pieces += `<line x1="${f(cx)}" y1="0" x2="${f(cx)}" y2="${f(cy - radius)}" stroke="#ffffff" stroke-width="1" opacity="0.25"/>`;
    pieces += `<g filter="url(#glow${id})">${stringArt(
      cx,
      cy,
      radius,
      spokes,
      14 + Math.floor(r() * 8),
      [...p.threads].sort(() => r() - 0.5),
      0.95,
      1.8,
      r(),
    )}</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="${p.sky[0]}"/>
    <ellipse cx="${w / 2}" cy="${h * 0.4}" rx="${w * 0.5}" ry="${h * 0.4}" fill="${p.sky[1]}" opacity="0.7" filter="url(#blur${id})"/>
    ${haze(r, w, h, p, id, 4)}
    ${pieces}
    ${forest(r, w, h * 1.02, p.ground, 16, h * 0.5, h * 0.95, [w * 0.2, w * 0.8])}
    ${crowd(r, w, h, h * 0.86, p.ground, 70, 0.3)}
  </svg>`;
  return render(svg, w, h);
}

/** Festival food stall at dusk with string lights. */
export async function stallScene({
  seed,
  palette = "dawn",
  w = 2000,
  h = 1500,
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `f${seed}`;
  const base = h * 0.78;
  const sx = w * (0.22 + r() * 0.1);
  const sw = w * 0.56;
  const roof = base - h * 0.42;
  let awning = "";
  const stripes = 10;
  for (let i = 0; i < stripes; i++) {
    const x = sx + (sw * i) / stripes;
    awning += `<path d="M${f(x)} ${f(roof)} h${f(sw / stripes)} v${f(h * 0.06)} q${f(-sw / stripes / 2)} ${f(h * 0.05)} ${f(-sw / stripes)} 0 Z" fill="${i % 2 ? p.threads[0] : "#f6efe4"}" opacity="0.92"/>`;
  }
  let bulbs = "";
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = w * 0.02 + t * w * 0.96;
    const y =
      h * 0.16 +
      Math.sin(t * Math.PI) * h * 0.12 +
      Math.sin(t * Math.PI * 3) * h * 0.02;
    bulbs += `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="#ffd9a0" filter="url(#glow${id})"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="url(#sky${id})"/>
    ${ridge(r, w, h * 0.6, h * 0.1, p.sky[1])}
    <path d="M${w * 0.02} ${h * 0.16} Q${w / 2} ${h * 0.4} ${w * 0.98} ${h * 0.16}" stroke="#2a2030" stroke-width="3" fill="none"/>
    ${bulbs}
    <rect x="${f(sx)}" y="${f(roof)}" width="${f(sw)}" height="${f(base - roof)}" fill="#1a1020"/>
    <rect x="${f(sx + sw * 0.06)}" y="${f(roof + h * 0.12)}" width="${f(sw * 0.88)}" height="${f(h * 0.18)}" fill="#ffcf8a" opacity="0.85"/>
    <ellipse cx="${f(sx + sw / 2)}" cy="${f(roof + h * 0.2)}" rx="${f(sw * 0.5)}" ry="${f(h * 0.14)}" fill="#ffb23f" opacity="0.35" filter="url(#blur${id})"/>
    <rect x="${f(sx)}" y="${f(roof + h * 0.3)}" width="${f(sw)}" height="${f(h * 0.05)}" fill="#3a2418"/>
    ${awning}
    <rect x="0" y="${f(base + h * 0.1)}" width="${w}" height="${h}" fill="${p.ground}"/>
    ${crowd(r, w, h, base + h * 0.08, p.ground, 22, 0.08)}
  </svg>`;
  return render(svg, w, h);
}

/** Camera operator silhouette filming the stage. */
export async function filmScene({
  seed,
  palette = "twilight",
  w = 2400,
  h = 1600,
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `c${seed}`;
  const horizon = h * 0.7;
  const x = w * 0.2;
  const y = h * 0.62;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="url(#sky${id})"/>
    ${stars(r, w, horizon * 0.7, 160)}
    ${ridge(r, w, horizon, h * 0.12, p.sky[1])}
    ${lasers(r, w * 0.68, horizon - h * 0.08, 12, p.threads, w, h, id)}
    ${haze(r, w, h, p, id)}
    ${stage(w * 0.68, horizon + h * 0.08, w * 0.24, h * 0.18, p, id)}
    ${crowd(r, w, h, horizon + h * 0.1, p.ground, 160)}
    <g fill="#030208">
      <circle cx="${x}" cy="${y - h * 0.16}" r="${h * 0.045}"/>
      <path d="M${x - h * 0.1} ${h} L${x - h * 0.09} ${y - h * 0.06} Q${x} ${y - h * 0.12} ${x + h * 0.09} ${y - h * 0.06} L${x + h * 0.1} ${h} Z"/>
      <rect x="${x + h * 0.04}" y="${y - h * 0.2}" width="${h * 0.2}" height="${h * 0.1}" rx="${h * 0.012}"/>
      <rect x="${x + h * 0.24}" y="${y - h * 0.18}" width="${h * 0.08}" height="${h * 0.06}" rx="${h * 0.01}"/>
      <rect x="${x + h * 0.07}" y="${y - h * 0.24}" width="${h * 0.06}" height="${h * 0.04}"/>
      <path d="M${x + h * 0.13} ${y - h * 0.1} L${x + h * 0.02} ${h} M${x + h * 0.13} ${y - h * 0.1} L${x + h * 0.24} ${h} M${x + h * 0.13} ${y - h * 0.1} L${x + h * 0.13} ${h}" stroke="#030208" stroke-width="${h * 0.008}"/>
    </g>
    <circle cx="${x + h * 0.31}" cy="${y - h * 0.15}" r="${h * 0.012}" fill="${p.threads[0]}" filter="url(#glow${id})"/>
  </svg>`;
  return render(svg, w, h);
}

/** Stylised DJ portrait: backlit silhouette behind the decks. */
export async function djPortrait({
  seed,
  palette = "night",
  w = 1600,
  h = 2000,
  pose = "raise",
  hair = "short",
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `p${seed}`;
  const cx = w / 2 + (r() - 0.5) * w * 0.08;
  const headY = h * 0.43;
  const hr = w * 0.085;
  const shoulderY = headY + hr * 2.1;
  const body = `M${cx - w * 0.25} ${h} C${cx - w * 0.25} ${shoulderY + hr * 2} ${cx - w * 0.235} ${shoulderY} ${cx - w * 0.14} ${shoulderY - hr * 0.3} L${cx - hr * 0.42} ${headY + hr * 0.85} L${cx + hr * 0.42} ${headY + hr * 0.85} L${cx + w * 0.14} ${shoulderY - hr * 0.3} C${cx + w * 0.235} ${shoulderY} ${cx + w * 0.25} ${shoulderY + hr * 2} ${cx + w * 0.25} ${h} Z`;
  const hairShape =
    hair === "long"
      ? `<path d="M${cx - hr * 1.15} ${headY} Q${cx - hr * 1.3} ${shoulderY + hr} ${cx - hr * 1.6} ${shoulderY + hr * 1.6} L${cx + hr * 1.6} ${shoulderY + hr * 1.6} Q${cx + hr * 1.3} ${shoulderY + hr} ${cx + hr * 1.15} ${headY} Z"/>`
      : hair === "bun"
        ? `<circle cx="${cx}" cy="${headY - hr * 1.15}" r="${hr * 0.5}"/>`
        : hair === "cap"
          ? `<path d="M${cx - hr * 1.05} ${headY - hr * 0.2} Q${cx} ${headY - hr * 1.5} ${cx + hr * 1.05} ${headY - hr * 0.2} L${cx + hr * 1.9} ${headY - hr * 0.05} L${cx + hr * 1.05} ${headY + hr * 0.1} Z"/>`
          : "";
  const arm = (side, raised) => {
    const sx = cx + side * w * 0.17;
    const sy = shoulderY + hr * 0.05;
    const thick = hr * 0.62;
    if (raised) {
      const ex = sx + side * w * 0.1;
      const ey = shoulderY - h * 0.07;
      const hx = sx + side * w * 0.03;
      const hy = h * 0.14 + r() * h * 0.05;
      return `<polyline points="${f(sx)},${f(sy)} ${f(ex)},${f(ey)} ${f(hx)},${f(hy)}" fill="none" stroke="#05030c" stroke-width="${f(thick)}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f(hx)}" cy="${f(hy - thick * 0.2)}" r="${f(thick * 0.62)}"/>`;
    }
    return `<polyline points="${f(sx)},${f(sy)} ${f(sx + side * w * 0.05)},${f(h * 0.66)} ${f(sx - side * w * 0.02)},${f(h * 0.8)}" fill="none" stroke="#05030c" stroke-width="${f(thick)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const left = pose === "both" || pose === "raise";
  const right = pose === "both";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="url(#sky${id})"/>
    <g filter="url(#glow${id})">${stringArt(cx, headY - h * 0.02, w * (0.46 + r() * 0.08), 6 + Math.floor(r() * 4), 22, p.threads, 0.85, 2.2, r())}</g>
    ${lasers(r, cx, headY + h * 0.05, 10, p.threads, w, h, id, 1.6)}
    <ellipse cx="${cx}" cy="${headY + hr}" rx="${w * 0.42}" ry="${h * 0.3}" fill="${p.glow}" opacity="0.45" filter="url(#blur${id})"/>
    <g fill="#05030c">
      <circle cx="${cx}" cy="${headY}" r="${hr}"/>
      ${hairShape}
      <path d="${body}"/>
      ${arm(-1, left)}
      ${arm(1, right)}
      <path d="M${cx - hr * 1.12} ${headY + hr * 0.1} Q${cx} ${headY - hr * 1.6} ${cx + hr * 1.12} ${headY + hr * 0.1}" fill="none" stroke="#05030c" stroke-width="${hr * 0.22}"/>
      <rect x="${cx - hr * 1.32}" y="${headY - hr * 0.15}" width="${hr * 0.45}" height="${hr * 0.7}" rx="${hr * 0.15}"/>
      <rect x="${cx + hr * 0.87}" y="${headY - hr * 0.15}" width="${hr * 0.45}" height="${hr * 0.7}" rx="${hr * 0.15}"/>
    </g>
    <path d="${body}" fill="none" stroke="${p.glow}" stroke-width="3" opacity="0.8" filter="url(#glow${id})"/>
    <circle cx="${cx}" cy="${headY}" r="${hr}" fill="none" stroke="${p.glow}" stroke-width="3" opacity="0.7" filter="url(#glow${id})"/>
    <rect x="0" y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="#030208"/>
    <rect x="0" y="${h * 0.8}" width="${w}" height="4" fill="${p.threads[1]}" opacity="0.7" filter="url(#glow${id})"/>
    ${Array.from({ length: 22 }, (_, i) => `<circle cx="${f(w * 0.1 + (w * 0.8 * i) / 21)}" cy="${f(h * 0.86 + (i % 3) * 14)}" r="5" fill="${p.threads[i % 3]}" opacity="0.9" filter="url(#glow${id})"/>`).join("")}
    <ellipse cx="${w * 0.3}" cy="${h * 0.9}" rx="${w * 0.1}" ry="${h * 0.025}" fill="none" stroke="#2a2440" stroke-width="6"/>
    <ellipse cx="${w * 0.7}" cy="${h * 0.9}" rx="${w * 0.1}" ry="${h * 0.025}" fill="none" stroke="#2a2440" stroke-width="6"/>
  </svg>`;
  return render(svg, w, h);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function studio(p, id, w, h) {
  return `<rect width="${w}" height="${h}" fill="#1a1530"/>
    <ellipse cx="${w / 2}" cy="${h * 0.45}" rx="${w * 0.55}" ry="${h * 0.5}" fill="#2c2452" filter="url(#blur${id})"/>
    <ellipse cx="${w / 2}" cy="${h * 0.93}" rx="${w * 0.38}" ry="${h * 0.04}" fill="#000" opacity="0.45" filter="url(#soft${id})"/>`;
}

export async function teeMockup({
  seed,
  palette = "night",
  fabric = "#141020",
  w = 1600,
  h = 2000,
}) {
  const p = PALETTES[palette];
  const id = `t${seed}`;
  const cx = w / 2;
  const tee = `M${cx - w * 0.14} ${h * 0.14} Q${cx} ${h * 0.2} ${cx + w * 0.14} ${h * 0.14} L${cx + w * 0.36} ${h * 0.24} L${cx + w * 0.3} ${h * 0.38} L${cx + w * 0.22} ${h * 0.34} L${cx + w * 0.23} ${h * 0.88} L${cx - w * 0.23} ${h * 0.88} L${cx - w * 0.22} ${h * 0.34} L${cx - w * 0.3} ${h * 0.38} L${cx - w * 0.36} ${h * 0.24} Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    ${studio(p, id, w, h)}
    <path d="${tee}" fill="${fabric}"/>
    <path d="M${cx - w * 0.14} ${h * 0.14} Q${cx} ${h * 0.24} ${cx + w * 0.14} ${h * 0.14}" fill="none" stroke="#2a2440" stroke-width="10"/>
    <g filter="url(#glow${id})">${stringArt(cx, h * 0.48, w * 0.15, 7 + (seed % 3), 16, p.threads, 0.95, 2.4)}</g>
    <path d="${tee}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="4"/>
  </svg>`;
  return render(svg, w, h);
}

export async function framedPrint({
  seed,
  palette = "night",
  w = 1600,
  h = 2000,
  wall = "#211a3a",
}) {
  const p = PALETTES[palette];
  const id = `pr${seed}`;
  const fx = w * 0.2;
  const fy = h * 0.14;
  const fw = w * 0.6;
  const fh = h * 0.68;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="${wall}"/>
    <rect x="${fx + 24}" y="${fy + 30}" width="${fw}" height="${fh}" fill="#000" opacity="0.45" filter="url(#soft${id})"/>
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#0c0a14"/>
    <rect x="${fx + fw * 0.06}" y="${fy + fh * 0.05}" width="${fw * 0.88}" height="${fh * 0.9}" fill="${p.sky[0]}"/>
    <g filter="url(#glow${id})">${stringArt(w / 2, fy + fh * 0.45, fw * 0.36, 9, 22, p.threads, 1, 2)}</g>
    <rect x="0" y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="#15102a"/>
  </svg>`;
  return render(svg, w, h);
}

export async function tapestry({
  seed,
  palette = "ultraviolet",
  w = 1600,
  h = 2000,
}) {
  const p = PALETTES[palette];
  const id = `ta${seed}`;
  let rings = "";
  for (let k = 0; k < 4; k++) {
    rings += stringArt(
      w / 2,
      h * 0.47,
      w * (0.38 - k * 0.08),
      6 + k * 3,
      14 + k * 2,
      [...p.threads.slice(k % 3), ...p.threads.slice(0, k % 3)],
      0.95,
      2,
      k * 0.3,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="#0d0a1c"/>
    <line x1="${w * 0.08}" y1="${h * 0.07}" x2="${w * 0.92}" y2="${h * 0.07}" stroke="#3a2f20" stroke-width="18"/>
    <path d="M${w * 0.1} ${h * 0.08} L${w * 0.9} ${h * 0.08} L${w * 0.88} ${h * 0.9} Q${w / 2} ${h * 0.86} ${w * 0.12} ${h * 0.9} Z" fill="${p.sky[0]}"/>
    <g filter="url(#glow${id})">${rings}</g>
  </svg>`;
  return render(svg, w, h);
}

export async function coverArt({ seed, palette = "dawn", w = 1600, h = 1600 }) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `a${seed}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    <rect width="${w}" height="${h}" fill="url(#sky${id})"/>
    <circle cx="${w / 2}" cy="${h * 0.7}" r="${w * 0.16}" fill="#ffd27a" opacity="0.85" filter="url(#soft${id})"/>
    ${ridge(r, w, h * 0.66, h * 0.12, p.sky[1])}
    ${ridge(r, w, h * 0.74, h * 0.08, "#120a24")}
    <g filter="url(#glow${id})">${stringArt(w / 2, h * 0.36, w * 0.24, 8, 18, p.threads, 0.9, 2.2)}</g>
    <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>
  </svg>`;
  return render(svg, w, h);
}

export async function stickerSheet({
  seed,
  palette = "night",
  w = 1600,
  h = 2000,
}) {
  const r = rng(seed);
  const p = PALETTES[palette];
  const id = `st${seed}`;
  let stickers = "";
  for (let i = 0; i < 6; i++) {
    const cx = w * (0.28 + (i % 2) * 0.44);
    const cy = h * (0.2 + Math.floor(i / 2) * 0.3);
    const rad = w * 0.17;
    stickers += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#f6efe4"/><circle cx="${cx}" cy="${cy}" r="${rad * 0.9}" fill="${p.sky[i % 3]}"/>`;
    stickers += `<g filter="url(#glow${id})">${stringArt(cx, cy, rad * 0.75, 5 + Math.floor(r() * 5), 12, p.threads, 1, 2, r())}</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(p, id)}
    ${studio(p, id, w, h)}
    <rect x="${w * 0.06}" y="${h * 0.04}" width="${w * 0.88}" height="${h * 0.92}" rx="30" fill="#ece4d6"/>
    ${stickers}
  </svg>`;
  return render(svg, w, h);
}
