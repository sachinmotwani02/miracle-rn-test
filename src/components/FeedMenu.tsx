import React, { useLayoutEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
/** The menu's left edge on screen, pt. */
const LEFT = 10;
/** A drag keeps its row this far outside the card's sides, so a wobbly thumb does not drop it, pt. */
const SIDE_SLOP = 24;

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
 * the current feed. It grows from its top-left corner; tapping outside closes it. A finger can also
 * drag over the rows: the lens follows it row by row with a selection tick, and lifting on a row
 * picks it. Lifting off the rows puts the lens back on the current feed and leaves the menu open.
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
  /** The row under the finger during a press or drag, or null off the rows. */
  const hovered = useRef<number | null>(null);

  if (!mounted) return null;

  const pick = (tab: TabKey) => {
    haptic('selection');
    lens.set(withTiming(indexOf(tab) * ROW, LENS));
    setTimeout(() => onSelect(tab), PICK_DELAY);
  };

  // Rows are found from page coordinates: `top` is the card's screen y and the rows start PAD below.
  const rowAt = ({ nativeEvent: { pageX, pageY } }: GestureResponderEvent) => {
    if (pageX < LEFT - SIDE_SLOP || pageX > LEFT + WIDTH + SIDE_SLOP) return null;
    const row = Math.floor((pageY - top - PAD) / ROW);
    return row >= 0 && row < TABS.length ? row : null;
  };
  const track = (e: GestureResponderEvent, first: boolean) => {
    const row = rowAt(e);
    if (row === hovered.current) return;
    hovered.current = row;
    lens.set(withTiming((row ?? indexOf(active)) * ROW, LENS));
    // The press itself is quiet; each new row under a dragging finger ticks.
    if (row !== null && !first) haptic('selection');
  };
  const release = (e: GestureResponderEvent) => {
    const row = rowAt(e);
    hovered.current = null;
    if (row !== null) pick(TABS[row].key);
    else lens.set(withTiming(indexOf(active) * ROW, LENS));
  };
  const cancel = () => {
    hovered.current = null;
    lens.set(withTiming(indexOf(active) * ROW, LENS));
  };

  return (
    <View style={styles.root}>
      {open ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the feed menu" />
      ) : null}
      <Animated.View style={[styles.shadow, { top }, card]}>
        <View
          style={styles.card}
          accessibilityRole="menu"
          // The card takes every touch on it (before the rows can), so one press can travel across rows.
          onStartShouldSetResponderCapture={() => open}
          onMoveShouldSetResponderCapture={() => open}
          onResponderTerminationRequest={() => false}
          onResponderGrant={e => track(e, true)}
          onResponderMove={e => track(e, false)}
          onResponderRelease={release}
          onResponderTerminate={cancel}
        >
          {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid }]}
          />
          <View style={styles.rim} />
          <Animated.View style={[styles.lens, lensStyle]} />
          {/* Touches go to the card above; the rows keep their roles and actions for screen readers. */}
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
    left: LEFT,
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
