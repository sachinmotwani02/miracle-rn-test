import { Easing } from 'react-native-reanimated';

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
  /** expo-blur intensity at the start; 30 is a 6 px blur on web (intensity x 0.2 px). */
  blur: 30,
  /** Strong ease-out (quint), the same curve as the first-load entrance and the tab labels. */
  easing: Easing.bezier(0.23, 1, 0.32, 1),
};

/** Where a card stands at progress `k` (0 = fully soft, 1 = settled). */
export function resolveFrame(k: number) {
  'worklet';
  const t = Math.min(Math.max(k, 0), 1);
  return {
    opacity: TAB_RESOLVE.opacity + (1 - TAB_RESOLVE.opacity) * t,
    scale: TAB_RESOLVE.scale + (1 - TAB_RESOLVE.scale) * t,
    intensity: TAB_RESOLVE.blur * (1 - t),
  };
}

/** When the card at `index` starts resolving, in ms after the new content lands; null if it sits it out. */
export function resolveDelay(index: number): number | null {
  return index < TAB_RESOLVE.count ? index * TAB_RESOLVE.stagger : null;
}
