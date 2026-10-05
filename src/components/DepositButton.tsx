import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, layout, text } from '../theme';
import { Glass, liquidGlassAvailable } from './Glass';

/**
 * Glass pill. iOS 26 renders Apple's Liquid Glass (interactive, so it answers the
 * touch itself); elsewhere the Figma fill is approximated with a white gradient
 * (32% -> 64% at 32% layer opacity) and a faint border.
 */
export function DepositButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Glass style={styles.button} tint="rgba(255,255,255,0.18)" interactive fallback={styles.fallback}>
        <Pressable
          accessibilityRole="button"
          onPressIn={() => {
            scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 220 });
          }}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress?.();
          }}
          style={styles.press}
        >
          {!liquidGlassAvailable && (
            <LinearGradient colors={[colors.depositTop, colors.depositBottom]} style={StyleSheet.absoluteFill} />
          )}
          <Text style={[text.button, styles.label]} maxFontSizeMultiplier={1.2}>
            Deposit
          </Text>
        </Pressable>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.depositWidth,
    height: layout.depositHeight,
    borderRadius: layout.depositHeight / 2,
    overflow: 'hidden',
  },
  fallback: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.white },
});
