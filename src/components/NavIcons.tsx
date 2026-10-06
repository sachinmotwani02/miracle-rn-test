import React from 'react';
import { Platform } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';
import { colors } from '../theme';

const common = {
  stroke: colors.navIcon,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

const AnimatedG = Animated.createAnimatedComponent(G);
const WEB = Platform.OS === 'web';
type Matrix = [number, number, number, number, number, number];

interface IconProps {
  size?: number;
  /** The press squeeze, 1 at rest. */
  scale: SharedValue<number>;
}

/**
 * Scales the glyph about the centre of its 24-unit box from inside the SVG. A view transform on
 * the icon would make iOS resample the already drawn bitmap, and the strokes go jaggy for as long
 * as the squeeze runs; scaling here redraws the vectors every frame. Native takes the raw
 * `matrix` prop, react-native-svg's web shapes a `transform`.
 */
function Squeeze({ scale, children }: { scale: SharedValue<number>; children: React.ReactNode }) {
  const animatedProps = useAnimatedProps<{ matrix?: Matrix; transform?: Matrix }>(() => {
    const s = scale.value;
    const matrix: Matrix = [s, 0, 0, s, 12 * (1 - s), 12 * (1 - s)];
    return WEB ? { transform: matrix } : { matrix };
  });
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

// Figma glyph boxes: home 15x16, compass 16.5, bars 15x13, person 13x15.5, all 2pt strokes.
export function HomeIcon({ size = 24, scale }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Squeeze scale={scale}>
        <Path d="M4.5 10.2 12 4l7.5 6.2V18.5a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5z" {...common} />
        <Path d="M8.6 14.6c.9 1.2 2 1.8 3.4 1.8s2.5-.6 3.4-1.8" {...common} />
      </Squeeze>
    </Svg>
  );
}

export function CompassIcon({ size = 24, scale }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Squeeze scale={scale}>
        <Circle cx="12" cy="12" r="9" {...common} />
        <Polygon
          points="15.2,8.8 13.6,13.6 8.8,15.2 10.4,10.4"
          fill={colors.navIcon}
          stroke={colors.navIcon}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </Squeeze>
    </Svg>
  );
}

export function BarsIcon({ size = 24, scale }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Squeeze scale={scale}>
        <Path d="M5 9v7M9.3 5v11M13.7 10v6M18 13v3" {...common} strokeWidth={2.2} />
      </Squeeze>
    </Svg>
  );
}

export function PersonIcon({ size = 24, scale }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Squeeze scale={scale}>
        <Circle cx="12" cy="8" r="3.6" {...common} />
        <Path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" {...common} />
      </Squeeze>
    </Svg>
  );
}
