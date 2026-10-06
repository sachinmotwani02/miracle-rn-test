import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { TICK, openingValue, portfolioAt, valueAfter } from '../utils/ticker';
import { Portfolio } from './types';

/**
 * A simulated live portfolio: it holds still while the app is open, and when the app comes back
 * from the background a fresh value lands `TICK.refreshDelay` later, as a fetch would, having
 * walked on for as long as the app was away (see utils/ticker). The 24h change follows the value.
 * A trip to `inactive` that never reached the background (Control Center, a call banner) is no return.
 * `rand` must keep its identity across renders (tests pass a seeded one); a new one restarts the walk.
 * While the portfolio is still loading (`undefined`) there is nothing to walk, so nothing listens.
 */
export function useLivePortfolio(start: Portfolio, rand?: () => number): Portfolio;
export function useLivePortfolio(start: Portfolio | undefined, rand?: () => number): Portfolio | undefined;
export function useLivePortfolio(start: Portfolio | undefined, rand: () => number = Math.random): Portfolio | undefined {
  // Each refresh remembers the start it walked from, so a new `start` shows at once.
  const [latest, setLatest] = useState({ from: start, live: start });

  useEffect(() => {
    if (!start) return;
    const opening = openingValue(start);
    let value = start.valueUsd;
    // When the app left, until a refresh lands; leaving again before then keeps the first time.
    let leftAt: number | undefined;
    let refresh: ReturnType<typeof setTimeout> | undefined;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        clearTimeout(refresh);
        refresh = undefined;
        leftAt ??= Date.now();
      } else if (state === 'active' && leftAt !== undefined && refresh === undefined) {
        const away = Date.now() - leftAt;
        refresh = setTimeout(() => {
          value = valueAfter(value, start.valueUsd, away, rand);
          leftAt = undefined;
          refresh = undefined;
          setLatest({ from: start, live: portfolioAt(opening, value) });
        }, TICK.refreshDelay);
      }
    });
    return () => {
      clearTimeout(refresh);
      subscription.remove();
    };
  }, [start, rand]);

  return latest.from === start ? latest.live : start;
}
