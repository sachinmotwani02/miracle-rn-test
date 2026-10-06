import { withSpring, type WithSpringConfig } from 'react-native-reanimated';
import { PRESS, RELEASE } from '../components/DepositButton';

// Reanimated needs the worklets native module; jest gets the JS stand-in that ships with it.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

interface Stepper {
  current: number;
  onStart: (self: Stepper, value: number, now: number, previous: undefined) => void;
  onFrame: (self: Stepper, now: number) => boolean;
}

/** Steps Reanimated's own spring with `config` from `from` to `to` at 60 fps, one value per frame. */
function play(config: WithSpringConfig, from: number, to: number): number[] {
  const anim = withSpring(to, config) as unknown as Stepper;
  let now = 1000;
  anim.onStart(anim, from, now, undefined);
  const frames = [from];
  for (let done = false; !done && frames.length < 600; ) {
    now += 1000 / 60;
    done = anim.onFrame(anim, now);
    frames.push(anim.current);
  }
  return frames;
}

// Tuned with mass 1. Under Reanimated 4's default mass 4 each of these overshot by a third to a half
// of its travel and took 1.5 to 2.6 s to settle.
describe.each([
  { name: 'the Deposit button squeezing on press', config: PRESS, from: 1, to: 0.95, overshootPct: 30 },
  { name: 'the Deposit button springing back on release', config: RELEASE, from: 0.95, to: 1, overshootPct: 30 },
])('$name', ({ config, from, to, overshootPct }) => {
  it(`swings past its target by at most ${overshootPct}% of the travel`, () => {
    const overshoot = Math.max(...play(config, from, to).map(v => (v - to) / (to - from)));
    expect(overshoot * 100).toBeLessThanOrEqual(overshootPct);
  });

  it('settles within 2% of its travel in under 0.7 s', () => {
    const lastAway = play(config, from, to).findLastIndex(v => Math.abs(v - to) > 0.02 * Math.abs(to - from));
    expect((lastAway + 1) / 60).toBeLessThan(0.7);
  });
});
