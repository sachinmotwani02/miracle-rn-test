import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useLivePortfolio } from '../data/live';
import { mulberry32 } from '../utils/random';
import { TICK, openingValue, portfolioAt, valueAfter } from '../utils/ticker';

const start = { valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 };
const addListener = AppState.addEventListener as jest.Mock;

/** Reports an AppState change to the listener the hook registered most recently. */
async function appState(state: string) {
  const listener = addListener.mock.calls[addListener.mock.calls.length - 1][1];
  await act(async () => listener(state));
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Leaves for `ms`, comes back, and waits for the refresh to land. */
async function awayFor(ms: number) {
  await appState('background');
  await advance(ms);
  await appState('active');
  await advance(TICK.refreshDelay);
}

beforeEach(() => {
  jest.useFakeTimers();
  addListener.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLivePortfolio', () => {
  it('holds still while the app stays open', async () => {
    const rand = mulberry32(1);
    const { result } = await renderHook(() => useLivePortfolio(start, rand));
    await advance(10 * 60 * 1000);
    expect(result.current).toBe(start);
  });

  it('refreshes a moment after the app comes back, with the 24h change following the value', async () => {
    const rand = mulberry32(2);
    const { result } = await renderHook(() => useLivePortfolio(start, rand));
    await appState('background');
    await advance(30 * 1000);
    await appState('active');
    await advance(TICK.refreshDelay - 1);
    expect(result.current).toBe(start);
    await advance(1);
    expect(result.current.valueUsd).not.toBe(start.valueUsd);
    expect(result.current).toEqual(portfolioAt(openingValue(start), result.current.valueUsd));
  });

  it('walks on from the last value for as long as the app was away, on every return', async () => {
    const mirror = mulberry32(3);
    const rand = mulberry32(3);
    const { result } = await renderHook(() => useLivePortfolio(start, rand));
    let expected = start.valueUsd;
    for (const ms of [5 * 1000, 2 * 60 * 1000, 800]) {
      await awayFor(ms);
      expected = valueAfter(expected, start.valueUsd, ms, mirror);
      expect(result.current.valueUsd).toBe(expected);
    }
  });

  it('ignores a trip to inactive that never reached the background', async () => {
    const rand = mulberry32(4);
    const { result } = await renderHook(() => useLivePortfolio(start, rand));
    await appState('inactive');
    await advance(5 * 1000);
    await appState('active');
    await advance(TICK.refreshDelay * 10);
    expect(result.current).toBe(start);
  });

  it('drops a pending refresh if the app leaves again before it lands', async () => {
    const rand = mulberry32(5);
    const { result } = await renderHook(() => useLivePortfolio(start, rand));
    await appState('background');
    await advance(5 * 1000);
    await appState('active');
    await advance(TICK.refreshDelay - 1);
    await appState('background');
    await advance(60 * 1000);
    expect(result.current).toBe(start);
  });

  it('follows a new starting portfolio', async () => {
    const rand = mulberry32(6);
    const next = { valueUsd: 15000, deltaUsd: -120.5, deltaPct: -0.8 };
    const { result, rerender } = await renderHook((p: typeof start) => useLivePortfolio(p, rand), {
      initialProps: start,
    });
    await awayFor(5 * 1000);
    expect(result.current.valueUsd).not.toBe(start.valueUsd);
    await rerender(next);
    expect(result.current).toEqual(next);
  });

  it('stops listening once unmounted, dropping a refresh still on its way', async () => {
    const rand = jest.fn(mulberry32(7));
    const { unmount } = await renderHook(() => useLivePortfolio(start, rand));
    const subscription = addListener.mock.results[addListener.mock.results.length - 1].value;
    await appState('background');
    await advance(5 * 1000);
    await appState('active');
    await unmount();
    await advance(TICK.refreshDelay * 10);
    expect(rand).not.toHaveBeenCalled();
    expect(subscription.remove).toHaveBeenCalled();
  });

  it('is empty while the portfolio loads, then shows it and starts listening once it arrives', async () => {
    const rand = mulberry32(8);
    const { result, rerender } = await renderHook(
      (s: typeof start | undefined) => useLivePortfolio(s, rand),
      { initialProps: undefined as typeof start | undefined },
    );
    expect(result.current).toBeUndefined();
    // Nothing to refresh yet, so nothing listens for returns from the background.
    expect(addListener).not.toHaveBeenCalled();
    await rerender(start);
    expect(result.current).toBe(start);
    expect(addListener).toHaveBeenCalledTimes(1);
  });
});
