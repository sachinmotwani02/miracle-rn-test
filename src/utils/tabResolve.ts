import { Easing, EasingFunctionFactory } from 'react-native-reanimated';

/**
 * Ease-out curves for the resolve, from the one that sharpens in its first frames to one that
 * takes its whole duration to arrive. With `snap` (quint) a 300 ms resolve is 40% done at 30 ms
 * and 70% at 60 ms, so the sharpening reads in about four frames; `smooth` (cubic) is half done
 * at a third of its duration and still moving at two thirds. The Dials' Curve slider indexes it.
 */
export const RESOLVE_CURVES = [
  { name: 'snap', easing: Easing.bezier(0.23, 1, 0.32, 1) },
  { name: 'quick', easing: Easing.bezier(0.25, 1, 0.5, 1) },
  { name: 'smooth', easing: Easing.bezier(0.33, 1, 0.68, 1) },
  { name: 'gentle', easing: Easing.bezier(0.61, 1, 0.88, 1) },
] as const;

/**
 * The tab switch "resolve". On the tap itself the cards on screen start to soften (slightly small,
 * see-through, blurred), on the UI thread, while the new feed renders into them. When it lands they
 * take the new content (they are reused, never rebuilt) and sharpen back into place from wherever
 * the softening had got to, each a beat after the one above. One motion that starts on the tap, and
 * the time it spends soft is time the render takes anyway.
 */
export const TAB_RESOLVE = {
  /** Softening on tap: short, and front-loaded so it shows in the first frames. */
  soften: 160,
  duration: 190,
  stagger: 45,
  /** The cards on screen right after a switch (the header fills the top); the rest swap plainly. */
  count: 3,
  scale: 0.96,
  opacity: 0.4,
  /** expo-blur intensity when fully soft; 8 is a 1.6 px blur on web (intensity x 0.2 px). */
  blur: 8,
  /**
   * The resolve's ease-out: `smooth` (cubic) in RESOLVE_CURVES. Half way at 60 ms of the 190, and
   * still moving at the end, so it reads as the card coming into focus; the snap (quint) that the
   * entrance and the tab labels use sharpened in four frames and read as a cut.
   */
  curve: 2,
  easing: RESOLVE_CURVES[2].easing,
  /**
   * The new feed's cards are often taller or shorter than the old ones (a note's line count): the
   * card eases to its new height over this many ms (TabResolve), and the cards below follow. 0 snaps.
   */
  height: 220,
};

/** The curve at `index` in RESOLVE_CURVES, clamped; fractional dial values round down. */
export function resolveEasing(index: number): EasingFunctionFactory {
  const i = Math.min(Math.max(Math.floor(index), 0), RESOLVE_CURVES.length - 1);
  return RESOLVE_CURVES[i].easing;
}

/** Everything that shapes the resolve; the Dials' Tab switch panel hands the screen a live one. */
export interface ResolveLook {
  soften: number;
  duration: number;
  stagger: number;
  count: number;
  scale: number;
  opacity: number;
  blur: number;
  easing: EasingFunctionFactory;
  height: number;
}

/** Where a card stands at progress `k` (0 = fully soft, 1 = settled). */
export function resolveFrame(k: number, look: Pick<ResolveLook, 'opacity' | 'scale' | 'blur'> = TAB_RESOLVE) {
  'worklet';
  const t = Math.min(Math.max(k, 0), 1);
  return {
    opacity: look.opacity + (1 - look.opacity) * t,
    scale: look.scale + (1 - look.scale) * t,
    intensity: look.blur * (1 - t),
  };
}

/** When the card at `index` starts resolving, in ms after the new content lands; null if it sits it out. */
export function resolveDelay(index: number, look: Pick<ResolveLook, 'count' | 'stagger'> = TAB_RESOLVE): number | null {
  return index < look.count ? index * look.stagger : null;
}
