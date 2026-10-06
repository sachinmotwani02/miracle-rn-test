import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';
import type { SkyBarState } from '../hooks/useSkyBar';
import { SKY_BAR, bandEdge, barLift, depositPinned, skyOffset, tabsDocked } from '../utils/skyBar';
import { Chevron } from './Chevron';
import { DepositButton } from './DepositButton';
import { SkyWindow } from './SkyBackground';
import { StatusFade } from './StatusFade';

interface Props {
  bar: SkyBarState;
  /** The active feed's name, shown in the dropdown. */
  feedLabel: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
}

/**
 * The sky bar (docs/superpowers/specs/2026-10-06-sky-bar-header-design.md): a band of the
 * background sky that the header scrolls under, and on scroll up in the feed a bar holding the feed
 * dropdown and Deposit. Every layer of sky is a window onto the background, so none of it can be
 * seen until content slides beneath it. The header's strip of sky behind the status bar fades out
 * as the first card rises through it, uncovering a light fade; in the feed the bar brings its own sky
 * back down from the top of the screen as one sheet with a crisp edge.
 */
export function SkyBar({ bar, feedLabel, menuOpen, onOpenMenu }: Props) {
  const { width } = useWindowDimensions();
  const { scrollY, presence, geometry, sky, top } = bar;
  const screenTop = useSharedValue(0);
  const barHeight = top + SKY_BAR.height;
  const depositLeft = width - layout.screenPadding - layout.depositWidth;

  const offset = useDerivedValue(() => skyOffset(scrollY.value, geometry.value));
  const edge = useDerivedValue(() => bandEdge(scrollY.value, presence.value, geometry.value));
  const bandTop = useDerivedValue(() => edge.value - barHeight);
  const lift = useDerivedValue(() => barLift(scrollY.value, presence.value, geometry.value));
  const depositTop = useDerivedValue(() => top + SKY_BAR.depositInset - lift.value);
  const pinned = useDerivedValue(() => (depositPinned(scrollY.value, presence.value, geometry.value) ? 1 : 0));

  const strip = useAnimatedStyle(() => ({ opacity: sky.value }));
  const backing = useAnimatedStyle(() => ({ opacity: pinned.value }));
  const deposit = useAnimatedStyle(() => ({
    opacity: pinned.value,
    transform: [{ translateY: depositTop.value - top }],
  }));
  const dropdown = useAnimatedStyle(() => ({
    opacity: tabsDocked(scrollY.value, presence.value, geometry.value) ? 1 : 0,
    transform: [{ translateY: SKY_BAR.tabsInset - lift.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusFade height={top} />
      <Animated.View style={[styles.strip, { height: top }, strip]}>
        <SkyWindow offset={offset} top={screenTop} left={0} width={width} height={top} />
      </Animated.View>
      <SkyWindow offset={offset} top={bandTop} left={0} width={width} height={barHeight} blocksTouches />
      {/* The controls slide out from under the status bar, so none of them shows above it. */}
      <View style={[styles.controls, { top }]}>
        <Animated.View style={[styles.dropdown, dropdown, { pointerEvents: bar.docked ? 'auto' : 'none' }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Feed: ${feedLabel}`}
            accessibilityState={{ expanded: menuOpen }}
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
            parentTop={top}
            left={depositLeft}
            width={layout.depositWidth}
            height={layout.depositHeight}
            radius={layout.depositHeight / 2}
          />
        </Animated.View>
        <Animated.View
          style={[styles.deposit, { left: depositLeft }, deposit, { pointerEvents: bar.pinned ? 'box-none' : 'none' }]}
        >
          <DepositButton />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
  controls: { position: 'absolute', left: 0, right: 0, height: SKY_BAR.height, overflow: 'hidden', pointerEvents: 'box-none' },
  layer: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
  deposit: { position: 'absolute', top: 0 },
  dropdown: { position: 'absolute', top: 0, left: layout.screenPadding },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20 },
  dropdownLabel: { color: colors.white },
});
