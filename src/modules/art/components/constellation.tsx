"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MapNode = {
  id: string;
  slug: string;
  name: string;
  portrait: string | null;
  meta: string;
};

export type MapLink = {
  a: string;
  b: string;
  exhibitions: string[];
  works: string[];
};

/** Wide ring for desktops; a taller ring with bigger names on phones. */
const LAYOUTS = {
  wide: { W: 1000, H: 640, RX: 400, RY: 245, R: 26, font: 17 },
  tall: { W: 600, H: 820, RX: 190, RY: 320, R: 32, font: 24 },
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Who made what together, drawn as string art: artists sit on a ring and a
 * thread joins every pair who shared an exhibition (violet) or co-created a
 * work (saffron, thicker). Pointing at or focusing an artist lights up their
 * threads; each artist links to their profile. A list view says the same
 * in words.
 */
export function Constellation({
  nodes,
  links,
}: {
  nodes: MapNode[];
  links: MapLink[];
}) {
  const clipBase = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [tall, setTall] = useState(false);
  const { W, H, RX, RY, R, font } = LAYOUTS[tall ? "tall" : "wide"];

  useEffect(() => {
    const query = matchMedia("(max-width: 639.98px)");
    const update = () => setTall(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const position = new Map(
    nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return [
        node.id,
        {
          x: W / 2 + RX * Math.cos(angle),
          y: H / 2 + RY * Math.sin(angle),
          angle,
        },
      ];
    }),
  );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const neighbours = new Set(
    active
      ? links.flatMap((l) =>
          l.a === active ? [l.b] : l.b === active ? [l.a] : [],
        )
      : [],
  );
  const activeNode = active ? byId.get(active) : null;
  const activeLinks = active
    ? links.filter((l) => l.a === active || l.b === active)
    : [];

  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className={`h-auto w-full overflow-visible ${drawn ? "art-drawn" : ""}`}
        role="group"
        aria-label="Collaboration map"
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          {nodes.map((node) => {
            const p = position.get(node.id)!;
            return (
              <clipPath key={node.id} id={`${clipBase}-${node.id}`}>
                <circle cx={p.x} cy={p.y} r={R} />
              </clipPath>
            );
          })}
        </defs>
        <ellipse
          cx={W / 2}
          cy={H / 2}
          rx={RX}
          ry={RY}
          fill="none"
          stroke="var(--line)"
          strokeDasharray="2 8"
        />
        <g fill="none" strokeLinecap="round">
          {links.map((link, i) => {
            const a = position.get(link.a)!;
            const b = position.get(link.b)!;
            const cx = W / 2 + ((a.x + b.x) / 2 - W / 2) * 0.35;
            const cy = H / 2 + ((a.y + b.y) / 2 - H / 2) * 0.35;
            const lit = active ? link.a === active || link.b === active : false;
            const works = link.works.length > 0;
            return (
              <path
                key={`${link.a}-${link.b}`}
                d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`}
                pathLength={1}
                className="art-thread"
                style={{ animationDelay: `${Math.min(i * 40, 1200)}ms` }}
                stroke={works ? "var(--accent)" : "var(--uv)"}
                strokeWidth={works ? 2.4 : 1.3}
                opacity={active ? (lit ? 0.95 : 0.06) : works ? 0.7 : 0.38}
              />
            );
          })}
        </g>
        {nodes.map((node) => {
          const p = position.get(node.id)!;
          const dim = active && active !== node.id && !neighbours.has(node.id);
          const right = Math.cos(p.angle) >= -0.05;
          // Phones: names centred under (or over) each face, so long names
          // never run off the screen. Desktops: names point outward.
          const below = Math.sin(p.angle) >= 0;
          const cos = Math.abs(Math.cos(p.angle));
          // Faces close to the top or bottom of the ring sit near a
          // neighbour, so their names go sideways instead.
          const side = tall ? cos >= 0.2 && cos <= 0.5 : cos >= 0.2;
          const lx = side || !tall ? p.x + Math.cos(p.angle) * (R + 12) : p.x;
          const ly =
            tall && !side
              ? p.y + (below ? R + font + 4 : -(R + 12))
              : p.y + Math.sin(p.angle) * (R + 12) + 5;
          return (
            <a
              key={node.id}
              href={`/art-gallery/artists/${node.slug}`}
              onPointerEnter={() => setActive(node.id)}
              onFocus={() => setActive(node.id)}
              onBlur={() => setActive(null)}
              className="outline-none [&:focus-visible_circle.ring]:stroke-accent"
              style={{ opacity: dim ? 0.3 : 1, transition: "opacity 300ms" }}
            >
              <title>{`${node.name}: ${node.meta}`}</title>
              <circle
                cx={p.x}
                cy={p.y}
                r={R + 5}
                fill="var(--bg)"
                className="ring"
                stroke={
                  active === node.id ? "var(--accent)" : "var(--line-strong)"
                }
                strokeWidth={2}
              />
              {node.portrait ? (
                <image
                  href={node.portrait}
                  x={p.x - R}
                  y={p.y - R}
                  width={R * 2}
                  height={R * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipBase}-${node.id})`}
                />
              ) : (
                <text
                  x={p.x}
                  y={p.y + 8}
                  textAnchor="middle"
                  className="fill-muted font-serif-art text-[26px] italic"
                >
                  {node.name.slice(0, 1)}
                </text>
              )}
              <text
                x={lx}
                y={ly}
                textAnchor={side ? (right ? "start" : "end") : "middle"}
                dy={tall || side ? 0 : below ? font : -font * 0.6}
                style={{ fontSize: font }}
                className={`font-label ${active === node.id ? "fill-accent" : "fill-text"}`}
              >
                {node.name}
              </text>
            </a>
          );
        })}
      </svg>

      <div
        className="mt-6 min-h-16 border-t border-line pt-4 text-sm"
        aria-live="polite"
      >
        {activeNode ? (
          <p>
            <span className="font-semibold text-text">{activeNode.name}</span>
            <span className="text-muted">
              {" "}
              ·{" "}
              {activeLinks
                .map((l) => {
                  const other = byId.get(l.a === activeNode.id ? l.b : l.a)!;
                  const parts = [
                    l.exhibitions.length
                      ? plural(l.exhibitions.length, "show")
                      : null,
                    l.works.length
                      ? plural(l.works.length, "shared work")
                      : null,
                  ].filter(Boolean);
                  return `${other.name} (${parts.join(", ")})`;
                })
                .join(", ")}
            </span>
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-6 bg-uv" /> Exhibited
              together
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-[3px] w-6 bg-accent" /> Created a
              work together
            </span>
            <span className="hidden sm:inline">
              Point at an artist to follow their threads.
            </span>
          </p>
        )}
      </div>

      <details className="mt-4 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted hover:text-text">
          Show as a list
        </summary>
        <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {links.map((l) => (
            <li key={`${l.a}-${l.b}`} className="text-text/85">
              {byId.get(l.a)!.name} &amp; {byId.get(l.b)!.name}
              <span className="text-muted">
                {" "}
                ·{" "}
                {[
                  l.exhibitions.length
                    ? plural(l.exhibitions.length, "show")
                    : null,
                  l.works.length ? plural(l.works.length, "shared work") : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
