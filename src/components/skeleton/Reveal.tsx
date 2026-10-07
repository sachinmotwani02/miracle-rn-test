import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SKELETON } from '../../utils/skeleton';
import { BoneFadeContext } from './Bone';

interface Props {
  /** Read once, on mount: true crossfades from `bones`, false renders the content plainly. */
  active: boolean;
  /** Exactly what the skeleton showed in this spot (same seed and fade). */
  bones: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}

/**
 * Hands over from bones to content in place. The skeleton stays underneath, unchanged, so the
 * frame where the real component replaces it looks the same; then the content fades in on top
 * while the bones (only the bones: shells and chrome stay solid, so nothing dips) fade out, and
 * the skeleton unmounts. Recycled or later mounts (active false) render the content as usual.
 */
export function Reveal({ active, bones, delay = 0, children }: Props) {
  const reducedMotion = useReducedMotion();
  // Android's nested list headers must not depend on an animated opacity commit to show data.
  // Keep the loading skeleton, then hand straight over to ordinary native content.
  if (Platform.OS === 'android' || reducedMotion) return <>{children}</>;
  return <AnimatedReveal active={active} bones={bones} delay={delay}>{children}</AnimatedReveal>;
}

function AnimatedReveal({ active, bones, delay = 0, children }: Props) {
  const [revealing] = useState(active);
  const [bonesMounted, setBonesMounted] = useState(active);
  const shown = useSharedValue(revealing ? 0 : 1);

  useEffect(() => {
    if (!revealing) return;
    const { duration } = SKELETON.reveal;
    shown.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) })));
    const id = setTimeout(() => setBonesMounted(false), delay + duration + 50);
    return () => clearTimeout(id);
  }, [revealing, delay, shown]);

  // Settle to an explicit visible state even if the final animation frame was missed.
  const contentStyle = useAnimatedStyle(() => ({ opacity: bonesMounted ? shown.value : 1 }));

  if (!revealing) return <>{children}</>;
  return (
    <View>
      {bonesMounted ? (
        <View style={styles.bones}>
          <BoneFadeContext.Provider value={shown}>{bones}</BoneFadeContext.Provider>
        </View>
      ) : null}
      <Animated.View collapsable={false} style={contentStyle}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Under the content and clipped to it: a card shorter than its skeleton (a note without
  // "Read more") must not show bones hanging out underneath.
  bones: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' },
});
