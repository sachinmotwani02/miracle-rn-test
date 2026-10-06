import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BlurView } from 'expo-blur';
import { TABS, TabKey } from '../data/types';
import { colors, text } from '../theme';
import { haptic } from '../utils/haptics';

const ROW = 40;
const PAD = 8;
const WIDTH = 180;
/** Quick and critically damped (ratio 1), like the nav pill: it lands without overshoot. */
const SETTLE = { mass: 1, stiffness: 400, damping: 40 } as const;
/** The lens reaches the pick before the menu closes and the feed switches, ms. */
const PICK_DELAY = 140;

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

  useEffect(() => {
    if (open) {
      lens.set(indexOf(active) * ROW);
      progress.set(withSpring(1, SETTLE));
    } else {
      progress.set(
        withTiming(0, { duration: 140 }, done => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, active, lens, progress]);

  const card = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [{ scale: reduceMotion ? 1 : 0.92 + 0.08 * progress.value }],
  }));
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lens.value }] }));

  if (!mounted) return null;

  const pick = (tab: TabKey) => {
    haptic('selection');
    lens.set(withSpring(indexOf(tab) * ROW, SETTLE));
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
