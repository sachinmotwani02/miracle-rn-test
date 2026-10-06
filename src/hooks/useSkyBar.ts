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
