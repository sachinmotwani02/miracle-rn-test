export interface Point {
  x: number;
  y: number;
}

export interface SparklineGeometry {
  points: Point[];
  /** SVG path: a Catmull-Rom spline through every point, as cubic Béziers. */
  path: string;
  /** Approximate path length, used for the stroke-dash draw-in. */
  length: number;
}

export interface SparklineOptions {
  width: number;
  height: number;
  /** Inset so the 3pt stroke and marker dots stay inside the box. */
  padding: number;
}

const r = (n: number) => Math.round(n * 100) / 100;

export function buildSparkline(values: number[], { width, height, padding }: SparklineOptions): SparklineGeometry {
  const n = values.length;
  if (n === 0) return { points: [], path: '', length: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points: Point[] = values.map((v, i) => ({
    x: r(padding + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))),
    y: r(max === min ? height / 2 : padding + innerH - ((v - min) / span) * innerH),
  }));

  let path = `M${points[0].x} ${points[0].y}`;
  let length = 0;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n - 1)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    path += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${p2.x} ${p2.y}`;

    // Approximate the curve length by sampling four sub-segments.
    let prev: Point = p1;
    for (let s = 1; s <= 4; s++) {
      const t = s / 4;
      const mt = 1 - t;
      const x = mt ** 3 * p1.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * p2.x;
      const y = mt ** 3 * p1.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * p2.y;
      length += Math.hypot(x - prev.x, y - prev.y);
      prev = { x, y };
    }
  }
  return { points, path, length: Math.ceil(length) };
}
