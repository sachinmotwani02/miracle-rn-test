import { mulberry32 } from '../utils/random';
import { AssetSymbol, FeedItem, Portfolio, Side, TabKey, TopTrade, Trader } from './types';

export const portfolio: Portfolio = { valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 };

export const traders: Trader[] = [
  { id: 't1', name: 'candlefox', avatar: 'candlefox', verified: true, rank: 100, winRate: 64, volumeUsd: 842000 },
  { id: 't2', name: 'ethereal', avatar: 'ethereal', verified: true, rank: 42, winRate: 71, volumeUsd: 1250000 },
  { id: 't3', name: 'moonpilot', avatar: 'candlefox', verified: false, rank: 318, winRate: 58, volumeUsd: 215000 },
  { id: 't4', name: 'quietalpha', avatar: 'ethereal', verified: true, rank: 12, winRate: 77, volumeUsd: 3400000 },
  { id: 't5', name: 'driftwood', avatar: 'candlefox', verified: false, rank: 205, winRate: 61, volumeUsd: 390000 },
  { id: 't6', name: 'nightowl', avatar: 'ethereal', verified: true, rank: 77, winRate: 66, volumeUsd: 960000 },
];

export const topTrades: TopTrade[] = [
  { id: 'tt1', trader: traders[0], asset: 'SOL', gainUsd: 3200, price: 141.2 },
  { id: 'tt2', trader: traders[1], asset: 'ETH', gainUsd: 1800, price: 2504 },
  { id: 'tt3', trader: traders[3], asset: 'BTC', gainUsd: 1250, price: 61820 },
  { id: 'tt4', trader: traders[5], asset: 'SOL', gainUsd: 940, price: 139.75 },
];

const NOTES = [
  'BTC is testing the top of its range. Trimming here and waiting for a clean retest before I add back. If we lose the 4h trend line I will flatten the position entirely and revisit next week.',
  'Added to SOL on the dip into the daily demand zone. Invalidation is a close below the prior swing low; targets are the range high and then price discovery.',
  'ETH/BTC looks ready to turn. Small starter here, will scale in if the weekly closes above the 200 day moving average.',
  'Taking profit on half. The move was faster than expected and funding is getting crowded, so I would rather hold a smaller core through the chop.',
  'Market is thin into the weekend. Keeping size modest and stops tight; this is a trade, not a thesis.',
  'Breakout retest held with volume. Moving stop to breakeven and letting the rest ride toward the measured move.',
];

const ASSETS: AssetSymbol[] = ['SOL', 'ETH', 'BTC'];
const PRICES: Record<AssetSymbol, number> = { SOL: 148.6, ETH: 2512.4, BTC: 61984 };

function buildFeed(): FeedItem[] {
  const rnd = mulberry32(20261005);
  const items: FeedItem[] = [];
  for (let i = 0; i < 36; i++) {
    const first = i === 0;
    const trader = first ? traders[0] : traders[Math.floor(rnd() * traders.length)];
    const asset: AssetSymbol = first ? 'SOL' : ASSETS[Math.floor(rnd() * ASSETS.length)];
    const n = 10 + Math.floor(rnd() * 5);
    const sparkline: number[] = [];
    let v = 50;
    for (let k = 0; k < n; k++) {
      v += (rnd() - 0.42) * 12;
      sparkline.push(Math.round(v * 100) / 100);
    }
    const entryCount = 1 + Math.floor(rnd() * 3);
    const entryIndices = Array.from(
      new Set(Array.from({ length: entryCount }, () => 1 + Math.floor(rnd() * (n - 3)))),
    ).sort((a, b) => a - b);
    const side: Side = rnd() < 0.8 ? 'Buy' : 'Sell';
    const changePct = first ? 12.84 : Math.round((rnd() * 24 - 6) * 100) / 100;
    items.push({
      id: `f${i}`,
      trader,
      side: first ? 'Buy' : side,
      ageMinutes: first ? 2 : Math.floor(2 + rnd() * 1500),
      asset,
      sizeUsd: first ? 18400 : Math.round(500 + rnd() * 60000),
      price: first ? 148.6 : Math.round(PRICES[asset] * (0.9 + rnd() * 0.2) * 100) / 100,
      changePct,
      sparkline: first ? [20, 26, 23, 30, 27, 33, 31, 38, 36, 44, 42, 50] : sparkline,
      entryIndices: first ? [3, 9] : entryIndices,
      note: NOTES[i % NOTES.length],
    });
  }
  return items;
}

const all = buildFeed();

export function feedForTab(tab: TabKey): FeedItem[] {
  switch (tab) {
    case 'discover':
      return all;
    case 'following':
      return all.filter(i => i.trader.id === 't1' || i.trader.id === 't2' || i.trader.id === 't4');
    case 'rising':
      return all.filter(i => i.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    case 'favourites':
      return all.filter((_, idx) => idx % 3 === 1);
  }
}
