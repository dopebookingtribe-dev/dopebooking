/**
 * Blacklight string art: the UV thread installations stretched over
 * psytrance dancefloors. Each sector joins nail i on one spoke to nail
 * (count - i) on the next, so straight threads trace a curved star.
 * Rendered on the server. The hero version draws in once; static copies
 * (tiles, placeholders) appear at once so there is a single motion moment.
 */

const COLORS = ["var(--accent)", "var(--uv)", "var(--thread-cyan)"] as const;

type Thread = { x1: number; y1: number; x2: number; y2: number };

function point(angle: number, radius: number) {
  return {
    x: Math.round(Math.cos(angle) * radius * 10) / 10,
    y: Math.round(Math.sin(angle) * radius * 10) / 10,
  };
}

function sectors(spokes: number, nails: number, radius: number) {
  const step = (Math.PI * 2) / spokes;
  return Array.from({ length: spokes }, (_, s) => {
    const a = s * step - Math.PI / 2;
    const b = a + step;
    const threads: Thread[] = [];
    for (let i = 1; i <= nails; i++) {
      const p = point(a, (radius * i) / nails);
      const q = point(b, (radius * (nails + 1 - i)) / nails);
      threads.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
    }
    return threads;
  });
}

const RADIUS = 300;
// Variants keep placeholders from looking identical side by side.
const SHAPES = [
  { spokes: 9, nails: 22 },
  { spokes: 6, nails: 18 },
  { spokes: 7, nails: 20 },
  { spokes: 5, nails: 16 },
] as const;

const GEOMETRY = SHAPES.map(({ spokes, nails }) => ({
  sectors: sectors(spokes, nails, RADIUS),
  tips: Array.from({ length: spokes }, (_, s) =>
    point((s * Math.PI * 2) / spokes - Math.PI / 2, RADIUS),
  ),
}));

export const STRING_ART = { radius: RADIUS, sectors: GEOMETRY[0].sectors };

export function StringArt({
  className = "",
  variant = 0,
  animate = variant === 0,
}: {
  className?: string;
  variant?: number;
  animate?: boolean;
}) {
  const shape = GEOMETRY[Math.abs(variant) % GEOMETRY.length];
  const offset = Math.abs(variant) % COLORS.length;
  return (
    <svg
      aria-hidden
      viewBox={`${-RADIUS - 12} ${-RADIUS - 12} ${RADIUS * 2 + 24} ${RADIUS * 2 + 24}`}
      className={`string-art ${animate ? "" : "string-art--static"} ${className}`}
      fill="none"
    >
      {shape.sectors.map((threads, s) => (
        <g
          key={s}
          stroke="currentColor"
          style={
            {
              "--sector": s,
              color: COLORS[(s + offset) % COLORS.length],
            } as React.CSSProperties
          }
          className="string-art__sector"
        >
          {threads.map((t, i) => (
            <line
              key={i}
              {...t}
              pathLength={1}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}
      <g fill="var(--text)" opacity={0.55}>
        <circle r={3} />
        {shape.tips.map((tip, s) => (
          <circle key={s} cx={tip.x} cy={tip.y} r={2.5} />
        ))}
      </g>
    </svg>
  );
}
