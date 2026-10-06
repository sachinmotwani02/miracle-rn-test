# Discover Feed Loading Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Discover screen a loading state: simulated per-section loading, bones that breathe
with the ghost, and an in-place crossfade to the content (spec:
`docs/superpowers/specs/2026-10-06-feed-skeleton-design.md`).

**Architecture:** Async mock fetchers (`src/data/api.ts`) feed a tiny external store
(`src/data/resources.ts`) that caches per key and owns all loading timing (blank, skeleton,
content, revealing). Dedicated bones components (`src/components/skeleton/`) mirror the real
cards' rows; a `Reveal` wrapper crossfades from bones to content on mount. The ghost drives a
breath-phase shared value the bones pulse on, and reacts to `loading`.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, Reanimated 4.5 (worklets 0.10),
FlashList 2.0.2, react-native-svg, jest-expo + @testing-library/react-native 14 (async API).

**Working directory:** `C:/Users/sachi/.config/superpowers/worktrees/miracle-rn-test/feed-skeleton`
(branch `feat/feed-skeleton`). Never run git commands that move branches in the OneDrive folder.

**Conventions:** shared value writes outside worklets use `.set()` (lint: react-hooks/immutability);
inside worklets `.value =` is fine. No setState synchronously in effect bodies (timers and promise
callbacks are fine). Baseline lint has 16 findings (BottomFade, DepositButton, Mascot, Sparkline);
add none.

---

## Deviations made during execution (2026-10-06)

- **Reveal keeps the skeleton solid.** Fading the whole bones layer made shared chrome (card
  shell, thread line, note box) dip about 25% mid-crossfade. `Bone.tsx` gained `BoneFadeContext`;
  `Reveal` leaves its skeleton opaque underneath and only the bones (`BonePulse`) fade out, while the
  content fades in on top.
- **`TradeCard` is not modified.** Its white shell is opaque, so the screen wraps each card in
  `Reveal` with `TradeCardSkeleton` as the bones (Task 8). `TopTradeCard` keeps the inner reveal
  because its glass shell is translucent.
- **Mascot lint.** Writing the breath phase through the `shared ?? own` alias uses `phase.set(p)`,
  and the loading smile is a separate `relief` value (combined with `happy` and clamped to 0..1)
  so `happy` is not captured by an effect; both keep `expo lint` at its baseline.
- **Resources hook test** uses a 600 ms reply: a 200 ms reply is held by the 400 ms minimum.
- **RN 0.86** has no `StyleSheet.absoluteFillObject`; edges are spelled out.
- **Merged `main`** (ghost hold-to-swirl) into the branch: README conflict resolved, Mascot merged
  cleanly, 87 tests pass.

- **Breathing replaced by a sweep (user request, after the build).** The bones no longer pulse on
  the ghost's breath and the ghost no longer reacts to loading: Task 7 is reverted
  (`Mascot.tsx` and `FloatingNavBar.tsx` match their base), `BonePulse` became `BoneGroup`
  (fade with distance + handover only), `Bone` draws its slice of a shared light band, and
  `SkeletonSweep` (`src/components/skeleton/Sweep.tsx`) runs it while anything loads.

## File structure

| File | Responsibility |
| --- | --- |
| `src/utils/skeleton.ts` (new) | `SKELETON` constants, `REVEAL_WINDOW`, `boneHeight`, `bonePulse` (worklet), seeded bone widths |
| `src/data/api.ts` (new) | `fetchPortfolio/fetchTopTrades/fetchFeed(ms)` over the mock data; `setHold` |
| `src/data/resources.ts` (new) | `load`, `readResource`, `clearResources`, `useResource`; timing rules |
| `src/theme/colors.ts` | `boneInk`, `boneSky` |
| `src/components/skeleton/Bone.tsx` (new) | `Bone`, `BonePulse`, `BreathContext` |
| `src/components/skeleton/Reveal.tsx` (new) | bones-to-content crossfade, decided on mount |
| `src/components/skeleton/FeedSkeleton.tsx` (new) | `TradeCardBones`, `TradeCardSkeleton`, `FeedSkeleton` |
| `src/components/skeleton/TopTradeSkeleton.tsx` (new) | `TopTradeCardBones`, `TopTradesSkeleton` |
| `src/components/skeleton/PortfolioBones.tsx` (new) | value + delta bones on the sky |
| `src/components/PortfolioHeader.tsx`, `TopTradeCard.tsx`, `TopTradesCarousel.tsx`, `TradeCard.tsx` | optional data, `Reveal` |
| `src/components/Mascot.tsx`, `FloatingNavBar.tsx` | `loading`, `breathPhase` |
| `src/screens/DiscoverScreen.tsx` | resources, Skeleton dials, Replay, `BreathContext` |
| `README.md` | Loading skeleton section |

---

### Task 1: Skeleton constants and maths

**Files:**
- Create: `src/utils/skeleton.ts`
- Test: `src/__tests__/skeleton.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { REVEAL_WINDOW, SKELETON, boneHeight, bonePulse, topTradeWidths, tradeCardWidths } from '../utils/skeleton';

describe('boneHeight', () => {
  it('sizes a text bone to about the cap height of the text it stands for', () => {
    expect(boneHeight(12)).toBe(9);
    expect(boneHeight(13)).toBe(9);
    expect(boneHeight(15)).toBe(11);
    expect(boneHeight(19)).toBe(14);
    expect(boneHeight(24)).toBe(17);
  });
});

describe('bonePulse', () => {
  it('is fully opaque at rest and dims by the pulse depth at the top of a breath', () => {
    expect(bonePulse(0)).toBe(1);
    expect(bonePulse(0.4)).toBeCloseTo(1 - SKELETON.pulseDepth, 6);
  });

  it('stays within [1 - depth, 1] over a whole breath', () => {
    for (let i = 0; i <= 100; i++) {
      const o = bonePulse(i / 100);
      expect(o).toBeGreaterThanOrEqual(1 - SKELETON.pulseDepth - 1e-9);
      expect(o).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe('bone widths', () => {
  it('are stable for a seed and differ between cards', () => {
    expect(tradeCardWidths(0)).toEqual(tradeCardWidths(0));
    expect(tradeCardWidths(0)).not.toEqual(tradeCardWidths(1));
    expect(topTradeWidths(0)).not.toEqual(topTradeWidths(1));
  });

  it('stay inside the range real content covers', () => {
    for (let seed = 0; seed < 50; seed++) {
      const w = tradeCardWidths(seed);
      expect(w.name).toBeGreaterThanOrEqual(64);
      expect(w.name).toBeLessThanOrEqual(100);
      expect(w.stats).toBeGreaterThanOrEqual(128);
      expect(w.stats).toBeLessThanOrEqual(168);
      expect(w.asset).toBeGreaterThanOrEqual(38);
      expect(w.asset).toBeLessThanOrEqual(50);
      expect(w.price).toBeGreaterThanOrEqual(132);
      expect(w.price).toBeLessThanOrEqual(164);
      expect(w.note).toBeGreaterThanOrEqual(58);
      expect(w.note).toBeLessThanOrEqual(86);
      const t = topTradeWidths(seed);
      expect(t.name).toBeGreaterThanOrEqual(52);
      expect(t.name).toBeLessThanOrEqual(76);
      expect(t.gain).toBeGreaterThanOrEqual(48);
      expect(t.gain).toBeLessThanOrEqual(64);
      expect(t.meta).toBeGreaterThanOrEqual(104);
      expect(t.meta).toBeLessThanOrEqual(132);
    }
  });
});

describe('REVEAL_WINDOW', () => {
  it("outlasts the last placeholder card's crossfade", () => {
    const last = (SKELETON.feedFade.length - 1) * SKELETON.reveal.stagger + SKELETON.reveal.duration;
    expect(REVEAL_WINDOW).toBeGreaterThan(last);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/__tests__/skeleton.test.ts`
Expected: FAIL, "Cannot find module '../utils/skeleton'".

- [ ] **Step 3: Implement**

```ts
import { breathCurve } from './mascotMotion';
import { mulberry32 } from './random';

/**
 * The Discover screen's loading skeleton. Bone tones live in the theme (`boneInk`, `boneSky`);
 * timing, motion and sizes live here. `bonePulse` is a worklet, so the pulse runs on the UI thread.
 */
export const SKELETON = {
  /** Bones dim by this much at the top of each of the ghost's breaths. */
  pulseDepth: 0.55,
  /** While anything loads the ghost breathes this much faster (3.8 s to about 1.5 s a breath). */
  breathRate: 2.5,
  /** How long the ghost takes to speed up and look up at the feed, and to come back, ms. */
  hurryMs: 600,
  /** Where the ghost's eyes rest while loading: up toward the feed, as a share of their travel. */
  attendY: -0.8,
  /** One entry per placeholder feed card: the opacity of its bones (they fade with distance). */
  feedFade: [1, 0.7, 0.4],
  /** Placeholder cards in the carousel. */
  carouselCards: 2,
  reveal: {
    /** Content fades in over its bones for this long, ms. */
    duration: 240,
    /** Delay between consecutive cards, ms. */
    stagger: 70,
  },
  gate: {
    /** A tab's first load draws nothing this long, so a quick reply never flashes bones, ms. */
    showDelay: 150,
    /** Once shown, bones stay at least this long, ms. */
    minVisible: 400,
  },
  /** Simulated latency of the mock API, ms (tunable in the Dials' Skeleton panel). */
  latency: { portfolio: 600, topTrades: 900, feed: 1300, tabFeed: 700 },
} as const;

/** Components that mount this soon after their bones hand over still crossfade; later ones do not. */
export const REVEAL_WINDOW =
  (SKELETON.feedFade.length - 1) * SKELETON.reveal.stagger + SKELETON.reveal.duration + 100;

/** Height of a bone standing in for text of this size: about the cap height, centred in the line. */
export function boneHeight(fontSize: number): number {
  return Math.round(fontSize * 0.72);
}

/** Opacity of a group of bones at a point in the ghost's breath: 1 at rest, dimmest at the top. */
export function bonePulse(phase: number): number {
  'worklet';
  return 1 - SKELETON.pulseDepth * breathCurve(phase);
}

function between(rnd: () => number, min: number, max: number): number {
  return Math.round(min + rnd() * (max - min));
}

export interface TradeCardWidths {
  name: number;
  stats: number;
  asset: number;
  price: number;
  /** Second note line, percent of the line. */
  note: number;
}

/** Bone widths for placeholder feed card `seed`: within what real cards show, stable per seed. */
export function tradeCardWidths(seed: number): TradeCardWidths {
  const rnd = mulberry32(7001 + seed);
  return {
    name: between(rnd, 64, 100),
    stats: between(rnd, 128, 168),
    asset: between(rnd, 38, 50),
    price: between(rnd, 132, 164),
    note: between(rnd, 58, 86),
  };
}

export interface TopTradeWidths {
  name: number;
  gain: number;
  meta: number;
}

/** Bone widths for placeholder carousel card `seed`. */
export function topTradeWidths(seed: number): TopTradeWidths {
  const rnd = mulberry32(9001 + seed);
  return { name: between(rnd, 52, 76), gain: between(rnd, 48, 64), meta: between(rnd, 104, 132) };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/__tests__/skeleton.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/skeleton.ts src/__tests__/skeleton.test.ts
git commit -m "feat: skeleton constants, bone sizes and a breath-driven bone pulse"
```

---

### Task 2: Mock API with latency and a hold switch

**Files:**
- Create: `src/data/api.ts`
- Test: `src/__tests__/api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { fetchFeed, fetchPortfolio, fetchTopTrades, setHold } from '../data/api';
import { feedForTab, portfolio, topTrades } from '../data/mock';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  setHold(false);
  jest.useRealTimers();
});

describe('mock api', () => {
  it('answers with the mock data after the latency', async () => {
    const done = jest.fn();
    fetchPortfolio(600).then(done);
    await jest.advanceTimersByTimeAsync(599);
    expect(done).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledWith(portfolio);
  });

  it('serves the top trades and each tab its own feed', async () => {
    const trades = fetchTopTrades(0);
    const rising = fetchFeed('rising', 0);
    await jest.advanceTimersByTimeAsync(0);
    await expect(trades).resolves.toEqual(topTrades);
    await expect(rising).resolves.toEqual(feedForTab('rising'));
  });

  it('parks answers while held and delivers them when the hold ends', async () => {
    setHold(true);
    const done = jest.fn();
    fetchPortfolio(100).then(done);
    await jest.advanceTimersByTimeAsync(5000);
    expect(done).not.toHaveBeenCalled();
    setHold(false);
    await jest.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith(portfolio);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/__tests__/api.test.ts`
Expected: FAIL, "Cannot find module '../data/api'".

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/__tests__/api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/api.ts src/__tests__/api.test.ts
git commit -m "feat: async mock api with per-call latency and a hold switch"
```

---

### Task 3: Resource store (cache + loading timing)

**Files:**
- Create: `src/data/resources.ts`
- Test: `src/__tests__/resources.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { act, renderHook } from '@testing-library/react-native';
import { clearResources, load, readResource, useResource } from '../data/resources';
import { REVEAL_WINDOW, SKELETON } from '../utils/skeleton';

/** A fetcher that answers `value` after `ms` (fake timers). */
const reply =
  <T,>(value: T, ms: number) =>
  () =>
    new Promise<T>(resolve => setTimeout(() => resolve(value), ms));

beforeEach(() => {
  jest.useFakeTimers();
  clearResources();
});
afterEach(() => jest.useRealTimers());

describe('resources', () => {
  it('cold start: bones at once, then content with a reveal window', async () => {
    load('a', reply('A', 600));
    expect(readResource('a')).toEqual({ phase: 'skeleton', data: undefined, revealing: false });
    await jest.advanceTimersByTimeAsync(600);
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: true });
    await jest.advanceTimersByTimeAsync(REVEAL_WINDOW);
    expect(readResource('a').revealing).toBe(false);
  });

  it('serves a loaded key from the cache, with no bones and no reveal', async () => {
    load('a', reply('A', 600));
    await jest.advanceTimersByTimeAsync(600 + REVEAL_WINDOW);
    const fetcher = jest.fn(reply('B', 600));
    load('a', fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: false });
  });

  it('keeps bones up for the minimum time when the data comes straight after them', async () => {
    load('a', reply('A', 50));
    await jest.advanceTimersByTimeAsync(50);
    expect(readResource('a').phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(SKELETON.gate.minVisible - 50);
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: true });
  });

  it('skips the bones when a delayed load answers inside the show delay', async () => {
    const delayed = { showDelay: SKELETON.gate.showDelay };
    load('b', reply('B', 100), delayed);
    expect(readResource('b', delayed).phase).toBe('blank');
    await jest.advanceTimersByTimeAsync(100);
    expect(readResource('b', delayed)).toEqual({ phase: 'content', data: 'B', revealing: false });
    await jest.advanceTimersByTimeAsync(1000);
    expect(readResource('b', delayed).phase).toBe('content');
  });

  it('draws bones after the show delay and holds them for the minimum time', async () => {
    const delayed = { showDelay: 150 };
    load('c', reply('C', 300), delayed);
    await jest.advanceTimersByTimeAsync(150);
    expect(readResource('c', delayed).phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(150); // data at 300; bones drawn at 150 stay until 550
    expect(readResource('c', delayed).phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(250);
    expect(readResource('c', delayed)).toEqual({ phase: 'content', data: 'C', revealing: true });
  });

  it('reads an unknown key as pending: bones, or blank under a show delay', () => {
    expect(readResource('nope').phase).toBe('skeleton');
    expect(readResource('nope', { showDelay: 150 }).phase).toBe('blank');
  });

  it('forgets everything on clear; a load still in flight lands nowhere', async () => {
    load('d', reply('D', 500));
    clearResources();
    await jest.advanceTimersByTimeAsync(500);
    expect(readResource('d').phase).toBe('skeleton');
  });

  it('re-renders a component as its resource moves from bones to content', async () => {
    // Slower than the bones' minimum time, so the content lands the moment the data does.
    const fetcher = reply('H', 600);
    const { result } = await renderHook(() => useResource('h', fetcher));
    expect(result.current.phase).toBe('skeleton');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(600);
    });
    expect(result.current).toEqual({ phase: 'content', data: 'H', revealing: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/__tests__/resources.test.ts`
Expected: FAIL, "Cannot find module '../data/resources'".

- [ ] **Step 3: Implement**

```ts
import { useEffect, useSyncExternalStore } from 'react';
import { REVEAL_WINDOW, SKELETON } from '../utils/skeleton';

/**
 * A small session cache for the mock API that also owns the loading UI's timing, so components
 * only read a snapshot:
 * - `blank`: a tab's first moments; nothing is drawn, so a quick reply never flashes bones.
 * - `skeleton`: bones, kept for at least SKELETON.gate.minVisible once drawn.
 * - `content`: the data. `revealing` stays true for REVEAL_WINDOW after content replaces bones,
 *   so the components that mount then crossfade from their bones. Content that never had bones
 *   (a cache hit, a reply inside the show delay) is not revealing.
 * Timers and the fetch callback make every change; rendering never does.
 */
export type LoadPhase = 'blank' | 'skeleton' | 'content';

export interface Resource<T> {
  phase: LoadPhase;
  data: T | undefined;
  revealing: boolean;
}

export interface LoadOptions {
  /** Wait this long before drawing bones; 0 draws them at once (cold start). */
  showDelay?: number;
}

interface Entry {
  snapshot: Resource<unknown>;
  shownAt: number | null;
  timers: Set<ReturnType<typeof setTimeout>>;
}

const BLANK: Resource<never> = { phase: 'blank', data: undefined, revealing: false };
const BONES: Resource<never> = { phase: 'skeleton', data: undefined, revealing: false };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(entry: Entry, patch: Partial<Resource<unknown>>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  listeners.forEach(listener => listener());
}

function after(entry: Entry, ms: number, run: () => void) {
  const id = setTimeout(() => {
    entry.timers.delete(id);
    run();
  }, ms);
  entry.timers.add(id);
}

/** Starts loading `key` unless it is loading or loaded already. Safe to call on every render. */
export function load<T>(key: string, fetcher: () => Promise<T>, { showDelay = 0 }: LoadOptions = {}) {
  if (entries.has(key)) return;
  // The new entry reads exactly like the pending snapshot, so nobody needs telling yet.
  const entry: Entry = {
    snapshot: showDelay > 0 ? BLANK : BONES,
    shownAt: showDelay > 0 ? null : Date.now(),
    timers: new Set(),
  };
  entries.set(key, entry);
  if (showDelay > 0) {
    after(entry, showDelay, () => {
      entry.shownAt = Date.now();
      update(entry, { phase: 'skeleton' });
    });
  }
  fetcher().then(data => {
    if (entries.get(key) !== entry) return; // cleared while loading
    if (entry.shownAt === null) {
      // Answered inside the show delay: the bones were never drawn, so there is nothing to reveal.
      entry.timers.forEach(clearTimeout);
      entry.timers.clear();
      update(entry, { phase: 'content', data });
      return;
    }
    const reveal = () => {
      update(entry, { phase: 'content', data, revealing: true });
      after(entry, REVEAL_WINDOW, () => update(entry, { revealing: false }));
    };
    const wait = entry.shownAt + SKELETON.gate.minVisible - Date.now();
    if (wait > 0) after(entry, wait, reveal);
    else reveal();
  });
}

/** What a component sees for `key` right now; a key nobody has loaded yet reads as pending. */
export function readResource<T>(key: string, { showDelay = 0 }: LoadOptions = {}): Resource<T> {
  return (entries.get(key)?.snapshot ?? (showDelay > 0 ? BLANK : BONES)) as Resource<T>;
}

/** Forgets every load, cached or in flight (the Dials' "Replay cold start"). */
export function clearResources() {
  entries.forEach(entry => entry.timers.forEach(clearTimeout));
  entries.clear();
  listeners.forEach(listener => listener());
}

/** Loads `key` once per session and re-renders as it goes from blank to bones to content. */
export function useResource<T>(key: string, fetcher: () => Promise<T>, options: LoadOptions = {}): Resource<T> {
  const showDelay = options.showDelay ?? 0;
  useEffect(() => {
    load(key, fetcher, { showDelay });
  }, [key, fetcher, showDelay]);
  return useSyncExternalStore(subscribe, () => readResource<T>(key, { showDelay }));
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/__tests__/resources.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/resources.ts src/__tests__/resources.test.ts
git commit -m "feat: resource store that caches mock loads and owns the skeleton timing"
```

---

### Task 4: Bone tones, Bone, BonePulse, BreathContext, Reveal

**Files:**
- Modify: `src/theme/colors.ts` (after `noteBg`)
- Create: `src/components/skeleton/Bone.tsx`, `src/components/skeleton/Reveal.tsx`

- [ ] **Step 1: Add the tones to `colors`**

```ts
  /** Loading bones: ink on white and glass cards, white on the sky. */
  boneInk: 'rgba(34,36,42,0.07)',
  boneSky: 'rgba(255,255,255,0.3)',
```

- [ ] **Step 2: Create `Bone.tsx`**

```tsx
import React, { createContext, useContext } from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { colors } from '../../theme';
import { bonePulse } from '../../utils/skeleton';

/** The ghost's breath phase (0..1, wrapping), driven by the Mascot. Bones pulse on it. */
export const BreathContext = createContext<SharedValue<number> | null>(null);

interface BoneProps {
  width: DimensionValue;
  height: number;
  /** Fully rounded unless given. */
  radius?: number;
  /** `ink` on white and glass cards, `sky` straight on the sky. */
  tone?: 'ink' | 'sky';
  style?: StyleProp<ViewStyle>;
}

/** One placeholder shape. Static on its own: the BonePulse around it does the breathing. */
export function Bone({ width, height, radius = height / 2, tone = 'ink', style }: BoneProps) {
  const backgroundColor = tone === 'sky' ? colors.boneSky : colors.boneInk;
  return <View style={[{ width, height, borderRadius: radius, backgroundColor }, style]} />;
}

interface PulseProps {
  /** Scales the group (feed cards fade with distance). */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * A group of bones breathing with the ghost: one animated opacity for the whole group, read from
 * the breath phase on the UI thread. Without a BreathContext (or with Reduce Motion, which stops
 * the ghost's breath) the bones hold still.
 */
export function BonePulse({ opacity = 1, style, children }: PulseProps) {
  const phase = useContext(BreathContext);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity * (phase ? bonePulse(phase.value) : 1) }));
  return <Animated.View style={[style, pulse]}>{children}</Animated.View>;
}
```

- [ ] **Step 3: Create `Reveal.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SKELETON } from '../../utils/skeleton';

interface Props {
  /** Read once, on mount: true crossfades from `bones`, false renders the content plainly. */
  active: boolean;
  /** The same bones (same seed and fade) the skeleton showed in this spot. */
  bones: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}

/**
 * Hands over from bones to content in place. The bones sit under the content looking exactly as
 * the skeleton did, so the frame where the real component replaces the skeleton is unchanged; then
 * the content fades in while the bones fade out, and the bones unmount. Recycled or later mounts
 * (active false) render the content as usual.
 */
export function Reveal({ active, bones, delay = 0, children }: Props) {
  const [revealing] = useState(active);
  const [bonesMounted, setBonesMounted] = useState(active);
  const shown = useSharedValue(revealing ? 0 : 1);

  useEffect(() => {
    if (!revealing) return;
    const { duration } = SKELETON.reveal;
    shown.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) })));
    const id = setTimeout(() => setBonesMounted(false), delay + duration + 50);
    return () => clearTimeout(id);
  }, [revealing, delay, shown]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const bonesStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));

  if (!revealing) return <>{children}</>;
  return (
    <View>
      {bonesMounted ? <Animated.View style={[styles.bones, bonesStyle]}>{bones}</Animated.View> : null}
      <Animated.View style={contentStyle}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clipped to the content: a card shorter than its skeleton (a note without "Read more") must not
  // show bones hanging out underneath.
  bones: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' },
});
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/theme/colors.ts src/components/skeleton/Bone.tsx src/components/skeleton/Reveal.tsx
git commit -m "feat: bone primitives that breathe with the ghost and an in-place reveal"
```

---

### Task 5: Bones layouts (feed card, carousel card, portfolio) with an a11y smoke test

**Files:**
- Create: `src/components/skeleton/FeedSkeleton.tsx`, `src/components/skeleton/TopTradeSkeleton.tsx`, `src/components/skeleton/PortfolioBones.tsx`
- Test: `src/__tests__/skeletonViews.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { FeedSkeleton } from '../components/skeleton/FeedSkeleton';
import { PortfolioBones } from '../components/skeleton/PortfolioBones';
import { TopTradesSkeleton } from '../components/skeleton/TopTradeSkeleton';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

describe('skeleton views', () => {
  it.each([
    ['Loading trades', <FeedSkeleton key="feed" />],
    ['Loading top trades', <TopTradesSkeleton key="carousel" />],
    ['Loading portfolio', <PortfolioBones key="portfolio" />],
  ])('announce "%s" once, as busy', async (label, element) => {
    const screen = await render(element);
    const region = screen.getByLabelText(label);
    expect(region.props.accessibilityState).toEqual({ busy: true });
    expect(screen.getAllByLabelText(label)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/__tests__/skeletonViews.test.tsx`
Expected: FAIL, "Cannot find module '../components/skeleton/FeedSkeleton'".

- [ ] **Step 3: Create `FeedSkeleton.tsx`**

```tsx
import React, { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, layout, text } from '../../theme';
import { SKELETON, boneHeight, tradeCardWidths } from '../../utils/skeleton';
import { Bone, BonePulse } from './Bone';

const INNER = layout.cardPadding - layout.noteInset;
const lineBone = (style: TextStyle) => boneHeight(style.fontSize ?? 12);
/** A gentle wave in the sparkline's 90 x 32 slot, where the real line draws in later. */
const WAVE = 'M5 22 C 17 15, 25 27, 37 21 S 57 13, 67 17 S 79 13, 85 11';

/**
 * The inside of a feed card while it loads, row for row with TradeCard: the 40 pt header, the
 * 11 pt thread, the 38 pt asset row and the collapsed note box (74 pt). The card's chrome (thread
 * line, note box) is drawn for real; only data becomes bones. `seed` varies the widths per card,
 * `fade` dims the bones of lower cards.
 */
export function TradeCardBones({ seed, fade = 1 }: { seed: number; fade?: number }) {
  const w = useMemo(() => tradeCardWidths(seed), [seed]);
  return (
    <View>
      <BonePulse opacity={fade} style={styles.header}>
        <Bone width={layout.avatar} height={layout.avatar} style={styles.avatar} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Bone width={w.name} height={lineBone(text.name)} />
            <Bone width={28} height={16} style={styles.after} />
            <Bone width={16} height={lineBone(text.meta)} style={styles.after} />
          </View>
          <View style={styles.statsRow}>
            <Bone width={w.stats} height={lineBone(text.meta)} />
          </View>
        </View>
      </BonePulse>
      <View style={styles.thread} />
      <BonePulse opacity={fade} style={styles.assetRow}>
        <Bone width={layout.coinLogo} height={layout.coinLogo} />
        <View style={styles.assetText}>
          <View style={styles.assetLine}>
            <Bone width={w.asset} height={lineBone(text.asset)} />
          </View>
          <View style={styles.priceLine}>
            <Bone width={w.price} height={lineBone(text.price)} />
          </View>
        </View>
        <Svg width={layout.sparklineWidth} height={layout.sparklineHeight}>
          <Path d={WAVE} stroke={colors.boneInk} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </Svg>
      </BonePulse>
      <View style={styles.note}>
        <BonePulse opacity={fade}>
          <View style={styles.noteLine}>
            <Bone width="100%" height={lineBone(text.note)} />
          </View>
          <View style={styles.noteLine}>
            <Bone width={`${w.note}%`} height={lineBone(text.note)} />
          </View>
          <View style={styles.more}>
            <Bone width={64} height={lineBone(text.link)} />
          </View>
        </BonePulse>
      </View>
    </View>
  );
}

/** A whole placeholder feed card: TradeCard's white shell with bones inside. */
export function TradeCardSkeleton({ seed, fade }: { seed: number; fade?: number }) {
  return (
    <View style={styles.card}>
      <TradeCardBones seed={seed} fade={fade} />
    </View>
  );
}

/** The feed while it loads: three cards fading with distance, announced once as busy. */
export function FeedSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading trades" accessibilityState={{ busy: true }} style={styles.feed}>
      {SKELETON.feedFade.map((fade, i) => (
        <TradeCardSkeleton key={i} seed={i} fade={fade} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { gap: layout.cardGap },
  // TradeCard's shell.
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.cardRadius,
    marginHorizontal: layout.cardMargin,
    paddingTop: layout.cardPaddingTop,
    paddingHorizontal: layout.noteInset,
    paddingBottom: layout.noteInset,
  },
  // TradeCard: 36 pt avatar nudged 2 pt down, then a 20 + 4 + 16 text column, all in 40 pt.
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: INNER, height: 40 },
  avatar: { marginTop: 2 },
  headerText: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', height: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', height: 16 },
  after: { marginLeft: 6 },
  thread: { width: 2, height: 11, backgroundColor: colors.thread, marginLeft: INNER + layout.avatar / 2 - 1 },
  // 36 pt coin, a 22 + 16 pt text column (the row is 38 pt), the 90 x 32 sparkline, 11 pt below.
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11, paddingHorizontal: INNER },
  assetText: { flex: 1 },
  assetLine: { height: 22, justifyContent: 'center' },
  priceLine: { height: 16, justifyContent: 'center' },
  // NoteBox, collapsed: 12 top, two 16 pt lines, 2 + 20 pt "Read more", 8 bottom.
  note: {
    backgroundColor: colors.noteBg,
    borderRadius: layout.noteRadius,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  noteLine: { height: 16, justifyContent: 'center' },
  more: { height: 20, marginTop: 2, justifyContent: 'center' },
});
```

- [ ] **Step 4: Create `TopTradeSkeleton.tsx`**

```tsx
import React, { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { colors, layout, text } from '../../theme';
import { SKELETON, boneHeight, topTradeWidths } from '../../utils/skeleton';
import { Bone, BonePulse } from './Bone';

const lineBone = (style: TextStyle) => boneHeight(style.fontSize ?? 12);

/** The inside of a carousel card while it loads, row for row with TopTradeCard. */
export function TopTradeCardBones({ seed }: { seed: number }) {
  const w = useMemo(() => topTradeWidths(seed), [seed]);
  return (
    <BonePulse>
      <View style={styles.header}>
        {/* The 20 pt photo plus its 1 pt ring. */}
        <Bone width={layout.avatarSmall + 2} height={layout.avatarSmall + 2} />
        <Bone width={w.name} height={lineBone(text.name)} />
      </View>
      <View style={styles.body}>
        <Bone width={layout.coinLogo} height={layout.coinLogo} />
        <View style={styles.texts}>
          <View style={styles.gainLine}>
            <Bone width={w.gain} height={lineBone(text.gain)} />
          </View>
          <View style={styles.metaLine}>
            <Bone width={w.meta} height={lineBone(text.meta)} />
          </View>
        </View>
      </View>
    </BonePulse>
  );
}

/** The carousel while it loads: real glass cards with bones inside; the row does not scroll. */
export function TopTradesSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading top trades" accessibilityState={{ busy: true }} style={styles.row}>
      {Array.from({ length: SKELETON.carouselCards }, (_, i) => (
        <View key={i} style={styles.card}>
          <TopTradeCardBones seed={i} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: layout.carouselGap, paddingHorizontal: layout.screenPadding, overflow: 'hidden' },
  // TopTradeCard's glass shell.
  card: {
    width: layout.carouselCardWidth,
    height: layout.carouselCardHeight,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.carouselCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 11,
    paddingTop: 11,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 22 },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 10, marginLeft: 1 },
  texts: { flex: 1 },
  gainLine: { height: 20, justifyContent: 'center' },
  metaLine: { height: 16, justifyContent: 'center' },
});
```

- [ ] **Step 5: Create `PortfolioBones.tsx`**

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { text } from '../../theme';
import { boneHeight } from '../../utils/skeleton';
import { Bone, BonePulse } from './Bone';

/** The portfolio value (28 pt line) and 24h delta (16 pt line, 6 pt below) as bones on the sky. */
export function PortfolioBones() {
  return (
    <BonePulse>
      <View accessible accessibilityLabel="Loading portfolio" accessibilityState={{ busy: true }}>
        <View style={styles.value}>
          <Bone width={132} height={boneHeight(text.portfolioValue.fontSize ?? 24)} tone="sky" />
        </View>
        <View style={styles.delta}>
          <Bone width={112} height={boneHeight(text.delta.fontSize ?? 12)} tone="sky" />
        </View>
      </View>
    </BonePulse>
  );
}

const styles = StyleSheet.create({
  value: { height: 28, justifyContent: 'center' },
  delta: { height: 16, marginTop: 6, justifyContent: 'center' },
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/__tests__/skeletonViews.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/skeleton src/__tests__/skeletonViews.test.tsx
git commit -m "feat: bones for the feed card, carousel card and portfolio, announced as busy"
```

---

### Task 6: Cards and header reveal from their bones

**Files:**
- Modify: `src/components/PortfolioHeader.tsx`, `src/components/TopTradeCard.tsx`, `src/components/TopTradesCarousel.tsx`, `src/components/TradeCard.tsx`

- [ ] **Step 1: `PortfolioHeader` takes optional data and reveals**

Replace the component with:

```tsx
export function PortfolioHeader({ portfolio, reveal = false }: { portfolio?: Portfolio; reveal?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        {portfolio ? (
          <Reveal active={reveal} bones={<PortfolioBones />}>
            <Text style={[text.portfolioValue, styles.value]} maxFontSizeMultiplier={1.2}>
              {formatMoney(portfolio.valueUsd)}
            </Text>
            <Text style={[text.delta, styles.delta]} maxFontSizeMultiplier={1.3}>
              <Text style={[text.delta, styles.deltaStrong]}>{formatSignedMoney(portfolio.deltaUsd)}</Text>
              <Text style={[text.deltaMuted, styles.deltaMuted]}>{` · ${formatPct(portfolio.deltaPct)} 24h`}</Text>
            </Text>
          </Reveal>
        ) : (
          <PortfolioBones />
        )}
      </View>
      <DepositButton />
    </View>
  );
}
```

with imports `import { PortfolioBones } from './skeleton/PortfolioBones';` and
`import { Reveal } from './skeleton/Reveal';`.

- [ ] **Step 2: `TopTradeCard` reveals when asked**

Props become `{ trade: TopTrade; index?: number; reveal?: boolean }`; wrap the card's two rows:

```tsx
export const TopTradeCard = React.memo(function TopTradeCard({
  trade,
  index = 0,
  reveal = false,
}: {
  trade: TopTrade;
  index?: number;
  /** Mount over the loading bones and crossfade (the cards that replace the skeleton). */
  reveal?: boolean;
}) {
  return (
    <View style={styles.card}>
      <Reveal active={reveal} delay={index * SKELETON.reveal.stagger} bones={<TopTradeCardBones seed={index} />}>
        <View style={styles.header}>
          {/* unchanged Avatar + name */}
        </View>
        <View style={styles.body}>
          {/* unchanged CoinLogo + texts */}
        </View>
      </Reveal>
    </View>
  );
});
```

(keep the existing Avatar/Text/CoinLogo JSX inside the two rows exactly as it is), with imports
`Reveal`, `TopTradeCardBones` from `./skeleton/...` and `SKELETON` from `../utils/skeleton`.

- [ ] **Step 3: `TopTradesCarousel` shows bones until trades arrive**

```tsx
export function TopTradesCarousel({ trades, reveal = false }: { trades?: TopTrade[]; reveal?: boolean }) {
  const renderItem = useCallback<ListRenderItem<TopTrade>>(
    ({ item, index }) => <TopTradeCard trade={item} index={index} reveal={reveal && index < SKELETON.carouselCards} />,
    [reveal],
  );
  return (
    <View>
      <Text style={[text.sectionTitle, styles.title]} maxFontSizeMultiplier={1.3}>
        Top trades last 24h
      </Text>
      {trades ? (
        <FlatList
          horizontal
          data={trades}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={reveal}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={Separator}
          snapToInterval={SNAP}
          snapToAlignment="start"
          decelerationRate="fast"
          nestedScrollEnabled
        />
      ) : (
        <TopTradesSkeleton />
      )}
    </View>
  );
}
```

with imports `TopTradesSkeleton` and `SKELETON`.

- [ ] **Step 4: `TradeCard` reveals when asked**

Add to `Props`:

```ts
  /** Mount over this card's loading bones and crossfade to the content (the first cards after a load). */
  reveal?: boolean;
```

and wrap everything inside the card's `Animated.View`:

```tsx
export const TradeCard = React.memo(function TradeCard({ item, index, expanded, onToggleNote, animateIn, reveal = false }: Props) {
  const up = item.changePct >= 0;
  const isBuy = item.side === 'Buy';
  return (
    <Animated.View entering={animateIn ? cardEntrance(index) : undefined} style={styles.card}>
      <Reveal
        active={reveal}
        delay={index * SKELETON.reveal.stagger}
        bones={<TradeCardBones seed={index} fade={SKELETON.feedFade[index] ?? 1} />}
      >
        {/* unchanged: header, thread, asset row, NoteBox */}
      </Reveal>
    </Animated.View>
  );
});
```

with imports `Reveal`, `TradeCardBones` and `SKELETON`.

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc exit 0; all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/PortfolioHeader.tsx src/components/TopTradeCard.tsx src/components/TopTradesCarousel.tsx src/components/TradeCard.tsx
git commit -m "feat: header, carousel and feed cards take optional data and reveal from their bones"
```

---

### Task 7: The ghost attends while loading

**Files:**
- Modify: `src/components/Mascot.tsx`, `src/components/FloatingNavBar.tsx`

- [ ] **Step 1: Breath can be stored outside and hurried**

Replace `useBreath` with:

```ts
/**
 * Breathing on a UI-thread clock instead of a repeating timing loop, so each breath can
 * take its own length and depth and the halo can trail the cloud by a fixed phase. The phase
 * lives in `shared` when the screen passes one (the loading bones pulse on it); `hurry` (0..1)
 * speeds the breaths up while the screen loads.
 */
function useBreath(enabled: boolean, hurry: SharedValue<number>, shared?: SharedValue<number>) {
  const own = useSharedValue(0);
  const phase = shared ?? own;
  const period = useSharedValue<number>(BREATH.period);
  const depth = useSharedValue(1);
  const exertion = useSharedValue(0);
  useFrameCallback(({ timeSincePreviousFrame }) => {
    // Clamped so coming back from the background does not skip ahead.
    const dt = Math.min(timeSincePreviousFrame ?? 16, 64);
    const rate = (1 + BREATH.exertedRate * exertion.value) * (1 + (SKELETON.breathRate - 1) * hurry.value);
    let p = phase.value + (dt / period.value) * rate;
    if (p >= 1) {
      // A new breath starts from rest, so its length and depth can change without a jump.
      p -= 1;
      period.value = BREATH.period * randomBetween(0.9, 1.1);
      depth.value = randomBetween(0.9, 1.1);
    }
    phase.value = p;
  }, enabled);
  return { phase, depth, exertion };
}
```

- [ ] **Step 2: Props, hurry, attention and the smile**

Signature:

```tsx
export function Mascot({
  ref,
  loading = false,
  breathPhase,
}: {
  ref?: React.Ref<MascotHandle>;
  /** The screen is loading: breathe quicker and look up at the feed; smile when it lands. */
  loading?: boolean;
  /** Where to keep the breath phase so the loading bones can pulse on it. */
  breathPhase?: SharedValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const hurry = useSharedValue(0);
  const attend = useSharedValue(0);
  const { phase, depth, exertion } = useBreath(!reduceMotion, hurry, breathPhase);
```

After the face/body shared values (after `const haloTilt = ...`), add:

```tsx
  // While the screen loads the ghost breathes quicker and looks up toward the feed; when the
  // content lands it smiles (with Reduce Motion too, as a tap does).
  const wasLoading = useRef(loading);
  useEffect(() => {
    const ramp = { duration: SKELETON.hurryMs, easing: Easing.inOut(Easing.quad) };
    hurry.set(withTiming(loading ? 1 : 0, ramp));
    attend.set(withTiming(loading && !reduceMotion ? 1 : 0, ramp));
    if (wasLoading.current && !loading) {
      happy.set(withSequence(withTiming(1, { duration: 140 }), withDelay(520, withTiming(0, { duration: 220 }))));
    }
    wasLoading.current = loading;
  }, [loading, reduceMotion, hurry, attend, happy]);
```

Replace the `gaze` derived value with:

```ts
  // Where the eyes point, -1..1: a tab glance overrides idle drifting, loading draws them up toward
  // the feed (and damps idle drifting), and the dizzy swirl rides on top.
  const gaze = useDerivedValue(() => {
    const swirl = dizzyOffset(dizzy.value);
    const idle = 1 - 0.8 * attend.value;
    const x = look.value + gazeX.value * idle * (1 - Math.min(1, Math.abs(look.value))) + swirl.x;
    const y = gazeY.value * idle + SKELETON.attendY * attend.value + swirl.y;
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  });
```

Import `SKELETON` from `../utils/skeleton`.

- [ ] **Step 3: `FloatingNavBar` passes them through**

Add to `Props`:

```ts
  /** The screen is loading (the ghost attends). */
  loading?: boolean;
  /** The ghost's breath phase, shared with the loading bones. */
  breathPhase?: SharedValue<number>;
```

destructure `loading = false, breathPhase` and render `<Mascot ref={mascot} loading={loading} breathPhase={breathPhase} />`.

- [ ] **Step 4: Typecheck, tests, lint diff**

Run: `npx tsc --noEmit && npx jest src/__tests__/mascotMotion.test.ts && npx expo lint`
Expected: tsc exit 0; mascot tests pass; lint still 16 problems, none new.

- [ ] **Step 5: Commit**

```bash
git add src/components/Mascot.tsx src/components/FloatingNavBar.tsx
git commit -m "feat: the ghost breathes quicker and looks up at the feed while it loads, then smiles"
```

---

### Task 8: Wire the screen (resources, dials, replay, breath)

**Files:**
- Modify: `src/screens/DiscoverScreen.tsx`

- [ ] **Step 1: Replace the screen**

```tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { fetchFeed, fetchPortfolio, fetchTopTrades, setHold } from '../data/api';
import { clearResources, useResource } from '../data/resources';
import { FeedItem, TabKey } from '../data/types';
import { useDials } from '../dev/dials';
import { colors, layout } from '../theme';
import { SKELETON } from '../utils/skeleton';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { TopTradesCarousel } from '../components/TopTradesCarousel';
import { FeedTabs } from '../components/FeedTabs';
import { TradeCard } from '../components/TradeCard';
import { BottomFade } from '../components/BottomFade';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { BreathContext } from '../components/skeleton/Bone';
import { FeedSkeleton } from '../components/skeleton/FeedSkeleton';

const ENTRANCE_COUNT = 5;

/** Live loading controls in dev builds (the Dials chip); defaults come from SKELETON. */
const SKELETON_DIALS = {
  latency: {
    portfolio: [SKELETON.latency.portfolio, 0, 3000, 50],
    topTrades: [SKELETON.latency.topTrades, 0, 3000, 50],
    feed: [SKELETON.latency.feed, 0, 3000, 50],
    tabFeed: [SKELETON.latency.tabFeed, 0, 3000, 50],
  },
  holdLoading: false,
  replay: { type: 'action', label: 'Replay cold start' },
} as const;

interface Latency {
  portfolio: number;
  topTrades: number;
  feed: number;
  tabFeed: number;
}

// Reanimated's wrapper intercepts the worklet scroll handler and attaches it to
// the underlying scroll view, so scroll-linked animations never touch the JS thread.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentClass<FlashListProps<FeedItem>>,
) as unknown as React.ComponentType<FlashListProps<FeedItem> & { onScroll?: unknown }>;

/** Owns the loading dials. Replay forgets every load and remounts the screen as a cold start. */
export function DiscoverScreen() {
  const [run, setRun] = useState(0);
  const onAction = useCallback((action: string) => {
    if (action !== 'replay') return;
    clearResources();
    setRun(r => r + 1);
  }, []);
  const dials = useDials('Skeleton', SKELETON_DIALS, { onAction });
  useEffect(() => {
    setHold(dials.holdLoading);
  }, [dials.holdLoading]);
  return <Discover key={run} latency={dials.latency} />;
}

function Discover({ latency }: { latency: Latency }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('discover');
  const [firstTab] = useState(tab);
  const [nav, setNav] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);
  const lastY = useSharedValue(0);
  /** The ghost's breath phase: the Mascot drives it, the loading bones pulse on it. */
  const breathPhase = useSharedValue(0);

  // Cold start loads all three at once with bones from the first frame; a tab's first visit loads
  // its feed behind a short show delay; anything loaded before comes straight from the cache.
  const portfolio = useResource('portfolio', () => fetchPortfolio(latency.portfolio));
  const topTrades = useResource('topTrades', () => fetchTopTrades(latency.topTrades));
  const cold = tab === firstTab;
  const feed = useResource(`feed:${tab}`, () => fetchFeed(tab, cold ? latency.feed : latency.tabFeed), {
    showDelay: cold ? 0 : SKELETON.gate.showDelay,
  });
  const loading = portfolio.phase !== 'content' || topTrades.phase !== 'content' || feed.phase !== 'content';
  const items = feed.phase === 'content' && feed.data ? feed.data : NO_ITEMS;
  const revealing = feed.revealing;

  const onToggleNote = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      if (Math.abs(dy) > 2) {
        // Hold the direction while events keep arriving, then decay to idle so the
        // nav bar springs back as soon as the scroll pauses (wheel scrolling on web
        // never fires the drag/momentum end events).
        scrollDirection.value = dy > 0 ? 1 : -1;
        scrollDirection.value = withDelay(220, withTiming(0, { duration: 1 }));
      }
      lastY.value = y;
      scrollY.value = y;
    },
    onEndDrag: () => {
      scrollDirection.value = 0;
    },
    onMomentumEnd: () => {
      scrollDirection.value = 0;
    },
  });

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item, index }) => (
      // Keyed by tab so a switch remounts just the cards while the header above stays mounted.
      // Cards replacing bones crossfade from them; otherwise the first cards play their entrance.
      <TradeCard
        key={tab}
        item={item}
        index={index}
        expanded={!!expanded[item.id]}
        onToggleNote={onToggleNote}
        animateIn={!revealing && index < ENTRANCE_COUNT}
        reveal={revealing && index < SKELETON.feedFade.length}
      />
    ),
    [tab, expanded, onToggleNote, revealing],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      <View style={{ paddingTop: insets.top + 11 }}>
        <PortfolioHeader portfolio={portfolio.data} reveal={portfolio.revealing} />
        <View style={{ height: 27 }} />
        <TopTradesCarousel trades={topTrades.data} reveal={topTrades.revealing} />
        <View style={{ height: 22 }} />
        <FeedTabs active={tab} onChange={setTab} />
        <View style={{ height: 18 }} />
      </View>
    ),
    [insets.top, tab, portfolio.data, portfolio.revealing, topTrades.data, topTrades.revealing],
  );

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;

  return (
    <BreathContext.Provider value={breathPhase}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <SkyBackground scrollY={scrollY} />
        <View style={styles.list}>
          <AnimatedFlashList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            extraData={expanded}
            ListHeaderComponent={header}
            ListEmptyComponent={feed.phase === 'skeleton' ? <FeedSkeleton /> : null}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={{ paddingBottom: navClearance }}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            drawDistance={height}
            // On by default in FlashList 2: on a tab switch it scrolled to keep a card the two feeds
            // share in place (0 -> 1064 pt on Rising). The feed never prepends, so leave the offset alone.
            maintainVisibleContentPosition={MVCP_OFF}
          />
        </View>
        <BottomFade height={navClearance + 20} />
        <FloatingNavBar
          active={nav}
          onChange={setNav}
          scrollY={scrollY}
          scrollDirection={scrollDirection}
          loading={loading}
          breathPhase={breathPhase}
        />
      </View>
    </BreathContext.Provider>
  );
}

const NO_ITEMS: FeedItem[] = [];
const keyExtractor = (item: FeedItem) => item.id;
const MVCP_OFF = { disabled: true };

function Separator() {
  return <View style={{ height: layout.cardGap }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.feedBg },
  list: { flex: 1 },
});
```

- [ ] **Step 2: Typecheck, tests, lint**

Run: `npx tsc --noEmit && npx jest && npx expo lint`
Expected: tsc exit 0; all suites pass; lint 16 problems (baseline), none in the new or edited code.

- [ ] **Step 3: Commit**

```bash
git add src/screens/DiscoverScreen.tsx
git commit -m "feat: Discover loads through the resource store with bones, a Skeleton dials panel and replay"
```

---

### Task 9: Verify in the web preview

- [ ] **Step 1: Start the worktree's Metro on its own port** (the preview's launch.json lives in
  the shared folder and serves it; 8081 is the user's)

Run (background): `npx expo start --web --port 8095` in the worktree, then open
`http://localhost:8095` in the Browser pane. Confirm `document.visibilityState === 'visible'`
(a hidden pane freezes requestAnimationFrame and every Reanimated animation).

- [ ] **Step 2: Cold start** — reload; bones on the sky, two glass carousel cards with bones,
  three feed cards fading with distance; the ghost looks up. Content lands at 600 / 900 / 1300 ms
  without any shift.

- [ ] **Step 3: Geometry** — with Dials > Skeleton > Hold loading on and Replay cold start, measure
  the skeleton feed card and carousel card boxes (`getBoundingClientRect`), release the hold, and
  measure the real cards: heights and tops must match to 0.5 pt.

- [ ] **Step 4: Tab switch** — Following: 150 ms blank, bones, then content; back to Discover:
  instant from cache with the usual entrance.

- [ ] **Step 5: Screenshots** of the held skeleton and the loaded screen for the user.

---

### Task 10: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Loading skeleton" section after "Other motion, deliberately limited"**

```markdown
## Loading skeleton

The mock data now arrives the way a network would (`src/data/api.ts`): portfolio, top trades and
each tab's feed load on their own (600 / 900 / 1300 ms on a cold start, 700 ms for a tab's first
visit) and are cached for the session (`src/data/resources.ts`).

- **Only data becomes bones.** The sky, labels, Deposit, tabs, card shells, the thread line, the
  note box and the nav bar stay real; bones mirror the real rows, so nothing moves when the
  content arrives. Bones are 7% ink on white and glass, 30% white on the sky, and lower feed cards
  fade with distance.
- **They breathe with the ghost.** Each group of bones pulses on the mascot's own breath clock,
  which runs 2.5x faster while anything loads; the ghost looks up toward the feed while it waits
  and smiles when the content lands. With Reduce Motion the bones hold still.
- **Handover in place.** Each card mounts over its own bones and crossfades (240 ms, 70 ms
  stagger). Cached content and quick replies skip the bones and use the usual entrance.
- **Timing rules.** A tab's first load waits 150 ms before drawing bones; once drawn they stay at
  least 400 ms.
- **Dials > Skeleton:** latency per section, Hold loading, Replay cold start.
```

and in "What I would do next", change item 2 to
`2. Add Sell-side sparkline colouring, and virtualise the carousel with FlashList if the data set grows.`

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README describes the loading skeleton"
```
