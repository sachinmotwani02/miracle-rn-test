import { portfolio, topTrades, feedForTab, traders } from '../data/mock';

describe('mock data', () => {
  it('matches the Figma header numbers', () => {
    expect(portfolio).toEqual({ valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 });
  });

  it('has the two Figma top trades first', () => {
    expect(topTrades[0]).toMatchObject({ asset: 'SOL', gainUsd: 3200, price: 141.2 });
    expect(topTrades[0].trader.name).toBe('candlefox');
    expect(topTrades[1]).toMatchObject({ asset: 'ETH', gainUsd: 1800 });
    expect(topTrades[1].trader.name).toBe('ethereal');
  });

  it('is deterministic and the first discover card matches the Figma card', () => {
    const a = feedForTab('discover');
    const b = feedForTab('discover');
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(24);
    expect(a[0]).toMatchObject({ side: 'Buy', ageMinutes: 2, asset: 'SOL', sizeUsd: 18400, price: 148.6, changePct: 12.84 });
    expect(a[0].trader).toMatchObject({ name: 'candlefox', rank: 100, winRate: 64, volumeUsd: 842000 });
    expect(a[0].note.startsWith('BTC is testing the top of its range.')).toBe(true);
  });

  it('gives every tab a non-empty, distinct list', () => {
    const keys = ['discover', 'following', 'rising', 'favourites'] as const;
    const ids = keys.map(k => feedForTab(k).map(i => i.id).join(','));
    expect(new Set(ids).size).toBe(4);
    keys.forEach(k => expect(feedForTab(k).length).toBeGreaterThan(0));
  });

  it('sparklines have 10-14 points and 1-3 entry markers inside range', () => {
    feedForTab('discover').forEach(item => {
      expect(item.sparkline.length).toBeGreaterThanOrEqual(10);
      expect(item.sparkline.length).toBeLessThanOrEqual(14);
      expect(item.entryIndices.length).toBeGreaterThanOrEqual(1);
      expect(item.entryIndices.length).toBeLessThanOrEqual(3);
      item.entryIndices.forEach(i => expect(i).toBeLessThan(item.sparkline.length - 1));
    });
  });

  it('rising is sorted by change descending', () => {
    const r = feedForTab('rising');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].changePct).toBeGreaterThanOrEqual(r[i].changePct);
  });

  it('exposes traders', () => {
    expect(traders.length).toBeGreaterThanOrEqual(2);
  });
});
