import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { layout } from '../theme';
import { TAB_RESOLVE, resolveDelay, resolveFrame } from '../utils/tabResolve';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// iOS and web blur whatever sits under the overlay. Android's BlurView needs a BlurTargetView
// around the content and would only paint a tint here, so Android resolves with scale and fade.
const CAN_BLUR = Platform.OS !== 'android';

/**
 * The screen's side of the resolve. `pending` (0 = sharp, 1 = fully soft) starts rising on the tap,
 * straight from the press handler, so the cards soften on the UI thread while the new feed renders.
 * `softening` is true from the tap until the tapped feed is on screen; it mounts the blur overlays.
 */
export interface TabSoften {
  pending: SharedValue<number>;
  softening: boolean;
}

export const TabSoftenContext = createContext<TabSoften | null>(null);

interface Props {
  /** Bumped by the screen when a switch puts a new feed in the cards; a change plays the resolve. */
  resolveKey: number;
  index: number;
  children: React.ReactNode;
}

/**
 * Plays the tab switch resolve (see TAB_RESOLVE) around one feed card. The fade sits on the
 * content only, and the blur is a sibling overlay outside it: a blur view under a see-through
 * ancestor renders wrong on iOS. The overlay covers the card (inside its side margins) and is
 * mounted only while the card softens or resolves. The screen hands the softening over through
 * context, so the tap re-renders these wrappers and not the list.
 */
export function TabResolve({ resolveKey, index, children }: Props) {
  const soften = useContext(TabSoftenContext);
  const reduced = useReducedMotion();
  const delay = resolveDelay(index);
  const takesPart = delay !== null && !reduced;
  const progress = useSharedValue(1);
  const sharp = useSharedValue(0);
  const pending = soften && takesPart ? soften.pending : sharp;
  const [seenKey, setSeenKey] = useState(resolveKey);
  const [run, setRun] = useState<{ id: number; delay: number } | null>(null);
  // The blur stays up while the screen eases `pending` back (tapped away and back before the cards
  // changed), so it fades with the scale and the opacity instead of vanishing in one frame.
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
  // their children's): the card takes over from however soft the tap had made it, so the new
  // content's first frame matches the last frame of the old.
  useLayoutEffect(() => {
    if (!run) return;
    progress.set(1 - pending.get());
    progress.set(withDelay(run.delay, withTiming(1, { duration: TAB_RESOLVE.duration, easing: TAB_RESOLVE.easing })));
  }, [run, progress, pending]);

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

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resolveFrame(Math.min(progress.value, 1 - pending.value)).scale }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: resolveFrame(Math.min(progress.value, 1 - pending.value)).opacity,
  }));
  const blurProps = useAnimatedProps(() => ({
    intensity: resolveFrame(Math.min(progress.value, 1 - pending.value)).intensity,
  }));

  const blurring = CAN_BLUR && takesPart && (run !== null || softening || settling);
  return (
    <Animated.View style={scaleStyle}>
      <Animated.View style={fadeStyle}>{children}</Animated.View>
      {blurring ? (
        <View style={styles.overlay} testID="tab-resolve-blur">
          {/* Starts unblurred: the animated props take it to the live value from the first frame. */}
          <AnimatedBlurView animatedProps={blurProps} intensity={0} tint="light" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: layout.cardMargin,
    right: layout.cardMargin,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
});
