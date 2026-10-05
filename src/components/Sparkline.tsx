import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, layout } from '../theme';
import { buildSparkline } from '../utils/sparkline';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Ids whose draw-in already played. Recycled list rows must not replay it. */
const seen = new Set<string>();

// Figma: 2.2pt stroke, 12pt "+" markers floating 10pt above a 6pt dot (2pt white
// ring) on the line, and a 9pt dot on the last point.
// Figma strokes at 2.2; the device renders that a touch thinner than the design, so 2.6.
const STROKE = 2.6;
const MARKER_R = 6;
const MARKER_LIFT = 10;
const DOT_R = 3;
const END_R = 4.5;

interface Props {
  id: string;
  values: number[];
  entryIndices: number[];
  width?: number;
  height?: number;
}

function Marker({ x, y, progress, at }: { x: number; y: number; progress: SharedValue<number>; at: number }) {
  const style = useAnimatedStyle(() => {
    // Pops over the 8% of the draw-in after the line reaches it (continuous, frame-safe).
    const t = Math.min(Math.max((progress.value - at) / 0.08, 0), 1);
    const overshoot = 1 + 0.3 * Math.sin(t * Math.PI);
    return { opacity: t, transform: [{ scale: 0.3 + 0.7 * t * overshoot }] };
  });
  return (
    <Animated.View style={[styles.marker, { left: x - MARKER_R, top: y - MARKER_LIFT - MARKER_R }, style]}>
      <Svg width={MARKER_R * 2} height={MARKER_R * 2}>
        <Circle cx={MARKER_R} cy={MARKER_R} r={MARKER_R} fill={colors.sparkline} />
        <Path
          d={`M${MARKER_R - 2.6} ${MARKER_R} H${MARKER_R + 2.6} M${MARKER_R} ${MARKER_R - 2.6} V${MARKER_R + 2.6}`}
          stroke={colors.white}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

export const Sparkline = React.memo(function Sparkline({
  id,
  values,
  entryIndices,
  width = layout.sparklineWidth,
  height = layout.sparklineHeight,
}: Props) {
  // Keep the line in the lower 27pt so the lifted markers fit above it.
  const geo = useMemo(
    () => buildSparkline(values, { width, height: height - 4, padding: 5 }),
    [values, width, height],
  );
  const first = useRef(!seen.has(id)).current;
  const progress = useSharedValue(first ? 0 : 1);

  useEffect(() => {
    if (first) {
      seen.add(id);
      progress.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [first, id, progress]);

  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: geo.length * (1 - progress.value) }));
  // Continuous ramp over the last 12% of the draw-in rather than a one-frame threshold,
  // so the dot cannot be lost if a frame is skipped while the card is still entering.
  const endStyle = useAnimatedStyle(() => {
    const t = Math.min(Math.max((progress.value - 0.88) / 0.12, 0), 1);
    const overshoot = 1 + 0.25 * Math.sin(t * Math.PI);
    return { opacity: t, transform: [{ scale: 0.3 + 0.7 * t * overshoot }] };
  });
  const last = geo.points[geo.points.length - 1];
  const markers = entryIndices.filter(i => geo.points[i] !== undefined);
  const offsetY = 4;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: offsetY }}>
        <AnimatedPath
          d={geo.path}
          stroke={colors.sparkline}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${geo.length} ${geo.length}`}
          animatedProps={pathProps}
        />
        {markers.map(i => (
          <Circle key={i} cx={geo.points[i].x} cy={geo.points[i].y} r={DOT_R} fill={colors.sparkline} stroke={colors.white} strokeWidth={2} />
        ))}
      </Svg>
      {markers.map(i => (
        <Marker
          key={i}
          x={geo.points[i].x}
          y={geo.points[i].y + offsetY}
          progress={progress}
          at={(i / (geo.points.length - 1)) * 0.9}
        />
      ))}
      {last && (
        <Animated.View style={[styles.end, { left: last.x - END_R, top: last.y + offsetY - END_R }, endStyle]} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: MARKER_R * 2, height: MARKER_R * 2, pointerEvents: 'none' },
  end: {
    position: 'absolute',
    width: END_R * 2,
    height: END_R * 2,
    borderRadius: END_R,
    backgroundColor: colors.sparkline,
    pointerEvents: 'none',
  },
});
