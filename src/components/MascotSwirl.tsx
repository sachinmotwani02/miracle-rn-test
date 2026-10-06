import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { colors } from '../theme';
import { silkBand, sparkle, starPath } from '../utils/mascotMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The swirl the ghost charges up when held: one silk ribbon in five colour bands wound round it,
 * and four twinkles when it lets go. Halo gold and sky blue come from the palette; the pink,
 * violet and mint are only used here.
 */
const BAND_COLORS = [colors.halo, '#FF5FA2', '#9B6BFF', colors.skyBlue, '#3DDC97'];
const SPARKLE_COLORS = [colors.halo, '#FF5FA2', colors.skyBlue, '#3DDC97'];

/** Canvas round the cloud's centre, tall enough for the ribbon floating up as it unravels. */
const SWIRL_W = 80;
const SWIRL_H = 80;

export interface Swirl {
  /** The swirl's clock, degrees: where the ribbon's head is. */
  angle: SharedValue<number>;
  /** Degrees per second; faster also wraps the ribbon further round. */
  speed: SharedValue<number>;
  /** 0..1. */
  alpha: SharedValue<number>;
  /** 0..1: the ribbon letting go, stretching upward and fading out. */
  unravel: SharedValue<number>;
  /** Milliseconds since the ribbon let go; drives the sparkles. */
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
  const unravel = useSharedValue(0);
  const sparkleMs = useSharedValue(0);
  const sparkleSeed = useSharedValue(0);
  const clock = useFrameCallback(({ timeSincePreviousFrame }) => {
    angle.value += (speed.value * Math.min(timeSincePreviousFrame ?? 16, 64)) / 1000;
  }, false);
  return useMemo(
    () => ({ angle, speed, alpha, unravel, sparkleMs, sparkleSeed, run: (on: boolean) => clock.setActive(on) }),
    [angle, speed, alpha, unravel, sparkleMs, sparkleSeed, clock],
  );
}

/**
 * One depth half of the swirl. The ghost draws the back half behind its cloud and the front half
 * over it, so the ribbon winds round it in 3D; the sparkles sit in the front half. `cx`/`cy` is
 * the cloud's centre in the ghost's box.
 */
export function SwirlLayer({ swirl, side, cx, cy }: { swirl: Swirl; side: 'front' | 'back'; cx: number; cy: number }) {
  return (
    <View style={[styles.layer, { left: cx - SWIRL_W / 2, top: cy - SWIRL_H / 2 }]}>
      <Svg width={SWIRL_W} height={SWIRL_H}>
        {BAND_COLORS.map((color, band) => (
          <SilkBand key={band} band={band} color={color} side={side} swirl={swirl} />
        ))}
        {side === 'front' && SPARKLE_COLORS.map((color, i) => <Sparkle key={i} index={i} color={color} swirl={swirl} />)}
      </Svg>
    </View>
  );
}

function SilkBand({ band, color, side, swirl }: { band: number; color: string; side: 'front' | 'back'; swirl: Swirl }) {
  const { angle, speed, alpha, unravel } = swirl;
  const animatedProps = useAnimatedProps(() => {
    // Letting go: the ribbon fades as it floats up (fade on the square, lift on an ease-out).
    const fade = alpha.value * (1 - unravel.value * unravel.value);
    if (fade < 0.01) return { d: 'M0 0', fillOpacity: 0 };
    const lift = 1 - (1 - unravel.value) * (1 - unravel.value);
    const paths = silkBand(band, angle.value, speed.value, lift, SWIRL_W / 2, SWIRL_H / 2);
    return { d: side === 'front' ? paths.front : paths.back, fillOpacity: fade };
  });
  return <AnimatedPath animatedProps={animatedProps} fill={color} />;
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
