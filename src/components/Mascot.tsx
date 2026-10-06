import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';
import { SwirlLayer, useSwirl } from './MascotSwirl';
import {
  BREATH,
  SPARKLE_MS,
  TrailRing,
  breathCurve,
  clamp,
  dizzyOffset,
  randomBetween,
  tapAction,
  trailPath,
  turnPose,
} from '../utils/mascotMotion';

const ART = require('../../assets/mascot_body.png');
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Geometry in pt inside the 34 x 40 Figma box (the PNG is drawn at 10x).
const W = 34;
const H = 40;
/** The halo ends at y 8.5 and the cloud starts at 9.2, so one raster splits into two layers here. */
const SPLIT = 8.8;
/** Centre of the cloud (it spans x 2.4 to 31.6): the pivot for the squash and the turn. */
const PIVOT_Y = 23.5;
const RIG_PIVOT = PIVOT_Y - H / 2;
const BODY_HALF_W = 14.6;

// Eyes: exactly the Figma ellipses (Ghost.svg), 4.089 x 6.578 tilted -8deg, plain #131722 with no
// highlight. Drawn as 6.578 circles squeezed on X so they stay true ellipses.
const EYE = 6.578;
const EYE_SX = 4.089 / 6.578;
const EYES = [
  { cx: 15.685, cy: 20.77 },
  { cx: 21.419, cy: 19.925 },
];
/**
 * The eyes ride on a face patch centred between them, which slides around the cloud and
 * foreshortens as the ghost turns about its vertical axis.
 */
const FACE_X = 18.552;
const FACE_Y = 20.348;
const FACE_W = 16;
const FACE_H = 12;
const FACE_LEFT = FACE_X - FACE_W / 2;
const FACE_TOP = FACE_Y - SPLIT - FACE_H / 2;
const FACE_OFFSET = (FACE_X - W / 2) / BODY_HALF_W;
const FRONT = turnPose(0, FACE_OFFSET);
/** The head follows the eyes a little: degrees of turn at full tab glance and full idle gaze. */
const HEAD_FOLLOW_LOOK = 12;
const HEAD_FOLLOW_GAZE = 6;

/**
 * White comet trails orbiting the ghost while it turns, on two rings round its middle. They sit
 * behind the cloud, so they only show where they swing out past its sides (white on the white
 * cloud would vanish anyway, and this keeps them off the eyes).
 */
const TRAIL_W = 64;
const TRAIL_CX = TRAIL_W / 2;
const TRAIL_RINGS: (TrailRing & { offset: number })[] = [
  { cy: 19, rx: 20, ry: 3, offset: 25 },
  { cy: 28.5, rx: 22, ry: 3.6, offset: 205 },
];
/** The trails' tail chases the turn on a slower clock, so a fast turn leaves a long streak. */
const TRAIL_CHASE = { duration: 700, easing: Easing.inOut(Easing.cubic) };

function trailProps(head: number, tail: number, ring: TrailRing & { offset: number }) {
  'worklet';
  return {
    d: trailPath(head + ring.offset, tail + ring.offset, ring, TRAIL_CX),
    // Fades as the tail catches up with the settling turn.
    fillOpacity: clamp((head - tail) / 25, 0, 1) * 0.9,
  };
}
/** Gaze travel at full deflection, pt. */
const GAZE_X = 2.2;
const GAZE_Y = 1.4;
/** A body-white disc that rises inside each eye and leaves an arch: the happy face. */
const CHEEK = 10;
const CHEEK_TOP = EYE + 0.3;
const CHEEK_RISE = CHEEK_TOP - 2.2;

const BLINK_CLOSE = { duration: 70, easing: Easing.in(Easing.quad) };
const BLINK_OPEN = { duration: 130, easing: Easing.out(Easing.quad) };
// Reanimated 4 springs default to mass 4, so every config here spells out mass 1.
const DART = { stiffness: 500, damping: 26, mass: 1 };
const DRIFT_BACK = { stiffness: 220, damping: 20, mass: 1 };
/** A tab change gets a barely-there hop: 1.5 pt up, then a well-damped settle with no bounce-back. */
const TAB_HOP = 1.5;
const HOP_UP = { duration: 120, easing: Easing.out(Easing.quad) };
const HOP_SETTLE = { stiffness: 300, damping: 21, mass: 1 };
const PRESS = { stiffness: 500, damping: 26, mass: 1 };
const RELAX = { stiffness: 300, damping: 18, mass: 1 };
const SPIN = { stiffness: 55, damping: 10, mass: 1 };
const LAND = { stiffness: 170, damping: 11, mass: 1 };
const SETTLE = { stiffness: 300, damping: 12, mass: 1 };
/** Loose springs: the halo floats a beat behind the cloud and jiggles back into place. */
const HALO_SETTLE = { stiffness: 120, damping: 7, mass: 1 };
const HALO_WOBBLE = { stiffness: 140, damping: 5, mass: 1 };

/** How long one turn's choreography runs; idle blinks and glances wait for it. */
const TURN_MS = 1400;
/** Turns a burst of taps can stack up. */
const MAX_TURNS = 3;
/** A plain turn has landed this long after release. */
const TURN_LAND_MS = 450;

/**
 * Every fourth tap (see `tapAction`) the ghost does a rare spin instead. It starts once the finger
 * has lifted, so it can be seen: the ghost winds up as five colourful rings start to orbit it,
 * then launches into a double spin.
 */
const RARE_WINDUP_MS = 240;
/** Swirl speeds, degrees per second: as the rings wind up, and while the ghost spins. */
const WINDUP_SPEED = 650;
const SPIN_SPEED = 1100;
const RARE_SPIN = { stiffness: 60, damping: 12.5, mass: 1 };
/** How long the rare spin's choreography runs from launch. */
const RARE_SPIN_MS = 2000;
/** It lands this long after launch: the rings burst and the twinkles pop. */
const RARE_LAND_MS = 480;
/** The burst: the rings grow to this size while fading out over BURST_MS, like a small firework. */
const BURST_SPREAD = 1.45;
const BURST_MS = 420;
/** Presses do nothing until this long after launch, while it is in the air. */
const RARE_AIR_MS = 700;

const blinkOnce = () => withSequence(withTiming(1, BLINK_CLOSE), withTiming(0, BLINK_OPEN));
const blinkTwice = () =>
  withSequence(
    withTiming(1, BLINK_CLOSE),
    withTiming(0, BLINK_OPEN),
    withDelay(90, withTiming(1, BLINK_CLOSE)),
    withTiming(0, BLINK_OPEN),
  );

export interface MascotHandle {
  /** Glance toward a tapped tab: -1 to the left, 1 to the right. */
  glance: (direction: number) => void;
}

/**
 * Breathing on a UI-thread clock instead of a repeating timing loop, so each breath can
 * take its own length and depth and the halo can trail the cloud by a fixed phase.
 */
function useBreath(enabled: boolean) {
  const phase = useSharedValue(0);
  const period = useSharedValue<number>(BREATH.period);
  const depth = useSharedValue(1);
  const exertion = useSharedValue(0);
  useFrameCallback(({ timeSincePreviousFrame }) => {
    // Clamped so coming back from the background does not skip ahead.
    const dt = Math.min(timeSincePreviousFrame ?? 16, 64);
    let p = phase.value + (dt / period.value) * (1 + BREATH.exertedRate * exertion.value);
    if (p >= 1) {
      // A new breath starts from rest, so its length and depth can change without a jump.
      p -= 1;
      period.set(BREATH.period * randomBetween(0.9, 1.1));
      depth.set(randomBetween(0.9, 1.1));
    }
    phase.set(p);
  }, enabled);
  return { phase, depth, exertion };
}

/** Random blinks every few seconds and a glance around now and then, paused while `busy`. */
function useIdleFace(
  enabled: boolean,
  busy: React.RefObject<boolean>,
  blink: SharedValue<number>,
  gazeX: SharedValue<number>,
  gazeY: SharedValue<number>,
) {
  useEffect(() => {
    if (!enabled) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const after = (ms: number, run: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
    };
    const nextBlink = () =>
      after(randomBetween(2000, 6000), () => {
        if (!busy.current) blink.set(Math.random() < 0.2 ? blinkTwice() : blinkOnce());
        nextBlink();
      });
    const nextGlance = () =>
      after(randomBetween(4000, 9000), () => {
        if (busy.current) return nextGlance();
        // Dart somewhere (half the time behind a blink), hold, then come back.
        if (Math.random() < 0.5) blink.set(blinkOnce());
        gazeX.set(withSpring((Math.random() < 0.5 ? -1 : 1) * randomBetween(0.35, 0.9), DART));
        gazeY.set(withSpring(randomBetween(-0.6, 0.5), DART));
        after(randomBetween(900, 1800), () => {
          if (!busy.current) {
            gazeX.set(withSpring(0, DART));
            gazeY.set(withSpring(0, DART));
          }
          nextGlance();
        });
      });
    nextBlink();
    nextGlance();
    return () => timers.forEach(clearTimeout);
  }, [enabled, busy, blink, gazeX, gazeY]);
}

/**
 * The ghost in the nav bar. Not a tab but a toy: it breathes, blinks and looks around on its
 * own, glances toward tabs when the nav bar asks, and does a full turn when tapped (every fourth
 * tap, a rare double spin inside colourful orbiting rings).
 */
export function Mascot({ ref }: { ref?: React.Ref<MascotHandle> }) {
  const reduceMotion = useReducedMotion();
  const { phase, depth, exertion } = useBreath(!reduceMotion);

  // Face, 0..1 unless noted.
  const blink = useSharedValue(0);
  const wide = useSharedValue(0);
  const happy = useSharedValue(0);
  const dizzy = useSharedValue(0);
  const look = useSharedValue(0); // tab glance, -1..1
  const gazeX = useSharedValue(0); // idle gaze, -1..1
  const gazeY = useSharedValue(0);
  // Body.
  const hop = useSharedValue(0); // pt, the tab-change hop
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const spin = useSharedValue(0); // turn about the vertical axis, degrees; every tap adds 360
  const trail = useSharedValue(0); // where the trails' tail has got to, degrees
  const haloLift = useSharedValue(0); // pt, relative to the cloud
  const haloTilt = useSharedValue(0); // degrees
  const swirl = useSwirl();

  const busy = useRef(false);
  useIdleFace(!reduceMotion, busy, blink, gazeX, gazeY);

  const target = useRef(0);
  const queued = useRef(0);
  const handled = useRef(false);
  /** This press began while the rare spin was busy, so nothing answers it. */
  const ignored = useRef(false);
  /** Plain turns since the last rare spin. */
  const turns = useRef(0);
  /** The last turn has landed by then; the wind-up and the rare spin wait for it. */
  const landedAt = useRef(0);
  /** Presses are ignored until then, while the rare spin winds up and is in the air. */
  const rareUntil = useRef(0);
  const pressing = useRef(false);
  /** A turn's choreography (and its timers) is still running. */
  const turnPlaying = useRef(false);
  /** The swirl's clock is running and has to be stopped once the rings are gone. */
  const swirlRunning = useRef(false);
  const turnTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = turnTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const schedule = (ms: number, run: () => void) => {
    const id = setTimeout(() => {
      turnTimers.current.delete(id);
      run();
    }, ms);
    turnTimers.current.add(id);
  };
  const clearTurnTimers = () => {
    turnTimers.current.forEach(clearTimeout);
    turnTimers.current.clear();
  };

  useImperativeHandle(
    ref,
    () => ({
      // A tab change gets a glance (the eyes, and the head a little) and a barely-there hop; the
      // pill stays the main thing that moves for navigation.
      glance(direction: number) {
        if (reduceMotion) return;
        gazeX.set(withSpring(0, DART));
        gazeY.set(withSpring(0, DART));
        look.set(withSequence(withSpring(direction, DART), withDelay(650, withSpring(0, DRIFT_BACK))));
        wide.set(withSequence(withTiming(0.4, { duration: 120 }), withDelay(450, withTiming(0, { duration: 220 }))));
        hop.set(withSequence(withTiming(-TAB_HOP, HOP_UP), withSpring(0, HOP_SETTLE)));
      },
    }),
    [reduceMotion, gazeX, gazeY, look, wide, hop],
  );

  const relax = () => {
    squash.set(withSpring(1, RELAX));
    wide.set(withTiming(0, { duration: 160 }));
    // Undo the wind-up, unless a turn is still in the air.
    if (Date.now() >= landedAt.current) spin.set(withSpring(target.current, RELAX));
    if (!turnPlaying.current) busy.current = false;
  };

  // Fades the swirl out and stops its clock once it is gone.
  const endSwirl = (ms: number) => {
    swirl.alpha.set(withTiming(0, { duration: ms }));
    swirl.speed.set(withTiming(0, { duration: ms }));
    schedule(ms + 60, () => {
      swirl.run(false);
      swirlRunning.current = false;
    });
  };

  // Every fourth tap: the rare spin. The finger has lifted, so it can be seen winding up: the ghost
  // crouches and turns away, grinning, as the rings fade in round it and pick up speed. Then it
  // launches into a double spin with the rings whipping round it; on landing they burst outward and
  // four twinkles pop round the ghost.
  // The whole timeline is queued here at the release, as delays and sequences that run on the UI
  // thread, so a busy JS thread cannot hold up the launch or the burst. JS timers only fire the
  // haptics and tidy up once the rings are gone.
  const rareSpin = () => {
    turns.current = 0;
    rareUntil.current = Date.now() + RARE_WINDUP_MS + RARE_AIR_MS;
    landedAt.current = rareUntil.current;
    queued.current = 0;
    turnPlaying.current = true;
    busy.current = true;
    clearTurnTimers();
    const from = target.current;
    target.current += 720;
    const to = target.current;
    /** When it launches and when it lands (the rings burst), ms after the release. */
    const launch = RARE_WINDUP_MS;
    const burst = RARE_WINDUP_MS + RARE_LAND_MS;

    // The body: a crouch turning a little away, then the double spin, a float up and a bouncy landing.
    spin.set(withSequence(
      withTiming(from - 35, { duration: RARE_WINDUP_MS, easing: Easing.inOut(Easing.quad) }),
      withSpring(to, RARE_SPIN),
    ));
    squash.set(withSequence(
      withTiming(0.84, { duration: RARE_WINDUP_MS, easing: Easing.out(Easing.quad) }),
      withTiming(1.1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 330, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.9, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(1, SETTLE),
    ));
    lift.set(withDelay(launch, withSequence(
      withTiming(-9, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withSpring(0, LAND),
    )));
    haloLift.set(withDelay(launch, withSequence(
      withTiming(1.5, { duration: 110 }),
      withTiming(-5, { duration: 380, easing: Easing.inOut(Easing.quad) }),
      withSpring(0, HALO_SETTLE),
    )));
    haloTilt.set(withSequence(withDelay(launch + 470, withTiming(-7, { duration: 90 })), withSpring(0, HALO_WOBBLE)));
    // The coloured rings stand in for the white trails, which jump to the end at the launch.
    trail.set(withDelay(launch, withTiming(to, { duration: 0 })));
    exertion.set(withDelay(launch, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1500, withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.quad) })),
    )));
    // The face: wide-eyed and grinning through the wind-up, happy in the air, then a dizzy swirl
    // and a blink. The last turn's dizzy spell and blink are cut short.
    wide.set(withSequence(withTiming(0.3, { duration: 160 }), withDelay(launch - 160, withTiming(0, { duration: 150 }))));
    happy.set(withSequence(
      withTiming(0.55, { duration: 160 }),
      withDelay(launch - 160, withTiming(1, { duration: 120 })),
      withDelay(480, withTiming(0, { duration: 180 })),
    ));
    dizzy.set(0);
    dizzy.set(withDelay(launch + 650, withTiming(1, { duration: 1000, easing: Easing.linear })));
    blink.set(0);
    blink.set(withDelay(launch + 1700, blinkOnce()));
    // The rings fade in and wind up, whip round with the spin, then burst outward and fade like a
    // small firework as the twinkles pop.
    swirl.run(true);
    swirlRunning.current = true;
    swirl.alpha.set(withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(burst - 160, withTiming(0, { duration: BURST_MS, easing: Easing.in(Easing.quad) })),
    ));
    swirl.speed.set(withSequence(
      withTiming(WINDUP_SPEED, { duration: RARE_WINDUP_MS, easing: Easing.in(Easing.quad) }),
      withTiming(SPIN_SPEED, { duration: 250 }),
      withDelay(250, withTiming(400, { duration: 500 })),
    ));
    swirl.spread.set(1);
    swirl.spread.set(withDelay(burst, withTiming(BURST_SPREAD, { duration: BURST_MS, easing: Easing.out(Easing.quad) })));
    swirl.sparkleSeed.set(withDelay(burst, withTiming(Math.random() * 360, { duration: 0 })));
    swirl.sparkleMs.set(withDelay(burst, withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(SPARKLE_MS, { duration: SPARKLE_MS, easing: Easing.linear }),
    )));

    schedule(launch, () => haptic('medium'));
    schedule(burst, () => haptic('soft'));
    schedule(burst + SPARKLE_MS + 60, () => {
      swirl.run(false);
      swirlRunning.current = false;
      swirl.alpha.set(0);
      swirl.speed.set(0);
      swirl.spread.set(1);
    });
    schedule(launch + RARE_SPIN_MS, () => {
      turnPlaying.current = false;
      if (!pressing.current) busy.current = false;
    });
  };

  const onPressIn = () => {
    handled.current = false;
    pressing.current = true;
    ignored.current = Date.now() < rareUntil.current;
    if (reduceMotion || ignored.current) return;
    busy.current = true;
    haptic('light');
    // Wind-up: squash, eyes wide, and turn a little the other way once the last turn has landed.
    squash.set(withSpring(0.88, PRESS));
    wide.set(withTiming(1, { duration: 120 }));
    gazeX.set(withSpring(0, DART));
    gazeY.set(withSpring(0, DART));
    if (Date.now() >= landedAt.current) spin.set(withSpring(target.current - 15, PRESS));
  };

  // On a quick tap Pressability fires onPress first and holds onPressOut back to 130 ms. On a
  // longer press onPressOut comes first and onPress follows at once (or never, if the finger slid off).
  const onPressOut = () => {
    pressing.current = false;
    if (reduceMotion || handled.current || ignored.current) return;
    relax();
  };

  const onPress = () => {
    handled.current = true;
    pressing.current = false;
    if (ignored.current) return;
    if (reduceMotion) {
      // No movement: a moment of the happy face is the whole reaction.
      happy.set(1);
      schedule(900, () => {
        happy.set(0);
      });
      return;
    }
    const landed = Date.now() >= landedAt.current;
    const action = tapAction(turns.current, landed, queued.current, MAX_TURNS);
    if (action === 'rare') {
      rareSpin();
      return;
    }
    if (action === 'ignore') {
      relax();
      return;
    }
    turns.current += 1;
    queued.current += 1;
    // On presses over 130 ms Pressability fires onPressOut (relax, which frees the idle face)
    // before onPress, so claim the face again here or an idle blink can cut into the turn.
    busy.current = true;
    turnPlaying.current = true;
    landedAt.current = Date.now() + TURN_LAND_MS;
    target.current += 360;
    const to = target.current;
    // The turn, about the vertical axis: a spring that overshoots and swings back to face us.
    spin.set(withSpring(to, SPIN));
    trail.set(withTiming(to, TRAIL_CHASE));
    // Float up during the fast part, then land on a soft bounce.
    lift.set(withSequence(withTiming(-7, { duration: 240, easing: Easing.out(Easing.cubic) }), withSpring(0, LAND)));
    // The halo is a ring around that axis, so it does not turn: it lags the take-off, floats
    // on past the top, and jiggles back into place after the landing.
    haloLift.set(withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(-3, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      withSpring(0, HALO_SETTLE),
    ));
    haloTilt.set(withSequence(withDelay(400, withTiming(-5, { duration: 90 })), withSpring(0, HALO_WOBBLE)));
    // Stretch on take-off, squash on landing.
    squash.set(withSequence(
      withTiming(1.08, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.92, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, SETTLE),
    ));
    // Face: wide turns happy while spinning, then a dizzy swirl, then a blink to recover.
    wide.set(withTiming(0, { duration: 150 }));
    happy.set(withSequence(withTiming(1, { duration: 120 }), withDelay(380, withTiming(0, { duration: 160 }))));
    dizzy.set(0);
    dizzy.set(withDelay(520, withTiming(1, { duration: 650, easing: Easing.linear })));
    blink.set(withDelay(1180, blinkOnce()));
    // Out of breath for a few breaths afterwards.
    exertion.set(withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1200, withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.quad) })),
    ));
    clearTurnTimers();
    // Rings still bursting after a rare spin: fade them out and stop their clock.
    if (swirlRunning.current) endSwirl(150);
    schedule(450, () => haptic('soft'));
    schedule(TURN_MS, () => {
      queued.current = 0;
      turnPlaying.current = false;
      if (!pressing.current) busy.current = false;
    });
  };

  const rigStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value + hop.value + RIG_PIVOT },
      { scaleX: 1 + (1 - squash.value) * 0.7 },
      { scaleY: squash.value },
      { translateY: -RIG_PIVOT },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => {
    const b = breathCurve(phase.value - BREATH.haloLag) * depth.value * (1 + BREATH.exertedDepth * exertion.value);
    return {
      transform: [{ translateY: haloLift.value - BREATH.haloRise * b }, { rotate: `${haloTilt.value}deg` }],
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const b = breathCurve(phase.value) * depth.value * (1 + BREATH.exertedDepth * exertion.value);
    return {
      transform: [{ translateY: -BREATH.rise * b }, { scaleX: 1 + BREATH.widen * b }, { scaleY: 1 + BREATH.grow * b }],
    };
  });

  // Where the eyes point, -1..1: a tab glance overrides idle drifting and the dizzy swirl rides on top.
  const gaze = useDerivedValue(() => {
    const swirl = dizzyOffset(dizzy.value);
    const x = look.value + gazeX.value * (1 - Math.min(1, Math.abs(look.value))) + swirl.x;
    return { x: clamp(x, -1, 1), y: clamp(gazeY.value + swirl.y, -1, 1) };
  });

  // How far the ghost has turned about its vertical axis; the head also follows the eyes a little.
  const pose = useDerivedValue(() =>
    turnPose(spin.value + HEAD_FOLLOW_LOOK * look.value + HEAD_FOLLOW_GAZE * gazeX.value, FACE_OFFSET),
  );

  // Side-on the cloud is narrower (it has depth), it never collapses to a flat card's edge.
  const cloudStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: pose.value.width }] }));

  // The face slides around the side, foreshortens, and is hidden while the ghost faces away.
  const faceStyle = useAnimatedStyle(() => ({
    opacity: clamp(pose.value.faceScale * 6, 0, 1),
    transform: [
      { translateX: (pose.value.faceX - FRONT.faceX) * BODY_HALF_W },
      { scaleX: pose.value.faceScale / FRONT.faceScale },
    ],
  }));

  const socketStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gaze.value.x * GAZE_X }, { translateY: gaze.value.y * GAZE_Y }, { rotate: '-8deg' }],
  }));

  const ballStyle = useAnimatedStyle(() => {
    const grow = 1 + 0.2 * wide.value;
    return {
      transform: [
        // The lid closes slightly low, like a real one.
        { translateY: 0.9 * blink.value },
        // Squeezed into the oval, and a touch narrower when looking to the side.
        { scaleX: EYE_SX * grow * (1 - 0.12 * Math.abs(gaze.value.x)) },
        { scaleY: grow * (1 - 0.92 * blink.value) * (1 - 0.1 * happy.value) },
      ],
    };
  });

  const upperTrail = useAnimatedProps(() => trailProps(spin.value, trail.value, TRAIL_RINGS[0]));
  const lowerTrail = useAnimatedProps(() => trailProps(spin.value, trail.value, TRAIL_RINGS[1]));

  const cheekStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -CHEEK_RISE * happy.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ghost"
      accessibilityHint="Spins the ghost."
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      hitSlop={6}
      // A finger that drifts a little before lifting still counts as a tap.
      pressRetentionOffset={40}
      style={styles.press}
    >
      <Animated.View style={[styles.rig, rigStyle]}>
        <View style={styles.trails}>
          <Svg width={TRAIL_W} height={H}>
            <AnimatedPath animatedProps={upperTrail} fill={colors.white} />
            <AnimatedPath animatedProps={lowerTrail} fill={colors.white} />
          </Svg>
        </View>
        <SwirlLayer swirl={swirl} side="back" cx={W / 2} cy={PIVOT_Y} />
        <Animated.View style={[styles.halo, haloStyle]}>
          <Image source={ART} style={styles.art} contentFit="contain" transition={0} />
        </Animated.View>
        <Animated.View style={[styles.body, bodyStyle]}>
          <Animated.View style={[styles.cloud, cloudStyle]}>
            <Image source={ART} style={[styles.art, styles.artBody]} contentFit="contain" transition={0} />
          </Animated.View>
          <Animated.View style={[styles.face, faceStyle]}>
            {EYES.map((e, i) => (
              <Animated.View
                key={i}
                style={[styles.socket, { left: e.cx - EYE / 2 - FACE_LEFT, top: e.cy - SPLIT - EYE / 2 - FACE_TOP }, socketStyle]}
              >
                <Animated.View style={[styles.ball, ballStyle]}>
                  <Animated.View style={[styles.cheek, cheekStyle]} />
                </Animated.View>
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>
        <SwirlLayer swirl={swirl} side="front" cx={W / 2} cy={PIVOT_Y} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  rig: { width: W, height: H },
  trails: { position: 'absolute', left: W / 2 - TRAIL_W / 2, top: 0, width: TRAIL_W, height: H, pointerEvents: 'none' },
  halo: { position: 'absolute', left: 0, top: 0, width: W, height: SPLIT, overflow: 'hidden' },
  body: { position: 'absolute', left: 0, top: SPLIT, width: W, height: H - SPLIT, overflow: 'hidden' },
  cloud: { position: 'absolute', left: 0, top: 0, width: W, height: H - SPLIT },
  art: { position: 'absolute', left: 0, top: 0, width: W, height: H },
  artBody: { top: -SPLIT },
  face: { position: 'absolute', left: FACE_LEFT, top: FACE_TOP, width: FACE_W, height: FACE_H, pointerEvents: 'none' },
  socket: { position: 'absolute', width: EYE, height: EYE, pointerEvents: 'none' },
  ball: { width: EYE, height: EYE, borderRadius: EYE / 2, overflow: 'hidden', backgroundColor: colors.eye },
  cheek: {
    position: 'absolute',
    left: (EYE - CHEEK) / 2,
    top: CHEEK_TOP,
    width: CHEEK,
    height: CHEEK,
    borderRadius: CHEEK / 2,
    backgroundColor: colors.white,
  },
});
