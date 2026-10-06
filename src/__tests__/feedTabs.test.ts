import { withTiming } from 'react-native-reanimated';
import { LABEL_FADE } from '../components/FeedTabs';

// Reanimated needs the worklets native module; jest gets the JS stand-in that ships with it.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

interface Stepper {
  current: number;
  onStart: (self: Stepper, value: number, now: number, previous: undefined) => void;
  onFrame: (self: Stepper, now: number) => boolean;
}

/** The label's opacity at the start and after each 60 fps frame of a fade from `from` to `to`. */
function play(from: number, to: number): number[] {
  const anim = withTiming(to, LABEL_FADE) as unknown as Stepper;
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

// A resting label is at 0.72 opacity, the selected one at 1.
describe('feed tab label', () => {
  it('lights the tapped label more than half-way on the first frame', () => {
    expect(play(0.72, 1)[1]).toBeGreaterThan(0.86);
  });

  it('dims the previous label just as quickly', () => {
    expect(play(1, 0.72)[1]).toBeLessThan(0.86);
  });

  it('is fully settled within about 100 ms', () => {
    const frames = play(0.72, 1);
    expect(frames.length - 1).toBeLessThanOrEqual(7);
    expect(frames[frames.length - 1]).toBe(1);
  });
});
