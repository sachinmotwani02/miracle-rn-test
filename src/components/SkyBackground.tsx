import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';
import { SKY_BAR } from '../utils/skyBar';

export const SKY = require('../../assets/sky.png');
const SKY_W = 393;
const SKY_H = 504;

/** The sky's drawn height at a screen width (the Figma export is 393 x 504 pt). */
export function skyHeight(width: number): number {
  return (SKY_H * width) / SKY_W;
}

/** The Figma cloud header, pinned to the top and parallaxed at 0.3x the scroll. */
export function SkyBackground({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const height = skyHeight(width);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(scrollY.value, 0) * SKY_BAR.parallax }],
  }));
  return (
    <Animated.View style={[styles.wrap, { width, height }, style]}>
      <Image source={SKY} style={{ width, height }} contentFit="fill" transition={0} />
    </Animated.View>
  );
}

interface WindowProps {
  /** The sky's parallax offset (pt scrolled up). */
  offset: SharedValue<number>;
  /** The window's top on screen; it may move every frame. */
  top: SharedValue<number>;
  left: number;
  width: number;
  height: number;
  radius?: number;
  /** Swallow touches like a bar does; by default they pass through. */
  blocksTouches?: boolean;
}

/**
 * A window onto the background sky: it shows exactly what SkyBackground draws at the same place on
 * screen, so it cannot be seen until something scrolls under it. The sky bar is built from these.
 */
export function SkyWindow({ offset, top, left, width, height, radius = 0, blocksTouches = false }: WindowProps) {
  const { width: screen } = useWindowDimensions();
  const skyH = skyHeight(screen);
  const frame = useAnimatedStyle(() => ({ transform: [{ translateY: top.value }] }));
  const sky = useAnimatedStyle(() => ({ transform: [{ translateY: -(offset.value + top.value) }] }));
  return (
    <Animated.View
      style={[
        styles.window,
        { left, width, height, borderRadius: radius, pointerEvents: blocksTouches ? 'auto' : 'none' },
        frame,
      ]}
    >
      <Animated.View style={[{ width: screen, height: skyH, marginLeft: -left }, sky]}>
        <Image source={SKY} style={{ width: screen, height: skyH }} contentFit="fill" transition={0} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.feedBg, pointerEvents: 'none' },
  window: { position: 'absolute', top: 0, overflow: 'hidden' },
});
