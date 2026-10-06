import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import { PortfolioTicker, ROLL_IN_DELAY, useRollIn } from '../components/PortfolioTicker';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// Reanimated's mock has no useReducedMotion, which NumberFlow and the roll-in read.
let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => mockReduceMotion,
}));

const start = { valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 };
const dayAgo = { valueUsd: 11993.5, deltaUsd: 0, deltaPct: 0 };
/** What the rolling numbers draw (each NumberFlow labels itself, hidden from screen readers here). */
const drawn = { includeHiddenElements: true };

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PortfolioTicker', () => {
  it('reads out the current figures while drawing others (mid roll-in)', async () => {
    const screen = await render(<PortfolioTicker portfolio={start} shown={dayAgo} />);
    expect(screen.getByLabelText('$12,057.70')).toBeTruthy();
    expect(screen.getByLabelText('+$64.20 · 0.54% 24h')).toBeTruthy();
    expect(screen.getAllByLabelText('$11,993.50', drawn)).toHaveLength(1);
    expect(screen.getAllByLabelText('+$0.00', drawn)).toHaveLength(1);
    expect(screen.getAllByLabelText(' · 0.00% 24h', drawn)).toHaveLength(1);
  });

  it('draws the current figures by default', async () => {
    const screen = await render(<PortfolioTicker portfolio={start} />);
    expect(screen.getAllByLabelText('+$64.20', drawn)).toHaveLength(1);
    expect(screen.getAllByLabelText(' · 0.54% 24h', drawn)).toHaveLength(1);
  });

  it('reads each line as one element, not once per rolling number', async () => {
    const screen = await render(<PortfolioTicker portfolio={start} />);
    expect(screen.getAllByLabelText(/12,057\.70/)).toHaveLength(1);
    expect(screen.getAllByLabelText(/64\.20/)).toHaveLength(1);
    expect(screen.getAllByLabelText(/0\.54%/)).toHaveLength(1);
  });
});

describe('useRollIn', () => {
  it('opens on the portfolio as it stood 24 hours ago, then rolls up to now', async () => {
    const { result } = await renderHook(() => useRollIn(start));
    expect(result.current).toEqual(dayAgo);
    await act(async () => {
      jest.advanceTimersByTime(ROLL_IN_DELAY - 1);
    });
    expect(result.current).toEqual(dayAgo);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(start);
  });

  it('follows every fresh value once it has rolled in', async () => {
    const { result, rerender } = await renderHook((live: typeof start) => useRollIn(live), {
      initialProps: start,
    });
    await act(async () => {
      jest.advanceTimersByTime(ROLL_IN_DELAY);
    });
    const fresh = { valueUsd: 12061.15, deltaUsd: 67.65, deltaPct: 0.56 };
    await rerender(fresh);
    expect(result.current).toBe(fresh);
  });

  it('opens on now with Reduce Motion on', async () => {
    mockReduceMotion = true;
    const { result } = await renderHook(() => useRollIn(start));
    expect(result.current).toBe(start);
  });
});
