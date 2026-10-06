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

export const SILK = {
  /** The ribbon winds round the cloud on a helix this wide, seen slightly from above (pt). */
  radius: 20,
  depth: 5,
  /** Height it climbs from tail to head, pt. */
  climb: 18,
  /** Thickness at its widest, pt; it tapers to both ends. */
  width: 2.4,
  /** Degrees of helix: it wraps further round the faster the swirl runs. */
  minSpan: 260,
  maxSpan: 420,
  spanPerSpeed: 0.12,
  /** Colour bands along it, tail to head, and points per band. */
  bands: 5,
  samples: 12,
} as const;

export const SPARKLE = {
  count: 4,
  /** They pop on an ellipse round the cloud, pt. */
  rx: 22,
  ry: 14,
  /** Each one's life, the gap between them and the wait before the first, ms. */
  life: 420,
  stagger: 70,
  delay: 40,
  /** Peak star radius (pt), rise (pt) and spin (degrees) over a life. */
  size: 3,
  rise: 6,
  spin: 60,
} as const;

/** From the ribbon letting go to the last sparkle fading, ms. */
export const SPARKLE_MS = SPARKLE.delay + (SPARKLE.count - 1) * SPARKLE.stagger + SPARKLE.life;

/** A point on a ribbon's centre line: half-width `w`, and whether it is in front of the ghost. */
export interface StripPoint {
  x: number;
  y: number;
  w: number;
  front: boolean;
}

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
 * Fills a ribbon along a centre line, split by depth: `front` for the stretches in front of the
 * ghost (drawn over the cloud) and `back` for those behind it. Each crossing point is shared by
 * both pieces so they join.
 */
export function stripPaths(pts: StripPoint[]): { front: string; back: string } {
  'worklet';
  let front = '';
  let back = '';
  let upper: string[] = [];
  let lower: string[] = [];
  let side = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const l = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= l;
    ty /= l;
    const top = `${(p.x - ty * p.w).toFixed(2)} ${(p.y + tx * p.w).toFixed(2)}`;
    const bottom = `${(p.x + ty * p.w).toFixed(2)} ${(p.y - tx * p.w).toFixed(2)}`;
    const here = p.front ? 1 : -1;
    if (side !== 0 && here !== side) {
      upper.push(top);
      lower.push(bottom);
      const piece = `M${upper.join(' L')} L${lower.reverse().join(' L')} Z`;
      if (side > 0) front += piece;
      else back += piece;
      upper = [];
      lower = [];
    }
    side = here;
    upper.push(top);
    lower.push(bottom);
  }
  if (upper.length > 1) {
    const piece = `M${upper.join(' L')} L${lower.reverse().join(' L')} Z`;
    if (side > 0) front += piece;
    else back += piece;
  }
  return { front: front || 'M0 0', back: back || 'M0 0' };
}

/** Degrees of helix the silk ribbon wraps at a swirl speed (degrees per second). */
export function silkSpan(speed: number): number {
  'worklet';
  return clamp(SILK.minSpan + SILK.spanPerSpeed * speed, SILK.minSpan, SILK.maxSpan);
}

/**
 * One colour band of the silk ribbon (band 0 is the tail), wound round the cloud on a helix that
 * climbs from tail to head, with its head at `angle` (degrees, 0 = nearest the viewer). `lift`
 * (0..1) is the unravel at the end: the helix stretches upward and floats off.
 */
export function silkBand(band: number, angle: number, speed: number, lift: number, cx: number, cy: number): { front: string; back: string } {
  'worklet';
  const span = silkSpan(speed);
  const n = SILK.samples;
  const pts: StripPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (band + i / n) / SILK.bands;
    const a = ((angle - span * (1 - u)) * Math.PI) / 180;
    const h = (SILK.climb / 2 - SILK.climb * u) * (1 + 1.2 * lift) - 12 * lift;
    pts.push({
      x: cx + SILK.radius * Math.sin(a),
      y: cy + h + SILK.depth * Math.cos(a),
      w: (SILK.width / 2) * Math.pow(Math.sin(Math.PI * u), 0.6) + 0.05,
      front: Math.cos(a) >= 0,
    });
  }
  return stripPaths(pts);
}

/**
 * Sparkle `i` at `ms` after the ribbon lets go: where it is, how big and how visible. They pop one
 * after another round the cloud, rise a little and spin as they twinkle out; `seed` (degrees) turns
 * the whole pattern so each burst lands differently.
 */
export function sparkle(
  i: number,
  ms: number,
  seed: number,
  cx: number,
  cy: number,
): { x: number; y: number; scale: number; opacity: number; rotate: number } {
  'worklet';
  const t = (ms - SPARKLE.delay - i * SPARKLE.stagger) / SPARKLE.life;
  if (t <= 0 || t >= 1) return { x: cx, y: cy, scale: 0, opacity: 0, rotate: 0 };
  const k = Math.sin(Math.PI * t);
  const a = ((seed + (i * 360) / SPARKLE.count + (i % 2) * 25) * Math.PI) / 180;
  const rise = SPARKLE.rise * (1 - (1 - t) * (1 - t));
  return {
    x: cx + SPARKLE.rx * Math.cos(a),
    y: cy + (SPARKLE.ry - SPARKLE.rise) * Math.sin(a) - rise,
    scale: SPARKLE.size * k,
    opacity: Math.min(1, k * 1.4),
    rotate: SPARKLE.spin * t,
  };
}

const STAR_POINTS = [0, -1, 0.26, -0.26, 1, 0, 0.26, 0.26, 0, 1, -0.26, 0.26, -1, 0, -0.26, -0.26];

/** A four-point star of radius `r` at (x, y), turned `rotate` degrees; "M0 0" (nothing) at zero size. */
export function starPath(x: number, y: number, r: number, rotate: number): string {
  'worklet';
  if (r <= 0.01) return 'M0 0';
  const c = Math.cos((rotate * Math.PI) / 180);
  const s = Math.sin((rotate * Math.PI) / 180);
  let d = '';
  for (let i = 0; i < STAR_POINTS.length; i += 2) {
    const px = STAR_POINTS[i];
    const py = STAR_POINTS[i + 1];
    d += `${i === 0 ? 'M' : ' L'}${(x + r * (px * c - py * s)).toFixed(2)} ${(y + r * (px * s + py * c)).toFixed(2)}`;
  }
  return `${d} Z`;
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

/**
 * How long after a press the hold starts charging: the usual `hold` delay, or longer if the last
 * turn is still in the air (it charges as soon as that lands, rather than ignoring the hold).
 */
export function chargeDelay(now: number, landedAt: number, hold: number): number {
  return Math.max(hold, landedAt - now);
}

/**
 * What letting go of the ghost does. A hold that has started charging always gets the big spin
 * (the ribbon showing is a promise); a plain tap turns, up to `maxTurns` stacked in a burst;
 * nothing happens while the big spin is still in the air.
 */
export function releaseAction(
  charging: boolean,
  now: number,
  bigUntil: number,
  queued: number,
  maxTurns: number,
): 'big' | 'turn' | 'ignore' {
  if (now < bigUntil) return 'ignore';
  if (charging) return 'big';
  return queued >= maxTurns ? 'ignore' : 'turn';
}

/** A random number in [min, max). `rand` is injectable for tests. */
export function randomBetween(min: number, max: number, rand: () => number = Math.random): number {
  'worklet';
  return min + (max - min) * rand();
}
