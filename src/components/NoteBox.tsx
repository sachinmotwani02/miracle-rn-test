import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';

const LINE = 16;
const COLLAPSED = LINE * 2;
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
  const [fullHeight, setFullHeight] = useState(COLLAPSED);
  const measureRef = useRef<Text>(null);
  const applyHeight = useCallback((height: number) => {
    setFullHeight(Math.max(COLLAPSED, Math.round(height)));
  }, []);
  useLayoutEffect(() => {
    const height = measureRef.current?.getBoundingClientRect?.().height;
    if (height) applyHeight(height);
  }, [note, applyHeight]);
  // Still listens for later changes (width, font scale); an unchanged height does not re-render.
  const onMeasure = useCallback((e: LayoutChangeEvent) => applyHeight(e.nativeEvent.layout.height), [applyHeight]);
  const target = useDerivedValue(
    () => withTiming(expanded ? fullHeight : COLLAPSED, REVEAL),
    [expanded, fullHeight],
  );
  const style = useAnimatedStyle(() => ({ height: target.value }));
  const needsToggle = fullHeight > COLLAPSED;

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.clip, style]}>
        {/* Collapsed: a real two-line clamp so the second line ends in "…" as in the Figma. */}
        <Text style={[text.note, styles.note]} numberOfLines={expanded ? undefined : 2} maxFontSizeMultiplier={1.2}>
          {note}
        </Text>
      </Animated.View>
      <Text
        ref={measureRef}
        onLayout={onMeasure}
        style={[text.note, styles.note, styles.measure]}
        maxFontSizeMultiplier={1.2}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {note}
      </Text>
      {needsToggle && (
        <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="button" style={styles.more}>
          <Text style={[text.link, styles.link]} maxFontSizeMultiplier={1.2}>
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
