# Sky Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the status bar legible over the Discover feed with a sky bar that the header scrolls under, which slides in on scroll up with the feed dropdown and Deposit, and hands them back to the header near the top.

**Architecture:** Pure worklet maths in `src/utils/skyBar.ts` decides every threshold and position from the scroll offset and a presence value; a hook owns the shared values and a scroll handler composed with the screen's own; overlay components draw the bar as windows onto the background sky (transforms and opacity only, UI thread). Spec: `docs/superpowers/specs/2026-10-06-sky-bar-header-design.md`.

**Tech Stack:** Expo SDK 57, React Native 0.86, Reanimated 4.5 + react-native-worklets 0.10, FlashList 2, react-native-svg 15, expo-image, expo-blur, jest-expo.

Work in the worktree `C:/Users/sachi/.config/superpowers/worktrees/miracle-rn-test/sky-bar-header` (branch `feat/sky-bar-header`). Never touch the shared OneDrive folder.

## File structure

| File | Responsibility |
| --- | --- |
| `src/utils/skyBar.ts` (new) | Worklet maths: constants, geometry, presence, band edge, fold, sky offset, visibility, fold transforms |
| `src/__tests__/skyBar.test.ts` (new) | Unit tests for the maths with the Figma numbers |
| `src/components/SkyBackground.tsx` | Also exports `SKY`, `skyHeight` and `SkyWindow` (a window onto the background sky) |
| `src/hooks/useSkyBar.ts` (new) | Shared values, the presence scroll handler, header layout callbacks, threshold flags |
| `src/components/Chevron.tsx` (new) | The dropdown chevron |
| `src/components/FeedTabs.tsx` | Optional fold into the dropdown, chevron, measured tab boxes |
| `src/components/SkyBar.tsx` (new) | The overlay: band, sheet corners, status strip, pinned Deposit, docked dropdown |
| `src/components/FeedMenu.tsx` (new) | The feed menu |
| `src/screens/DiscoverScreen.tsx` | Wiring, keyed cards, list ref, menu state |
| `README.md` | Describe the sky bar |

---

### Task 1: Sky bar maths

**Files:**
- Create: `src/utils/skyBar.ts`
- Test: `src/__tests__/skyBar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  SKY_BAR,
  bandEdge,
  barGeometry,
  barLift,
  chevronReveal,
  crossesIntoHeader,
  depositPinned,
  figmaHeader,
  foldProgress,
  foldedTab,
  nextPresence,
  settleTarget,
  skyOffset,
  tabsDocked,
} from '../utils/skyBar';

const T = 59;
const g = barGeometry(T, figmaHeader(T));

describe('sky bar geometry', () => {
  it('reads the Figma frame: Deposit pins at 24, the tabs rise from 198 and dock at 238', () => {
    expect(g.pin).toBe(24);
    expect(g.riseStart).toBe(198);
    expect(g.dock).toBe(238);
    expect(g.feed).toBe(282);
    expect(g.feedTop).toBe(244);
  });

  it('keeps the same offsets for a taller status bar, since the header moves down with it', () => {
    const tall = barGeometry(T + 3, figmaHeader(T + 3));
    expect(tall.pin).toBe(g.pin);
    expect(tall.dock).toBe(g.dock);
    expect(tall.feedTop).toBe(g.feedTop);
  });
});

describe('presence', () => {
  it('is hidden at the very top', () => {
    expect(nextPresence(1, 0, 40, g)).toBe(0);
    expect(nextPresence(1, -12, 0, g)).toBe(0);
  });

  it('holds through the header whichever way the list moves', () => {
    expect(nextPresence(0, 150, 120, g)).toBe(0);
    expect(nextPresence(1, 120, 150, g)).toBe(1);
    expect(nextPresence(0, 260, 280, g)).toBe(0);
  });

  it('follows the finger in the feed: 44 pt up shows it, 44 pt down hides it', () => {
    expect(nextPresence(0, 678, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(0, 600, 700, g)).toBe(1);
    expect(nextPresence(1, 722, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(1, 800, 700, g)).toBe(0);
  });

  it('finishes sliding in when the list crosses back into the header partway', () => {
    expect(crossesIntoHeader(0.4, 270, 290, g)).toBe(true);
    expect(crossesIntoHeader(1, 270, 290, g)).toBe(false);
    expect(crossesIntoHeader(0, 270, 290, g)).toBe(false);
    expect(crossesIntoHeader(0.4, 300, 320, g)).toBe(false);
  });

  it('settles a partway bar at the nearer end', () => {
    expect(settleTarget(0.49)).toBe(0);
    expect(settleTarget(0.5)).toBe(1);
  });
});

describe('band edge', () => {
  it('sits under the status bar at rest and whenever the bar is hidden', () => {
    expect(bandEdge(0, 1, g)).toBe(T);
    expect(bandEdge(150, 0, g)).toBe(T);
    expect(bandEdge(600, 0, g)).toBe(T);
  });

  it('slides down over the first 60 pt with the bar shown', () => {
    expect(bandEdge(30, 1, g)).toBe(T + 22);
    expect(bandEdge(60, 1, g)).toBe(T + 44);
    expect(bandEdge(150, 1, g)).toBe(T + 44);
  });

  it('rides 8 pt above the rising tab row, without a jump where the ride starts', () => {
    expect(bandEdge(g.riseStart, 1, g)).toBe(T + 44);
    expect(bandEdge(218, 1, g)).toBe(309 - 218 - 8);
  });

  it('sits under the docked row, and slides with presence in the feed', () => {
    expect(bandEdge(g.dock, 1, g)).toBe(T + 44);
    expect(bandEdge(600, 0.5, g)).toBe(T + 22);
  });
});

describe('fold', () => {
  it('runs over the 40 pt rise, and only with the bar shown', () => {
    expect(foldProgress(g.riseStart, 1, g)).toBe(0);
    expect(foldProgress(218, 1, g)).toBeCloseTo(0.5);
    expect(foldProgress(g.dock, 1, g)).toBe(1);
    expect(foldProgress(218, 0, g)).toBe(0);
  });

  it('slides every tab to the start; only the active one stays solid', () => {
    const active = foldedTab(1, 172, 16, true);
    expect(active.translateX).toBe(-156);
    expect(active.scale).toBe(1);
    expect(active.opacity).toBe(1);
    const other = foldedTab(1, 229, 16, false);
    expect(other.translateX).toBe(-213);
    expect(other.scale).toBeCloseTo(0.85);
    expect(other.opacity).toBe(0);
    const rest = foldedTab(0, 229, 16, false);
    expect(rest.translateX).toBeCloseTo(0);
    expect(rest.scale).toBe(1);
    expect(rest.opacity).toBe(1);
  });

  it('brings the chevron in over the second half', () => {
    expect(chevronReveal(0.5)).toEqual({ opacity: 0, translateX: -6 });
    expect(chevronReveal(1)).toEqual({ opacity: 1, translateX: 0 });
  });
});

describe('sky and visibility', () => {
  it('follows the background parallax until the tabs dock, then holds', () => {
    expect(skyOffset(100, g)).toBeCloseTo(30);
    expect(skyOffset(g.dock, g)).toBeCloseTo(71.4);
    expect(skyOffset(900, g)).toBeCloseTo(71.4);
    expect(skyOffset(-40, g)).toBe(0);
  });

  it('lifts the controls under the status bar as the bar hides', () => {
    expect(barLift(1)).toBe(0);
    expect(barLift(0)).toBe(SKY_BAR.height);
  });

  it('pins Deposit and docks the tabs only with the bar shown', () => {
    expect(depositPinned(23, 1, g)).toBe(false);
    expect(depositPinned(24, 1, g)).toBe(true);
    expect(depositPinned(400, 0, g)).toBe(false);
    expect(tabsDocked(237, 1, g)).toBe(false);
    expect(tabsDocked(238, 1, g)).toBe(true);
    expect(tabsDocked(600, 0, g)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/skyBar.test.ts`
Expected: FAIL with "Cannot find module '../utils/skyBar'"

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Scroll maths for the sky bar: how the header hands Deposit and the feed tabs to a bar under the
 * status bar, and takes them back (docs/superpowers/specs/2026-10-06-sky-bar-header-design.md).
 *
 * Every function is a worklet, so the same code runs in Reanimated styles on the UI thread and in
 * jest. Order matters: the worklet transform captures helpers when each worklet is created at
 * module load, so a helper must be declared above the worklets that call it.
 */

export const SKY_BAR = {
  /** The bar's row under the status bar, pt. */
  height: 44,
  /** The 36 pt Deposit pill and the 20 pt tab row sit centred in the row. */
  depositInset: 4,
  tabsInset: 12,
  /** The tab row rises its last 40 pt into the bar, folding into the dropdown on the way. */
  rise: 40,
  /** While the row rises, the bar's edge rides this far above it so the row stays in view. */
  rideGap: 8,
  /** Over the first 60 pt of scroll the edge slides down from under the status bar. */
  descent: 60,
  /** The background sky's parallax (SkyBackground). */
  parallax: 0.3,
  /** A bar left partway settles once scrolling has been still this long, over this long (ms). */
  settleDelay: 160,
  settleDuration: 180,
  /** The sheet edge's corners: the cards' radius. */
  corner: 24,
} as const;

/** Positions inside the list header, in content coordinates (pt). */
export interface HeaderLayout {
  /** Top of the Deposit pill. */
  depositTop: number;
  /** Top of the tab row. */
  tabsTop: number;
  /** Top of the first feed card, which is the header's height. */
  feedTop: number;
}

/** Scroll offsets (pt) where the bar's choreography changes, for one status bar height. */
export interface BarGeometry {
  /** Status bar height (the safe-area top inset). */
  top: number;
  /** Deposit's top reaches its slot in the bar. */
  pin: number;
  /** The tab row reaches its slot in the bar. */
  dock: number;
  /** The tab row starts its rise into the bar. */
  riseStart: number;
  /** Past this the bar answers the scroll direction. */
  feed: number;
  /** Puts the first card right under the bar. */
  feedTop: number;
  /** The tab row's top in content coordinates, for the edge that rides above it. */
  tabsTop: number;
}

/** The header as laid out from the Figma, for a status bar `top` pt tall (59 in the Figma frame). */
export function figmaHeader(top: number): HeaderLayout {
  'worklet';
  return { depositTop: top + 28, tabsTop: top + 250, feedTop: top + 288 };
}

export function clamp01(x: number): number {
  'worklet';
  return Math.min(1, Math.max(0, x));
}

/** Ease-in-out (quadratic), the fold's curve. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function barGeometry(top: number, header: HeaderLayout): BarGeometry {
  'worklet';
  const dock = header.tabsTop - (top + SKY_BAR.tabsInset);
  return {
    top,
    pin: header.depositTop - (top + SKY_BAR.depositInset),
    dock,
    riseStart: dock - SKY_BAR.rise,
    feed: dock + SKY_BAR.height,
    feedTop: header.feedTop - (top + SKY_BAR.height),
    tabsTop: header.tabsTop,
  };
}

/**
 * The bar's presence (0 hidden, 1 shown) after the list scrolls from `prevY` to `y`: hidden at the
 * very top, held through the header so the hand-back runs with a settled bar, and following the
 * finger in the feed (44 pt of scroll up shows it fully, 44 pt down hides it).
 */
export function nextPresence(h: number, y: number, prevY: number, g: BarGeometry): number {
  'worklet';
  if (y <= 0) return 0;
  if (y >= g.feed) return clamp01(h - (y - prevY) / SKY_BAR.height);
  return h;
}

/** Scrolling back into the header with the bar partway shown: it should finish sliding in. */
export function crossesIntoHeader(h: number, y: number, prevY: number, g: BarGeometry): boolean {
  'worklet';
  return prevY >= g.feed && y < g.feed && h > 0 && h < 1;
}

/** Where a bar left partway settles: whichever end is nearer. */
export function settleTarget(h: number): number {
  'worklet';
  return h < 0.5 ? 0 : 1;
}

/**
 * Screen y of the bar's bottom edge. With the bar shown it slides down from under the status bar
 * over the first 60 pt, rides 8 pt above the tab row while the row rises in, and sits under the row
 * once it docks; presence scales the whole thing back up under the status bar.
 */
export function bandEdge(s: number, h: number, g: BarGeometry): number {
  'worklet';
  let full: number;
  if (s >= g.dock) full = g.top + SKY_BAR.height;
  else if (s >= g.riseStart) full = g.tabsTop - s - SKY_BAR.rideGap;
  else full = g.top + SKY_BAR.height * clamp01(s / SKY_BAR.descent);
  return g.top + (full - g.top) * h;
}

/** How far the tab row has folded into the dropdown (0..1), only while the bar is there to take it. */
export function foldProgress(s: number, h: number, g: BarGeometry): number {
  'worklet';
  return clamp01((s - g.riseStart) / SKY_BAR.rise) * h;
}

/** The sky behind the bar follows the background's parallax until the tabs dock, then holds. */
export function skyOffset(s: number, g: BarGeometry): number {
  'worklet';
  return SKY_BAR.parallax * Math.min(Math.max(s, 0), Math.max(g.dock, 0));
}

/** How far above their slots the bar's controls sit: they slide out under the status bar. */
export function barLift(h: number): number {
  'worklet';
  return (1 - h) * SKY_BAR.height;
}

export function depositPinned(s: number, h: number, g: BarGeometry): boolean {
  'worklet';
  return s >= g.pin && h > 0;
}

export function tabsDocked(s: number, h: number, g: BarGeometry): boolean {
  'worklet';
  return s >= g.dock && h > 0;
}

/**
 * One tab mid-fold: every tab slides to the row's start while the others fade and shrink into the
 * active one. `opacity` multiplies the tab's own selected/unselected opacity.
 */
export function foldedTab(m: number, x: number, start: number, active: boolean) {
  'worklet';
  const e = easeInOut(m);
  return {
    translateX: (start - x) * e,
    scale: active ? 1 : 1 - 0.15 * e,
    opacity: active ? 1 : 1 - clamp01(m * 1.6),
  };
}

/** The chevron fades in after the active label over the fold's second half, sliding 6 pt in. */
export function chevronReveal(m: number) {
  'worklet';
  const c = clamp01(m * 2 - 1);
  return { opacity: c, translateX: 6 * (c - 1) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/skyBar.test.ts`
Expected: PASS (17 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/skyBar.ts src/__tests__/skyBar.test.ts
git commit -m "feat: sky bar scroll maths (geometry, presence, band edge, fold) with tests"
```

---

### Task 2: Windows onto the sky

**Files:**
- Modify: `src/components/SkyBackground.tsx` (whole file)

- [ ] **Step 1: Replace the file**

```tsx
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';
import { SKY_BAR } from '../utils/skyBar';

export const SKY = require('../../assets/sky.png');
const SKY_W = 393;
const SKY_H = 504;

/** The sky's drawn height at a screen width (the Figma export is 393 x 504 pt). */
export function skyHeight(width: number): number {
  return (SKY_H * width) / SKY_W;
}

/** The Figma cloud header, pinned to the top and parallaxed at 0.3x the scroll. */
export function SkyBackground({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const height = skyHeight(width);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(scrollY.value, 0) * SKY_BAR.parallax }],
  }));
  return (
    <Animated.View style={[styles.wrap, { width, height }, style]}>
      <Image source={SKY} style={{ width, height }} contentFit="fill" transition={0} />
    </Animated.View>
  );
}

interface WindowProps {
  /** The sky's parallax offset (pt scrolled up). */
  offset: SharedValue<number>;
  /** The window's top on screen; it may move every frame. */
  top: SharedValue<number>;
  left: number;
  width: number;
  height: number;
  radius?: number;
  /** Swallow touches like a bar does; by default they pass through. */
  blocksTouches?: boolean;
}

/**
 * A window onto the background sky: it shows exactly what SkyBackground draws at the same place on
 * screen, so it cannot be seen until something scrolls under it. The sky bar is built from these.
 */
export function SkyWindow({ offset, top, left, width, height, radius = 0, blocksTouches = false }: WindowProps) {
  const { width: screen } = useWindowDimensions();
  const skyH = skyHeight(screen);
  const frame = useAnimatedStyle(() => ({ transform: [{ translateY: top.value }] }));
  const sky = useAnimatedStyle(() => ({ transform: [{ translateY: -(offset.value + top.value) }] }));
  return (
    <Animated.View
      style={[
        styles.window,
        { left, width, height, borderRadius: radius, pointerEvents: blocksTouches ? 'auto' : 'none' },
        frame,
      ]}
    >
      <Animated.View style={[{ width: screen, height: skyH, marginLeft: -left }, sky]}>
        <Image source={SKY} style={{ width: screen, height: skyH }} contentFit="fill" transition={0} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.feedBg, pointerEvents: 'none' },
  window: { position: 'absolute', top: 0, overflow: 'hidden' },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add src/components/SkyBackground.tsx
git commit -m "feat: SkyWindow, a window onto the background sky for the sky bar"
```

---

### Task 3: The sky bar hook

**Files:**
- Create: `src/hooks/useSkyBar.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { layout } from '../theme';
import {
  BarGeometry,
  HeaderLayout,
  SKY_BAR,
  barGeometry,
  crossesIntoHeader,
  depositPinned,
  figmaHeader,
  foldProgress,
  nextPresence,
  settleTarget,
  tabsDocked,
} from '../utils/skyBar';

export interface SkyBarState {
  scrollY: SharedValue<number>;
  /** 0 hidden .. 1 shown. */
  presence: SharedValue<number>;
  geometry: SharedValue<BarGeometry>;
  /** 0..1 as the tab row folds into the dropdown. */
  fold: SharedValue<number>;
  /** Status bar height. */
  top: number;
  /** Threshold flags for touch and accessibility, flipped from the UI thread. */
  pinned: boolean;
  docked: boolean;
  folded: boolean;
  /** Scroll offset that puts the first card right under the bar. */
  feedTop: number;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  onHeaderLayout: (e: LayoutChangeEvent) => void;
  onPortfolioLayout: (e: LayoutChangeEvent) => void;
  onTabsLayout: (e: LayoutChangeEvent) => void;
}

const PINNED = 1;
const DOCKED = 2;
const FOLDED = 4;

/**
 * State for the sky bar (src/components/SkyBar.tsx). `scrollY` is the screen's scroll offset;
 * compose `scrollHandler` with the screen's own handler on the list.
 */
export function useSkyBar(scrollY: SharedValue<number>, top: number): SkyBarState {
  const [header, setHeader] = useState<HeaderLayout>(() => figmaHeader(top));
  const g = useMemo(() => barGeometry(top, header), [top, header]);
  const geometry = useSharedValue<BarGeometry>(g);
  useEffect(() => {
    geometry.set(g);
  }, [geometry, g]);

  const presence = useSharedValue(0);
  const prevY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      const y = e.contentOffset.y;
      const geo = geometry.value;
      const prev = prevY.value;
      prevY.set(y);
      const h = presence.value;
      if (crossesIntoHeader(h, y, prev, geo)) {
        presence.set(withTiming(1, { duration: SKY_BAR.settleDuration }));
        return;
      }
      const next = nextPresence(h, y, prev, geo);
      if (next !== h) presence.set(next);
      // Left partway in the feed, the bar settles to the nearer end once scrolling goes still
      // (wheel scrolling on web never fires the drag or momentum end events).
      if (y >= geo.feed && next > 0 && next < 1) {
        presence.set(
          withDelay(SKY_BAR.settleDelay, withTiming(settleTarget(next), { duration: SKY_BAR.settleDuration })),
        );
      }
    },
  });

  const fold = useDerivedValue(() => foldProgress(scrollY.value, presence.value, geometry.value));

  const [flags, setFlags] = useState(0);
  useAnimatedReaction(
    () => {
      const s = scrollY.value;
      const h = presence.value;
      const geo = geometry.value;
      return (
        (depositPinned(s, h, geo) ? PINNED : 0) | (tabsDocked(s, h, geo) ? DOCKED : 0) | (fold.value >= 0.5 ? FOLDED : 0)
      );
    },
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setFlags, next);
    },
  );

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const feedTop = e.nativeEvent.layout.height;
    setHeader(h => (h.feedTop === feedTop ? h : { ...h, feedTop }));
  }, []);
  const onPortfolioLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    // The portfolio row centres the Deposit pill vertically.
    const depositTop = y + (height - layout.depositHeight) / 2;
    setHeader(h => (h.depositTop === depositTop ? h : { ...h, depositTop }));
  }, []);
  const onTabsLayout = useCallback((e: LayoutChangeEvent) => {
    const tabsTop = e.nativeEvent.layout.y;
    setHeader(h => (h.tabsTop === tabsTop ? h : { ...h, tabsTop }));
  }, []);

  return {
    scrollY,
    presence,
    geometry,
    fold,
    top,
    pinned: (flags & PINNED) !== 0,
    docked: (flags & DOCKED) !== 0,
    folded: (flags & FOLDED) !== 0,
    feedTop: g.feedTop,
    scrollHandler,
    onHeaderLayout,
    onPortfolioLayout,
    onTabsLayout,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSkyBar.ts
git commit -m "feat: useSkyBar hook (presence scroll handler, header measurements, threshold flags)"
```

---

### Task 4: Tabs fold into the dropdown

**Files:**
- Create: `src/components/Chevron.tsx`
- Modify: `src/components/FeedTabs.tsx` (whole file)

- [ ] **Step 1: Create the chevron**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/** The feed dropdown's chevron: 14 pt with 2 pt rounded strokes, like the nav icons. */
export function Chevron({ color = colors.white }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M3 5.5l4 4 4-4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 2: Replace FeedTabs**

```tsx
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TABS, TabKey } from '../data/types';
import { colors, layout, text } from '../theme';
import { chevronReveal, foldedTab } from '../utils/skyBar';
import { Chevron } from './Chevron';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** 0..1 as the row folds into the sky bar's dropdown; without it the row never folds. */
  fold?: SharedValue<number>;
  /** Past half folded: the folded-away tabs stop taking taps and the row opens the menu instead. */
  folded?: boolean;
  onOpenMenu?: () => void;
}

interface TabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  fold: SharedValue<number>;
  /** The tab's measured x in the row; the fold slides it to the row's start. */
  x: number;
  folded: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
}

function Tab({ label, selected, onPress, fold, x, folded, onLayout }: TabProps) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0.72, { duration: 180 }),
    transform: [{ scale: withTiming(pressed.value ? 0.96 : 1, { duration: 120 }) }],
  }));
  const folding = useAnimatedStyle(() => {
    const t = foldedTab(fold.value, x, layout.screenPadding, selected);
    return { opacity: t.opacity, transform: [{ translateX: t.translateX }, { scale: t.scale }] };
  });
  return (
    <Animated.View
      style={[styles.tab, folding, { pointerEvents: folded && !selected ? 'none' : 'auto' }]}
      onLayout={onLayout}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        // Folded, the active label also answers taps on the chevron beside it.
        hitSlop={{ top: 10, bottom: 10, left: 4, right: folded && selected ? 24 : 4 }}
      >
        <Animated.Text style={[text.tab, styles.label, style]} maxFontSizeMultiplier={1.2}>
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

export function FeedTabs({ active, onChange, fold, folded = false, onOpenMenu }: Props) {
  const still = useSharedValue(0);
  const progress = fold ?? still;
  const [boxes, setBoxes] = useState<Partial<Record<TabKey, { x: number; width: number }>>>({});
  const chevron = useAnimatedStyle(() => {
    const c = chevronReveal(progress.value);
    return { opacity: c.opacity, transform: [{ translateX: c.translateX }] };
  });
  const activeWidth = boxes[active]?.width ?? 0;
  return (
    <View style={styles.row}>
      {TABS.map(t => (
        <Tab
          key={t.key}
          label={t.label}
          selected={t.key === active}
          fold={progress}
          x={boxes[t.key]?.x ?? layout.screenPadding}
          folded={folded}
          onPress={() => (folded ? onOpenMenu?.() : onChange(t.key))}
          onLayout={e => {
            const { x, width } = e.nativeEvent.layout;
            setBoxes(prev =>
              prev[t.key]?.x === x && prev[t.key]?.width === width ? prev : { ...prev, [t.key]: { x, width } },
            );
          }}
        />
      ))}
      {/* Fades in beside the active label as the row folds into the dropdown. */}
      <Animated.View style={[styles.chevron, { left: layout.screenPadding + activeWidth + 4 }, chevron]}>
        <Chevron />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.tabGap,
    paddingHorizontal: layout.screenPadding,
    height: 20,
  },
  // Folding tabs shrink toward their left edge, where the dropdown's label starts.
  tab: { transformOrigin: 'left center' },
  label: { color: colors.white },
  chevron: { position: 'absolute', top: 3, pointerEvents: 'none' },
});
```

- [ ] **Step 3: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc silent; all suites pass

- [ ] **Step 4: Commit**

```bash
git add src/components/Chevron.tsx src/components/FeedTabs.tsx
git commit -m "feat: the tab row can fold into a feed dropdown (scroll-linked, chevron beside the active tab)"
```

---

### Task 5: The sky bar overlay

**Files:**
- Create: `src/components/SkyBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';
import { colors, layout, text } from '../theme';
import type { SkyBarState } from '../hooks/useSkyBar';
import { SKY_BAR, bandEdge, barLift, depositPinned, skyOffset, tabsDocked } from '../utils/skyBar';
import { Chevron } from './Chevron';
import { DepositButton } from './DepositButton';
import { SKY, SkyWindow, skyHeight } from './SkyBackground';

const AnimatedSvgImage = Animated.createAnimatedComponent(SvgImage);

interface Props {
  bar: SkyBarState;
  /** The active feed's name, shown in the dropdown. */
  feedLabel: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
}

/**
 * The sky bar (docs/superpowers/specs/2026-10-06-sky-bar-header-design.md): a strip of the
 * background sky that the header scrolls under, so the status bar always sits on sky, and on scroll
 * up in the feed a bar holding the feed dropdown and Deposit. Every layer is a window onto the
 * background sky, so none of it can be seen until content slides beneath it.
 */
export function SkyBar({ bar, feedLabel, menuOpen, onOpenMenu }: Props) {
  const { width } = useWindowDimensions();
  const { scrollY, presence, geometry, top } = bar;
  const barHeight = top + SKY_BAR.height;
  const depositLeft = width - layout.screenPadding - layout.depositWidth;

  const offset = useDerivedValue(() => skyOffset(scrollY.value, geometry.value));
  const edge = useDerivedValue(() => bandEdge(scrollY.value, presence.value, geometry.value));
  const bandTop = useDerivedValue(() => edge.value - barHeight);
  const lift = useDerivedValue(() => barLift(presence.value));
  const depositTop = useDerivedValue(() => top + SKY_BAR.depositInset - lift.value);
  const stripTop = useSharedValue(0);
  const pinned = useDerivedValue(() => (depositPinned(scrollY.value, presence.value, geometry.value) ? 1 : 0));

  const backing = useAnimatedStyle(() => ({ opacity: pinned.value }));
  const deposit = useAnimatedStyle(() => ({
    opacity: pinned.value,
    transform: [{ translateY: depositTop.value }],
  }));
  const dropdown = useAnimatedStyle(() => ({
    opacity: tabsDocked(scrollY.value, presence.value, geometry.value) ? 1 : 0,
    transform: [{ translateY: top + SKY_BAR.tabsInset - lift.value }],
  }));

  return (
    <View style={styles.root}>
      <SkyWindow offset={offset} top={bandTop} left={0} width={width} height={barHeight} blocksTouches />
      <SheetCorner side="left" offset={offset} edge={edge} width={width} />
      <SheetCorner side="right" offset={offset} edge={edge} width={width} />
      <Animated.View style={[styles.dropdown, dropdown, { pointerEvents: bar.docked ? 'auto' : 'none' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Feed: ${feedLabel}`}
          accessibilityState={{ expanded: menuOpen }}
          onPress={onOpenMenu}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          style={styles.dropdownRow}
        >
          <Text style={[text.tab, styles.dropdownLabel]} maxFontSizeMultiplier={1.2}>
            {feedLabel}
          </Text>
          <Chevron />
        </Pressable>
      </Animated.View>
      {/* The pinned Deposit sits on its own piece of sky, which covers the header's Deposit
          scrolling up underneath it. */}
      <Animated.View style={[styles.layer, backing]}>
        <SkyWindow
          offset={offset}
          top={depositTop}
          left={depositLeft}
          width={layout.depositWidth}
          height={layout.depositHeight}
          radius={layout.depositHeight / 2}
        />
      </Animated.View>
      <Animated.View style={[styles.deposit, { left: depositLeft }, deposit, { pointerEvents: bar.pinned ? 'box-none' : 'none' }]}>
        <DepositButton />
      </Animated.View>
      {/* Over the status bar: the bar's controls slide out from under it. */}
      <SkyWindow offset={offset} top={stripTop} left={0} width={width} height={top} />
    </View>
  );
}

interface CornerProps {
  side: 'left' | 'right';
  offset: SharedValue<number>;
  edge: SharedValue<number>;
  width: number;
}

/**
 * A concave corner of sky under the bar's edge at one side of the screen, so the edge reads as the
 * rounded top of a sheet tucked under the sky. Clipped with SVG: MaskedView has no web build and is
 * experimental on Android.
 */
function SheetCorner({ side, offset, edge, width }: CornerProps) {
  const r = SKY_BAR.corner;
  const left = side === 'left' ? 0 : width - r;
  const id = `sky-sheet-${side}`;
  const d = side === 'left' ? `M0 0H${r}A${r} ${r} 0 0 0 0 ${r}Z` : `M0 0H${r}V${r}A${r} ${r} 0 0 0 0 0Z`;
  const frame = useAnimatedStyle(() => ({ transform: [{ translateY: edge.value }] }));
  const image = useAnimatedProps(() => ({ y: -(offset.value + edge.value) }));
  return (
    <Animated.View style={[styles.corner, { left, width: r, height: r }, frame]}>
      <Svg width={r} height={r}>
        <Defs>
          <ClipPath id={id}>
            <Path d={d} />
          </ClipPath>
        </Defs>
        <AnimatedSvgImage
          href={SKY}
          x={-left}
          width={width}
          height={skyHeight(width)}
          preserveAspectRatio="none"
          clipPath={`url(#${id})`}
          animatedProps={image}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, pointerEvents: 'box-none' },
  layer: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
  corner: { position: 'absolute', top: 0, pointerEvents: 'none' },
  deposit: { position: 'absolute', top: 0 },
  dropdown: { position: 'absolute', top: 0, left: layout.screenPadding },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20 },
  dropdownLabel: { color: colors.white },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add src/components/SkyBar.tsx
git commit -m "feat: SkyBar overlay (sky band with sheet corners, status strip, pinned Deposit, docked dropdown)"
```

---

### Task 6: The feed menu

**Files:**
- Create: `src/components/FeedMenu.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BlurView } from 'expo-blur';
import { TABS, TabKey } from '../data/types';
import { colors, text } from '../theme';
import { haptic } from '../utils/haptics';

const ROW = 40;
const PAD = 8;
const WIDTH = 180;
/** Quick and critically damped (ratio 1), like the nav pill: it lands without overshoot. */
const SETTLE = { mass: 1, stiffness: 400, damping: 40 } as const;
/** The lens reaches the pick before the menu closes and the feed switches, ms. */
const PICK_DELAY = 140;

interface Props {
  open: boolean;
  active: TabKey;
  /** Screen y of the menu's top edge. */
  top: number;
  onSelect: (tab: TabKey) => void;
  onClose: () => void;
}

const indexOf = (tab: TabKey) => Math.max(0, TABS.findIndex(t => t.key === tab));

/**
 * The sky bar's feed menu: a dark glass card in the nav bar's material with the nav bar's lens on
 * the current feed. It grows from its top-left corner; tapping outside closes it.
 */
export function FeedMenu({ open, active, top, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const lens = useSharedValue(indexOf(active) * ROW);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      lens.set(indexOf(active) * ROW);
      progress.set(withSpring(1, SETTLE));
    } else {
      progress.set(
        withTiming(0, { duration: 140 }, done => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, active, lens, progress]);

  const card = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [{ scale: reduceMotion ? 1 : 0.92 + 0.08 * progress.value }],
  }));
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lens.value }] }));

  if (!mounted) return null;

  const pick = (tab: TabKey) => {
    haptic('selection');
    lens.set(withSpring(indexOf(tab) * ROW, SETTLE));
    setTimeout(() => onSelect(tab), PICK_DELAY);
  };

  return (
    <View style={styles.root}>
      {open ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the feed menu" />
      ) : null}
      <Animated.View style={[styles.shadow, { top }, card]}>
        <View style={styles.card} accessibilityRole="menu">
          {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid }]}
          />
          <View style={styles.rim} />
          <Animated.View style={[styles.lens, lensStyle]} />
          {TABS.map(t => (
            <Pressable
              key={t.key}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: t.key === active }}
              onPress={() => pick(t.key)}
              style={styles.row}
            >
              <Text style={[text.tab, styles.label]} maxFontSizeMultiplier={1.2}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, pointerEvents: 'box-none' },
  shadow: {
    position: 'absolute',
    left: 10,
    width: WIDTH,
    borderRadius: 24,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.18)',
    transformOrigin: 'left top',
  },
  card: { borderRadius: 24, overflow: 'hidden', padding: PAD },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    pointerEvents: 'none',
  },
  lens: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: WIDTH - PAD * 2,
    height: ROW,
    borderRadius: ROW / 2,
    backgroundColor: colors.navPill,
  },
  row: { height: ROW, justifyContent: 'center', paddingLeft: 16 },
  label: { color: colors.white },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add src/components/FeedMenu.tsx
git commit -m "feat: FeedMenu, the sky bar's feed picker in the nav bar's dark glass"
```

---

### Task 7: Wire it into the screen

**Files:**
- Modify: `src/screens/DiscoverScreen.tsx` (whole file)

- [ ] **Step 1: Replace the screen**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { feedForTab, portfolio, topTrades } from '../data/mock';
import { FeedItem, TABS, TabKey } from '../data/types';
import { colors, layout } from '../theme';
import { useSkyBar } from '../hooks/useSkyBar';
import { SKY_BAR } from '../utils/skyBar';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { TopTradesCarousel } from '../components/TopTradesCarousel';
import { FeedTabs } from '../components/FeedTabs';
import { TradeCard } from '../components/TradeCard';
import { BottomFade } from '../components/BottomFade';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { SkyBar } from '../components/SkyBar';
import { FeedMenu } from '../components/FeedMenu';

const ENTRANCE_COUNT = 5;

// Reanimated's wrapper intercepts the worklet scroll handler and attaches it to
// the underlying scroll view, so scroll-linked animations never touch the JS thread.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentClass<FlashListProps<FeedItem>>,
) as unknown as React.ComponentType<
  FlashListProps<FeedItem> & { onScroll?: unknown; ref?: React.Ref<FlashListRef<FeedItem>> }
>;

/** Hidden from screen readers while the sky bar holds the live copy. */
function a11yHidden(hidden: boolean) {
  return {
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? ('no-hide-descendants' as const) : ('auto' as const),
  };
}

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('discover');
  const [nav, setNav] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<FlashListRef<FeedItem>>(null);
  /** Set when a feed is picked from the sky bar: land on its first card once it renders. */
  const landOnFeed = useRef(false);
  const scrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);
  const lastY = useSharedValue(0);
  const bar = useSkyBar(scrollY, insets.top);

  const items = useMemo(() => feedForTab(tab), [tab]);

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
  const onScroll = useComposedEventHandler([scrollHandler, bar.scrollHandler]);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Tapping the row while it folds takes it the rest of the way into the bar and opens the menu.
  const openMenuFromTabs = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: bar.feedTop, animated: true });
    setMenuOpen(true);
  }, [bar.feedTop]);
  const onPickFeed = useCallback(
    (next: TabKey) => {
      setMenuOpen(false);
      if (next === tab) return;
      landOnFeed.current = true;
      setTab(next);
    },
    [tab],
  );

  useEffect(() => {
    if (!landOnFeed.current) return;
    landOnFeed.current = false;
    // The new cards render first; then the list lands on the first one, right under the bar.
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: bar.feedTop, animated: false }));
  }, [tab, bar.feedTop]);

  // The menu hangs off the docked dropdown, so it closes if the bar leaves.
  useEffect(() => {
    if (!bar.docked) setMenuOpen(false);
  }, [bar.docked]);

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item, index }) => (
      // Keyed by tab so a switch remounts just the cards (replaying their staggered entrance)
      // while the list and its header stay mounted, keeping the scroll offset the sky bar reads.
      <TradeCard
        key={tab}
        item={item}
        index={index}
        expanded={!!expanded[item.id]}
        onToggleNote={onToggleNote}
        animateIn={index < ENTRANCE_COUNT}
      />
    ),
    [tab, expanded, onToggleNote],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      // The sky bar measures where Deposit, the tabs and the first card sit.
      <View style={{ paddingTop: insets.top + 11 }} onLayout={bar.onHeaderLayout}>
        <View onLayout={bar.onPortfolioLayout} {...a11yHidden(bar.pinned)}>
          <PortfolioHeader portfolio={portfolio} />
        </View>
        <View style={{ height: 27 }} />
        <TopTradesCarousel trades={topTrades} />
        <View style={{ height: 22 }} />
        <View onLayout={bar.onTabsLayout} {...a11yHidden(bar.docked)}>
          <FeedTabs
            active={tab}
            onChange={setTab}
            fold={bar.fold}
            folded={bar.folded}
            onOpenMenu={openMenuFromTabs}
          />
        </View>
        <View style={{ height: 18 }} />
      </View>
    ),
    [
      insets.top,
      tab,
      bar.onHeaderLayout,
      bar.onPortfolioLayout,
      bar.onTabsLayout,
      bar.pinned,
      bar.docked,
      bar.fold,
      bar.folded,
      openMenuFromTabs,
    ],
  );

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;
  const feedLabel = TABS.find(t => t.key === tab)?.label ?? '';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SkyBackground scrollY={scrollY} />
      <View style={styles.list}>
        <AnimatedFlashList
          ref={listRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={expanded}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingBottom: navClearance }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          drawDistance={height}
          // On by default in FlashList 2: on a tab switch it scrolled to keep a card the two feeds
          // share in place. The feed never prepends, so leave the offset alone.
          maintainVisibleContentPosition={MVCP_OFF}
        />
      </View>
      <SkyBar bar={bar} feedLabel={feedLabel} menuOpen={menuOpen} onOpenMenu={openMenu} />
      <BottomFade height={navClearance + 20} />
      <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} scrollDirection={scrollDirection} />
      <FeedMenu
        open={menuOpen}
        active={tab}
        top={insets.top + SKY_BAR.height + 4}
        onSelect={onPickFeed}
        onClose={closeMenu}
      />
    </View>
  );
}

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

- [ ] **Step 2: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc silent; all suites pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/DiscoverScreen.tsx
git commit -m "feat: Discover gets the sky bar; tab switches keep the list mounted (keyed cards)"
```

---

### Task 8: Verify in the web preview

- [ ] **Step 1: Start this worktree's Metro on port 8090 (8081 is the user's)**

Run in the background from the worktree: `CI=1 npx expo start --web --port 8090`
Expected: "Waiting on http://localhost:8090"

- [ ] **Step 2: Open http://localhost:8090 in the browser pane at 393 x 852 and check the console is clean**

- [ ] **Step 3: Check positions at key offsets.** Scroll the list's scroll view with `scrollTo` from the
  page's JS and read element boxes. Expected with a 0 status bar inset on web: the thresholds shift
  by −59 against the Figma numbers (T = 0).
  - At 0: nothing of the bar visible; header as before.
  - Scrolling down to 400: no Deposit or dropdown overlay; header content clipped at the status strip.
  - Scrolling up from 700 to 650: the dropdown and Deposit slide in (overlay opacity 1, translateY near the slot).
  - Scrolling up to the dock offset and below: the folded row takes over, then unfolds.
  - Tapping the dropdown opens the menu; picking Rising switches the feed and lands with the first card under the bar.

- [ ] **Step 4: Fix what fails, re-run `npx tsc --noEmit && npx jest`, commit fixes**

---

### Task 9: README

**Files:**
- Modify: `README.md` ("What is on the screen" table row for the portfolio header; a new "Animation: the sky bar" section after the nav bar section; the "Other motion" list's last line)

- [ ] **Step 1: Edit README.md**

Add after the "Tuning the pill live" section:

```markdown
## Animation: the sky bar

The header scrolls under a strip of the sky, so the status bar always sits on sky and stays legible.
Scrolling down from the top nothing sticks. In the feed, any scroll up slides a sky bar down from
under the status bar holding a "Discover ⌄" feed dropdown and the Deposit pill, following the finger
(44 pt in or out, snapping when you stop halfway). Heading back to the top with the bar showing, it
hands its controls back: the dropdown drops out of the bar and unfolds into the four tabs, and
Deposit drops back into the portfolio row. The dropdown opens a menu in the nav bar's dark glass.

How: every layer of the bar is a window onto the background sky (`SkyWindow`), so it is invisible
until content slides beneath it; the edge has 24 pt concave corners (an SVG clip) so it reads as the
top of a sheet. All positions come from worklet maths in `src/utils/skyBar.ts` (unit-tested) and run
on the UI thread; JS only hears threshold crossings, for touch and accessibility.
```

Replace "Nothing else moves. The header, carousel and cards are static by design." with
"Nothing else moves: the carousel and cards are static by design; the header only moves with the scroll (the sky bar)."

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README describes the sky bar"
```

---

### Task 10: Lint and device check

- [ ] **Step 1: Lint with the chore/expo-lint config, without touching package.json**

Run: `cp ../chore-expo-lint/eslint.config.js . && npm install --no-save eslint@9.39.5 eslint-config-expo@57.0.2 && npx eslint src/utils/skyBar.ts src/hooks/useSkyBar.ts src/components/SkyBar.tsx src/components/FeedMenu.tsx src/components/FeedTabs.tsx src/components/Chevron.tsx src/components/SkyBackground.tsx src/screens/DiscoverScreen.tsx; rm eslint.config.js`
Expected: no new problems in the new files; any reported in pre-existing lines match main's baseline.

- [ ] **Step 2: Ask the user to open the worktree's Metro (port 8090) in Expo Go on the iPhone and scroll it.**
