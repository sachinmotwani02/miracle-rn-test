import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
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

// Reanimated's wrapper intercepts the worklet scroll handler and attaches it to
// the underlying scroll view, so scroll-linked animations never touch the JS thread.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentClass<FlashListProps<FeedItem>>,
) as unknown as React.ComponentType<FlashListProps<FeedItem> & { onScroll?: unknown }>;

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

  const onTab = useCallback((next: TabKey) => {
    // The list remounts on a tab change, so let the first cards play their entrance again.
    firstMount.current = true;
    setTab(next);
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
      <TradeCard
        item={item}
        index={index}
        expanded={!!expanded[item.id]}
        onToggleNote={onToggleNote}
        animateIn={firstMount.current && index < ENTRANCE_COUNT}
      />
    ),
    [expanded, onToggleNote],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      <View style={{ paddingTop: insets.top + 11 }}>
        <PortfolioHeader portfolio={portfolio} />
        <View style={{ height: 27 }} />
        <TopTradesCarousel trades={topTrades} />
        <View style={{ height: 22 }} />
        <FeedTabs active={tab} onChange={onTab} />
        <View style={{ height: 18 }} />
      </View>
    ),
    [insets.top, tab, onTab],
  );

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SkyBackground scrollY={scrollY} />
      {/* Keyed by tab so a switch remounts the list; cards re-run their staggered entrance.
          No opacity fade here: Liquid Glass views inside it stop rendering at opacity 0. */}
      <View key={tab} style={styles.list}>
        <AnimatedFlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={expanded}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingBottom: navClearance }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          drawDistance={height}
        />
      </View>
      <BottomFade height={navClearance + 20} />
      <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} scrollDirection={scrollDirection} />
    </View>
  );
}

const keyExtractor = (item: FeedItem) => item.id;

function Separator() {
  return <View style={{ height: layout.cardGap }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.feedBg },
  list: { flex: 1 },
});
