/**
 * Scroll maths for the sky bar: how the header hands Deposit and the feed tabs to a bar under the
 * status bar, and takes them back (docs/superpowers/specs/2026-10-06-sky-bar-header-design.md).
 *
 * Every function is a worklet, so the same code runs in Reanimated styles on the UI thread and in
 * jest. Order matters: the worklet transform captures helpers when each worklet is created at
 * module load, so a helper must be declared above the worklets that call it.
 */

export const SKY_BAR = {
  /** The bar's row under the status bar, pt. */
  height: 44,
  /** The 36 pt Deposit pill and the 20 pt tab row sit centred in the row. */
  depositInset: 4,
  tabsInset: 12,
  /** The tab row rises its last 40 pt into the bar, folding into the dropdown on the way. */
  rise: 40,
  /** While the row rises, the bar's edge rides this far above it so the row stays in view. */
  rideGap: 8,
  /** Over the first 60 pt of scroll the edge slides down from under the status bar. */
  descent: 60,
  /** The background sky's parallax (SkyBackground). */
  parallax: 0.3,
  /** A bar left partway settles once scrolling has been still this long, over this long (ms). */
  settleDelay: 160,
  settleDuration: 180,
  /** The sheet edge's corners: the cards' radius. */
  corner: 24,
} as const;

/** Positions inside the list header, in content coordinates (pt). */
export interface HeaderLayout {
  /** Top of the Deposit pill. */
  depositTop: number;
  /** Top of the tab row. */
  tabsTop: number;
  /** Top of the first feed card, which is the header's height. */
  feedTop: number;
}

/** Scroll offsets (pt) where the bar's choreography changes, for one status bar height. */
export interface BarGeometry {
  /** Status bar height (the safe-area top inset). */
  top: number;
  /** Deposit's top reaches its slot in the bar. */
  pin: number;
  /** The tab row reaches its slot in the bar. */
  dock: number;
  /** The tab row starts its rise into the bar. */
  riseStart: number;
  /** Past this the bar answers the scroll direction. */
  feed: number;
  /** Puts the first card right under the bar. */
  feedTop: number;
  /** The tab row's top in content coordinates, for the edge that rides above it. */
  tabsTop: number;
}

/** The header as laid out from the Figma, for a status bar `top` pt tall (59 in the Figma frame). */
export function figmaHeader(top: number): HeaderLayout {
  'worklet';
  return { depositTop: top + 28, tabsTop: top + 250, feedTop: top + 288 };
}

export function clamp01(x: number): number {
  'worklet';
  return Math.min(1, Math.max(0, x));
}

/** Ease-in-out (quadratic), the fold's curve. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function barGeometry(top: number, header: HeaderLayout): BarGeometry {
  'worklet';
  const dock = header.tabsTop - (top + SKY_BAR.tabsInset);
  return {
    top,
    pin: header.depositTop - (top + SKY_BAR.depositInset),
    dock,
    riseStart: dock - SKY_BAR.rise,
    feed: dock + SKY_BAR.height,
    feedTop: header.feedTop - (top + SKY_BAR.height),
    tabsTop: header.tabsTop,
  };
}

/**
 * The bar's presence (0 hidden, 1 shown) after the list scrolls from `prevY` to `y`: hidden at the
 * very top, held through the header so the hand-back runs with a settled bar, and following the
 * finger in the feed (44 pt of scroll up shows it fully, 44 pt down hides it).
 */
export function nextPresence(h: number, y: number, prevY: number, g: BarGeometry): number {
  'worklet';
  if (y <= 0) return 0;
  if (y >= g.feed) return clamp01(h - (y - prevY) / SKY_BAR.height);
  return h;
}

/** Scrolling back into the header with the bar partway shown: it should finish sliding in. */
export function crossesIntoHeader(h: number, y: number, prevY: number, g: BarGeometry): boolean {
  'worklet';
  return prevY >= g.feed && y < g.feed && h > 0 && h < 1;
}

/** Where a bar left partway settles: whichever end is nearer. */
export function settleTarget(h: number): number {
  'worklet';
  return h < 0.5 ? 0 : 1;
}

/**
 * Screen y of the bar's bottom edge. With the bar shown it slides down from under the status bar
 * over the first 60 pt, rides 8 pt above the tab row while the row rises in, and sits under the row
 * once it docks; presence scales the whole thing back up under the status bar.
 */
export function bandEdge(s: number, h: number, g: BarGeometry): number {
  'worklet';
  let full: number;
  if (s >= g.dock) full = g.top + SKY_BAR.height;
  else if (s >= g.riseStart) full = g.tabsTop - s - SKY_BAR.rideGap;
  else full = g.top + SKY_BAR.height * clamp01(s / SKY_BAR.descent);
  return g.top + (full - g.top) * h;
}

/** How far the tab row has folded into the dropdown (0..1), only while the bar is there to take it. */
export function foldProgress(s: number, h: number, g: BarGeometry): number {
  'worklet';
  return clamp01((s - g.riseStart) / SKY_BAR.rise) * h;
}

/** The sky behind the bar follows the background's parallax until the tabs dock, then holds. */
export function skyOffset(s: number, g: BarGeometry): number {
  'worklet';
  return SKY_BAR.parallax * Math.min(Math.max(s, 0), Math.max(g.dock, 0));
}

/** How far above their slots the bar's controls sit: they slide out under the status bar. */
export function barLift(h: number): number {
  'worklet';
  return (1 - h) * SKY_BAR.height;
}

export function depositPinned(s: number, h: number, g: BarGeometry): boolean {
  'worklet';
  return s >= g.pin && h > 0;
}

export function tabsDocked(s: number, h: number, g: BarGeometry): boolean {
  'worklet';
  return s >= g.dock && h > 0;
}

/**
 * One tab mid-fold: every tab slides to the row's start while the others fade and shrink into the
 * active one. `opacity` multiplies the tab's own selected/unselected opacity.
 */
export function foldedTab(m: number, x: number, start: number, active: boolean) {
  'worklet';
  const e = easeInOut(m);
  return {
    translateX: (start - x) * e,
    scale: active ? 1 : 1 - 0.15 * e,
    opacity: active ? 1 : 1 - clamp01(m * 1.6),
  };
}

/** The chevron fades in after the active label over the fold's second half, sliding 6 pt in. */
export function chevronReveal(m: number) {
  'worklet';
  const c = clamp01(m * 2 - 1);
  return { opacity: c, translateX: 6 * (c - 1) };
}
