import { Easing } from 'react-native-reanimated';

/**
 * The tab switch "resolve": when a feed tab switches to a feed that is already loaded, the cards
 * on screen take the new content at once (they are reused, never rebuilt) and then sharpen into
 * place, each a beat after the one above. They start soft, slightly small and see-through, and land
 * crisp, full size and opaque. Content first, motion second, so the switch stays instant.
 */
export const TAB_RESOLVE = {
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

/** Where a card stands at progress `k` (0 = just switched, 1 = settled). */
export function resolveFrame(k: number) {
  'worklet';
  const t = Math.min(Math.max(k, 0), 1);
  return {
    opacity: TAB_RESOLVE.opacity + (1 - TAB_RESOLVE.opacity) * t,
    scale: TAB_RESOLVE.scale + (1 - TAB_RESOLVE.scale) * t,
    intensity: TAB_RESOLVE.blur * (1 - t),
  };
}

/** When the card at `index` starts resolving, in ms after the switch; null if it sits it out. */
export function resolveDelay(index: number): number | null {
  return index < TAB_RESOLVE.count ? index * TAB_RESOLVE.stagger : null;
}
