import React, { useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COMETS, RareStyle, SILK, comet, cometPoint, cometTail, confetti, getRareStyle, silkBand, subscribeRareStyle } from '../dev/rareStyles';
import { colors } from '../theme';
import { Orbit, ribbonArc, ribbonPaths, sparkle, starPath } from '../utils/mascotMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
/** The rejected looks (src/dev/rareStyles) use the same five colours. */
const BAND_COLORS = RIBBONS.map(ribbon => ribbon.color);

/** Canvas round the cloud's centre, big enough for the burst (orbits grown to 1.45x). */
const SWIRL_W = 80;
const SWIRL_H = 60;
/** The rejected looks need more room: the silk floats up as it unravels, the confetti flies out. */
const WIDE_W = 170;
const WIDE_H = 150;

/** The burst: the rings grow to this size while fading out over BURST_MS, like a small firework. */
const BURST_SPREAD = 1.45;
const BURST_MS = 420;

export interface Swirl {
  /** The swirl's clock, degrees; ribbons ride it at their own rates. */
  angle: SharedValue<number>;
  /** Degrees per second; faster also means longer ribbons. */
  speed: SharedValue<number>;
  /** 0..1. */
  alpha: SharedValue<number>;
  /** Orbit size multiplier, for the burst at the end. */
  spread: SharedValue<number>;
  /** Silk look only: 0..1, the ribbon letting go, stretching upward and fading out. */
  unravel: SharedValue<number>;
  /** Comets look only: the swirl's angle when they burst into confetti; NaN while they circle. */
  burstAt: SharedValue<number>;
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
  const unravel = useSharedValue(0);
  const burstAt = useSharedValue(NaN);
  const sparkleMs = useSharedValue(0);
  const sparkleSeed = useSharedValue(0);
  const clock = useFrameCallback(({ timeSincePreviousFrame }) => {
    angle.set(angle.value + (speed.value * Math.min(timeSincePreviousFrame ?? 16, 64)) / 1000);
  }, false);
  return useMemo(
    () => ({ angle, speed, alpha, spread, unravel, burstAt, sparkleMs, sparkleSeed, run: (on: boolean) => clock.setActive(on) }),
    [angle, speed, alpha, spread, unravel, burstAt, sparkleMs, sparkleSeed, clock],
  );
}

/** Back to its resting shape, before a rare spin and once one is over. */
export function resetSwirl(swirl: Swirl) {
  swirl.spread.set(1);
  swirl.unravel.set(0);
  swirl.burstAt.set(NaN);
}

/**
 * The landing, queued `delay` ms ahead on the UI thread: the rings burst outward and fade like a
 * small firework, and the sparkles' clock starts. (In the showcase's rejected looks the silk
 * unravels upward, the comets pop into confetti.) An animation already running on a value, like
 * the rings' fade-in, carries on until then.
 */
export function burstSwirl(swirl: Swirl, sparkleMs: number, delay: number) {
  const style = getRareStyle();
  const { angle, burstAt } = swirl;
  if (style === 'silk') swirl.unravel.set(withDelay(delay, withTiming(1, { duration: SILK.unravelMs })));
  else if (style === 'orbit') {
    swirl.spread.set(withDelay(delay, withTiming(BURST_SPREAD, { duration: BURST_MS, easing: Easing.out(Easing.quad) })));
    swirl.alpha.set(withDelay(delay, withTiming(0, { duration: BURST_MS, easing: Easing.in(Easing.quad) })));
  }
  swirl.sparkleSeed.set(withDelay(delay, withTiming(Math.random() * 360, { duration: 0 })));
  swirl.sparkleMs.set(
    withDelay(
      delay,
      withSequence(
        withTiming(0, { duration: 0 }, finished => {
          'worklet';
          // At the burst, on the UI thread: the comets pop from wherever they have got to.
          if (finished && style === 'comets') burstAt.set(angle.value);
        }),
        withTiming(sparkleMs, { duration: sparkleMs, easing: Easing.linear }),
      ),
    ),
  );
}

/**
 * One depth half of the swirl. The ghost draws the back half behind its cloud and the front half
 * over it, so the ribbons pass round it in 3D; the sparkles sit in the front half. `cx`/`cy` is
 * the cloud's centre in the ghost's box.
 */
export function SwirlLayer({ swirl, side, cx, cy }: { swirl: Swirl; side: 'front' | 'back'; cx: number; cy: number }) {
  const style = useSyncExternalStore(subscribeRareStyle, getRareStyle);
  if (style !== 'orbit') return <RejectedLayer style={style} swirl={swirl} side={side} cx={cx} cy={cy} />;
  return (
    <View style={[styles.layer, { left: cx - SWIRL_W / 2, top: cy - SWIRL_H / 2 }]}>
      <Svg width={SWIRL_W} height={SWIRL_H}>
        {RIBBONS.map((ribbon, i) => (
          <RibbonPath key={i} ribbon={ribbon} side={side} swirl={swirl} />
        ))}
        {side === 'front' && SPARKLE_COLORS.map((color, i) => <Sparkle key={i} index={i} color={color} swirl={swirl} w={SWIRL_W} h={SWIRL_H} />)}
      </Svg>
    </View>
  );
}

interface RejectedProps {
  style: Exclude<RareStyle, 'orbit'>;
  swirl: Swirl;
  side: 'front' | 'back';
  cx: number;
  cy: number;
}

/** The rejected looks, for the craft showcase (see src/dev/rareStyles). */
function RejectedLayer({ style, swirl, side, cx, cy }: RejectedProps) {
  return (
    <View style={[styles.layer, { left: cx - WIDE_W / 2, top: cy - WIDE_H / 2, width: WIDE_W, height: WIDE_H }]}>
      <Svg width={WIDE_W} height={WIDE_H}>
        {style === 'silk'
          ? BAND_COLORS.map((color, band) => <SilkBand key={band} band={band} color={color} side={side} swirl={swirl} />)
          : Array.from({ length: COMETS.count }, (_, i) => (
              <Comet key={i} index={i} color={BAND_COLORS[i % BAND_COLORS.length]} side={side} swirl={swirl} />
            ))}
        {side === 'front' && style === 'silk'
          ? SPARKLE_COLORS.map((color, i) => <Sparkle key={i} index={i} color={color} swirl={swirl} w={WIDE_W} h={WIDE_H} />)
          : null}
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
    const paths = silkBand(band, angle.value, speed.value, lift, WIDE_W / 2, WIDE_H / 2);
    return { d: side === 'front' ? paths.front : paths.back, fillOpacity: fade };
  });
  return <AnimatedPath animatedProps={animatedProps} fill={color} />;
}

function Comet({ index, color, side, swirl }: { index: number; color: string; side: 'front' | 'back'; swirl: Swirl }) {
  const { angle, speed, alpha, burstAt, sparkleMs } = swirl;
  const front = side === 'front';
  const tailProps = useAnimatedProps(() => {
    if (alpha.value < 0.01 || !Number.isNaN(burstAt.value)) return { d: 'M0 0', fillOpacity: 0 };
    const o = comet(index);
    const paths = cometTail(index, angle.value * o.rate + o.phase, speed.value, WIDE_W / 2, WIDE_H / 2);
    return { d: front ? paths.front : paths.back, fillOpacity: alpha.value };
  });
  const dotProps = useAnimatedProps(() => {
    const o = comet(index);
    if (Number.isNaN(burstAt.value)) {
      const p = cometPoint(index, angle.value * o.rate + o.phase, WIDE_W / 2, WIDE_H / 2);
      return { cx: p.x, cy: p.y, r: COMETS.dot, opacity: p.front === front ? alpha.value : 0 };
    }
    // The confetti flies in front of everything.
    const c = confetti(index, burstAt.value * o.rate + o.phase, sparkleMs.value, WIDE_W / 2, WIDE_H / 2);
    return { cx: c.x, cy: c.y, r: c.r, opacity: front ? c.opacity * alpha.value : 0 };
  });
  return (
    <>
      <AnimatedPath animatedProps={tailProps} fill={color} />
      <AnimatedCircle animatedProps={dotProps} fill={color} />
    </>
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

function Sparkle({ index, color, swirl, w, h }: { index: number; color: string; swirl: Swirl; w: number; h: number }) {
  const { sparkleMs, sparkleSeed } = swirl;
  const animatedProps = useAnimatedProps(() => {
    const s = sparkle(index, sparkleMs.value, sparkleSeed.value, w / 2, h / 2);
    return { d: starPath(s.x, s.y, s.scale, s.rotate), fillOpacity: s.opacity };
  });
  return <AnimatedPath animatedProps={animatedProps} fill={color} />;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', width: SWIRL_W, height: SWIRL_H, pointerEvents: 'none' },
});
