import { Easing } from 'react-native-reanimated';

/**
 * The tab switch "slide". The cards stay still and their content slides through them, in the
 * direction the tab row moved: Discover -> Following (a tab to the right) sends the old content a
 * little to the left and brings the new content in from the right; going back reverses it. On the
 * tap itself the old content starts sliding out (and dimming) on the UI thread while the new feed
 * renders into the cards. When it lands the cards take the new content (they are reused, never
 * rebuilt) and slide it in from the other side, each a beat after the one above. One motion that
 * starts on the tap, and the time spent sliding out is time the render takes anyway.
 */
export const TAB_RESOLVE = {
  /** Sliding out on tap: short, and front-loaded so it shows in the first frames. */
  soften: 160,
  duration: 300,
  stagger: 30,
  /** Only the cards that can be on screen right after a switch (the header fills the top). */
  count: 5,
  /** How far the old content travels out, in pt, against the direction of the switch. */
  exit: 16,
  /** How far off the new content starts, in pt, on the side of the tapped tab. */
  enter: 22,
  opacity: 0.45,
  /** Strong ease-out (quint), the same curve as the first-load entrance and the tab labels. */
  easing: Easing.bezier(0.23, 1, 0.32, 1),
};

/** -1 when the tapped tab sits left of the feed on screen, 1 when it sits right, 0 when it is the same. */
export function slideDirection<T>(tabs: readonly T[], from: T, to: T): -1 | 0 | 1 {
  return Math.sign(tabs.indexOf(to) - tabs.indexOf(from)) as -1 | 0 | 1;
}

/**
 * Where a card's content stands. `progress` runs 0 -> 1 as the new content slides in; `pending` runs
 * 0 -> 1 as the old content slides out on the tap (and back to 0 if the tap is undone). The old
 * content travels against `direction` (the latest tap's); the new content arrives from `arrival`,
 * the direction of the switch that brought it, so a quick tap mid-slide does not flip its side.
 */
export function slideFrame(progress: number, pending: number, direction: number, arrival: number = direction) {
  'worklet';
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
  // The commit hands over at progress = 1 - pending exactly; the epsilon keeps float noise on the new side.
  const incoming = progress <= 1 - pending + 1e-6;
  const t = clamp(incoming ? progress : 1 - pending);
  const x = incoming ? arrival * TAB_RESOLVE.enter * (1 - t) : -direction * TAB_RESOLVE.exit * (1 - t);
  return { x, opacity: TAB_RESOLVE.opacity + (1 - TAB_RESOLVE.opacity) * t };
}

/** When the card at `index` starts sliding in, in ms after the new content lands; null if it sits it out. */
export function resolveDelay(index: number): number | null {
  return index < TAB_RESOLVE.count ? index * TAB_RESOLVE.stagger : null;
}
