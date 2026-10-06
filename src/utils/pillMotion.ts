/**
 * Motion and glass for the nav bar's active pill. The defaults live here; in dev builds the
 * Dials panel overrides them live (see FloatingNavBar), and its Copy button prints values in
 * this same shape, ready to paste back over `PILL`.
 */

export const PILL = {
  spring: {
    /** Perceptual duration, ms; the whole move runs about 1.5x this. */
    duration: 250,
    /** 0 lands dead on the tab; higher overshoots. The damping ratio is 1 - bounce. */
    bounce: 0,
  },
  stretch: {
    /** Extra width at full stretch: 0.23 is 23% wider. */
    amount: 0.23,
    /** Distance travelled, in pill widths, before the stretch is full: it grows in, never snaps. */
    easeIn: 1,
    /** Distance still to travel, in pill widths, at which the stretch starts letting go. */
    reach: 0.65,
    /** Height given up as it widens: 0 keeps the height, 0.5 thins a little, 1 keeps the area. */
    squash: 0.5,
  },
  /** The Figma's 12% white capsule, its Glass effect faked with inner white shadows. */
  glass: {
    /** Fill, white alpha. */
    fill: 0.12,
    /** Catch-light along the top edge, white alpha. */
    topLight: 0.32,
    /** Fainter catch-light along the bottom edge, white alpha. */
    bottomLight: 0.15,
    /** Soft glow all round the inside, white alpha, and its blur in pt. */
    glow: 0.08,
    glowBlur: 6,
  },
} as const;

type Numbers<T> = { -readonly [K in keyof T]: number };
export type PillSpring = Numbers<typeof PILL.spring>;
export type PillStretch = Numbers<typeof PILL.stretch>;
export type PillGlass = Numbers<typeof PILL.glass>;

/**
 * How stretched the pill is, 0..1, `traveled` pt into a move with `remaining` pt to go: it grows
 * over the first `easeIn` and lets go over the last `reach`, so it is unstretched at both ends.
 */
export function stretchFactor(traveled: number, remaining: number, width: number, p: PillStretch): number {
  'worklet';
  const growing = Math.abs(traveled) / Math.max(p.easeIn * width, 1e-6);
  const landing = Math.abs(remaining) / Math.max(p.reach * width, 1e-6);
  return Math.min(growing, landing, 1);
}

/** Scale of the pill `traveled` pt into a move with `remaining` pt to go. */
export function pillShape(traveled: number, remaining: number, width: number, p: PillStretch): { scaleX: number; scaleY: number } {
  'worklet';
  const t = stretchFactor(traveled, remaining, width, p);
  // Smoothstep: no kink where the stretch starts, peaks or lets go.
  const scaleX = 1 + t * t * (3 - 2 * t) * p.amount;
  return { scaleX, scaleY: Math.pow(scaleX, -p.squash) };
}

/**
 * Where a new move should count its travel from. A move from rest starts at `x`; a tap mid-flight
 * starts a little behind it, so the new move picks up the stretch the pill already has.
 */
export function moveStart(x: number, start: number, oldTarget: number, newTarget: number, width: number, p: PillStretch): number {
  const t = stretchFactor(x - start, oldTarget - x, width, p);
  return x - Math.sign(newTarget - x) * t * p.easeIn * width;
}

/** Reanimated spring config; `slowMo` stretches it out for inspecting the motion. */
export function pillSpring(p: PillSpring, slowMo = 1): { duration: number; dampingRatio: number } {
  return { duration: p.duration * slowMo, dampingRatio: 1 - p.bounce };
}

/** Fill and inset shadows for the pill. */
export function pillGlass(p: PillGlass): { backgroundColor: string; boxShadow: string } {
  const white = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;
  return {
    backgroundColor: white(p.fill),
    boxShadow: [
      `inset 0 1px 1px ${white(p.topLight)}`,
      `inset 0 -1px 1px ${white(p.bottomLight)}`,
      `inset 0 0 ${p.glowBlur}px ${white(p.glow)}`,
    ].join(', '),
  };
}
