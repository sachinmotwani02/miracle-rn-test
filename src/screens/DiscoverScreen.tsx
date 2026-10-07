import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewProps, useWindowDimensions } from 'react-native';
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
import { clearResources, load, readResource, useResource } from '../data/resources';
import { FeedItem, TABS, TabKey } from '../data/types';
import { hideDials, setDial, useDials } from '../dev/dials';
import { useSkyBar } from '../hooks/useSkyBar';
import { colors, layout } from '../theme';
import { moveAccessibilityFocus } from '../utils/accessibilityFocus';
import { SKELETON } from '../utils/skeleton';
import { ResolveLook, TAB_RESOLVE, resolveEasing } from '../utils/tabResolve';
import { SKY_BAR } from '../utils/skyBar';
import { SkyBackground } from '../components/SkyBackground';
import { PortfolioHeader } from '../components/PortfolioHeader';
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

/**
 * Live controls for the tab switch card animation in dev builds (the Dials chip); defaults come
 * from TAB_RESOLVE. Play switches to the next tab like a tap; with auto play on, every change
 * plays a switch too, so a slider shows its effect as soon as it moves. The panel hides while a
 * switch plays, so it never covers the cards.
 */
const CARD_DIALS = {
  play: { type: 'action', label: 'Play' },
  autoPlay: true,
  /** Whole looks to compare in one tap; Reset is the shipped one. */
  deepFast: { type: 'action', label: 'Deep fast' },
  whisper: { type: 'action', label: 'Whisper' },
  deep: { type: 'action', label: 'Deep' },
  soften: [TAB_RESOLVE.soften, 0, 600, 10],
  duration: [TAB_RESOLVE.duration, 50, 1000, 10],
  /** Ease-out of the resolve, an index into RESOLVE_CURVES: 0 snap, 1 quick, 2 smooth, 3 gentle. */
  curve: [0, 0, 3, 1],
  stagger: [TAB_RESOLVE.stagger, 0, 150, 5],
  cards: [TAB_RESOLVE.count, 0, 8, 1],
  scale: [TAB_RESOLVE.scale, 0.8, 1, 0.005],
  opacity: [TAB_RESOLVE.opacity, 0, 1, 0.01],
  blur: [TAB_RESOLVE.blur, 0, 40, 1],
  /** How long the cards' height changes take, ms; 0 snaps. */
  height: [TAB_RESOLVE.height, 0, 600, 10],
  /** Stretches every duration and the stagger, to watch a switch frame by frame. */
  slowMo: [1, 1, 10, 0.5],
} as const;

/**
 * Three looks for the resolve, each a whole set of dials. Deep sinks the cards further than the
 * shipped look and surfaces them slowly, for a switch with presence; Deep fast keeps that
 * softness but settles in 380 ms on the smooth curve ("I like the softness of Deep but it feels
 * very slow"); Whisper is the lightest touch that still registers.
 */
const CARD_PRESETS: Record<string, Record<string, number>> = {
  deepFast: { soften: 160, duration: 380, curve: 2, stagger: 40, cards: 5, scale: 0.96, opacity: 0.4, blur: 14, height: 220 },
  whisper: { soften: 140, duration: 320, curve: 1, stagger: 35, cards: 5, scale: 0.985, opacity: 0.65, blur: 8, height: 200 },
  deep: { soften: 200, duration: 520, curve: 3, stagger: 55, cards: 5, scale: 0.96, opacity: 0.4, blur: 14, height: 260 },
};

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

/**
 * Hidden from screen readers while the sky bar holds the live copy. `aria-hidden` rather than
 * the native-only props, which react-native-web drops: it becomes accessibilityElementsHidden on
 * iOS, importantForAccessibility no-hide-descendants on Android and aria-hidden on the web.
 */
function a11yHidden(hidden: boolean) {
  return { 'aria-hidden': hidden };
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
  // A tap lights its label in a commit of its own; the cards follow a frame later, so the label
  // never waits for them. `switched` retires the first-load entrance for good.
  // Not useDeferredValue: FlashList rewrites its layout table while it renders, and React throws a
  // deferred render away when anything urgent lands (a second tap, a dial, a feed arriving),
  // keeping the old cards on screen over a table cut to the new feed; their next layout report
  // then asks for a card past its end and crashes. A state set from the next frame renders at the
  // default priority, which React runs to the end.
  const [selection, setSelection] = useState<{ tab: TabKey; switched: boolean }>({ tab: 'discover', switched: false });
  const [shown, setShown] = useState(selection);
  useEffect(() => {
    if (shown === selection) return;
    const id = requestAnimationFrame(() => setShown(selection));
    return () => cancelAnimationFrame(id);
  }, [selection, shown]);
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
  const topTrades = useResource('topTrades', () => fetchTopTrades(latency.topTrades));
  // The feed follows the deferred tab, so a tap repaints its label before the cards change. Only
  // the cold start's feed draws bones; the feeds behind the other tabs load quietly (ahead of time,
  // below), and until one lands the cards of the feed shown before stay up.
  const cold = shown.tab === firstTab;
  const feed = useResource(`feed:${shown.tab}`, () => fetchFeed(shown.tab, cold ? latency.feed : latency.tabFeed), {
    quiet: !cold,
  });
  const [feedTab, setFeedTab] = useState<TabKey | null>(null);
  // Play switches tabs like a tap; onTab is declared below, so it goes through a ref.
  const playNext = useRef(() => {});
  const onDialAction = useCallback((action: string) => {
    if (action === 'play') playNext.current();
    const preset = CARD_PRESETS[action];
    if (preset) for (const [key, value] of Object.entries(preset)) setDial('Card animation', key, value);
  }, []);
  const card = useDials('Card animation', CARD_DIALS, { onAction: onDialAction });
  const { soften: softenMs, duration, curve, stagger, cards, scale, opacity, blur, height: heightMs, slowMo, autoPlay } = card;
  const look = useMemo<ResolveLook>(
    () => ({
      soften: softenMs * slowMo,
      duration: duration * slowMo,
      stagger: stagger * slowMo,
      count: cards,
      scale,
      opacity,
      blur,
      easing: resolveEasing(curve),
      height: heightMs * slowMo,
    }),
    [softenMs, duration, curve, stagger, cards, scale, opacity, blur, slowMo, heightMs],
  );

  const reduced = useReducedMotion();

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
  const onTab = useCallback(
    (tab: TabKey) => {
      if (tab === selection.tab) return;
      if (!reduced) pending.set(withTiming(1, { duration: look.soften, easing: look.easing }));
      setSelection({ tab, switched: true });
    },
    [selection.tab, reduced, pending, look],
  );
  useEffect(() => {
    playNext.current = () => {
      const i = TABS.findIndex(t => t.key === selection.tab);
      // The panel steps aside until the last card settles (plus the new feed's render).
      hideDials(look.soften + Math.max(look.count - 1, 0) * look.stagger + look.duration + 400);
      onTab(TABS[(i + 1) % TABS.length].key);
    };
  }, [onTab, selection.tab, look]);
  // Auto play: a moment after the dials stop changing, play a switch with the new values.
  const lookSeen = useRef(look);
  useEffect(() => {
    if (lookSeen.current === look) return;
    lookSeen.current = look;
    if (!autoPlay) return;
    const id = setTimeout(() => playNext.current(), 250);
    return () => clearTimeout(id);
  }, [look, autoPlay]);
  const softening = feedTab !== null && selection.tab !== feedTab;
  const soften = useMemo(() => ({ pending, softening, look }), [pending, softening, look]);
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
      pending.set(withTiming(0, { duration: look.duration, easing: look.easing }));
    }
  }, [softening, resolveKey, pending, look]);

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

  // Closing the menu hands the screen reader back to the dropdown that opened it, if the bar is
  // still there to hold it.
  const dropdownRef = useRef<View>(null);
  const menuWasOpen = useRef(false);
  useEffect(() => {
    if (menuOpen) {
      menuWasOpen.current = true;
      return;
    }
    if (!menuWasOpen.current) return;
    menuWasOpen.current = false;
    if (bar.docked) moveAccessibilityFocus(dropdownRef.current);
  }, [menuOpen, bar.docked]);

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item, index }) => {
      // FlashList can draw a cell for an index its render stack is about to drop (a longer feed's
      // cell on a shorter feed), with no card for it. Draw nothing; its next pass drops the cell.
      if (!item) return null;
      return (
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
      );
    },
    [revealed, shown.switched, expanded, onToggleNote, revealing, resolveKey],
  );

  const header = useMemo(
    () => (
      // Figma (status bar 59pt): label 70, title 167, carousel 195, tabs 309, first card 347.
      // The sky bar measures where Deposit, the tabs and the first card sit.
      <View style={{ paddingTop: insets.top + 11 }} onLayout={bar.onHeaderLayout}>
        <View onLayout={bar.onPortfolioLayout} {...a11yHidden(bar.pinned)}>
          <PortfolioHeader portfolio={portfolio.data} reveal={portfolio.revealing} />
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
      portfolio.data,
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
        <StatusBar style={bar.darkStatus ? 'dark' : 'light'} animated />
        {/* While the feed menu is open, it is all a screen reader reaches. */}
        <View style={styles.screen} {...a11yHidden(menuOpen)}>
          <SkyBackground scrollY={scrollY} />
          <View style={styles.list}>
            <TabSoftenContext.Provider value={soften}>
              <AnimatedFlashList
                ref={listRef}
                data={items}
                renderItem={renderItem}
                CellRendererComponent={FeedCell}
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
          <SkyBar bar={bar} feedLabel={feedLabel} menuOpen={menuOpen} onOpenMenu={openMenu} dropdownRef={dropdownRef} />
          <BottomFade height={navClearance + 20} />
          <FloatingNavBar active={nav} onChange={setNav} scrollY={scrollY} />
        </View>
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
// Cells are keyed by position, not by trade: on a tab switch each cell keeps its place and takes
// the new feed's card for it, so a card can hold its slot's height and ease to the new one
// (TabResolve). Keyed by trade, FlashList handed cells across positions (the second card's cell
// became the first), and the held heights belonged to the wrong slots. The feed never reorders.
const keyExtractor = (_item: FeedItem, index: number) => String(index);

/**
 * The list's cell. FlashList sizes cells from their layout reports and looks each one up by the
 * cell's index. Card heights animate on the UI thread (TabResolve), so a report can still be in
 * flight when a shorter feed drops the cell, and Fabric delivers it to the removed cell all the
 * same: an index past the end of the new feed, which FlashList throws on. Dropped here instead.
 */
const FeedCell = forwardRef<View, ViewProps>(function FeedCell({ onLayout, ...rest }, ref) {
  const live = useRef(true);
  useEffect(() => () => {
    live.current = false;
  }, []);
  const onLiveLayout = useCallback((e: LayoutChangeEvent) => {
    if (live.current) onLayout?.(e);
  }, [onLayout]);
  return <View ref={ref} {...rest} onLayout={onLiveLayout} />;
});
const MVCP_OFF = { disabled: true };

function Separator() {
  return <View style={{ height: layout.cardGap }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.feedBg },
  screen: { flex: 1 },
  list: { flex: 1 },
});
