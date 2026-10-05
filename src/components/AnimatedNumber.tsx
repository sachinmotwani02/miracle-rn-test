import React, { useEffect } from 'react';
import { Platform, StyleProp, TextInput, TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../utils/format';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const IS_WEB = Platform.OS === 'web';

interface Props {
  value: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Counts up to `value` entirely on the UI thread: the formatted string is
 * written straight into a non-editable TextInput through animatedProps, so no
 * React re-render happens per frame.
 */
export function AnimatedNumber({ value, duration = 900, delay = 150, style }: Props) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(delay, withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
  }, [value, duration, delay, v]);

  const animatedProps = useAnimatedProps(() => {
    const s = formatMoney(v.value);
    // Native TextInput takes `text`; react-native-web takes `value`.
    return (IS_WEB ? { value: s } : { text: s }) as Record<string, string>;
  });

  return (
    <AnimatedTextInput
      animatedProps={animatedProps as never}
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0, margin: 0, includeFontPadding: false } as TextStyle, style]}
      defaultValue={formatMoney(0)}
      accessibilityLabel={formatMoney(value)}
    />
  );
}
