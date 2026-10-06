/**
 * When the floating nav bar shrinks. It shrinks on a scroll down and grows back on a scroll up or
 * at the top. A pause changes nothing, so reading in short flicks doesn't make it bob. Travel is
 * counted per direction so a pixel of jitter against the scroll (FlashList re-layouts, a finger
 * settling) never flips it.
 */
export const NAV_SHRINK = {
  /** Within this many pt of the top the bar is always full size (tolerates sub-pixel offsets). */
  topZone: 8,
  /** Travel (pt) in a new direction before the bar follows it. */
  travel: 6,
};

export interface NavShrinkState {
  shrunk: boolean;
  /** Signed distance scrolled in the current direction (+ down, - up). */
  travel: number;
}

/** One scroll event: `y` is the new offset, `dy` the change since the last event. */
export function navShrinkStep(state: NavShrinkState, y: number, dy: number): NavShrinkState {
  'worklet';
  if (dy === 0) return state;
  const travel = Math.sign(dy) === Math.sign(state.travel) ? state.travel + dy : dy;
  let shrunk = state.shrunk;
  if (y <= NAV_SHRINK.topZone) shrunk = false;
  else if (travel > NAV_SHRINK.travel) shrunk = true;
  else if (travel < -NAV_SHRINK.travel) shrunk = false;
  return { shrunk, travel };
}
