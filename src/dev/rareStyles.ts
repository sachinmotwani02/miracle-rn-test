import { StripPoint, clamp, stripPaths } from '../utils/mascotMotion';

/**
 * The ghost's rare spin in its earlier, rejected looks, kept for the craft showcase
 * (public/craft.html), which switches between them; the app itself always uses the orbit rings.
 * - `silk`: one rainbow ribbon wound round the ghost that unravels upward on landing
 *   (shipped in ba53c57, replaced by the orbit rings in 481413f).
 * - `comets`: twelve comets circling on tilted orbits that pop into confetti on landing
 *   (prototype C from the swirl comparison; never shipped).
 * No React imports: craftFrame loads this before anything else.
 */
export type RareStyle = 'orbit' | 'silk' | 'comets';

let current: RareStyle = 'orbit';
const listeners = new Set<() => void>();

export function getRareStyle(): RareStyle {
  return current;
}

export function setRareStyle(style: RareStyle) {
  current = style;
  listeners.forEach(listener => listener());
}

/** The rare spins view plays the rare spin on every tap instead of every fourth. */
let everyTap = false;

export function rareOnEveryTap(): boolean {
  return everyTap;
}

export function setRareOnEveryTap(on: boolean) {
  everyTap = on;
}

export function subscribeRareStyle(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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
  /** The unravel on landing, ms. */
  unravelMs: 520,
} as const;

/**
 * One colour band of the silk ribbon (band 0 is the tail), wound round the cloud on a helix that
 * climbs from tail to head, with its head at `angle` (degrees, 0 = nearest the viewer). `lift`
 * (0..1) is the unravel at the end: the helix stretches upward and floats off.
 */
export function silkBand(band: number, angle: number, speed: number, lift: number, cx: number, cy: number): { front: string; back: string } {
  'worklet';
  const span = clamp(SILK.minSpan + SILK.spanPerSpeed * speed, SILK.minSpan, SILK.maxSpan);
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

export const COMETS = {
  count: 12,
  /** Head dot radius, pt, and tail thickness at the head. */
  dot: 1.25,
  tailWidth: 1.3,
  /** Tail length, degrees of arc, growing with the swirl's speed. */
  minTail: 18,
  maxTail: 80,
  tailPerSpeed: 0.05,
  /** Confetti: fades over this long, pt/s^2 of gravity. */
  confettiMs: 700,
  gravity: 150,
} as const;

/** Comet `i`'s orbit, phase, rate and burst speed (pt/s), spread evenly round the ghost. */
export function comet(i: number): { rx: number; ry: number; tilt: number; phase: number; rate: number; burst: number } {
  'worklet';
  return {
    rx: 16 + ((i * 5) % 9),
    ry: 4 + ((i * 3) % 4),
    tilt: -60 + ((i * 41) % 120),
    phase: i * 30,
    rate: 0.8 + (i % 5) * 0.11,
    burst: 55 + ((i * 13) % 50),
  };
}

/** Where comet `i`'s head is at `deg` degrees round its orbit, and whether it is in front of the ghost. */
export function cometPoint(i: number, deg: number, cx: number, cy: number): { x: number; y: number; front: boolean } {
  'worklet';
  const o = comet(i);
  const a = (deg * Math.PI) / 180;
  const t = (o.tilt * Math.PI) / 180;
  const lx = o.rx * Math.sin(a);
  const ly = o.ry * Math.cos(a);
  return { x: cx + lx * Math.cos(t) - ly * Math.sin(t), y: cy + lx * Math.sin(t) + ly * Math.cos(t), front: Math.cos(a) >= 0 };
}

/** Comet `i` in flight: its tapering tail (front and back halves) behind the head at `head` degrees. */
export function cometTail(i: number, head: number, speed: number, cx: number, cy: number): { front: string; back: string } {
  'worklet';
  const arc = clamp(COMETS.minTail + COMETS.tailPerSpeed * speed, COMETS.minTail, COMETS.maxTail);
  const n = 8;
  const pts: StripPoint[] = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n;
    const p = cometPoint(i, head - arc + arc * s, cx, cy);
    pts.push({ x: p.x, y: p.y, w: (COMETS.tailWidth / 2) * Math.pow(s, 0.7), front: p.front });
  }
  return stripPaths(pts);
}

/**
 * Comet `i` `ms` after the burst, which caught its head at `head` degrees: a bit of confetti thrown
 * outward from there, falling under gravity, shrinking and fading.
 */
export function confetti(i: number, head: number, ms: number, cx: number, cy: number): { x: number; y: number; r: number; opacity: number } {
  'worklet';
  const o = comet(i);
  const from = cometPoint(i, head, cx, cy);
  const dx = from.x - cx;
  const dy = from.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const t = ms / 1000;
  const life = clamp(ms / COMETS.confettiMs, 0, 1);
  return {
    x: from.x + (dx / len) * o.burst * t,
    y: from.y + ((dy / len) * o.burst - 30) * t + (COMETS.gravity / 2) * t * t,
    r: COMETS.dot * (1 - 0.4 * life),
    opacity: 1 - life,
  };
}
