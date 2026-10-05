import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, layout, text } from '../theme';

/** Glass pill: the Figma fill is a white gradient (32% -> 64%) at 32% layer opacity. */
export function DepositButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
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
        style={styles.button}
      >
        <LinearGradient colors={[colors.depositTop, colors.depositBottom]} style={StyleSheet.absoluteFill} />
        <Text style={[text.button, styles.label]} maxFontSizeMultiplier={1.2}>
          Deposit
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.depositWidth,
    height: layout.depositHeight,
    borderRadius: layout.depositHeight / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.white },
});
