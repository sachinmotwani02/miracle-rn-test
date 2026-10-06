import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { colors } from '../theme';
import { Orbit, ribbonArc, ribbonPaths, sparkle, starPath } from '../utils/mascotMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Ribbon = Orbit & { color: string; phase: number; rate: number };

/**
 * The swirl round the ghost's rare spin: five ribbons on tilted orbits, crossing like rings round a
 * planet, each with its own speed, and four twinkles when they burst. Halo gold and sky blue come
 * from the palette; the pink, violet and mint are only used here.
 */
const RIBBONS: Ribbon[] = [
  { color: colors.halo, rx: 21, ry: 5, tilt: -24, phase: 0, rate: 1 },
  { color: '#FF5FA2', rx: 22, ry: 6, tilt: 18, phase: 72, rate: 1.15 },
  { color: '#9B6BFF', rx: 19.5, ry: 6.5, tilt: 52, phase: 144, rate: 0.9 },
  { color: colors.skyBlue, rx: 23, ry: 4.5, tilt: -6, phase: 216, rate: 1.25 },
  { color: '#3DDC97', rx: 19, ry: 6.5, tilt: -55, phase: 288, rate: 1.05 },
];
const SPARKLE_COLORS = [colors.halo, '#FF5FA2', colors.skyBlue, '#3DDC97'];

/** Canvas round the cloud's centre, big enough for the burst (orbits grown to 1.45x). */
const SWIRL_W = 80;
const SWIRL_H = 60;

export interface Swirl {
  /** The swirl's clock, degrees; ribbons ride it at their own rates. */
  angle: SharedValue<number>;
  /** Degrees per second; faster also means longer ribbons. */
  speed: SharedValue<number>;
  /** 0..1. */
  alpha: SharedValue<number>;
  /** Orbit size multiplier, for the burst at the end. */
  spread: SharedValue<number>;
  /** Milliseconds since the rings burst; drives the sparkles. */
  sparkleMs: SharedValue<number>;
  /** Turns the sparkle pattern so each burst lands differently, degrees. */
  sparkleSeed: SharedValue<number>;
  /** Starts or stops the clock; it only runs while the swirl is showing. */
  run: (on: boolean) => void;
}

export function useSwirl(): Swirl {
  const angle = useSharedValue(0);
  const speed = useSharedValue(0);
  const alpha = useSharedValue(0);
  const spread = useSharedValue(1);
  const sparkleMs = useSharedValue(0);
  const sparkleSeed = useSharedValue(0);
  const clock = useFrameCallback(({ timeSincePreviousFrame }) => {
    angle.set(angle.value + (speed.value * Math.min(timeSincePreviousFrame ?? 16, 64)) / 1000);
  }, false);
  return useMemo(
    () => ({ angle, speed, alpha, spread, sparkleMs, sparkleSeed, run: (on: boolean) => clock.setActive(on) }),
    [angle, speed, alpha, spread, sparkleMs, sparkleSeed, clock],
  );
}

/**
 * One depth half of the swirl. The ghost draws the back half behind its cloud and the front half
 * over it, so the ribbons pass round it in 3D; the sparkles sit in the front half. `cx`/`cy` is
 * the cloud's centre in the ghost's box.
 */
export function SwirlLayer({ swirl, side, cx, cy }: { swirl: Swirl; side: 'front' | 'back'; cx: number; cy: number }) {
  return (
    <View style={[styles.layer, { left: cx - SWIRL_W / 2, top: cy - SWIRL_H / 2 }]}>
      <Svg width={SWIRL_W} height={SWIRL_H}>
        {RIBBONS.map((ribbon, i) => (
          <RibbonPath key={i} ribbon={ribbon} side={side} swirl={swirl} />
        ))}
        {side === 'front' && SPARKLE_COLORS.map((color, i) => <Sparkle key={i} index={i} color={color} swirl={swirl} />)}
      </Svg>
    </View>
  );
}

function RibbonPath({ ribbon, side, swirl }: { ribbon: Ribbon; side: 'front' | 'back'; swirl: Swirl }) {
  const { angle, speed, alpha, spread } = swirl;
  const animatedProps = useAnimatedProps(() => {
    if (alpha.value < 0.01) return { d: 'M0 0', fillOpacity: 0 };
    const head = angle.value * ribbon.rate + ribbon.phase;
    const paths = ribbonPaths(head, ribbonArc(speed.value), ribbon, spread.value, SWIRL_W / 2, SWIRL_H / 2);
    return { d: side === 'front' ? paths.front : paths.back, fillOpacity: alpha.value };
  });
  return <AnimatedPath animatedProps={animatedProps} fill={ribbon.color} />;
}

function Sparkle({ index, color, swirl }: { index: number; color: string; swirl: Swirl }) {
  const { sparkleMs, sparkleSeed } = swirl;
  const animatedProps = useAnimatedProps(() => {
    const s = sparkle(index, sparkleMs.value, sparkleSeed.value, SWIRL_W / 2, SWIRL_H / 2);
    return { d: starPath(s.x, s.y, s.scale, s.rotate), fillOpacity: s.opacity };
  });
  return <AnimatedPath animatedProps={animatedProps} fill={color} />;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', width: SWIRL_W, height: SWIRL_H, pointerEvents: 'none' },
});
