import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { AssetSymbol } from '../data/types';
import { BuyBadge } from './BuyBadge';

function Sol({ size }: { size: number }) {
  // Figma: the three bars span x 7.9-28.1 and y 10.1-25.9 of the 36pt disc.
  const s = size / 36;
  const bar = (y: number, flip: boolean) => {
    const x0 = 7.9 * s;
    const x1 = 28.1 * s;
    const h = 4.0 * s;
    const skew = 3.6 * s;
    return flip
      ? `M${x0 + skew} ${y} H${x1} L${x1 - skew} ${y + h} H${x0} Z`
      : `M${x0} ${y} H${x1 - skew} L${x1} ${y + h} H${x0 + skew} Z`;
  };
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="solGradient" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#9945FF" />
          <Stop offset="1" stopColor="#14F195" />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#1C1C1C" />
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      <Path d={bar(10.1 * s, true)} fill="url(#solGradient)" />
      <Path d={bar(16 * s, false)} fill="url(#solGradient)" />
      <Path d={bar(21.9 * s, true)} fill="url(#solGradient)" />
    </Svg>
  );
}

function Eth({ size }: { size: number }) {
  // Figma: diamond 17 x 27 inside the 36 disc (x 10.1 to 27, y 4.5 to 31.5).
  const s = size / 36;
  const cx = 18.5 * s;
  const hw = 8.4 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#627EEA" />
      <Polygon points={`${cx},${4.5 * s} ${cx + hw},${18.3 * s} ${cx},${23.2 * s}`} fill="#FFFFFF" fillOpacity={0.6} />
      <Polygon points={`${cx},${4.5 * s} ${cx - hw},${18.3 * s} ${cx},${23.2 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${24.7 * s} ${cx + hw},${19.8 * s} ${cx},${31.5 * s}`} fill="#FFFFFF" fillOpacity={0.6} />
      <Polygon points={`${cx},${24.7 * s} ${cx - hw},${19.8 * s} ${cx},${31.5 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${14.5 * s} ${cx + hw},${18.3 * s} ${cx},${23.2 * s}`} fill="#FFFFFF" fillOpacity={0.2} />
      <Polygon points={`${cx},${14.5 * s} ${cx - hw},${18.3 * s} ${cx},${23.2 * s}`} fill="#FFFFFF" fillOpacity={0.6} />
    </Svg>
  );
}

function Btc({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#F7931A" />
      <SvgText x={size / 2} y={size * 0.7} fontSize={size * 0.56} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        ₿
      </SvgText>
    </Svg>
  );
}

interface Props {
  asset: AssetSymbol;
  size?: number;
  badge?: boolean;
  badgeSize?: number;
}

export function CoinLogo({ asset, size = 36, badge = true, badgeSize = 15 }: Props) {
  const Logo = asset === 'SOL' ? Sol : asset === 'ETH' ? Eth : Btc;
  return (
    <View style={{ width: size, height: size }}>
      <Logo size={size} />
      {badge && (
        // Figma: the 15pt badge's bottom-right corner sits 1.5pt outside the logo.
        <View style={[styles.badge, { right: -1.5, bottom: -1.2 }]}>
          <BuyBadge size={badgeSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ badge: { position: 'absolute' } });
