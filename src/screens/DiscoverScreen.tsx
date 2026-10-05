import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import Animated, { FadeIn, FadeOut, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
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
    firstMount.current = false;
    setTab(next);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      if (Math.abs(dy) > 2) scrollDirection.value = dy > 0 ? 1 : -1;
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
      <View style={{ paddingTop: insets.top + 12 }}>
        <PortfolioHeader portfolio={portfolio} />
        <View style={{ height: 30 }} />
        <TopTradesCarousel trades={topTrades} />
        <View style={{ height: 24 }} />
        <FeedTabs active={tab} onChange={onTab} />
        <View style={{ height: 16 }} />
      </View>
    ),
    [insets.top, tab, onTab],
  );

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SkyBackground scrollY={scrollY} />
      <Animated.View key={tab} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.list}>
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
      </Animated.View>
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
