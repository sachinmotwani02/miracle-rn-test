import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatMoney } from '../utils/format';

interface Props {
  value: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Counts up to `value` over `duration` ms with an ease-out cubic.
 *
 * Text content cannot be changed from the UI thread (the TextInput `text`
 * animatedProps trick does not apply on the new architecture), so this is the
 * one JS-driven animation on the screen: a single Text re-rendered per frame
 * for under a second on mount, well before any scrolling starts.
 */
export function AnimatedNumber({ value, duration = 900, delay = 150, style }: Props) {
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

  return (
    <Text style={style} maxFontSizeMultiplier={1.2} accessibilityLabel={formatMoney(value)}>
      {formatMoney(shown)}
    </Text>
  );
}
