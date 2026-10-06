import { feedForTab, portfolio, topTrades } from './mock';
import { FeedItem, Portfolio, TabKey, TopTrade } from './types';

/**
 * The mock data served the way a network would: every call answers after `ms`. While held (the
 * Dials' "Hold loading"), answers that are due park until the hold is released, so the loading
 * state can be inspected for as long as needed.
 */
let held = false;
const parked = new Set<() => void>();

export function setHold(on: boolean) {
  held = on;
  if (on) return;
  parked.forEach(deliver => deliver());
  parked.clear();
}

function answer<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => {
      if (held) parked.add(() => resolve(value));
      else resolve(value);
    }, ms);
  });
}

export const fetchPortfolio = (ms: number): Promise<Portfolio> => answer(portfolio, ms);
export const fetchTopTrades = (ms: number): Promise<TopTrade[]> => answer(topTrades, ms);
export const fetchFeed = (tab: TabKey, ms: number): Promise<FeedItem[]> => answer(feedForTab(tab), ms);
