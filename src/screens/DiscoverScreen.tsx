import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { fetchFeed, fetchPortfolio, fetchTopTrades, setHold } from '../data/api';
import { useLivePortfolio } from '../data/live';
import { clearResources, load, readResource, useResource } from '../data/resources';
import { FeedItem, TABS, TabKey } from '../data/types';
import { useDials } from '../dev/dials';
import { useSkyBar } from '../hooks/useSkyBar';
import { colors, layout } from '../theme';
import { SKELETON } from '../utils/skeleton';
import { TAB_RESOLVE } from '../utils/tabResolve';
import { SKY_BAR } from '../utils/skyBar';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { useRollIn } from '../components/PortfolioTicker';
import { TopTradesCarousel } from '../components/TopTradesCarousel';
import { FeedTabs } from '../components/FeedTabs';
import { TradeCard } from '../components/TradeCard';
import { TabResolve, TabSoftenContext } from '../components/TabResolve';
import { BottomFade } from '../components/BottomFade';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { SkyBar } from '../components/SkyBar';
import { FeedMenu } from '../components/FeedMenu';
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
  // A tap lights its label in a commit of its own; the cards follow in a deferred render, so the
  // label never waits for them. `switched` retires the first-load entrance for good.
  const [selection, setSelection] = useState<{ tab: TabKey; switched: boolean }>({ tab: 'discover', switched: false });
  const shown = useDeferredValue(selection);
  const [firstTab] = useState(selection.tab);
  const [nav, setNav] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<FlashListRef<FeedItem>>(null);
  /** Set when a feed is picked from the sky bar: land on its first card once it renders. */
  const landOnFeed = useRef(false);
  const scrollY = useSharedValue(0);
  const bar = useSkyBar(scrollY, insets.top);

  // Cold start loads all three at once with bones from the first frame; a tab's first visit loads
  // its feed behind a short show delay; anything loaded before comes straight from the cache.
  const portfolio = useResource('portfolio', () => fetchPortfolio(latency.portfolio));
  // Held here, above the cards, so a tab switch restarts neither; Replay remounts Discover and rolls again.
  const livePortfolio = useLivePortfolio(portfolio.data);
  const shownPortfolio = useRollIn(livePortfolio);
  const topTrades = useResource('topTrades', () => fetchTopTrades(latency.topTrades));
  // The feed follows the deferred tab, so a tap repaints its label before the cards change. Only
  // the cold start's feed draws bones; the feeds behind the other tabs load quietly (ahead of time,
  // below), and until one lands the cards of the feed shown before stay up.
  const cold = shown.tab === firstTab;
  const feed = useResource(`feed:${shown.tab}`, () => fetchFeed(shown.tab, cold ? latency.feed : latency.tabFeed), {
    quiet: !cold,
  });
  const [feedTab, setFeedTab] = useState<TabKey | null>(null);
  // A switch, to a feed loaded ahead or one that just landed, resolves the cards on screen in place.
  const [resolveKey, setResolveKey] = useState(0);
  if (feed.phase === 'content' && feedTab !== shown.tab) {
    setFeedTab(shown.tab);
    if (feedTab !== null) setResolveKey(k => k + 1);
  }
  const showing = feed.phase === 'content' ? feed : feedTab ? readResource<FeedItem[]>(`feed:${feedTab}`) : feed;
  const items = showing.phase === 'content' && showing.data ? showing.data : NO_ITEMS;
  const loading = portfolio.phase !== 'content' || topTrades.phase !== 'content' || feed.phase === 'skeleton';
  const revealing = feed.revealing;
  // The staggered entrance is for a first feed that arrives without bones. One that reveals from
  // its bones retires it for good, so cards that mount after the reveal window never play it.
  const [revealed, setRevealed] = useState(false);
  if (revealing && !revealed) setRevealed(true);

  // Once the first feed is in, the others load behind it, so a tab tap usually finds its feed ready.
  const firstFeedIn = feedTab !== null;
  useEffect(() => {
    if (!firstFeedIn) return;
    for (const { key } of TABS) {
      if (key !== firstTab) load(`feed:${key}`, () => fetchFeed(key, latency.tabFeed), { quiet: true });
    }
  }, [firstFeedIn, firstTab, latency.tabFeed]);

  // The cards start to soften on the tap itself, from this handler, before React renders anything;
  // the new feed then resolves out of the softness (TabResolve).
  const pending = useSharedValue(0);
  const reduced = useReducedMotion();
  const onTab = useCallback(
    (tab: TabKey) => {
      if (tab === selection.tab) return;
      if (!reduced) pending.set(withTiming(1, { duration: TAB_RESOLVE.soften, easing: TAB_RESOLVE.easing }));
      setSelection({ tab, switched: true });
    },
    [selection.tab, reduced, pending],
  );
  const softening = feedTab !== null && selection.tab !== feedTab;
  const soften = useMemo(() => ({ pending, softening }), [pending, softening]);
  // Once the tapped feed is on screen the cards own the motion: on a resolve they have already taken
  // over from `pending` (their layout effects run first), so it drops at once; with no resolve (tapped
  // away and back before the cards changed) they ease back to sharp.
  const handedOff = useRef(resolveKey);
  useLayoutEffect(() => {
    if (softening) return;
    if (handedOff.current !== resolveKey) {
      handedOff.current = resolveKey;
      pending.set(0);
    } else {
      pending.set(withTiming(0, { duration: TAB_RESOLVE.duration, easing: TAB_RESOLVE.easing }));
    }
  }, [softening, resolveKey, pending]);

  const onToggleNote = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollY.set(e.contentOffset.y);
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
      if (next === selection.tab) return;
      landOnFeed.current = true;
      onTab(next);
    },
    [selection.tab, onTab],
  );

  useEffect(() => {
    if (!landOnFeed.current) return;
    landOnFeed.current = false;
    // The new cards render first (in the deferred render); then the list lands on the first one,
    // right under the bar.
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: bar.feedTop, animated: false }));
  }, [feedTab, bar.feedTop]);

  // The menu hangs off the docked dropdown, so it closes if the bar leaves (say a status bar tap
  // scrolls to the top while it is open).
  const [wasDocked, setWasDocked] = useState(bar.docked);
  if (wasDocked !== bar.docked) {
    setWasDocked(bar.docked);
    if (!bar.docked) setMenuOpen(false);
  }

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item, index }) => (
      // A tab switch to a loaded feed hands it to the cards already mounted (FlashList recycles
      // them, so only their props change) and shows it on the next frame, while the list and its
      // header stay mounted for the sky bar. Rebuilding every card and fading it in from nothing
      // made each switch wait on a pile of work and then on the fade. A feed's first load empties
      // the list, so its cards mount fresh and crossfade from the bones (the skeleton card stays
      // underneath until the real one covers it); the staggered entrance belongs to the first load only.
      <Reveal
        active={revealing && index < SKELETON.feedFade.length}
        delay={index * SKELETON.reveal.stagger}
        bones={<TradeCardSkeleton seed={index} fade={SKELETON.feedFade[index]} />}
      >
        {/* Outside the memoised card, so a switch re-renders only this wrapper for a card both feeds share. */}
        <TabResolve resolveKey={resolveKey} index={index}>
          <TradeCard
            item={item}
            index={index}
            expanded={!!expanded[item.id]}
            onToggleNote={onToggleNote}
            animateIn={!revealed && !shown.switched && index < ENTRANCE_COUNT}
          />
        </TabResolve>
      </Reveal>
    ),
    [revealed, shown.switched, expanded, onToggleNote, revealing, resolveKey],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      // The sky bar measures where Deposit, the tabs and the first card sit.
      <View style={{ paddingTop: insets.top + 11 }} onLayout={bar.onHeaderLayout}>
        <View onLayout={bar.onPortfolioLayout} {...a11yHidden(bar.pinned)}>
          <PortfolioHeader portfolio={livePortfolio} shown={shownPortfolio} reveal={portfolio.revealing} />
        </View>
        <View style={{ height: 27 }} />
        <TopTradesCarousel trades={topTrades.data} reveal={topTrades.revealing} />
        <View style={{ height: 22 }} />
        <View onLayout={bar.onTabsLayout} {...a11yHidden(bar.docked)}>
          <FeedTabs
            active={selection.tab}
            onChange={onTab}
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
      selection.tab,
      onTab,
      livePortfolio,
      shownPortfolio,
      portfolio.revealing,
      topTrades.data,
      topTrades.revealing,
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
  const feedLabel = TABS.find(t => t.key === selection.tab)?.label ?? '';

  return (
    // One subtle light sweep crosses every bone while anything is loading.
    <SkeletonSweep active={loading}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <SkyBackground scrollY={scrollY} />
        <View style={styles.list}>
          <TabSoftenContext.Provider value={soften}>
            <AnimatedFlashList
              ref={listRef}
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              extraData={expanded}
              ListHeaderComponent={header}
              ListEmptyComponent={feed.phase === 'skeleton' ? <FeedSkeleton /> : null}
              ItemSeparatorComponent={Separator}
              contentContainerStyle={{ paddingBottom: navClearance }}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              drawDistance={height}
              // On by default in FlashList 2: on a tab switch it scrolled to keep a card the two feeds
              // share in place (0 -> 1064 pt on Rising). The feed never prepends, so leave the offset alone.
              maintainVisibleContentPosition={MVCP_OFF}
            />
          </TabSoftenContext.Provider>
        </View>
        <SkyBar bar={bar} feedLabel={feedLabel} menuOpen={menuOpen} onOpenMenu={openMenu} />
        <BottomFade height={navClearance + 20} />
        <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} />
        <FeedMenu
          open={menuOpen}
          active={selection.tab}
          top={insets.top + SKY_BAR.height + 4}
          onSelect={onPickFeed}
          onClose={closeMenu}
        />
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
