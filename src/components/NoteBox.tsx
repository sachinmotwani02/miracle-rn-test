import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { colors, layout, text } from '../theme';

const LINE = 16;
const COLLAPSED = LINE * 2;

interface Props {
  note: string;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Two-line clamp that springs open to the note's full height. The full height
 * is measured from an invisible copy of the text so the spring has a real target.
 * Figma: 12pt padding, 2pt gap, 20pt "Read more" line, 8pt bottom padding, radius 20.
 */
export function NoteBox({ note, expanded, onToggle }: Props) {
  const [fullHeight, setFullHeight] = useState(COLLAPSED);
  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    setFullHeight(Math.max(COLLAPSED, Math.round(e.nativeEvent.layout.height)));
  }, []);
  const target = useDerivedValue(
    () => withSpring(expanded ? fullHeight : COLLAPSED, { damping: 18, stiffness: 220 }),
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
