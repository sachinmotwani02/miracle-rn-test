import React from 'react';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Mascot } from '../components/Mascot';
import { haptic } from '../utils/haptics';

// The press logic runs on JS timers; the animations themselves are mocked to jump to their ends.
// The animation builders are watched, to see when the ghost queues its motion.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  return {
    ...mock,
    withTiming: jest.fn(mock.withTiming),
    withSpring: jest.fn(mock.withSpring),
    withSequence: jest.fn(mock.withSequence),
    withDelay: jest.fn(mock.withDelay),
    useReducedMotion: () => false,
    useFrameCallback: () => ({ setActive: () => {}, isActive: false, callbackId: -1 }),
  };
});
jest.mock('../utils/haptics', () => ({ haptic: jest.fn() }));

// The haptics mark each beat: 'light' on a press the ghost answers, 'medium' when the rare spin
// launches, 'soft' when a turn (plain or rare) lands.
const haptics = haptic as jest.MockedFunction<typeof haptic>;
const count = (style: Parameters<typeof haptic>[0]) => haptics.mock.calls.filter(([s]) => s === style).length;
const reanimated = jest.requireMock<Record<'withTiming' | 'withSpring' | 'withSequence' | 'withDelay', jest.Mock>>(
  'react-native-reanimated',
);
const builders = [reanimated.withTiming, reanimated.withSpring, reanimated.withSequence, reanimated.withDelay];

beforeEach(() => {
  jest.useFakeTimers();
  haptics.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

// A finger at `pageX` on the ghost's 60 x 64 slot, which sits at (100, 700) on screen.
const touch = (pageX: number) => ({
  persist: () => {},
  currentTarget: { measure: (done: (...box: number[]) => void) => done(0, 0, 60, 64, 100, 700) },
  nativeEvent: {
    changedTouches: [],
    touches: [],
    identifier: 0,
    locationX: 0,
    locationY: 0,
    pageX,
    pageY: 730,
    target: 0,
    timestamp: Date.now(),
  },
});

// userEvent and the raw responder events both drive the real Pressability, so onPressIn,
// onPressOut and onPress arrive in the order and at the times a phone sends them.
async function ghost() {
  const user = userEvent.setup();
  await render(<Mascot />);
  const target = screen.getByRole('button', { name: 'Ghost' });
  const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));
  return {
    tap: () => user.press(target),
    /** A tap, then long enough for its turn (plain or rare) to play out. */
    tapAndWatch: async () => {
      await user.press(target);
      await wait(2500);
    },
    hold: (ms: number) => user.longPress(target, { duration: ms }),
    wait,
    down: (x: number) => fireEvent(target, 'responderGrant', touch(x)),
    move: (x: number) => fireEvent(target, 'responderMove', touch(x)),
    up: (x: number) => fireEvent(target, 'responderRelease', touch(x)),
  };
}

describe('tapping the ghost', () => {
  it('plays the rare spin on every fourth tap', async () => {
    const g = await ghost();
    for (let i = 0; i < 3; i++) await g.tapAndWatch();
    expect(count('soft')).toBe(3);
    expect(count('medium')).toBe(0);
    await g.tapAndWatch();
    expect(count('medium')).toBe(1);
    for (let i = 0; i < 3; i++) await g.tapAndWatch();
    expect(count('medium')).toBe(1);
    await g.tapAndWatch();
    expect(count('medium')).toBe(2);
  });

  it('saves the rare spin for a tap once the ghost has landed, so a fast burst just stacks turns', async () => {
    const g = await ghost();
    for (let i = 0; i < 4; i++) await g.tap();
    await g.wait(1500);
    expect(count('medium')).toBe(0);
    await g.tapAndWatch();
    expect(count('medium')).toBe(1);
  });

  it('ignores presses while the rare spin winds up and is in the air, then turns again', async () => {
    const g = await ghost();
    for (let i = 0; i < 3; i++) await g.tapAndWatch();
    await g.tap(); // the rare spin
    await g.wait(100);
    await g.tap(); // still winding up
    await g.wait(300);
    await g.tap(); // in the air
    expect(count('light')).toBe(4); // only the presses it answered
    await g.wait(3000);
    expect(count('soft')).toBe(4); // three plain landings and the rare one's
    await g.tapAndWatch();
    expect(count('soft')).toBe(5);
    expect(count('medium')).toBe(1);
  });

  it('queues the whole rare spin as the finger lifts, so no stage waits on a JS timer', async () => {
    const g = await ghost();
    for (let i = 0; i < 3; i++) await g.tapAndWatch();
    builders.forEach(b => b.mockClear());
    await g.tap(); // the rare spin
    // The double spin is queued already: three plain turns took the ghost to 1080 deg, this one 720 more.
    expect(reanimated.withSpring).toHaveBeenCalledWith(1800, expect.anything());
    builders.forEach(b => b.mockClear());
    // The launch (240 ms after the release), the landing burst and the twinkles (720 ms) come from
    // that queue. JS still marks the beats with haptics.
    await g.wait(2000);
    expect(builders.map(b => b.mock.calls.length)).toEqual([0, 0, 0, 0]);
    expect(count('medium')).toBe(1);
    expect(count('soft')).toBe(4);
  });

  it('treats a long press as a tap: nothing charges, and it turns on release', async () => {
    const g = await ghost();
    await g.hold(1200);
    await g.wait(1500);
    expect(count('selection')).toBe(0);
    expect(count('medium')).toBe(0);
    expect(count('soft')).toBe(1);
  });

  it('still turns when the finger drifts a little off the ghost', async () => {
    const g = await ghost();
    await g.down(130);
    await g.wait(300);
    await g.move(190); // 30 pt past the slot's right edge
    await g.up(190);
    await g.wait(1500);
    expect(count('soft')).toBe(1);
  });

  it('does nothing, and counts nothing, when the finger slides right off', async () => {
    const g = await ghost();
    await g.down(130);
    await g.wait(300);
    await g.move(400);
    await g.up(400);
    await g.wait(1500);
    expect(count('soft')).toBe(0);
    for (let i = 0; i < 3; i++) await g.tapAndWatch();
    expect(count('medium')).toBe(0);
  });
});
