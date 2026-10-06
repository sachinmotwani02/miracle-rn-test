import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/** The feed dropdown's chevron: 14 pt with 2 pt rounded strokes, like the nav icons. */
export function Chevron({ color = colors.white }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M3 5.5l4 4 4-4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
