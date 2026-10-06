import { cardEntrance } from '../utils/cardEntrance';

// Reanimated needs the worklets native module; jest gets the JS stand-in that ships with it.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

interface Stepper {
  current: number;
  onStart: (self: Stepper, value: number, now: number, previous: undefined) => void;
  onFrame: (self: Stepper, now: number) => boolean;
}

/** Steps the entrance's own Reanimated animation from `from` to `to` at 60 fps, one value per frame. */
function play(from: number, to: number): number[] {
  const [animation, config] = cardEntrance(0).getAnimationAndConfig();
  const anim = animation(to, config) as Stepper;
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

describe('cardEntrance', () => {
  it('starts each card transparent, 12 pt below its slot (spec: staggered fade + 12 pt rise)', () => {
    const { initialValues } = cardEntrance(0).build()({} as never);
    expect(initialValues).toEqual({ opacity: 0, transform: [{ translateY: 12 }] });
  });

  it('staggers the cards 40 ms apart', () => {
    expect([0, 1, 2, 3, 4].map(i => cardEntrance(i).getDelay())).toEqual([0, 40, 80, 120, 160]);
  });

  it('rises into its slot without bouncing past it', () => {
    expect(Math.min(...play(12, 0))).toBeGreaterThan(-0.05);
  });

  it('fades in once, never dimming again on the way', () => {
    const opacity = play(0, 1);
    opacity.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(opacity[i] - 1e-9));
  });

  it('covers most of the rise in the first 100 ms', () => {
    const rise = play(12, 0);
    expect(rise[6]).toBeLessThan(12 * 0.25);
  });

  it('settles in under 300 ms with no slow tail', () => {
    expect((play(12, 0).length - 1) / 60).toBeLessThan(0.3);
  });
});
