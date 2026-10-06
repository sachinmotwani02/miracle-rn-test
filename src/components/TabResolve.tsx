import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
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

interface Props {
  /** Bumped by the screen on each switch to a loaded feed; a change plays the resolve. */
  resolveKey: number;
  index: number;
  children: React.ReactNode;
}

/**
 * Plays the tab switch resolve (see TAB_RESOLVE) around one feed card. The fade sits on the
 * content only, and the blur is a sibling overlay outside it: a blur view under a see-through
 * ancestor renders wrong on iOS. The overlay covers the card (inside its side margins) and is
 * mounted only while the card resolves.
 */
export function TabResolve({ resolveKey, index, children }: Props) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  const [seenKey, setSeenKey] = useState(resolveKey);
  const [run, setRun] = useState<{ id: number; delay: number } | null>(null);

  // A mount (or a recycled card that scrolls in) takes the current key quietly; only a change
  // while mounted is a switch.
  if (resolveKey !== seenKey) {
    setSeenKey(resolveKey);
    const delay = resolveDelay(index);
    if (delay !== null && !reduced) setRun({ id: resolveKey, delay });
  }

  // Before paint, so the new content's first frame is already soft rather than a crisp flash.
  useLayoutEffect(() => {
    if (!run) return;
    // A plain write lands at once (a zero-length timing would wait for the next animation frame),
    // then the timing runs on from there.
    progress.set(0);
    progress.set(withDelay(run.delay, withTiming(1, { duration: TAB_RESOLVE.duration, easing: TAB_RESOLVE.easing })));
  }, [run, progress]);

  useEffect(() => {
    if (!run) return;
    const id = setTimeout(() => setRun(null), run.delay + TAB_RESOLVE.duration + 50);
    return () => clearTimeout(id);
  }, [run]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: resolveFrame(progress.value).scale }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: resolveFrame(progress.value).opacity }));
  const blurProps = useAnimatedProps(() => ({ intensity: resolveFrame(progress.value).intensity }));

  return (
    <Animated.View style={scaleStyle}>
      <Animated.View style={fadeStyle}>{children}</Animated.View>
      {run && CAN_BLUR ? (
        <View style={styles.overlay} testID="tab-resolve-blur">
          <AnimatedBlurView animatedProps={blurProps} intensity={TAB_RESOLVE.blur} tint="light" style={StyleSheet.absoluteFill} />
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
