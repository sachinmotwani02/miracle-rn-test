import React, { useEffect, useState } from 'react';
import { Platform, StyleProp, Text, TextInput, TextStyle } from 'react-native';
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
export function AnimatedNumber(props: Props) {
  return IS_WEB ? <WebAnimatedNumber {...props} /> : <NativeAnimatedNumber {...props} />;
}

function NativeAnimatedNumber({ value, duration = 900, delay = 150, style }: Props) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(delay, withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
  }, [value, duration, delay, v]);

  const animatedProps = useAnimatedProps(() => {
    const s = formatMoney(v.value);
    return { text: s } as Record<string, string>;
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

/** Web preview only: react-native-web has no `text` native prop, so count up with rAF. */
function WebAnimatedNumber({ value, duration = 900, delay = 150, style }: Props) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);
  return <Text style={style}>{formatMoney(shown)}</Text>;
}
