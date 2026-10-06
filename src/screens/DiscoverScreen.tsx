import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { fetchFeed, fetchPortfolio, fetchTopTrades, setHold } from '../data/api';
import { useLivePortfolio } from '../data/live';
import { clearResources, useResource } from '../data/resources';
import { FeedItem, TabKey } from '../data/types';
import { useDials } from '../dev/dials';
import { colors, layout } from '../theme';
import { SKELETON } from '../utils/skeleton';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { useRollIn } from '../components/PortfolioTicker';
import { TopTradesCarousel } from '../components/TopTradesCarousel';
import { FeedTabs } from '../components/FeedTabs';
import { TradeCard } from '../components/TradeCard';
import { BottomFade } from '../components/BottomFade';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { FeedSkeleton, TradeCardSkeleton } from '../components/skeleton/FeedSkeleton';
import { Reveal } from '../components/skeleton/Reveal';
import { SkeletonSweep } from '../components/skeleton/Sweep';

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

  // Cold start loads all three at once with bones from the first frame; a tab's first visit loads
  // its feed behind a short show delay; anything loaded before comes straight from the cache.
  const portfolio = useResource('portfolio', () => fetchPortfolio(latency.portfolio));
  // Held here, above the cards, so a tab switch restarts neither; Replay remounts Discover and rolls again.
  const livePortfolio = useLivePortfolio(portfolio.data);
  const shownPortfolio = useRollIn(livePortfolio);
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
      scrollY.value = e.contentOffset.y;
    },
  });

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item, index }) => (
      // Keyed by tab so a switch remounts just the cards while the header above stays mounted.
      // The cards that replace the feed's bones crossfade from them (the skeleton card stays
      // underneath until the real one covers it); otherwise the first cards play their entrance.
      <Reveal
        key={tab}
        active={revealing && index < SKELETON.feedFade.length}
        delay={index * SKELETON.reveal.stagger}
        bones={<TradeCardSkeleton seed={index} fade={SKELETON.feedFade[index]} />}
      >
        <TradeCard
          item={item}
          index={index}
          expanded={!!expanded[item.id]}
          onToggleNote={onToggleNote}
          animateIn={!revealing && index < ENTRANCE_COUNT}
        />
      </Reveal>
    ),
    [tab, expanded, onToggleNote, revealing],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      <View style={{ paddingTop: insets.top + 11 }}>
        <PortfolioHeader portfolio={livePortfolio} shown={shownPortfolio} reveal={portfolio.revealing} />
        <View style={{ height: 27 }} />
        <TopTradesCarousel trades={topTrades.data} reveal={topTrades.revealing} />
        <View style={{ height: 22 }} />
        <FeedTabs active={tab} onChange={setTab} />
        <View style={{ height: 18 }} />
      </View>
    ),
    [insets.top, tab, livePortfolio, shownPortfolio, portfolio.revealing, topTrades.data, topTrades.revealing],
  );

  const navClearance = Math.max(insets.bottom, 16) + layout.nav.bottomGap + layout.nav.height + 16;

  return (
    // One subtle light sweep crosses every bone while anything is loading.
    <SkeletonSweep active={loading}>
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
        <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} />
      </View>
    </SkeletonSweep>
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
