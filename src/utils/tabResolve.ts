import { Easing, EasingFunctionFactory } from 'react-native-reanimated';

/** Strong ease-out (quint), the same curve as the first-load entrance and the tab labels. */
const CURVE = { x1: 0.23, y1: 1, x2: 0.32, y2: 1 };

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
  duration: 300,
  stagger: 45,
  /** Only the cards that can be on screen right after a switch (the header fills the top). */
  count: 5,
  scale: 0.97,
  opacity: 0.45,
  /** expo-blur intensity when fully soft; 12 is a 2.4 px blur on web (intensity x 0.2 px). */
  blur: 12,
  curve: CURVE,
  easing: Easing.bezier(CURVE.x1, CURVE.y1, CURVE.x2, CURVE.y2),
};

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
