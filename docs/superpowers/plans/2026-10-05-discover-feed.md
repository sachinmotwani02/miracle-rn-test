# Discover Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Figma "Discover" feed screen 1:1 in Expo + TypeScript with UI-thread animations and a creative floating nav bar, per `docs/superpowers/specs/2026-10-05-discover-feed-design.md`.

**Architecture:** One screen (`DiscoverScreen`) composed of small, typed components under `src/components`. A `FlashList` (v2) renders memoised `TradeCard`s; the portfolio header, carousel and tabs are the list header. A single Reanimated `scrollY` shared value drives the sky parallax and the nav bar sink. All motion is Reanimated 4 worklets; vectors are `react-native-svg`; rasters (sky, avatars, mascot body) are PNG assets from the Figma exports/captures.

**Tech Stack:** Expo SDK 57, React Native (new architecture), TypeScript, react-native-reanimated 4, react-native-worklets, react-native-gesture-handler, @shopify/flash-list 2, react-native-svg, expo-blur, expo-linear-gradient, expo-image, expo-haptics, @react-native-masked-view/masked-view, react-native-safe-area-context, expo-font + @expo-google-fonts/inter, jest-expo + @testing-library/react-native.

---

## File structure

```
App.tsx                          entry: providers, font loading, DiscoverScreen
babel.config.js                  babel-preset-expo (+ worklets plugin if not auto)
jest.config.js / package.json    jest-expo preset
.claude/launch.json              expo web preview config
assets/
  sky@2x.png                     Figma export of the cloud header (786x1008)
  mascot_body.png                cloud + halo (eyes removed), 340x400
  avatar_candlefox.png           252x252 circle crop
  avatar_ethereal.png            252x252 circle crop
src/theme/
  colors.ts                      measured palette
  typography.ts                  font(weight) helper + text presets
  layout.ts                      measured sizes/radii/spacing + nav geometry
  index.ts
src/data/
  types.ts                       Trader, TopTrade, FeedItem, TabKey
  mock.ts                        deterministic mock data per tab
src/utils/
  format.ts                      money/percent formatting (worklet-safe)
  sparkline.ts                   values -> smooth SVG path + marker points
  random.ts                      mulberry32 PRNG
src/components/
  SkyBackground.tsx              parallax sky image
  AnimatedNumber.tsx             count-up via TextInput animatedProps
  PortfolioHeader.tsx            label, value, delta, Deposit button
  DepositButton.tsx
  Avatar.tsx                     photo + VerifiedBadge
  VerifiedBadge.tsx              SVG seal
  CoinLogo.tsx                   SOL/ETH/BTC SVG + BuyBadge
  BuyBadge.tsx                   SVG dark circle with green swap glyph
  TopTradesCarousel.tsx          horizontal snapping list
  TopTradeCard.tsx
  FeedTabs.tsx                   Discover/Following/Rising/Favourites
  Sparkline.tsx                  animated draw-in path + markers
  NoteBox.tsx                    expandable note with Read more
  TradeCard.tsx                  memoised feed card
  BottomFade.tsx                 progressive blur / gradient under nav
  NavIcons.tsx                   home, compass, bars, person
  Mascot.tsx                     body PNG + animated eyes
  FloatingNavBar.tsx             pill, press bloom, mascot reactions, scroll sink
src/screens/DiscoverScreen.tsx
src/__tests__/                   format, sparkline, mock, layout tests
README.md
```

---

### Task 1: Scaffold the Expo project and install dependencies

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `App.tsx`, `babel.config.js`, `.gitignore` (from the template)
- Create: `.claude/launch.json`

- [ ] **Step 1: Scaffold into a temp dir and move into the repo (repo already has .git and docs)**

```bash
cd "C:/Users/sachi/OneDrive/Desktop"
npx --yes create-expo-app@latest miracle-scaffold --template blank-typescript --no-install
cp -r miracle-scaffold/. miracle-rn-test/ && rm -rf miracle-scaffold
cd miracle-rn-test && npm install
```

- [ ] **Step 2: Install runtime dependencies with expo install (version-matched)**

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-blur expo-linear-gradient expo-image expo-haptics @react-native-masked-view/masked-view react-native-safe-area-context @shopify/flash-list expo-font @expo-google-fonts/inter expo-status-bar react-native-web react-dom @expo/metro-runtime
```

- [ ] **Step 3: Install dev/test dependencies**

```bash
npx expo install jest-expo jest @testing-library/react-native @types/jest -- --save-dev
```

- [ ] **Step 4: Configure jest in package.json**

Add to `package.json`:

```json
"scripts": { "start": "expo start", "android": "expo start --android", "ios": "expo start --ios", "web": "expo start --web", "test": "jest", "typecheck": "tsc --noEmit" },
"jest": { "preset": "jest-expo", "testMatch": ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"] }
```

- [ ] **Step 5: Confirm babel handles worklets**

Check `node_modules/babel-preset-expo/build/index.js` for `react-native-worklets/plugin`. If present, keep the template `babel.config.js`. If absent, write:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'], plugins: ['react-native-worklets/plugin'] };
};
```

- [ ] **Step 6: app.json — name, orientation, new arch, splash colour**

```json
{
  "expo": {
    "name": "Miracle Discover",
    "slug": "miracle-discover",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": { "image": "./assets/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#2EA7F1" },
    "ios": { "supportsTablet": false },
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#2EA7F1" }, "edgeToEdgeEnabled": true },
    "web": { "favicon": "./assets/favicon.png" }
  }
}
```

- [ ] **Step 7: Web preview config**

`.claude/launch.json`:
```json
{ "version": "0.0.1", "configurations": [ { "name": "expo-web", "runtimeExecutable": "npx", "runtimeArgs": ["expo", "start", "--web", "--port", "8081"], "port": 8081 } ] }
```

- [ ] **Step 8: Typecheck + commit**

Run: `npx tsc --noEmit` → Expected: no output (exit 0).
```bash
git add -A && git commit -m "chore: scaffold Expo TypeScript app with animation, list, svg and test deps"
```

---

### Task 2: Assets

**Files:**
- Create: `assets/sky@2x.png`, `assets/mascot_body.png`, `assets/avatar_candlefox.png`, `assets/avatar_ethereal.png`

- [ ] **Step 1: Copy the Figma exports/captures from the scratchpad and docs**

```bash
SP="C:/Users/sachi/AppData/Local/Temp/claude/C--Users-sachi-OneDrive-Desktop-miracle-rn-test/fa33bd20-e6ed-4f0d-93f6-561eae57d038/scratchpad/figma"
cp docs/reference/sky@2x.png assets/sky@2x.png
cp "$SP/assets/avatar_candlefox.png" assets/
cp "$SP/assets/avatar_ethereal.png" assets/
```

- [ ] **Step 2: Render the mascot body (Ghost.svg without the two eye paths) at 10x via the browser page and save as `assets/mascot_body.png`** (same canvas-render technique used for `mascot.png`; strip the two `fill="#131722"` paths first).

- [ ] **Step 3: Commit**
```bash
git add assets && git commit -m "feat: add sky, avatar and mascot assets"
```

---

### Task 3: Theme tokens

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/layout.ts`, `src/theme/index.ts`
- Test: `src/__tests__/layout.test.ts`

- [ ] **Step 1: colors.ts**

```ts
export const colors = {
  textPrimary: '#22242A',
  textSecondary: '#727377',
  green: '#0FAA55',
  sparkline: '#14BF62',
  link: '#2398FF',
  badgeBlue: '#5281F8',
  badgeBlueLight: '#7399F9',
  buyPillBg: '#D8F1E4',
  sellPillBg: '#FBE4E4',
  red: '#E5484D',
  noteBg: '#F3F8FF',
  card: '#FFFFFF',
  feedBg: '#E9EEF6',
  bottomFade: '#F5F5F5',
  navBar: 'rgba(78,80,85,0.96)',
  navBarAndroid: '#4E5055',
  navPill: 'rgba(255,255,255,0.12)',
  navIcon: '#FFFFFF',
  white: '#FFFFFF',
  white70: 'rgba(255,255,255,0.7)',
  white20: 'rgba(255,255,255,0.2)',
  white35: 'rgba(255,255,255,0.35)',
  white85: 'rgba(255,255,255,0.85)',
  badgeDark: '#121212',
  skyBlue: '#2EA7F1',
  halo: '#FFC017',
  eye: '#131722',
} as const;
```

- [ ] **Step 2: typography.ts**

```ts
import { Platform, TextStyle } from 'react-native';

export type Weight = '400' | '500' | '600' | '700';

const interFamily: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

/** SF Pro on iOS (system), Inter elsewhere. */
export function font(weight: Weight): TextStyle {
  if (Platform.OS === 'ios') return { fontWeight: weight };
  return { fontFamily: interFamily[weight], fontWeight: weight };
}

function t(size: number, weight: Weight, lineHeight: number, extra?: TextStyle): TextStyle {
  return { fontSize: size, lineHeight, ...font(weight), ...extra };
}

export const text = {
  portfolioLabel: t(11, '500', 14),
  portfolioValue: t(22, '700', 28, { letterSpacing: -0.2 }),
  delta: t(12, '600', 16),
  deltaMuted: t(12, '400', 16),
  button: t(14, '600', 18),
  sectionTitle: t(14, '600', 18),
  name: t(15, '600', 18),
  meta: t(12, '400', 16),
  pill: t(11, '600', 14),
  asset: t(19, '700', 22, { letterSpacing: -0.2 }),
  price: t(12, '400', 16),
  priceStrong: t(12, '600', 16),
  note: t(13, '400', 16),
  link: t(13, '600', 16),
  tab: t(15, '600', 20),
  gain: t(18, '600', 22),
} as const;
```

- [ ] **Step 3: layout.ts (measured constants + nav geometry)**

```ts
export const FRAME_WIDTH = 393;

export const layout = {
  screenPadding: 16,
  headerPadding: 20,
  cardMargin: 4,
  cardRadius: 24,
  cardPadding: 12,
  cardGap: 4,
  noteInset: 4,
  noteRadius: 16,
  avatar: 36,
  avatarSmall: 24,
  badge: 15,
  coinLogo: 36,
  buyBadge: 21,
  buyBadgeSmall: 20,
  carouselCardWidth: 204,
  carouselCardHeight: 92,
  carouselGap: 4,
  sparklineWidth: 90,
  sparklineHeight: 32,
  depositWidth: 86,
  depositHeight: 36,
  tabGap: 18,
  nav: { width: 300, height: 64, padding: 4, slots: 5, pill: 56, bottomGap: 2 },
} as const;

/** Centre x of slot `index` inside the nav bar (bar-local coordinates). */
export function navSlotCenter(index: number, width = layout.nav.width, padding = layout.nav.padding, slots = layout.nav.slots): number {
  const slotWidth = (width - padding * 2) / slots;
  return padding + slotWidth * index + slotWidth / 2;
}

/** Left x of the active pill so that it is centred on slot `index`. */
export function navPillLeft(index: number, pill = layout.nav.pill): number {
  return navSlotCenter(index) - pill / 2;
}
```

- [ ] **Step 4: index.ts**

```ts
export { colors } from './colors';
export { text, font } from './typography';
export { layout, navSlotCenter, navPillLeft, FRAME_WIDTH } from './layout';
```

- [ ] **Step 5: Failing test for nav geometry**

`src/__tests__/layout.test.ts`:
```ts
import { navSlotCenter, navPillLeft } from '../theme/layout';

describe('nav geometry', () => {
  it('spaces five slots evenly inside the padded 300pt bar', () => {
    expect(navSlotCenter(0)).toBeCloseTo(33.2, 1);
    expect(navSlotCenter(2)).toBeCloseTo(150, 1);
    expect(navSlotCenter(4)).toBeCloseTo(266.8, 1);
  });
  it('centres the 56pt pill on the slot', () => {
    expect(navPillLeft(0)).toBeCloseTo(5.2, 1);
    expect(navPillLeft(2)).toBeCloseTo(122, 1);
  });
});
```
Run: `npx jest src/__tests__/layout.test.ts` → Expected: PASS (pure functions, write test + impl together, verify it passes).

- [ ] **Step 6: Commit**
```bash
git add src/theme src/__tests__/layout.test.ts && git commit -m "feat: theme tokens measured from Figma and nav geometry"
```

---

### Task 4: Formatting utils (TDD)

**Files:**
- Create: `src/utils/format.ts`
- Test: `src/__tests__/format.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { formatMoney, formatCompactMoney, formatSignedMoney, formatPct, formatAge } from '../utils/format';

describe('format', () => {
  it('formats money with thousands separators and 2 decimals', () => {
    expect(formatMoney(12057.7)).toBe('$12,057.70');
    expect(formatMoney(148.6)).toBe('$148.60');
    expect(formatMoney(2501)).toBe('$2,501.00');
  });
  it('formats compact money', () => {
    expect(formatCompactMoney(18400)).toBe('$18.4K');
    expect(formatCompactMoney(842000)).toBe('$842K');
    expect(formatCompactMoney(3200)).toBe('$3.2K');
    expect(formatCompactMoney(1250000)).toBe('$1.25M');
    expect(formatCompactMoney(950)).toBe('$950');
  });
  it('formats signed money', () => {
    expect(formatSignedMoney(64.2)).toBe('+$64.20');
    expect(formatSignedMoney(-12)).toBe('-$12.00');
    expect(formatSignedMoney(3200, true)).toBe('+$3.2K');
  });
  it('formats percentages', () => {
    expect(formatPct(12.84)).toBe('12.84%');
    expect(formatPct(0.54)).toBe('0.54%');
  });
  it('formats ages', () => {
    expect(formatAge(2)).toBe('2m');
    expect(formatAge(75)).toBe('1h');
    expect(formatAge(60 * 30)).toBe('1d');
  });
});
```
Run: `npx jest src/__tests__/format.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 2: Implementation (worklet-safe: no Intl)**

```ts
function groupThousands(intPart: string): string {
  'worklet';
  let out = '';
  for (let i = 0; i < intPart.length; i++) {
    const fromEnd = intPart.length - i;
    out += intPart[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += ',';
  }
  return out;
}

export function formatMoney(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const fixed = abs.toFixed(2);
  const [intPart, dec] = fixed.split('.');
  return `${value < 0 ? '-' : ''}$${groupThousands(intPart)}.${dec}`;
}

export function formatCompactMoney(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${trimZeros((abs / 1_000_000).toFixed(2))}M`;
  if (abs >= 1_000) return `${sign}$${trimZeros((abs / 1_000).toFixed(1))}K`;
  return `${sign}$${trimZeros(abs.toFixed(0))}`;
}

function trimZeros(s: string): string {
  'worklet';
  return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
}

export function formatSignedMoney(value: number, compact = false): string {
  'worklet';
  const body = compact ? formatCompactMoney(Math.abs(value)) : formatMoney(Math.abs(value));
  return `${value < 0 ? '-' : '+'}${body}`;
}

export function formatPct(value: number): string {
  'worklet';
  return `${Math.abs(value).toFixed(2)}%`;
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (60 * 24))}d`;
}
```
Run: `npx jest src/__tests__/format.test.ts` → Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/utils/format.ts src/__tests__/format.test.ts && git commit -m "feat: worklet-safe money/percent formatters"
```

---

### Task 5: Sparkline geometry (TDD)

**Files:**
- Create: `src/utils/sparkline.ts`
- Test: `src/__tests__/sparkline.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { buildSparkline } from '../utils/sparkline';

describe('buildSparkline', () => {
  const values = [1, 3, 2, 5, 4, 8];
  it('maps points into the box with padding for the stroke and markers', () => {
    const s = buildSparkline(values, { width: 90, height: 32, padding: 6 });
    expect(s.points).toHaveLength(6);
    expect(s.points[0].x).toBe(6);
    expect(s.points[5].x).toBe(84);
    expect(Math.min(...s.points.map(p => p.y))).toBeCloseTo(6, 5);
    expect(Math.max(...s.points.map(p => p.y))).toBeCloseTo(26, 5);
  });
  it('produces a cubic path starting at the first point', () => {
    const s = buildSparkline(values, { width: 90, height: 32, padding: 6 });
    expect(s.path.startsWith('M6 26')).toBe(true);
    expect(s.path).toContain('C');
  });
  it('estimates length as at least the straight-line polyline length', () => {
    const s = buildSparkline(values, { width: 90, height: 32, padding: 6 });
    expect(s.length).toBeGreaterThanOrEqual(78);
  });
  it('handles flat series without NaN', () => {
    const s = buildSparkline([2, 2, 2], { width: 90, height: 32, padding: 6 });
    expect(s.points.every(p => Number.isFinite(p.y))).toBe(true);
    expect(s.points[0].y).toBe(16);
  });
});
```
Run: `npx jest src/__tests__/sparkline.test.ts` → Expected: FAIL.

- [ ] **Step 2: Implementation (Catmull-Rom → cubic Bézier)**

```ts
export interface Point { x: number; y: number }
export interface SparklineGeometry { points: Point[]; path: string; length: number }
export interface SparklineOptions { width: number; height: number; padding: number }

const r = (n: number) => Math.round(n * 100) / 100;

export function buildSparkline(values: number[], { width, height, padding }: SparklineOptions): SparklineGeometry {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const points: Point[] = values.map((v, i) => ({
    x: r(padding + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))),
    y: r(max === min ? height / 2 : padding + innerH - ((v - min) / span) * innerH),
  }));

  let path = `M${points[0].x} ${points[0].y}`;
  let length = 0;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n - 1)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    path += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${p2.x} ${p2.y}`;
    // approximate curve length by sampling
    let prev = p1;
    for (let t = 0.25; t <= 1.0001; t += 0.25) {
      const mt = 1 - t;
      const x = mt ** 3 * p1.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * p2.x;
      const y = mt ** 3 * p1.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * p2.y;
      length += Math.hypot(x - prev.x, y - prev.y);
      prev = { x, y };
    }
  }
  return { points, path, length: Math.ceil(length) };
}
```
Run: `npx jest src/__tests__/sparkline.test.ts` → Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/utils/sparkline.ts src/__tests__/sparkline.test.ts && git commit -m "feat: sparkline geometry with smooth path and length estimate"
```

---

### Task 6: Mock data (TDD)

**Files:**
- Create: `src/data/types.ts`, `src/data/mock.ts`, `src/utils/random.ts`
- Test: `src/__tests__/mock.test.ts`

- [ ] **Step 1: types.ts**

```ts
export type AssetSymbol = 'SOL' | 'ETH' | 'BTC';
export type AvatarKey = 'candlefox' | 'ethereal';
export type TabKey = 'discover' | 'following' | 'rising' | 'favourites';
export type Side = 'Buy' | 'Sell';

export interface Trader { id: string; name: string; avatar: AvatarKey; verified: boolean; rank: number; winRate: number; volumeUsd: number }
export interface Portfolio { valueUsd: number; deltaUsd: number; deltaPct: number }
export interface TopTrade { id: string; trader: Trader; asset: AssetSymbol; gainUsd: number; price: number }
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
  entryIndices: number[];
  note: string;
}
export const TABS: { key: TabKey; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'following', label: 'Following' },
  { key: 'rising', label: 'Rising' },
  { key: 'favourites', label: 'Favourites' },
];
```

- [ ] **Step 2: random.ts**

```ts
/** mulberry32 — tiny deterministic PRNG so mock data is stable between renders and tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 3: Failing tests**

```ts
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
      item.entryIndices.forEach(i => expect(i).toBeLessThan(item.sparkline.length - 1));
    });
  });
  it('rising is sorted by change descending', () => {
    const r = feedForTab('rising');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].changePct).toBeGreaterThanOrEqual(r[i].changePct);
  });
  it('exposes traders', () => { expect(traders.length).toBeGreaterThanOrEqual(2); });
});
```
Run: `npx jest src/__tests__/mock.test.ts` → Expected: FAIL.

- [ ] **Step 4: mock.ts**

```ts
import { mulberry32 } from '../utils/random';
import { AssetSymbol, FeedItem, Portfolio, TabKey, TopTrade, Trader } from './types';

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
    const trader = i === 0 ? traders[0] : traders[Math.floor(rnd() * traders.length)];
    const asset = i === 0 ? 'SOL' : ASSETS[Math.floor(rnd() * ASSETS.length)];
    const n = 10 + Math.floor(rnd() * 5);
    const sparkline: number[] = [];
    let v = 50;
    for (let k = 0; k < n; k++) { v += (rnd() - 0.42) * 12; sparkline.push(Math.round(v * 100) / 100); }
    const entryCount = 1 + Math.floor(rnd() * 3);
    const entryIndices = Array.from(new Set(Array.from({ length: entryCount }, () => 1 + Math.floor(rnd() * (n - 3))))).sort((a, b) => a - b);
    const side = rnd() < 0.8 ? 'Buy' : 'Sell';
    const changePct = i === 0 ? 12.84 : Math.round((rnd() * 24 - 6) * 100) / 100;
    items.push({
      id: `f${i}`,
      trader,
      side: i === 0 ? 'Buy' : side,
      ageMinutes: i === 0 ? 2 : Math.floor(2 + rnd() * 1500),
      asset,
      sizeUsd: i === 0 ? 18400 : Math.round(500 + rnd() * 60000),
      price: i === 0 ? 148.6 : Math.round(PRICES[asset] * (0.9 + rnd() * 0.2) * 100) / 100,
      changePct,
      sparkline: i === 0 ? [20, 26, 23, 30, 27, 33, 31, 38, 36, 44, 42, 50] : sparkline,
      entryIndices: i === 0 ? [3, 9] : entryIndices,
      note: NOTES[i % NOTES.length],
    });
  }
  return items;
}

const all = buildFeed();

export function feedForTab(tab: TabKey): FeedItem[] {
  switch (tab) {
    case 'discover': return all;
    case 'following': return all.filter(i => i.trader.id === 't1' || i.trader.id === 't2' || i.trader.id === 't4');
    case 'rising': return [...all].filter(i => i.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    case 'favourites': return all.filter((_, idx) => idx % 3 === 1);
  }
}
```
Run: `npx jest src/__tests__/mock.test.ts` → Expected: PASS. (If `rising` happens to equal another tab's id order the distinct test fails; adjust the seed.)

- [ ] **Step 5: Commit**
```bash
git add src/data src/utils/random.ts src/__tests__/mock.test.ts && git commit -m "feat: deterministic mock data for portfolio, top trades and feed tabs"
```

---

### Task 7: Vector primitives — VerifiedBadge, BuyBadge, CoinLogo, Avatar

**Files:**
- Create: `src/components/VerifiedBadge.tsx`, `src/components/BuyBadge.tsx`, `src/components/CoinLogo.tsx`, `src/components/Avatar.tsx`

- [ ] **Step 1: VerifiedBadge.tsx** (10-point scalloped seal, white ring, check)

```tsx
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

function sealPath(cx: number, cy: number, outer: number, inner: number, points = 10): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)} `;
  }
  return d + 'Z';
}

export function VerifiedBadge({ size = 15 }: { size?: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c} fill={colors.white} />
      <Path d={sealPath(c, c, c - 1.2, c - 2.6)} fill={colors.badgeBlue} strokeLinejoin="round" stroke={colors.badgeBlue} strokeWidth={1.2} />
      <Path d={`M${c - 2.6} ${c + 0.2} L${c - 0.7} ${c + 2} L${c + 2.8} ${c - 1.8}`} stroke={colors.white} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
```

- [ ] **Step 2: BuyBadge.tsx** (dark disc, white ring, green swap glyph)

```tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

export function BuyBadge({ size = 21 }: { size?: number }) {
  const c = size / 2;
  const r = c - 1.5;
  const k = size / 21;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c} fill={colors.white} />
      <Circle cx={c} cy={c} r={r} fill={colors.badgeDark} />
      <Path
        d={`M${c - 5.2 * k} ${c - 2.2 * k} C${c - 5.2 * k} ${c - 4.6 * k} ${c - 1.8 * k} ${c - 3.2 * k} ${c} ${c} C${c + 1.8 * k} ${c + 3.2 * k} ${c + 5.2 * k} ${c + 4.6 * k} ${c + 5.2 * k} ${c + 2.2 * k} C${c + 5.2 * k} ${c - 0.6 * k} ${c + 1.8 * k} ${c - 2.4 * k} ${c} ${c} C${c - 1.8 * k} ${c + 2.4 * k} ${c - 5.2 * k} ${c + 0.6 * k} ${c - 5.2 * k} ${c - 2.2 * k} Z`}
        fill="#3DDC84"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: CoinLogo.tsx** (SOL / ETH / BTC discs with optional BuyBadge at bottom-right)

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { AssetSymbol } from '../data/types';
import { BuyBadge } from './BuyBadge';

function Sol({ size }: { size: number }) {
  const s = size / 36;
  const bar = (y: number, flip: boolean) => {
    const x0 = 9 * s, x1 = 27 * s, h = 3.6 * s, skew = 3.2 * s;
    return flip
      ? `M${x0 + skew} ${y} H${x1} L${x1 - skew} ${y + h} H${x0} Z`
      : `M${x0} ${y} H${x1 - skew} L${x1} ${y + h} H${x0 + skew} Z`;
  };
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="solg" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#9945FF" />
          <Stop offset="1" stopColor="#14F195" />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#1C1C1E" />
      <Path d={bar(11 * s, true)} fill="url(#solg)" />
      <Path d={bar(16.2 * s, false)} fill="url(#solg)" />
      <Path d={bar(21.4 * s, true)} fill="url(#solg)" />
    </Svg>
  );
}

function Eth({ size }: { size: number }) {
  const s = size / 36;
  const cx = 18 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#627EEA" />
      <Polygon points={`${cx},${7 * s} ${cx + 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#C0CBF7" />
      <Polygon points={`${cx},${7 * s} ${cx - 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${24.4 * s} ${cx + 7 * s},${20 * s} ${cx},${29.5 * s}`} fill="#C0CBF7" />
      <Polygon points={`${cx},${24.4 * s} ${cx - 7 * s},${20 * s} ${cx},${29.5 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${14.5 * s} ${cx + 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#9CAEF2" />
      <Polygon points={`${cx},${14.5 * s} ${cx - 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#C0CBF7" />
    </Svg>
  );
}

function Btc({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#F7931A" />
      <SvgText x={size / 2} y={size * 0.69} fontSize={size * 0.56} fontWeight="700" fill="#FFFFFF" textAnchor="middle">₿</SvgText>
    </Svg>
  );
}

interface Props { asset: AssetSymbol; size?: number; badge?: boolean; badgeSize?: number }

export function CoinLogo({ asset, size = 36, badge = true, badgeSize = 21 }: Props) {
  const Logo = asset === 'SOL' ? Sol : asset === 'ETH' ? Eth : Btc;
  return (
    <View style={{ width: size, height: size }}>
      <Logo size={size} />
      {badge && (
        <View style={[styles.badge, { right: -badgeSize * 0.22, bottom: -badgeSize * 0.12 }]}>
          <BuyBadge size={badgeSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ badge: { position: 'absolute' } });
```

- [ ] **Step 4: Avatar.tsx**

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AvatarKey } from '../data/types';
import { VerifiedBadge } from './VerifiedBadge';

const SOURCES: Record<AvatarKey, number> = {
  candlefox: require('../../assets/avatar_candlefox.png'),
  ethereal: require('../../assets/avatar_ethereal.png'),
};

interface Props { avatar: AvatarKey; size?: number; verified?: boolean; badgeSize?: number }

export function Avatar({ avatar, size = 36, verified = false, badgeSize = 15 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Image source={SOURCES[avatar]} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={0} />
      {verified && (
        <View style={[styles.badge, { right: -badgeSize * 0.1, bottom: -badgeSize * 0.1 }]}>
          <VerifiedBadge size={badgeSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ badge: { position: 'absolute' } });
```

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → Expected: exit 0.
```bash
git add src/components && git commit -m "feat: avatar, verified badge, coin logos and buy badge primitives"
```

---

### Task 8: Sky background, AnimatedNumber, PortfolioHeader, DepositButton

**Files:**
- Create: `src/components/SkyBackground.tsx`, `src/components/AnimatedNumber.tsx`, `src/components/DepositButton.tsx`, `src/components/PortfolioHeader.tsx`

- [ ] **Step 1: SkyBackground.tsx** (parallax at 0.3×, pinned top, width-scaled)

```tsx
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';

const SKY = require('../../assets/sky@2x.png');
const SKY_W = 393;
const SKY_H = 504;

export function SkyBackground({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const height = (SKY_H * width) / SKY_W;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollY.value * 0.3 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { width, height }, style]}>
      <Image source={SKY} style={{ width, height }} contentFit="fill" transition={0} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.feedBg } });
```

- [ ] **Step 2: AnimatedNumber.tsx** (count-up on the UI thread)

```tsx
import React, { useEffect } from 'react';
import { TextInput, TextStyle, StyleProp } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../utils/format';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props { value: number; duration?: number; delay?: number; style?: StyleProp<TextStyle> }

export function AnimatedNumber({ value, duration = 900, delay = 150, style }: Props) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
  }, [value, duration, delay, v]);
  const animatedProps = useAnimatedProps(() => {
    const s = formatMoney(v.value);
    return { text: s, defaultValue: s } as any;
  });
  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0, margin: 0, includeFontPadding: false } as TextStyle, style]}
      defaultValue={formatMoney(0)}
      accessibilityLabel={formatMoney(value)}
    />
  );
}
```

- [ ] **Step 3: DepositButton.tsx** (glass pill, scale spring + haptic)

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, layout, text } from '../theme';

export function DepositButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
        onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
        style={styles.button}
      >
        <Text style={[text.button, styles.label]} maxFontSizeMultiplier={1.2}>Deposit</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.depositWidth, height: layout.depositHeight, borderRadius: layout.depositHeight / 2,
    backgroundColor: colors.white20, borderWidth: 1, borderColor: colors.white35,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: colors.white },
});
```

- [ ] **Step 4: PortfolioHeader.tsx**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatPct, formatSignedMoney } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { DepositButton } from './DepositButton';

export function PortfolioHeader({ portfolio }: { portfolio: Portfolio }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>Your portfolio</Text>
        <AnimatedNumber value={portfolio.valueUsd} style={[text.portfolioValue, styles.value]} />
        <Text style={styles.delta} maxFontSizeMultiplier={1.3}>
          <Text style={[text.delta, styles.deltaStrong]}>{formatSignedMoney(portfolio.deltaUsd)}</Text>
          <Text style={[text.deltaMuted, styles.deltaMuted]}>{` · ${formatPct(portfolio.deltaPct)} 24h`}</Text>
        </Text>
      </View>
      <DepositButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: layout.headerPadding, paddingRight: layout.screenPadding },
  left: { gap: 3 },
  label: { color: colors.white },
  value: { color: colors.white, height: 28 },
  delta: { marginTop: 1 },
  deltaStrong: { color: colors.white },
  deltaMuted: { color: colors.white70 },
});
```

- [ ] **Step 5: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components && git commit -m "feat: sky parallax, count-up portfolio header and deposit button"
```

---

### Task 9: Top trades carousel

**Files:**
- Create: `src/components/TopTradeCard.tsx`, `src/components/TopTradesCarousel.tsx`

- [ ] **Step 1: TopTradeCard.tsx**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';

export const TopTradeCard = React.memo(function TopTradeCard({ trade }: { trade: TopTrade }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar avatar={trade.trader.avatar} size={layout.avatarSmall} verified={trade.trader.verified} badgeSize={layout.badge} />
        <Text style={[text.name, styles.name]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{trade.trader.name}</Text>
      </View>
      <View style={styles.body}>
        <CoinLogo asset={trade.asset} size={layout.coinLogo} badgeSize={layout.buyBadgeSmall} />
        <View style={styles.texts}>
          <Text style={[text.gain, styles.gain]} maxFontSizeMultiplier={1.2}>{formatSignedMoney(trade.gainUsd, true)}</Text>
          <Text style={[text.meta, styles.meta]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {`Bought ${trade.asset} at ${formatMoney(trade.price)}`}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: layout.carouselCardWidth, height: layout.carouselCardHeight, borderRadius: layout.cardRadius,
    backgroundColor: colors.white85, borderWidth: 1, borderColor: colors.white, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24 },
  name: { color: colors.textPrimary, marginLeft: 0 },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  texts: { flex: 1 },
  gain: { color: colors.green },
  meta: { color: colors.textSecondary },
});
```

- [ ] **Step 2: TopTradesCarousel.tsx**

```tsx
import React, { useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { TopTradeCard } from './TopTradeCard';

const SNAP = layout.carouselCardWidth + layout.carouselGap;

export function TopTradesCarousel({ trades }: { trades: TopTrade[] }) {
  const renderItem = useCallback<ListRenderItem<TopTrade>>(({ item }) => <TopTradeCard trade={item} />, []);
  return (
    <View>
      <Text style={[text.sectionTitle, styles.title]} maxFontSizeMultiplier={1.3}>Top trades last 24h</Text>
      <FlatList
        horizontal
        data={trades}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
      />
    </View>
  );
}

function Separator() { return <View style={{ width: layout.carouselGap }} />; }

const styles = StyleSheet.create({
  title: { color: colors.white, paddingHorizontal: layout.screenPadding, marginBottom: 10 },
  content: { paddingHorizontal: layout.screenPadding },
});
```

- [ ] **Step 3: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components && git commit -m "feat: top trades carousel with snapping cards"
```

---

### Task 10: Feed tabs

**Files:**
- Create: `src/components/FeedTabs.tsx`

- [ ] **Step 1: FeedTabs.tsx** (active label crossfade on UI thread)

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TABS, TabKey } from '../data/types';
import { colors, layout, text } from '../theme';

interface Props { active: TabKey; onChange: (tab: TabKey) => void }

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0.7, { duration: 180 }),
    transform: [{ scale: withTiming(press.value ? 0.96 : 1, { duration: 120 }) }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => { press.value = 1; }}
      onPressOut={() => { press.value = 0; }}
      hitSlop={{ top: 8, bottom: 8 }}
    >
      <Animated.Text style={[text.tab, styles.label, style]} maxFontSizeMultiplier={1.2}>{label}</Animated.Text>
    </Pressable>
  );
}

export function FeedTabs({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map(t => (
        <Tab key={t.key} label={t.label} selected={t.key === active} onPress={() => onChange(t.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: layout.tabGap, paddingHorizontal: layout.screenPadding, height: 20 },
  label: { color: colors.white },
});
```

- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components/FeedTabs.tsx && git commit -m "feat: feed tab row"
```

---

### Task 11: Sparkline (animated draw-in)

**Files:**
- Create: `src/components/Sparkline.tsx`

- [ ] **Step 1: Sparkline.tsx**

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { colors, layout } from '../theme';
import { buildSparkline } from '../utils/sparkline';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const seen = new Set<string>();
const STROKE = 3;
const MARKER_R = 6.5;
const DOT_R = 2.5;
const END_R = 5;

interface Props { id: string; values: number[]; entryIndices: number[]; width?: number; height?: number }

function Marker({ x, y, progress, at }: { x: number; y: number; progress: Animated.SharedValue<number>; at: number }) {
  const style = useAnimatedStyle(() => {
    const reached = progress.value >= at;
    return { opacity: reached ? 1 : 0, transform: [{ scale: withSpring(reached ? 1 : 0.3, { damping: 10, stiffness: 260 }) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.marker, { left: x - MARKER_R, top: y - 2 * MARKER_R - 3 }, style]}>
      <Svg width={MARKER_R * 2} height={MARKER_R * 2}>
        <Circle cx={MARKER_R} cy={MARKER_R} r={MARKER_R} fill={colors.sparkline} />
        <Path d={`M${MARKER_R - 3} ${MARKER_R} H${MARKER_R + 3} M${MARKER_R} ${MARKER_R - 3} V${MARKER_R + 3}`} stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

export const Sparkline = React.memo(function Sparkline({ id, values, entryIndices, width = layout.sparklineWidth, height = layout.sparklineHeight }: Props) {
  const geo = useMemo(() => buildSparkline(values, { width, height, padding: 6 }), [values, width, height]);
  const first = useRef(!seen.has(id)).current;
  const progress = useSharedValue(first ? 0 : 1);

  useEffect(() => {
    if (first) {
      seen.add(id);
      progress.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [first, id, progress]);

  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: geo.length * (1 - progress.value) }));
  const endStyle = useAnimatedStyle(() => ({ opacity: progress.value > 0.98 ? 1 : 0, transform: [{ scale: withSpring(progress.value > 0.98 ? 1 : 0.2) }] }));
  const last = geo.points[geo.points.length - 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <AnimatedPath d={geo.path} stroke={colors.sparkline} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${geo.length} ${geo.length}`} animatedProps={pathProps} />
        {entryIndices.map(i => geo.points[i] && <Circle key={i} cx={geo.points[i].x} cy={geo.points[i].y} r={DOT_R} fill={colors.sparkline} />)}
      </Svg>
      {entryIndices.map(i => geo.points[i] && (
        <Marker key={i} x={geo.points[i].x} y={geo.points[i].y} progress={progress} at={(i / (geo.points.length - 1)) * 0.9} />
      ))}
      <Animated.View pointerEvents="none" style={[styles.end, { left: last.x - END_R, top: last.y - END_R }, endStyle]} />
    </View>
  );
});

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: MARKER_R * 2, height: MARKER_R * 2 },
  end: { position: 'absolute', width: END_R * 2, height: END_R * 2, borderRadius: END_R, backgroundColor: colors.sparkline },
});
```

- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components/Sparkline.tsx && git commit -m "feat: sparkline with UI-thread draw-in and entry markers"
```

---

### Task 12: NoteBox and TradeCard

**Files:**
- Create: `src/components/NoteBox.tsx`, `src/components/TradeCard.tsx`

- [ ] **Step 1: NoteBox.tsx** (2-line clamp, measured full height, spring height)

```tsx
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';

const LINE = 16;
const COLLAPSED = LINE * 2;

interface Props { note: string; expanded: boolean; onToggle: () => void }

export function NoteBox({ note, expanded, onToggle }: Props) {
  const [fullHeight, setFullHeight] = useState(COLLAPSED);
  const onMeasure = useCallback((e: LayoutChangeEvent) => setFullHeight(Math.max(COLLAPSED, Math.round(e.nativeEvent.layout.height))), []);
  const target = useDerivedValue(() => withSpring(expanded ? fullHeight : COLLAPSED, { damping: 18, stiffness: 220 }), [expanded, fullHeight]);
  const style = useAnimatedStyle(() => ({ height: target.value }));
  const needsToggle = fullHeight > COLLAPSED;

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.clip, style]}>
        <Text style={[text.note, styles.note]} maxFontSizeMultiplier={1.2}>{note}</Text>
      </Animated.View>
      <Text onLayout={onMeasure} style={[text.note, styles.note, styles.measure]} maxFontSizeMultiplier={1.2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{note}</Text>
      {needsToggle && (
        <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="button" style={styles.more}>
          <Text style={[text.link, styles.link]} maxFontSizeMultiplier={1.2}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.noteBg, borderRadius: layout.noteRadius, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  clip: { overflow: 'hidden' },
  note: { color: colors.textPrimary },
  measure: { position: 'absolute', left: 12, right: 12, top: 12, opacity: 0 },
  more: { marginTop: 4, alignSelf: 'flex-start' },
  link: { color: colors.link },
});
```

- [ ] **Step 2: TradeCard.tsx** (memoised; header, asset row, sparkline, note)

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FeedItem } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatAge, formatCompactMoney, formatMoney, formatPct } from '../utils/format';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';
import { NoteBox } from './NoteBox';
import { Sparkline } from './Sparkline';

interface Props { item: FeedItem; index: number; expanded: boolean; onToggleNote: (id: string) => void; animateIn: boolean }

function Triangle({ up }: { up: boolean }) {
  return <View style={[styles.tri, up ? styles.triUp : styles.triDown]} />;
}

export const TradeCard = React.memo(function TradeCard({ item, index, expanded, onToggleNote, animateIn }: Props) {
  const up = item.changePct >= 0;
  const isBuy = item.side === 'Buy';
  return (
    <Animated.View entering={animateIn ? FadeInDown.delay(index * 70).duration(420).springify().damping(18) : undefined} style={styles.card}>
      <View style={styles.header}>
        <Avatar avatar={item.trader.avatar} size={layout.avatar} verified={item.trader.verified} badgeSize={layout.badge} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={[text.name, styles.name]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.trader.name}</Text>
            <View style={[styles.pill, { backgroundColor: isBuy ? colors.buyPillBg : colors.sellPillBg }]}>
              <Text style={[text.pill, { color: isBuy ? colors.green : colors.red }]} maxFontSizeMultiplier={1.2}>{item.side}</Text>
            </View>
            <Text style={[text.meta, styles.meta]} maxFontSizeMultiplier={1.2}>{formatAge(item.ageMinutes)}</Text>
          </View>
          <Text style={[text.meta, styles.meta]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {`Top ${item.trader.rank} · ${item.trader.winRate}% WR · ${formatCompactMoney(item.trader.volumeUsd)}`}
          </Text>
        </View>
      </View>

      <View style={styles.assetRow}>
        <CoinLogo asset={item.asset} size={layout.coinLogo} badgeSize={layout.buyBadge} />
        <View style={styles.assetText}>
          <Text style={[text.asset, styles.assetName]} maxFontSizeMultiplier={1.2}>{item.asset}</Text>
          <View style={styles.priceRow}>
            <Text style={[text.priceStrong, styles.priceDark]} maxFontSizeMultiplier={1.2}>{formatCompactMoney(item.sizeUsd)}</Text>
            <Text style={[text.price, styles.priceMuted]} maxFontSizeMultiplier={1.2}> at </Text>
            <Text style={[text.priceStrong, styles.priceDark]} maxFontSizeMultiplier={1.2}>{formatMoney(item.price)}</Text>
            <View style={styles.changeRow}>
              <Triangle up={up} />
              <Text style={[text.priceStrong, { color: up ? colors.green : colors.red }]} maxFontSizeMultiplier={1.2}>{formatPct(item.changePct)}</Text>
            </View>
          </View>
        </View>
        <Sparkline id={item.id} values={item.sparkline} entryIndices={item.entryIndices} />
      </View>

      <NoteBox note={item.note} expanded={expanded} onToggle={() => onToggleNote(item.id)} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: layout.cardRadius, marginHorizontal: layout.cardMargin,
    paddingTop: layout.cardPadding, paddingHorizontal: layout.cardPadding - layout.noteInset, paddingBottom: layout.noteInset,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.noteInset },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.textPrimary, flexShrink: 1 },
  pill: { height: 16, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  meta: { color: colors.textSecondary },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: layout.noteInset, marginBottom: 12 },
  assetText: { flex: 1 },
  assetName: { color: colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  priceDark: { color: colors.textPrimary },
  priceMuted: { color: colors.textSecondary },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 6, gap: 3 },
  tri: { width: 0, height: 0, borderLeftWidth: 3.5, borderRightWidth: 3.5, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  triUp: { borderBottomWidth: 6, borderBottomColor: colors.green },
  triDown: { borderTopWidth: 6, borderTopColor: colors.red },
});
```

- [ ] **Step 3: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components && git commit -m "feat: feed trade card with expandable note"
```

---

### Task 13: Nav icons, Mascot, BottomFade

**Files:**
- Create: `src/components/NavIcons.tsx`, `src/components/Mascot.tsx`, `src/components/BottomFade.tsx`

- [ ] **Step 1: NavIcons.tsx** (24pt boxes, 2pt white strokes)

```tsx
import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { colors } from '../theme';

const common = { stroke: colors.navIcon, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 10.5 12 3.5l8 7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...common} />
      <Path d="M8.8 13.5c.9 1.3 2 1.9 3.2 1.9s2.3-.6 3.2-1.9" {...common} />
    </Svg>
  );
}

export function CompassIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" {...common} />
      <Polygon points="15.2,8.8 13.6,13.6 8.8,15.2 10.4,10.4" fill={colors.navIcon} stroke={colors.navIcon} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

export function BarsIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 9v7M9.3 5v11M13.7 10v6M18 13v3" {...common} strokeWidth={2.2} />
    </Svg>
  );
}

export function PersonIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="3.6" {...common} />
      <Path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" {...common} />
    </Svg>
  );
}
```

- [ ] **Step 2: Mascot.tsx** (body PNG + two animated eyes)

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';

const BODY = require('../../assets/mascot_body.png');
// Figma mascot box is 34 x 40; eyes are ellipses ~4.2 x 6.6 centred at (15.7, 20.8) and (21.4, 19.9), tilted -8deg.
export const MASCOT_W = 34;
export const MASCOT_H = 40;
const EYE_W = 4.2;
const EYE_H = 6.6;
const EYES = [{ cx: 15.7, cy: 20.8 }, { cx: 21.4, cy: 19.9 }];

interface Props { look: SharedValue<number>; blink: SharedValue<number>; scale?: number }

export function Mascot({ look, blink, scale = 1 }: Props) {
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: look.value * 2.2 }, { scaleY: 1 - blink.value * 0.85 }],
  }));
  return (
    <View style={{ width: MASCOT_W * scale, height: MASCOT_H * scale }}>
      <Image source={BODY} style={{ width: MASCOT_W * scale, height: MASCOT_H * scale }} contentFit="contain" transition={0} />
      {EYES.map((e, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[styles.eye, {
            width: EYE_W * scale, height: EYE_H * scale, borderRadius: (EYE_W * scale) / 2,
            left: (e.cx - EYE_W / 2) * scale, top: (e.cy - EYE_H / 2) * scale,
          }, eyeStyle, { transform: [{ rotate: '-8deg' }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ eye: { position: 'absolute', backgroundColor: colors.eye } });
```

Note: combine the rotate with the animated transform inside `useAnimatedStyle` instead of a second style (RN merges arrays but a later `transform` replaces the earlier one). Final version:

```tsx
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: look.value * 2.2 }, { rotate: '-8deg' }, { scaleY: 1 - blink.value * 0.85 }],
  }));
```
and drop the trailing `{ transform: [{ rotate: '-8deg' }] }` from the style array.

- [ ] **Step 3: BottomFade.tsx** (iOS progressive blur, Android/web gradient)

```tsx
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

let MaskedView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MaskedView = require('@react-native-masked-view/masked-view').default;
}

export function BottomFade({ height }: { height: number }) {
  if (Platform.OS === 'ios' && MaskedView) {
    return (
      <View pointerEvents="none" style={[styles.wrap, { height }]}>
        <MaskedView style={StyleSheet.absoluteFill} maskElement={<LinearGradient colors={['transparent', 'black', 'black']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />}>
          <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        </MaskedView>
        <LinearGradient colors={['rgba(245,245,245,0)', 'rgba(245,245,245,0.6)', colors.bottomFade]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  return (
    <LinearGradient pointerEvents="none" colors={['rgba(245,245,245,0)', 'rgba(245,245,245,0.85)', colors.bottomFade]} locations={[0, 0.55, 1]} style={[styles.wrap, { height }]} />
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 } });
```

- [ ] **Step 4: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components && git commit -m "feat: nav icons, mascot with animated eyes, bottom fade"
```

---

### Task 14: FloatingNavBar (the creative piece)

**Files:**
- Create: `src/components/FloatingNavBar.tsx`

- [ ] **Step 1: FloatingNavBar.tsx**

```tsx
import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, SharedValue, useAnimatedStyle, useDerivedValue, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, navPillLeft, navSlotCenter } from '../theme';
import { BarsIcon, CompassIcon, HomeIcon, PersonIcon } from './NavIcons';
import { Mascot } from './Mascot';

export const NAV_ITEMS = ['home', 'explore', 'mascot', 'stats', 'profile'] as const;
export type NavKey = typeof NAV_ITEMS[number];
const MASCOT_INDEX = 2;

interface Props { active: number; onChange: (index: number) => void; scrollY: SharedValue<number>; scrollDirection: SharedValue<number> }

function haptic(style: 'light' | 'medium') {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
}

function NavButton({ index, active, onPress, children, pressBloom }: { index: number; active: boolean; onPress: (i: number) => void; children: React.ReactNode; pressBloom: boolean }) {
  const pressed = useSharedValue(0);
  const bloom = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.88 : 1, { damping: 14, stiffness: 320 }) }],
    opacity: withTiming(active ? 1 : 0.86, { duration: 200 }),
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - bloom.value),
    transform: [{ scale: 0.4 + bloom.value * 1.2 }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={styles.slot}
      onPressIn={() => { pressed.value = 1; if (pressBloom) { bloom.value = 0; bloom.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }); } }}
      onPressOut={() => { pressed.value = 0; }}
      onPress={() => onPress(index)}
      hitSlop={6}
    >
      {pressBloom && <Animated.View pointerEvents="none" style={[styles.bloom, bloomStyle]} />}
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export function FloatingNavBar({ active, onChange, scrollY, scrollDirection }: Props) {
  const insets = useSafeAreaInsets();
  const pillX = useSharedValue(navPillLeft(active));
  const target = useSharedValue(navPillLeft(active));
  const look = useSharedValue(0);
  const blink = useSharedValue(0);
  const bob = useSharedValue(0);
  const squash = useSharedValue(1);
  const haloSpin = useSharedValue(0);

  // Idle blink every ~4s (UI thread loop).
  useEffect(() => {
    blink.value = withRepeat(
      withSequence(withDelay(3800, withTiming(1, { duration: 70 })), withTiming(0, { duration: 110 }), withDelay(200, withTiming(0, { duration: 1 }))),
      -1, false,
    );
  }, [blink]);

  useEffect(() => {
    const next = navPillLeft(active);
    target.value = next;
    pillX.value = withSpring(next, { damping: 15, stiffness: 190, mass: 0.9 });
  }, [active, pillX, target]);

  const react = useCallback((index: number) => {
    // Mascot glances toward the tab and bobs; tapping the mascot itself makes it jump.
    const dir = index === MASCOT_INDEX ? 0 : Math.sign(index - MASCOT_INDEX);
    look.value = withSequence(withSpring(dir, { damping: 12, stiffness: 260 }), withDelay(650, withSpring(0, { damping: 14, stiffness: 200 })));
    if (index === MASCOT_INDEX) {
      bob.value = withSequence(withTiming(-14, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 9, stiffness: 240 }));
      squash.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 300 }));
      haloSpin.value = withSequence(withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 }));
      blink.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 120 }));
      haptic('medium');
    } else {
      bob.value = withSequence(withTiming(-5, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 11, stiffness: 260 }));
      haptic('light');
    }
  }, [look, bob, squash, haloSpin, blink]);

  const onPress = useCallback((index: number) => { react(index); onChange(index); }, [react, onChange]);

  // Pill stretches along the direction of travel while it is far from its target.
  const pillStyle = useAnimatedStyle(() => {
    const dist = Math.abs(target.value - pillX.value);
    const stretch = 1 + Math.min(dist / layout.nav.pill, 1) * 0.28;
    return { transform: [{ translateX: pillX.value }, { scaleX: stretch }, { scaleY: 1 / Math.sqrt(stretch) }] };
  });

  // Bar sinks while the list is being scrolled downward.
  const barStyle = useAnimatedStyle(() => {
    const down = scrollDirection.value > 0 && scrollY.value > 40;
    return {
      transform: [
        { translateY: withSpring(down ? 12 : 0, { damping: 18, stiffness: 180 }) },
        { scale: withSpring(down ? 0.97 : 1, { damping: 18, stiffness: 180 }) },
      ],
    };
  });

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scaleY: squash.value }, { scaleX: 1 + (1 - squash.value) * 0.6 }],
  }));

  const bottom = Math.max(insets.bottom, 16) + layout.nav.bottomGap;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom }, barStyle]}>
      <View style={styles.bar}>
        {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid, borderRadius: layout.nav.height / 2 }]} />
        <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />
        <View style={styles.slots}>
          <NavButton index={0} active={active === 0} onPress={onPress} pressBloom><HomeIcon /></NavButton>
          <NavButton index={1} active={active === 1} onPress={onPress} pressBloom><CompassIcon /></NavButton>
          <NavButton index={2} active={active === 2} onPress={onPress} pressBloom={false}>
            <Animated.View style={mascotStyle}><Mascot look={look} blink={blink} /></Animated.View>
          </NavButton>
          <NavButton index={3} active={active === 3} onPress={onPress} pressBloom><BarsIcon /></NavButton>
          <NavButton index={4} active={active === 4} onPress={onPress} pressBloom><PersonIcon /></NavButton>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    width: layout.nav.width, height: layout.nav.height, borderRadius: layout.nav.height / 2, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  pill: {
    position: 'absolute', top: layout.nav.padding, left: 0, width: layout.nav.pill, height: layout.nav.pill,
    borderRadius: layout.nav.pill / 2, backgroundColor: colors.navPill,
  },
  slots: { flex: 1, flexDirection: 'row', paddingHorizontal: layout.nav.padding },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white },
});
```

Note: `shadow*` on a view with `overflow: 'hidden'` clips on Android; keep shadow props on `wrap`'s child wrapper if needed. `navSlotCenter`, `haloSpin` are reserved for the halo tilt: apply `haloSpin` as a subtle rotate on the mascot container if time allows, otherwise remove the unused value before committing (lint clean).

- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit && git add src/components/FloatingNavBar.tsx && git commit -m "feat: floating nav bar with sliding pill, mascot reactions, press bloom and scroll sink"
```

---

### Task 15: DiscoverScreen and App

**Files:**
- Create: `src/screens/DiscoverScreen.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: DiscoverScreen.tsx**

```tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, useSharedValue, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { feedForTab, portfolio, topTrades } from '../data/mock';
import { FeedItem, TabKey } from '../data/types';
import { colors, layout } from '../theme';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { TopTradesCarousel } from '../components/TopTradesCarousel';
import { FeedTabs } from '../components/FeedTabs';
import { TradeCard } from '../components/TradeCard';
import { BottomFade } from '../components/BottomFade';
import { FloatingNavBar } from '../components/FloatingNavBar';

const ENTRANCE_COUNT = 5;

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('discover');
  const [nav, setNav] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);
  const lastY = useSharedValue(0);
  const firstMount = useRef(true);

  const items = useMemo(() => feedForTab(tab), [tab]);

  const onToggleNote = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onTab = useCallback((next: TabKey) => { firstMount.current = false; setTab(next); }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      if (Math.abs(dy) > 2) scrollDirection.value = dy > 0 ? 1 : -1;
      lastY.value = y;
      scrollY.value = y;
    },
    onEndDrag: () => { scrollDirection.value = 0; },
    onMomentumEnd: () => { scrollDirection.value = 0; },
  });

  const renderItem = useCallback<ListRenderItem<FeedItem>>(({ item, index }) => (
    <TradeCard item={item} index={index} expanded={!!expanded[item.id]} onToggleNote={onToggleNote} animateIn={firstMount.current && index < ENTRANCE_COUNT} />
  ), [expanded, onToggleNote]);

  const header = useMemo(() => (
    <View style={{ paddingTop: insets.top + 12 }}>
      <PortfolioHeader portfolio={portfolio} />
      <View style={{ height: 30 }} />
      <TopTradesCarousel trades={topTrades} />
      <View style={{ height: 24 }} />
      <FeedTabs active={tab} onChange={onTab} />
      <View style={{ height: 17 }} />
    </View>
  ), [insets.top, tab, onTab]);

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SkyBackground scrollY={scrollY} />
      <Animated.View key={tab} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.list}>
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={expanded}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingBottom: navClearance }}
          showsVerticalScrollIndicator={false}
          renderScrollComponent={Animated.ScrollView as any}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          drawDistance={height}
        />
      </Animated.View>
      <BottomFade height={navClearance + 20} />
      <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} scrollDirection={scrollDirection} />
    </View>
  );
}

const keyExtractor = (item: FeedItem) => item.id;
function Separator() { return <View style={{ height: layout.cardGap }} />; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.feedBg },
  list: { flex: 1 },
});
```

- [ ] **Step 2: App.tsx**

```tsx
import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DiscoverScreen } from './src/screens/DiscoverScreen';

export default function App() {
  const [loaded] = useFonts(Platform.OS === 'ios' ? {} : { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DiscoverScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Typecheck, run tests, commit**
```bash
npx tsc --noEmit && npx jest && git add -A && git commit -m "feat: Discover screen composition and app entry"
```

---

### Task 16: Run and verify visually (web preview + fidelity pass)

- [ ] **Step 1: Start the web preview** via `preview_start` with `expo-web`, viewport 393×852, compare against `docs/reference/figma-discover@2x.png`. Fix spacing deltas (header offsets, card heights 188, carousel 92, nav bottom 36).
- [ ] **Step 2: Exercise interactions**: tab switch, Read more, nav taps (pill slide, mascot bob/jump), scroll (parallax, nav sink), count-up.
- [ ] **Step 3: Check console for Reanimated/FlashList warnings; fix.**
- [ ] **Step 4: Commit fixes** `git commit -am "fix: fidelity adjustments after visual pass"`.

---

### Task 17: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README** covering: how to run (Expo Go / dev build, web), architecture, how the Figma was measured (view-only workaround), design tokens, animation decisions (nav bar concept + restraint list), performance (FlashList, memo, worklets, SVG sparkline, run-once animations), robustness (safe areas, Android fallbacks, dynamic type), trade-offs (procedural vs exported assets, Inter on Android, no native device recording from this machine, SVG badge approximations), tests, what's next.
- [ ] **Step 2: Commit** `git add README.md && git commit -m "docs: README with decisions, trade-offs and next steps"`.

---

## Self-review

- Spec coverage: header ✔ (T8), carousel ✔ (T9), tabs ✔ (T10), feed cards incl. avatar/Buy tag/stats/asset row/sparkline markers/Read more ✔ (T11–12), nav bar with 5 items + mascot + pill ✔ (T13–14), iOS/Android safe areas + blur fallback ✔ (T13–15), UI-thread animations ✔, mock data ✔ (T6), README ✔ (T17), tests ✔ (T3–6).
- Type consistency: `navPillLeft`/`navSlotCenter` defined in T3 and used in T14; `formatSignedMoney(value, compact)` signature consistent across T4/T8/T9; `FeedItem` fields consistent between T6 and T12; `Mascot` props `{look, blink}` consistent between T13/T14; `TradeCard` props consistent between T12/T15.
- Placeholders: none. `haloSpin` is explicitly either used or removed in T14.
