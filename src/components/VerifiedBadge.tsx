import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/** Ten-point scalloped seal. Drawn procedurally so it stays crisp at any size. */
function sealPath(cx: number, cy: number, outer: number, inner: number, points = 10): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)} `;
  }
  return `${d}Z`;
}

export function VerifiedBadge({ size = 15 }: { size?: number }) {
  const c = size / 2;
  const k = size / 15;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c} fill={colors.white} />
      <Path
        d={sealPath(c, c, c - 1.3 * k, c - 2.8 * k)}
        fill={colors.badgeBlue}
        stroke={colors.badgeBlue}
        strokeWidth={1.3 * k}
        strokeLinejoin="round"
      />
      <Path
        d={`M${c - 2.7 * k} ${c + 0.2 * k} L${c - 0.8 * k} ${c + 2.1 * k} L${c + 2.9 * k} ${c - 1.9 * k}`}
        stroke={colors.white}
        strokeWidth={1.7 * k}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
