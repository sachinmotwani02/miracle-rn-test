import React, { useLayoutEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BlurView } from 'expo-blur';
import { TABS, TabKey } from '../data/types';
import { colors, text } from '../theme';
import { haptic } from '../utils/haptics';

const ROW = 40;
const PAD = 8;
const WIDTH = 180;
/**
 * Quick, with no tail: a strong ease-out (quint) puts most of each move in its first frames and
 * stops dead, where the earlier critically damped spring spent 300-400 ms settling.
 */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const OPEN = { duration: 160, easing: EASE_OUT };
const CLOSE = { duration: 100, easing: EASE_OUT };
const LENS = { duration: 150, easing: EASE_OUT };
/** The lens is nearly on the pick (90% by ~60 ms) when the menu closes and the feed switches, ms. */
const PICK_DELAY = 80;

interface Props {
  open: boolean;
  active: TabKey;
  /** Screen y of the menu's top edge. */
  top: number;
  onSelect: (tab: TabKey) => void;
  onClose: () => void;
}

const indexOf = (tab: TabKey) => Math.max(0, TABS.findIndex(t => t.key === tab));

/**
 * The sky bar's feed menu: a dark glass card in the nav bar's material with the nav bar's lens on
 * the current feed. It grows from its top-left corner; tapping outside closes it.
 */
export function FeedMenu({ open, active, top, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const lens = useSharedValue(indexOf(active) * ROW);
  // Mounted while open and through the closing fade.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  // Before paint, so the menu's first frame is already on its way in.
  useLayoutEffect(() => {
    if (open) {
      lens.set(indexOf(active) * ROW);
      progress.set(withTiming(1, OPEN));
    } else {
      progress.set(
        withTiming(0, CLOSE, done => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, active, lens, progress]);

  const card = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [{ scale: reduceMotion ? 1 : 0.94 + 0.06 * progress.value }],
  }));
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lens.value }] }));

  if (!mounted) return null;

  const pick = (tab: TabKey) => {
    haptic('selection');
    lens.set(withTiming(indexOf(tab) * ROW, LENS));
    setTimeout(() => onSelect(tab), PICK_DELAY);
  };

  return (
    <View style={styles.root}>
      {open ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the feed menu" />
      ) : null}
      <Animated.View style={[styles.shadow, { top }, card]}>
        <View style={styles.card} accessibilityRole="menu">
          {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid }]}
          />
          <View style={styles.rim} />
          <Animated.View style={[styles.lens, lensStyle]} />
          {TABS.map(t => (
            <Pressable
              key={t.key}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: t.key === active }}
              onPress={() => pick(t.key)}
              style={styles.row}
            >
              <Text style={[text.tab, styles.label]} maxFontSizeMultiplier={1.2}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  shadow: {
    position: 'absolute',
    left: 10,
    width: WIDTH,
    borderRadius: 24,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.18)',
    transformOrigin: 'left top',
  },
  card: { borderRadius: 24, overflow: 'hidden', padding: PAD },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    pointerEvents: 'none',
  },
  lens: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: WIDTH - PAD * 2,
    height: ROW,
    borderRadius: ROW / 2,
    backgroundColor: colors.navPill,
  },
  row: { height: ROW, justifyContent: 'center', paddingLeft: 16 },
  label: { color: colors.white },
});
