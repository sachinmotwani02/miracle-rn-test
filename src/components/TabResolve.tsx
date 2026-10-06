import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, layout } from '../theme';
import { TAB_RESOLVE, resolveDelay, slideFrame } from '../utils/tabResolve';

/**
 * The screen's side of the slide. `pending` (0 = still, 1 = fully out) starts rising on the tap,
 * straight from the press handler, so the old content slides out on the UI thread while the new
 * feed renders. `direction` is 1 when the tapped tab sits right of the feed on screen, -1 when it
 * sits left. `softening` is true from the tap until the tapped feed is on screen; it turns the
 * cards' clip on.
 */
export interface TabSoften {
  pending: SharedValue<number>;
  direction: SharedValue<number>;
  softening: boolean;
}

export const TabSoftenContext = createContext<TabSoften | null>(null);

interface Props {
  /** Bumped by the screen when a switch puts a new feed in the cards; a change plays the slide. */
  resolveKey: number;
  index: number;
  children: React.ReactNode;
}

/**
 * Plays the tab switch slide (see TAB_RESOLVE) around one feed card. The card itself stays put: while
 * it moves, a solid white clip on the card's own shape holds still and the content (the card's face,
 * note box and all) slides and dims inside it, so the card's edge stays crisp and the sky never shows
 * through. Outside a switch the clip is a plain wrapper, so the first-load entrance and the skeleton
 * reveal play as before. The screen hands the motion over through context, so the tap re-renders
 * these wrappers and not the list.
 */
export function TabResolve({ resolveKey, index, children }: Props) {
  const soften = useContext(TabSoftenContext);
  const reduced = useReducedMotion();
  const delay = resolveDelay(index);
  const takesPart = delay !== null && !reduced;
  const progress = useSharedValue(1);
  const still = useSharedValue(0);
  const right = useSharedValue(1);
  const arrival = useSharedValue(1);
  const pending = soften && takesPart ? soften.pending : still;
  const direction = soften ? soften.direction : right;
  const [seenKey, setSeenKey] = useState(resolveKey);
  const [run, setRun] = useState<{ id: number; delay: number } | null>(null);
  // The clip stays on while the screen eases `pending` back (tapped away and back before the cards
  // changed), so the old content slides home inside it.
  const softening = !!soften?.softening;
  const [wasSoftening, setWasSoftening] = useState(softening);
  const [settling, setSettling] = useState(false);
  if (softening !== wasSoftening) {
    setWasSoftening(softening);
    setSettling(!softening);
  }

  // A mount (or a recycled card that scrolls in) takes the current key quietly; only a change
  // while mounted is a switch.
  if (resolveKey !== seenKey) {
    setSeenKey(resolveKey);
    if (takesPart) setRun({ id: resolveKey, delay });
  }

  // Before paint, and before the screen lets go of `pending` (parents' layout effects run after
  // their children's): the new content starts as far along as the old one had got, on the far side,
  // so the swap reads as one card passing through.
  useLayoutEffect(() => {
    if (!run) return;
    arrival.set(direction.get());
    progress.set(1 - pending.get());
    progress.set(withDelay(run.delay, withTiming(1, { duration: TAB_RESOLVE.duration, easing: TAB_RESOLVE.easing })));
  }, [run, progress, pending, direction, arrival]);

  useEffect(() => {
    if (!run) return;
    const id = setTimeout(() => setRun(null), run.delay + TAB_RESOLVE.duration + 50);
    return () => clearTimeout(id);
  }, [run]);

  useEffect(() => {
    if (!settling) return;
    const id = setTimeout(() => setSettling(false), TAB_RESOLVE.duration + 50);
    return () => clearTimeout(id);
  }, [settling]);

  const slideStyle = useAnimatedStyle(() => {
    const frame = slideFrame(progress.value, pending.value, direction.value, arrival.value);
    return { opacity: frame.opacity, transform: [{ translateX: frame.x }] };
  });

  const moving = takesPart && (run !== null || softening || settling);
  return (
    <View style={[styles.clip, moving && styles.clipping]} testID={moving ? 'tab-resolve-slide' : undefined}>
      <Animated.View style={[styles.content, slideStyle]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // On the card's own rectangle (TradeCard's slot margin), so clipping it cuts exactly at the card's edge.
  clip: { marginHorizontal: layout.cardMargin },
  // Matches the card's radius and stays opaque while the content dims and slides inside it.
  clipping: { overflow: 'hidden', borderRadius: layout.cardRadius, backgroundColor: colors.card },
  // Gives the card back the slot's full width, so its own margin lands it on the clip.
  content: { marginHorizontal: -layout.cardMargin },
});
