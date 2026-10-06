import { NAV_SHRINK, NavShrinkState, navShrinkStep } from '../utils/navShrink';

/** Feeds a run of scroll offsets through the rule, returning `shrunk` after each step. */
function scroll(offsets: number[], from: NavShrinkState = { shrunk: false, travel: 0 }) {
  let state = from;
  let prev = offsets[0];
  const shrunk: boolean[] = [];
  for (const y of offsets.slice(1)) {
    state = navShrinkStep(state, y, y - prev);
    prev = y;
    shrunk.push(state.shrunk);
  }
  return { state, shrunk };
}

const SHRUNK: NavShrinkState = { shrunk: true, travel: 300 };

describe('navShrinkStep', () => {
  it('shrinks on a scroll down', () => {
    expect(scroll([100, 100 + NAV_SHRINK.travel + 1]).state.shrunk).toBe(true);
  });

  it('grows back as soon as the scroll turns upward, well away from the top', () => {
    expect(scroll([500, 500 - NAV_SHRINK.travel - 1], SHRUNK).state.shrunk).toBe(false);
  });

  it('a pause changes nothing', () => {
    const { state } = scroll([100, 200]);
    expect(navShrinkStep(state, 200, 0)).toEqual(state);
  });

  it('ignores a pixel of jitter against the scroll in either direction', () => {
    expect(scroll([100, 200, 199, 260]).shrunk).toEqual([true, true, true]);
    expect(scroll([500, 400, 401, 350], { shrunk: false, travel: -100 }).shrunk).toEqual([false, false, false]);
  });

  it('never shrinks inside the top zone', () => {
    expect(scroll([0, 4, NAV_SHRINK.topZone]).shrunk).toEqual([false, false]);
  });

  it('is full size at the top even if the last move was downward', () => {
    expect(navShrinkStep(SHRUNK, 0, 1).shrunk).toBe(false);
  });
});
