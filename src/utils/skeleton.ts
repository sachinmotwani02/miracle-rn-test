import { mulberry32 } from './random';

/**
 * The Discover screen's loading skeleton. Bone tones live in the theme (`boneInk`, `boneSky`);
 * timing, motion and sizes live here.
 */
export const SKELETON = {
  /**
   * One faint glint of light snaps across every bone at once while anything loads, then rests off
   * screen: a quick pass and a calm pause, rather than a slow, constant shimmer.
   */
  sweep: {
    /** Width of the band, pt: narrow, so the pass reads as a glint. */
    band: 100,
    /** Time for the band to cross the screen, then the rest before the next pass, ms. */
    duration: 650,
    pause: 1100,
    /** Peak white in the middle of the band: very subtle on ink bones, softer still on the sky. */
    inkPeak: 0.35,
    skyPeak: 0.2,
  },
  /** One entry per placeholder feed card: the opacity of its bones (they fade with distance). */
  feedFade: [1, 0.7, 0.4],
  /** Placeholder cards in the carousel. */
  carouselCards: 2,
  reveal: {
    /** Content fades in over its bones for this long, ms. */
    duration: 240,
    /** Delay between consecutive cards, ms. */
    stagger: 70,
  },
  gate: {
    /** A tab's first load draws nothing this long, so a quick reply never flashes bones, ms. */
    showDelay: 150,
    /** Once shown, bones stay at least this long, ms. */
    minVisible: 400,
  },
  /** Simulated latency of the mock API, ms (tunable in the Dials' Skeleton panel). */
  latency: { portfolio: 600, topTrades: 900, feed: 1300, tabFeed: 700 },
} as const;

/** Components that mount this soon after their bones hand over still crossfade; later ones do not. */
export const REVEAL_WINDOW =
  (SKELETON.feedFade.length - 1) * SKELETON.reveal.stagger + SKELETON.reveal.duration + 100;

/** Height of a bone standing in for text of this size: about the cap height, centred in the line. */
export function boneHeight(fontSize: number): number {
  return Math.round(fontSize * 0.72);
}

/** Where the sweep's band (its left edge, in window x) starts and ends: fully off screen both times. */
export function sweepTrack(screenWidth: number): { from: number; to: number } {
  return { from: -SKELETON.sweep.band, to: screenWidth };
}

function between(rnd: () => number, min: number, max: number): number {
  return Math.round(min + rnd() * (max - min));
}

export interface TradeCardWidths {
  name: number;
  stats: number;
  asset: number;
  price: number;
  /** Second note line, percent of the line. */
  note: number;
}

/** Bone widths for placeholder feed card `seed`: within what real cards show, stable per seed. */
export function tradeCardWidths(seed: number): TradeCardWidths {
  const rnd = mulberry32(7001 + seed);
  return {
    name: between(rnd, 64, 100),
    stats: between(rnd, 128, 168),
    asset: between(rnd, 38, 50),
    price: between(rnd, 132, 164),
    note: between(rnd, 58, 86),
  };
}

export interface TopTradeWidths {
  name: number;
  gain: number;
  meta: number;
}

/** Bone widths for placeholder carousel card `seed`. */
export function topTradeWidths(seed: number): TopTradeWidths {
  const rnd = mulberry32(9001 + seed);
  return { name: between(rnd, 52, 76), gain: between(rnd, 48, 64), meta: between(rnd, 104, 132) };
}
