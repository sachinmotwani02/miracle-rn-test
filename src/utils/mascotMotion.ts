/**
 * Motion maths for the ghost mascot. Every function is a worklet, so the same code
 * runs inside Reanimated styles on the UI thread and in jest.
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
