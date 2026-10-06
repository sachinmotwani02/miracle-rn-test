import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';
import type { SkyBarState } from '../hooks/useSkyBar';
import { SKY_BAR, bandEdge, barLift, depositPinned, skyOffset, tabsDocked } from '../utils/skyBar';
import { Chevron } from './Chevron';
import { DepositButton } from './DepositButton';
import { SkyWindow } from './SkyBackground';

interface Props {
  bar: SkyBarState;
  /** The active feed's name, shown in the dropdown. */
  feedLabel: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  /** The dropdown, for handing the screen reader back to it when the menu closes. */
  dropdownRef?: React.Ref<View>;
}

/**
 * The sky bar (docs/superpowers/specs/2026-10-06-sky-bar-header-design.md): a strip of the
 * background sky that the header scrolls under, so the status bar always sits on sky, and on scroll
 * up in the feed a bar holding the feed dropdown and Deposit. Every layer is a window onto the
 * background sky, so none of it can be seen until content slides beneath it.
 */
export function SkyBar({ bar, feedLabel, menuOpen, onOpenMenu, dropdownRef }: Props) {
  const { width } = useWindowDimensions();
  const { scrollY, presence, geometry, top } = bar;
  const barHeight = top + SKY_BAR.height;
  const depositLeft = width - layout.screenPadding - layout.depositWidth;

  const offset = useDerivedValue(() => skyOffset(scrollY.value, geometry.value));
  const edge = useDerivedValue(() => bandEdge(scrollY.value, presence.value, geometry.value));
  const bandTop = useDerivedValue(() => edge.value - barHeight);
  const lift = useDerivedValue(() => barLift(presence.value));
  const depositTop = useDerivedValue(() => top + SKY_BAR.depositInset - lift.value);
  const stripTop = useSharedValue(0);
  const pinned = useDerivedValue(() => (depositPinned(scrollY.value, presence.value, geometry.value) ? 1 : 0));

  const backing = useAnimatedStyle(() => ({ opacity: pinned.value }));
  const deposit = useAnimatedStyle(() => ({
    opacity: pinned.value,
    transform: [{ translateY: depositTop.value }],
  }));
  const dropdown = useAnimatedStyle(() => ({
    opacity: tabsDocked(scrollY.value, presence.value, geometry.value) ? 1 : 0,
    transform: [{ translateY: top + SKY_BAR.tabsInset - lift.value }],
  }));

  return (
    <View style={styles.root}>
      <SkyWindow offset={offset} top={bandTop} left={0} width={width} height={barHeight} blocksTouches />
      {/* Each control here is a copy of one in the header, so it is hidden from screen readers
          whenever it is hidden from sight; the header hides its own copy the rest of the time. */}
      <Animated.View
        style={[styles.dropdown, dropdown, { pointerEvents: bar.docked ? 'auto' : 'none' }]}
        aria-hidden={!bar.docked}
      >
        <Pressable
          ref={dropdownRef}
          accessibilityRole="button"
          accessibilityLabel={`Feed: ${feedLabel}`}
          aria-expanded={menuOpen}
          onPress={onOpenMenu}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          style={styles.dropdownRow}
        >
          <Text style={[text.tab, styles.dropdownLabel]} maxFontSizeMultiplier={1.2}>
            {feedLabel}
          </Text>
          <Chevron />
        </Pressable>
      </Animated.View>
      {/* The pinned Deposit sits on its own piece of sky, which covers the header's Deposit
          scrolling up underneath it. */}
      <Animated.View style={[styles.layer, backing]}>
        <SkyWindow
          offset={offset}
          top={depositTop}
          left={depositLeft}
          width={layout.depositWidth}
          height={layout.depositHeight}
          radius={layout.depositHeight / 2}
        />
      </Animated.View>
      <Animated.View
        style={[styles.deposit, { left: depositLeft }, deposit, { pointerEvents: bar.pinned ? 'box-none' : 'none' }]}
        aria-hidden={!bar.pinned}
      >
        <DepositButton />
      </Animated.View>
      {/* Over the status bar: the bar's controls slide out from under it. */}
      <SkyWindow offset={offset} top={stripTop} left={0} width={width} height={top} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  layer: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
  deposit: { position: 'absolute', top: 0 },
  dropdown: { position: 'absolute', top: 0, left: layout.screenPadding },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 20 },
  dropdownLabel: { color: colors.white },
});
