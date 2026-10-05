/**
 * Motion maths for the ghost mascot. Every function is a worklet, so the same code
 * runs inside Reanimated styles on the UI thread and in jest.
 *
 * Order matters: the worklet transform captures helpers when each worklet is created at
 * module load, so a helper must be declared above the worklets that call it.
 */

export const BREATH = {
  /** One calm breath, ms. */
  period: 3800,
  /** Share of the cycle spent breathing in, then out; the rest is a pause. */
  inhale: 0.4,
  exhale: 0.45,
  /** At the top of a breath the cloud is this much taller and wider (fractions) and higher (pt). */
  grow: 0.03,
  widen: 0.015,
  rise: 0.5,
  /** The halo trails the cloud by this share of a breath (about 200 ms) and floats a little more (pt). */
  haloLag: 0.053,
  haloRise: 0.8,
  /** Fully out of breath (just after a turn), breaths come this much faster and deeper. */
  exertedRate: 0.45,
  exertedDepth: 0.6,
} as const;

export const TURN = {
  /** Seen from above the cloud is an ellipse this deep for its width: side-on it is this much narrower. */
  depth: 0.6,
} as const;

export const TRAIL = {
  /** Longest trail drawn, degrees of arc. */
  maxArc: 140,
  /** Ribbon thickness at the head, pt. */
  width: 1.8,
  /** Points along each edge of the ribbon. */
  samples: 14,
} as const;

export interface TrailRing {
  /** Centre height of the ring, pt. */
  cy: number;
  /** Half-width and half-height of the ring as seen from slightly above (a flattened ellipse), pt. */
  rx: number;
  ry: number;
}

export interface TurnPose {
  /** Silhouette width as a share of the front-on width. */
  width: number;
  /** Face centre, in front-on half-widths from the cloud's centre (positive is right). */
  faceX: number;
  /** Horizontal foreshortening of the face: 1 straight on, 0 edge-on or facing away. */
  faceScale: number;
}

export function clamp(x: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, x));
}

/** Wraps any phase into 0..1. */
export function wrap01(x: number): number {
  'worklet';
  return x - Math.floor(x);
}

function easeInOutSine(u: number): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

/**
 * How full the lungs are, 0 (rest) to 1, at a point in the breath (phase 0..1, wrapped).
 * The inhale eases in and out, the exhale is front-loaded like a passive breath out, then
 * a short pause. Every segment starts and ends at zero speed, so nothing snaps.
 */
export function breathCurve(phase: number): number {
  'worklet';
  const p = wrap01(phase);
  if (p < BREATH.inhale) return easeInOutSine(p / BREATH.inhale);
  const out = (p - BREATH.inhale) / BREATH.exhale;
  if (out < 1) return 1 - easeInOutSine(1 - Math.pow(1 - out, 1.6));
  return 0;
}

/**
 * The ghost turned `deg` degrees about its vertical axis (0 faces the viewer, positive turns
 * the face to the right). In plan view the cloud is the ellipse x = sin(psi), z = depth * cos(psi);
 * the face sits on it at `faceOffset` (sin(psi), from its position on the front view).
 */
export function turnPose(deg: number, faceOffset: number): TurnPose {
  'worklet';
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const d = TURN.depth;
  const sinPsi = clamp(faceOffset, -1, 1);
  const cosPsi = Math.sqrt(1 - sinPsi * sinPsi);
  // Outward normal of the ellipse at the face; its turned z part is how much the face looks at us.
  const nx = d * sinPsi;
  const nz = cosPsi;
  return {
    width: Math.sqrt(c * c + d * d * s * s),
    faceX: sinPsi * c + d * cosPsi * s,
    faceScale: Math.max(0, (nz * c - nx * s) / Math.sqrt(nx * nx + nz * nz)),
  };
}

/**
 * SVG path for a comet trail on a horizontal ring around the ghost: a ribbon from the lagging
 * `tail` angle to the `head` angle (degrees; 0 is the front of the ring, nearest the viewer, and
 * angles grow to the right like the turn), tapering to a point at the tail. "M0 0" (nothing)
 * until the head is ahead of the tail.
 */
export function trailPath(head: number, tail: number, ring: TrailRing, cx: number): string {
  'worklet';
  const arc = Math.min(head - tail, TRAIL.maxArc);
  if (arc <= 0.5) return 'M0 0';
  const start = ((head - arc) * Math.PI) / 180;
  const span = (arc * Math.PI) / 180;
  const n = TRAIL.samples;
  const upper: string[] = [];
  const lower: string[] = [];
  let tip = '';
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const a = start + span * s;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const x = cx + ring.rx * sin;
    const y = ring.cy + ring.ry * cos;
    // Unit tangent and normal of the ellipse here; the ribbon thickens along the normal.
    const tx = ring.rx * cos;
    const ty = -ring.ry * sin;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const w = (TRAIL.width / 2) * Math.pow(s, 0.7);
    const nx = (-ty / len) * w;
    const ny = (tx / len) * w;
    upper.push(`${(x + nx).toFixed(2)} ${(y + ny).toFixed(2)}`);
    lower.push(`${(x - nx).toFixed(2)} ${(y - ny).toFixed(2)}`);
    if (i === n) tip = `${(x + (tx / len) * w).toFixed(2)} ${(y + (ty / len) * w).toFixed(2)}`;
  }
  return `M${upper.join(' L')} L${tip} L${lower.reverse().join(' L')} Z`;
}

/**
 * Gaze offset (-1..1 per axis) for the dizzy swirl at progress t (0..1): one and a quarter
 * laps of a small ellipse that grows out of the centre and shrinks back into it.
 */
export function dizzyOffset(t: number): { x: number; y: number } {
  'worklet';
  const reach = Math.sin(Math.PI * clamp(t, 0, 1));
  const angle = 2.5 * Math.PI * t;
  return { x: reach * Math.sin(angle), y: -0.75 * reach * Math.cos(angle) };
}

/** A random number in [min, max). `rand` is injectable for tests. */
export function randomBetween(min: number, max: number, rand: () => number = Math.random): number {
  'worklet';
  return min + (max - min) * rand();
}
