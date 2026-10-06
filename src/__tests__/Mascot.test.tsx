import React from 'react';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Mascot } from '../components/Mascot';
import { haptic } from '../utils/haptics';

// The press logic runs on JS timers; the animations themselves are mocked to jump to their ends.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
  useFrameCallback: () => ({ setActive: () => {}, isActive: false, callbackId: -1 }),
}));
jest.mock('../utils/haptics', () => ({ haptic: jest.fn() }));

// The haptics mark each beat: 'selection' when the ribbon starts charging, 'medium' when the big
// spin fires, 'soft' when a turn (plain or big) lands.
const haptics = haptic as jest.MockedFunction<typeof haptic>;
const count = (style: Parameters<typeof haptic>[0]) => haptics.mock.calls.filter(([s]) => s === style).length;

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
  return {
    hold: (ms: number) => user.longPress(target, { duration: ms }),
    tap: () => user.press(target),
    wait: (ms: number) => act(async () => jest.advanceTimersByTime(ms)),
    down: (x: number) => fireEvent(target, 'responderGrant', touch(x)),
    move: (x: number) => fireEvent(target, 'responderMove', touch(x)),
    up: (x: number) => fireEvent(target, 'responderRelease', touch(x)),
  };
}

describe('holding the ghost', () => {
  it('fires the big spin on a long hold', async () => {
    const g = await ghost();
    await g.hold(1000);
    expect(count('selection')).toBeGreaterThan(0);
    expect(count('medium')).toBe(1);
  });

  it('fires the big spin as soon as the ribbon has appeared', async () => {
    const g = await ghost();
    await g.hold(400);
    expect(count('medium')).toBe(1);
  });

  it('fires the big spin on every hold, even one started while the last is still landing', async () => {
    const g = await ghost();
    for (let i = 0; i < 4; i++) {
      await g.hold(900);
      await g.wait(200);
    }
    expect(count('medium')).toBe(4);
  });

  it('charges a hold that starts while a tap is still turning, once the ghost lands', async () => {
    const g = await ghost();
    await g.tap();
    await g.hold(800);
    expect(count('medium')).toBe(1);
  });

  it('keeps the charge when the finger drifts a little off the ghost', async () => {
    const g = await ghost();
    await g.down(130);
    await g.wait(600);
    await g.move(190); // 30 pt past the slot's right edge
    await g.up(190);
    expect(count('medium')).toBe(1);
  });

  it('lets the ribbon fizzle out when the finger slides right off, and still charges next time', async () => {
    const g = await ghost();
    await g.down(130);
    await g.wait(600);
    await g.move(400);
    await g.wait(200);
    await g.up(400);
    await g.wait(2000);
    expect(count('selection')).toBeGreaterThan(0);
    expect(count('medium')).toBe(0);
    await g.hold(800);
    expect(count('medium')).toBe(1);
  });

  it('only turns on a tap, without charging', async () => {
    const g = await ghost();
    await g.tap();
    await g.wait(2000);
    expect(count('selection')).toBe(0);
    expect(count('medium')).toBe(0);
    expect(count('soft')).toBe(1);
  });

  it('ignores a tap while the big spin is in the air, and turns again once it has landed', async () => {
    const g = await ghost();
    await g.hold(1000);
    await g.tap();
    await g.wait(3000);
    expect(count('soft')).toBe(1); // the big spin's landing only
    await g.tap();
    await g.wait(2000);
    expect(count('soft')).toBe(2);
    expect(count('medium')).toBe(1);
  });
});
