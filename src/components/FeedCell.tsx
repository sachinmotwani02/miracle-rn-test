import React, { createContext, useContext, useMemo } from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import Animated, { EasingFunctionFactory, LayoutAnimationsValues, withTiming } from 'react-native-reanimated';
import { cellMoveDuration } from '../utils/tabResolve';

/** Set by the screen for the length of a tab switch; null the rest of the time. */
export interface CellGlide {
  ms: number;
  easing: EasingFunctionFactory;
}

export const CellGlideContext = createContext<CellGlide | null>(null);

type Props = ViewProps & { index?: number; ref?: React.Ref<View> };

/**
 * FlashList's cell container (its CellRendererComponent). During a tab switch the cells carry a
 * layout transition, so a card that comes in taller or shorter eases to its new height and the
 * cards below glide to their new places instead of jumping. It runs on the UI thread, in the same
 * frames as the resolve, and only then: while scrolling, recycled cells move instantly as before.
 * The cell clips its card, so a growing card unrolls rather than sliding under the next one.
 * Custom layout transitions do not run on the web, where cells keep jumping.
 */
export function FeedCell({ style, index: _index, ...rest }: Props) {
  const glide = useContext(CellGlideContext);
  const layout = useMemo(() => {
    if (!glide || Platform.OS === 'web') return undefined;
    const { ms, easing } = glide;
    return (values: LayoutAnimationsValues) => {
      'worklet';
      const config = { duration: cellMoveDuration(values.targetOriginY - values.currentOriginY, ms), easing };
      return {
        initialValues: { originY: values.currentOriginY, height: values.currentHeight },
        animations: {
          originY: withTiming(values.targetOriginY, config),
          height: withTiming(values.targetHeight, config),
        },
      };
    };
  }, [glide]);
  return <Animated.View {...rest} style={[style, styles.clip]} layout={layout} />;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
