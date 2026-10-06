import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, layout, text } from '../theme';

// Reanimated 4 springs default to mass 4, so these spell out the mass 1 they were tuned with.
export const PRESS = { damping: 15, stiffness: 300, mass: 1 };
export const RELEASE = { damping: 12, stiffness: 220, mass: 1 };

/**
 * Glass pill built from the Figma values so it is identical on iOS and Android:
 * a white gradient (32% -> 64%) at 32% layer opacity, a soft white drop shadow, and
 * the Figma Glass effect faked with inner white shadows (see `glass`).
 */
export function DepositButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.shadow, style]}>
      <Pressable
        accessibilityRole="button"
        // 44 pt tall round the 36 pt pill.
        hitSlop={{ top: 4, bottom: 4 }}
        onPressIn={() => {
          scale.set(withSpring(0.95, PRESS));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, RELEASE));
        }}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        style={styles.button}
      >
        <LinearGradient colors={[colors.depositTop, colors.depositBottom]} style={StyleSheet.absoluteFill} />
        {/* Inset shadows paint under a view's own children, so they sit on a layer above the gradient. */}
        <View style={styles.glass} />
        <Text style={[text.button, styles.label]} maxFontSizeMultiplier={1.2}>
          Deposit
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Figma drop shadow: 0 2 12, white 12%. Kept off the clipped button so it is not cut away.
  shadow: {
    borderRadius: layout.depositHeight / 2,
    boxShadow: '0 2px 12px rgba(255, 255, 255, 0.12)',
  },
  button: {
    width: layout.depositWidth,
    height: layout.depositHeight,
    borderRadius: layout.depositHeight / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma inner shadow (0 -6 12, white 32%) pools a glow along the bottom edge; the Glass
  // light (-45deg, 16%) becomes a 1pt catch-light on the top-left and bottom-right rims.
  glass: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: layout.depositHeight / 2,
    boxShadow:
      'inset 0 -6px 12px rgba(255, 255, 255, 0.32), inset 1px 1px 1px rgba(255, 255, 255, 0.16), inset -1px -1px 1px rgba(255, 255, 255, 0.16)',
    pointerEvents: 'none',
  },
  label: { color: colors.white },
});
