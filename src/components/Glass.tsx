import React from 'react';
import { ColorValue, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

/**
 * True when the app can render Apple's Liquid Glass (iOS 26+, API present).
 * Everywhere else the Glass component renders its `fallback` styling instead.
 */
export const liquidGlassAvailable: boolean =
  Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

interface Props {
  style?: StyleProp<ViewStyle>;
  /** Colour laid over the glass (keep the alpha low; the material supplies the depth). */
  tint?: ColorValue;
  scheme?: 'light' | 'dark';
  /** Native touch highlight on the glass itself. */
  interactive?: boolean;
  /** Extra style applied only when native glass is unavailable (solid fill, border). */
  fallback?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Figma "Glass" effect: native Liquid Glass on iOS 26, approximated fill elsewhere. */
export function Glass({ style, tint, scheme = 'light', interactive = false, fallback, children }: Props) {
  if (liquidGlassAvailable) {
    return (
      <GlassView style={style} glassEffectStyle="regular" tintColor={tint} colorScheme={scheme} isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return <View style={[style, fallback]}>{children}</View>;
}
