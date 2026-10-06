import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TABS, TabKey } from '../data/types';
import { colors, layout, text } from '../theme';
import { chevronReveal, foldedTab } from '../utils/skyBar';
import { Chevron } from './Chevron';

/**
 * Tabs get switched all the time, so the labels barely animate: a short, strong ease-out puts more
 * than half the change on the first frame and settles in about 100 ms.
 */
export const LABEL_FADE = { duration: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) };

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** 0..1 as the row folds into the sky bar's dropdown; without it the row never folds. */
  fold?: SharedValue<number>;
  /** Past half folded: the folded-away tabs stop taking taps and the row opens the menu instead. */
  folded?: boolean;
  onOpenMenu?: () => void;
}

interface TabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  fold: SharedValue<number>;
  /** The tab's measured x in the row; the fold slides it to the row's start. */
  x: number;
  folded: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
}

function Tab({ label, selected, onPress, fold, x, folded, onLayout }: TabProps) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0.72, LABEL_FADE),
    transform: [{ scale: withTiming(pressed.value ? 0.96 : 1, { duration: 120 }) }],
  }));
  const folding = useAnimatedStyle(() => {
    const t = foldedTab(fold.value, x, layout.screenPadding, selected);
    return { opacity: t.opacity, transform: [{ translateX: t.translateX }, { scale: t.scale }] };
  });
  return (
    <Animated.View
      style={[styles.tab, folding, { pointerEvents: folded && !selected ? 'none' : 'auto' }]}
      onLayout={onLayout}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        // Folded, the active label also answers taps on the chevron beside it.
        hitSlop={{ top: 10, bottom: 10, left: 4, right: folded && selected ? 24 : 4 }}
      >
        <Animated.Text style={[text.tab, styles.label, style]} maxFontSizeMultiplier={1.2}>
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

export function FeedTabs({ active, onChange, fold, folded = false, onOpenMenu }: Props) {
  const still = useSharedValue(0);
  const progress = fold ?? still;
  const [boxes, setBoxes] = useState<Partial<Record<TabKey, { x: number; width: number }>>>({});
  const chevron = useAnimatedStyle(() => {
    const c = chevronReveal(progress.value);
    return { opacity: c.opacity, transform: [{ translateX: c.translateX }] };
  });
  const activeWidth = boxes[active]?.width ?? 0;
  return (
    <View style={styles.row}>
      {TABS.map(t => (
        <Tab
          key={t.key}
          label={t.label}
          selected={t.key === active}
          fold={progress}
          x={boxes[t.key]?.x ?? layout.screenPadding}
          folded={folded}
          onPress={() => (folded ? onOpenMenu?.() : onChange(t.key))}
          onLayout={e => {
            const { x, width } = e.nativeEvent.layout;
            setBoxes(prev =>
              prev[t.key]?.x === x && prev[t.key]?.width === width ? prev : { ...prev, [t.key]: { x, width } },
            );
          }}
        />
      ))}
      {/* Fades in beside the active label as the row folds into the dropdown. */}
      <Animated.View style={[styles.chevron, { left: layout.screenPadding + activeWidth + 4 }, chevron]}>
        <Chevron />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.tabGap,
    paddingHorizontal: layout.screenPadding,
    height: 20,
  },
  // Folding tabs shrink toward their left edge, where the dropdown's label starts.
  tab: { transformOrigin: 'left center' },
  label: { color: colors.white },
  chevron: { position: 'absolute', top: 3, pointerEvents: 'none' },
});
