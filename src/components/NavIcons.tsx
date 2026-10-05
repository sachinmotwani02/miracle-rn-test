import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { colors } from '../theme';

const common = {
  stroke: colors.navIcon,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

export function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 10.5 12 3.5l8 7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...common} />
      <Path d="M8.8 13.5c.9 1.3 2 1.9 3.2 1.9s2.3-.6 3.2-1.9" {...common} />
    </Svg>
  );
}

export function CompassIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" {...common} />
      <Polygon
        points="15.2,8.8 13.6,13.6 8.8,15.2 10.4,10.4"
        fill={colors.navIcon}
        stroke={colors.navIcon}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BarsIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 9v7M9.3 5v11M13.7 10v6M18 13v3" {...common} strokeWidth={2.2} />
    </Svg>
  );
}

export function PersonIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="3.6" {...common} />
      <Path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" {...common} />
    </Svg>
  );
}
