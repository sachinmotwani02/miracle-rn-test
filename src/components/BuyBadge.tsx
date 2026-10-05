import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/** Dark disc with a white ring and the green "swap" glyph that sits on coin logos. */
export function BuyBadge({ size = 21 }: { size?: number }) {
  const c = size / 2;
  const r = c - 1.5;
  const k = size / 21;
  const d =
    `M${c - 5.2 * k} ${c - 2.2 * k} ` +
    `C${c - 5.2 * k} ${c - 4.8 * k} ${c - 1.6 * k} ${c - 3.4 * k} ${c} ${c} ` +
    `C${c + 1.6 * k} ${c + 3.4 * k} ${c + 5.2 * k} ${c + 4.8 * k} ${c + 5.2 * k} ${c + 2.2 * k} ` +
    `C${c + 5.2 * k} ${c - 0.4 * k} ${c + 1.6 * k} ${c - 2.6 * k} ${c} ${c} ` +
    `C${c - 1.6 * k} ${c + 2.6 * k} ${c - 5.2 * k} ${c + 0.4 * k} ${c - 5.2 * k} ${c - 2.2 * k} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c} fill={colors.white} />
      <Circle cx={c} cy={c} r={r} fill={colors.badgeDark} />
      <Path d={d} fill="#3DDC84" />
    </Svg>
  );
}
