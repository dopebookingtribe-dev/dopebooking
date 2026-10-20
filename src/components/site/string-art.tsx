/**
 * Blacklight string art: the UV thread installations stretched over
 * psytrance dancefloors. Each sector joins nail i on one spoke to nail
 * (count - i) on the next, so straight threads trace a curved star.
 * Rendered on the server; the threads draw in once, then stay still.
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
const SPOKES = 9;
const NAILS = 22;
export const STRING_ART = {
  radius: RADIUS,
  sectors: sectors(SPOKES, NAILS, RADIUS),
};
const SECTORS = STRING_ART.sectors;
const TIPS = Array.from({ length: SPOKES }, (_, s) =>
  point((s * Math.PI * 2) / SPOKES - Math.PI / 2, RADIUS),
);

export function StringArt({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`${-RADIUS - 12} ${-RADIUS - 12} ${RADIUS * 2 + 24} ${RADIUS * 2 + 24}`}
      className={`string-art ${className}`}
      fill="none"
    >
      {SECTORS.map((threads, s) => (
        <g
          key={s}
          stroke="currentColor"
          style={
            {
              "--sector": s,
              color: COLORS[s % COLORS.length],
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
        {TIPS.map((tip, s) => (
          <circle key={s} cx={tip.x} cy={tip.y} r={2.5} />
        ))}
      </g>
    </svg>
  );
}
