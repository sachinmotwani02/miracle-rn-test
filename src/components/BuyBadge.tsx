import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The swap badge on coin logos: a 13.5pt #121212 disc with a 1.5pt white stroke
 * (15pt overall) and a #42D578 swap glyph, as in the Figma.
 */
export function BuyBadge({ size = 15 }: { size?: number }) {
  const c = size / 2;
  const k = size / 15;
  const r = c - 0.75 * k;
  const d =
    `M${c - 4.4 * k} ${c - 1.8 * k} ` +
    `C${c - 4.4 * k} ${c - 3.8 * k} ${c - 1.4 * k} ${c - 2.8 * k} ${c} ${c} ` +
    `C${c + 1.4 * k} ${c + 2.8 * k} ${c + 4.4 * k} ${c + 3.8 * k} ${c + 4.4 * k} ${c + 1.8 * k} ` +
    `C${c + 4.4 * k} ${c - 0.3 * k} ${c + 1.4 * k} ${c - 2.1 * k} ${c} ${c} ` +
    `C${c - 1.4 * k} ${c + 2.1 * k} ${c - 4.4 * k} ${c + 0.3 * k} ${c - 4.4 * k} ${c - 1.8 * k} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={colors.badgeDark} stroke={colors.white} strokeWidth={1.5 * k} />
      <Path d={d} fill={colors.badgeGreen} />
    </Svg>
  );
}
