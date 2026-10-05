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

const STROKE = 3;
const MARKER_R = 6.5;
const DOT_R = 2.5;
const END_R = 5;

interface Props {
  id: string;
  values: number[];
  entryIndices: number[];
  width?: number;
  height?: number;
}

function Marker({ x, y, progress, at }: { x: number; y: number; progress: SharedValue<number>; at: number }) {
  const style = useAnimatedStyle(() => {
    const reached = progress.value >= at;
    return {
      opacity: reached ? 1 : 0,
      transform: [{ scale: withSpring(reached ? 1 : 0.3, { damping: 10, stiffness: 260 }) }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.marker, { left: x - MARKER_R, top: y - 2 * MARKER_R - 3 }, style]}>
      <Svg width={MARKER_R * 2} height={MARKER_R * 2}>
        <Circle cx={MARKER_R} cy={MARKER_R} r={MARKER_R} fill={colors.sparkline} />
        <Path
          d={`M${MARKER_R - 3} ${MARKER_R} H${MARKER_R + 3} M${MARKER_R} ${MARKER_R - 3} V${MARKER_R + 3}`}
          stroke={colors.white}
          strokeWidth={1.8}
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
  const geo = useMemo(() => buildSparkline(values, { width, height, padding: 6 }), [values, width, height]);
  const first = useRef(!seen.has(id)).current;
  const progress = useSharedValue(first ? 0 : 1);

  useEffect(() => {
    if (first) {
      seen.add(id);
      progress.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [first, id, progress]);

  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: geo.length * (1 - progress.value) }));
  const endStyle = useAnimatedStyle(() => {
    const done = progress.value > 0.98;
    return { opacity: done ? 1 : 0, transform: [{ scale: withSpring(done ? 1 : 0.2, { damping: 10, stiffness: 240 }) }] };
  });
  const last = geo.points[geo.points.length - 1];
  const markers = entryIndices.filter(i => geo.points[i] !== undefined);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
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
          <Circle key={i} cx={geo.points[i].x} cy={geo.points[i].y} r={DOT_R} fill={colors.sparkline} />
        ))}
      </Svg>
      {markers.map(i => (
        <Marker key={i} x={geo.points[i].x} y={geo.points[i].y} progress={progress} at={(i / (geo.points.length - 1)) * 0.9} />
      ))}
      {last && <Animated.View pointerEvents="none" style={[styles.end, { left: last.x - END_R, top: last.y - END_R }, endStyle]} />}
    </View>
  );
});

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: MARKER_R * 2, height: MARKER_R * 2 },
  end: { position: 'absolute', width: END_R * 2, height: END_R * 2, borderRadius: END_R, backgroundColor: colors.sparkline },
});
