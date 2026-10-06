import React, { createContext, useContext, useLayoutEffect, useRef } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { SKELETON } from '../../utils/skeleton';

/** Window x of the sweep's light band (its left edge), shared by every bone so they light up in step. */
export const SweepContext = createContext<SharedValue<number> | null>(null);

/** How far a Reveal has handed over (0..1): its bones fade out by this much. */
export const BoneFadeContext = createContext<SharedValue<number> | null>(null);

const { band, inkPeak, skyPeak } = SKELETON.sweep;
const light = (peak: number) => ['rgba(255,255,255,0)', `rgba(255,255,255,${peak})`, 'rgba(255,255,255,0)'] as const;
const INK_LIGHT = light(inkPeak);
const SKY_LIGHT = light(skyPeak);

interface BoneProps {
  width: DimensionValue;
  height: number;
  /** Fully rounded unless given. */
  radius?: number;
  /** `ink` on white and glass cards, `sky` straight on the sky. */
  tone?: 'ink' | 'sky';
  style?: StyleProp<ViewStyle>;
}

/**
 * One placeholder shape. Inside a SkeletonSweep it carries its slice of the sweep: the shared band,
 * shifted by the bone's own window x, so a single band of light seems to cross the whole screen.
 */
export function Bone({ width, height, radius = height / 2, tone = 'ink', style }: BoneProps) {
  const sweep = useContext(SweepContext);
  const ref = useRef<View>(null);
  const left = useSharedValue(0);
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect?.();
    if (box) left.set(box.left);
  }, [left]);
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (sweep ? sweep.value : -band) - left.value }],
  }));
  const backgroundColor = tone === 'sky' ? colors.boneSky : colors.boneInk;
  return (
    <View ref={ref} style={[{ width, height, borderRadius: radius, backgroundColor }, styles.clip, style]}>
      {sweep ? (
        <Animated.View style={[styles.band, bandStyle]}>
          <LinearGradient
            colors={tone === 'sky' ? SKY_LIGHT : INK_LIGHT}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

interface GroupProps {
  /** Scales the group (feed cards fade with distance). */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * A group of bones: dimmed for lower feed cards, and inside a Reveal faded out as it hands over,
 * while the chrome around them (card shells, thread line, note box) stays put.
 */
export function BoneGroup({ opacity = 1, style, children }: GroupProps) {
  const handover = useContext(BoneFadeContext);
  const fade = useAnimatedStyle(() => ({ opacity: opacity * (handover ? 1 - handover.value : 1) }));
  return <Animated.View style={[style, fade]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, width: band, pointerEvents: 'none' },
});
