import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';

const SKY = require('../../assets/sky@2x.png');
const SKY_W = 393;
const SKY_H = 504;

/** The Figma cloud header, pinned to the top and parallaxed at 0.3x the scroll. */
export function SkyBackground({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const height = (SKY_H * width) / SKY_W;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(scrollY.value, 0) * 0.3 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { width, height }, style]}>
      <Image source={SKY} style={{ width, height }} contentFit="fill" transition={0} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.feedBg },
});
