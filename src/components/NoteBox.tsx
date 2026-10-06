import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';

const LINE = 16;
/** The note follows the system text size up to this much. */
const MAX_SCALE = 1.2;

/**
 * The two-line clamp's height. Line height scales with the text, so at 1.2x two lines need 38.4 pt
 * and a fixed 32 cut into the second. Rounded up: the clamp draws only two lines, so a spare
 * fraction of a point shows nothing more.
 */
export function collapsedHeight(fontScale: number): number {
  return Math.ceil(LINE * 2 * Math.min(fontScale, MAX_SCALE));
}

// A strong ease-out rather than a spring: the box glides to its new height and stops dead, no bounce.
export const REVEAL = { duration: 320, easing: Easing.bezier(0.23, 1, 0.32, 1) };

interface Props {
  note: string;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Two-line clamp that eases open to the note's full height. The full height
 * is measured from an invisible copy of the text so the animation has a real target.
 * The first measurement is synchronous (new architecture layout reads in a layout effect), so a
 * card mounts at its final height with "Read more" already in place. Waiting for onLayout instead
 * re-rendered every card a few frames after mount and grew it by 22 pt mid-entrance, shoving the
 * cards below down while they were still animating in.
 * Figma: 12pt padding, 2pt gap, 20pt "Read more" line, 8pt bottom padding, radius 20.
 */
export function NoteBox({ note, expanded, onToggle }: Props) {
  const collapsed = collapsedHeight(useWindowDimensions().fontScale);
  const [measured, setMeasured] = useState(0);
  const fullHeight = Math.max(collapsed, measured);
  const measureRef = useRef<Text>(null);
  const applyHeight = useCallback((height: number) => {
    setMeasured(Math.round(height));
  }, []);
  useLayoutEffect(() => {
    const height = measureRef.current?.getBoundingClientRect?.().height;
    if (height) applyHeight(height);
  }, [note, applyHeight]);
  // Still listens for later changes (width, font scale); an unchanged height does not re-render.
  const onMeasure = useCallback((e: LayoutChangeEvent) => applyHeight(e.nativeEvent.layout.height), [applyHeight]);
  const target = useDerivedValue(
    () => withTiming(expanded ? fullHeight : collapsed, REVEAL),
    [expanded, fullHeight, collapsed],
  );
  const style = useAnimatedStyle(() => ({ height: target.value }));
  const needsToggle = fullHeight > collapsed;

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.clip, style]}>
        {/* Collapsed: a real two-line clamp so the second line ends in "…" as in the Figma. */}
        <Text
          style={[text.note, styles.note]}
          numberOfLines={expanded ? undefined : 2}
          maxFontSizeMultiplier={MAX_SCALE}
        >
          {note}
        </Text>
      </Animated.View>
      <Text
        ref={measureRef}
        onLayout={onMeasure}
        style={[text.note, styles.note, styles.measure]}
        maxFontSizeMultiplier={MAX_SCALE}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {note}
      </Text>
      {needsToggle && (
        <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="button" style={styles.more}>
          <Text style={[text.link, styles.link]} maxFontSizeMultiplier={MAX_SCALE}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.noteBg,
    borderRadius: layout.noteRadius,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  clip: { overflow: 'hidden' },
  note: { color: colors.textPrimary },
  measure: { position: 'absolute', left: 12, right: 12, top: 12, opacity: 0 },
  more: { marginTop: 2, alignSelf: 'flex-start' },
  link: { color: colors.link },
});
