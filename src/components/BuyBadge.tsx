import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The swap badge on coin logos: a 13.5pt #121212 disc with a 1.5pt white stroke
 * (15pt overall) and a #42D578 bow-tie glyph spanning ~10 x 7.4pt, as in the Figma.
 */
export function BuyBadge({ size = 15 }: { size?: number }) {
  const c = size / 2;
  const k = size / 15;
  const r = c - 0.75 * k;
  // Two rounded triangles meeting at the centre; the stroke rounds the corners.
  const w = 4.6 * k;
  const h = 3.2 * k;
  const left = `M${c - w} ${c - h} L${c - 0.6 * k} ${c} L${c - w} ${c + h} Z`;
  const right = `M${c + w} ${c - h} L${c + 0.6 * k} ${c} L${c + w} ${c + h} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={colors.badgeDark} stroke={colors.white} strokeWidth={1.5 * k} />
      <Path d={left} fill={colors.badgeGreen} stroke={colors.badgeGreen} strokeWidth={1.4 * k} strokeLinejoin="round" />
      <Path d={right} fill={colors.badgeGreen} stroke={colors.badgeGreen} strokeWidth={1.4 * k} strokeLinejoin="round" />
    </Svg>
  );
}
