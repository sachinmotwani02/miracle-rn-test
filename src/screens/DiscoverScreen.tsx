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
      scrollY.set(y);
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

  // The menu hangs off the docked dropdown, so it closes if the bar leaves (say a status bar tap
  // scrolls to the top while it is open).
  const [wasDocked, setWasDocked] = useState(bar.docked);
  if (wasDocked !== bar.docked) {
    setWasDocked(bar.docked);
    if (!bar.docked) setMenuOpen(false);
  }

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
