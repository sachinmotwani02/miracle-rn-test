import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TABS, TabKey } from '../data/types';
import { colors, layout, text } from '../theme';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0.7, { duration: 180 }),
    transform: [{ scale: withTiming(pressed.value ? 0.96 : 1, { duration: 120 }) }],
  }));
  return (
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
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
    >
      <Animated.Text style={[text.tab, styles.label, style]} maxFontSizeMultiplier={1.2}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function FeedTabs({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map(t => (
        <Tab key={t.key} label={t.label} selected={t.key === active} onPress={() => onChange(t.key)} />
      ))}
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
  label: { color: colors.white },
});
