import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { AssetSymbol } from '../data/types';
import { BuyBadge } from './BuyBadge';

function Sol({ size }: { size: number }) {
  const s = size / 36;
  const bar = (y: number, flip: boolean) => {
    const x0 = 9 * s;
    const x1 = 27 * s;
    const h = 3.6 * s;
    const skew = 3.2 * s;
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
      <Path d={bar(11 * s, true)} fill="url(#solGradient)" />
      <Path d={bar(16.2 * s, false)} fill="url(#solGradient)" />
      <Path d={bar(21.4 * s, true)} fill="url(#solGradient)" />
    </Svg>
  );
}

function Eth({ size }: { size: number }) {
  const s = size / 36;
  const cx = 18 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#627EEA" />
      <Polygon points={`${cx},${7 * s} ${cx + 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#C0CBF7" />
      <Polygon points={`${cx},${7 * s} ${cx - 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${24.4 * s} ${cx + 7 * s},${20 * s} ${cx},${29.5 * s}`} fill="#C0CBF7" />
      <Polygon points={`${cx},${24.4 * s} ${cx - 7 * s},${20 * s} ${cx},${29.5 * s}`} fill="#FFFFFF" />
      <Polygon points={`${cx},${14.5 * s} ${cx + 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#9CAEF2" />
      <Polygon points={`${cx},${14.5 * s} ${cx - 7 * s},${18.5 * s} ${cx},${22.8 * s}`} fill="#C0CBF7" />
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
