export type AssetSymbol = 'SOL' | 'ETH' | 'BTC';
export type AvatarKey = 'candlefox' | 'ethereal';
export type TabKey = 'discover' | 'following' | 'rising' | 'favourites';
export type Side = 'Buy' | 'Sell';

export interface Trader {
  id: string;
  name: string;
  avatar: AvatarKey;
  verified: boolean;
  rank: number;
  winRate: number;
  volumeUsd: number;
}

export interface Portfolio {
  valueUsd: number;
  deltaUsd: number;
  deltaPct: number;
}

export interface TopTrade {
  id: string;
  trader: Trader;
  asset: AssetSymbol;
  gainUsd: number;
  price: number;
}

export interface FeedItem {
  id: string;
  trader: Trader;
  side: Side;
  ageMinutes: number;
  asset: AssetSymbol;
  sizeUsd: number;
  price: number;
  changePct: number;
  sparkline: number[];
  /** Indices into `sparkline` that get an entry marker. */
  entryIndices: number[];
  note: string;
}

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'following', label: 'Following' },
  { key: 'rising', label: 'Rising' },
  { key: 'favourites', label: 'Favourites' },
];
