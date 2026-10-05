# Ghost Mascot Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the nav bar's ghost into a toy with a life of its own: expressive eyes, subtle breathing, and a fun 360° Z turn on tap, and stop treating it as a tab.

**Architecture:** A Reanimated rig over the existing raster. The halo and the cloud are two clipped copies of `assets/mascot_body.png`, and the eyes are a small View rig (oval ball, rising body-white "cheek" for happy arches, catchlight). Breathing runs on a UI-thread frame clock. A JS scheduler drives idle blinks and glances. The turn is a spring. Pure motion maths lives in a worklet-safe util with jest tests.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, Reanimated 4.5 (springs default to mass 4, so set `mass: 1`), expo-image, expo-haptics, jest-expo.

Spec: `docs/superpowers/specs/2026-10-05-ghost-mascot-motion-design.md`

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/utils/mascotMotion.ts` | create | Worklet-safe maths: `BREATH` constants, `breathCurve`, `dizzyOffset`, `randomBetween`, `clamp`, `wrap01` |
| `src/__tests__/mascotMotion.test.ts` | create | Unit tests for the above |
| `src/utils/haptics.ts` | create | `haptic('light' \| 'soft')`, a no-op on web |
| `src/components/Mascot.tsx` | rewrite | The rig, breathing, idle face, turn, press handling, `glance()` via `ref` |
| `src/components/FloatingNavBar.tsx` | modify | Centre slot hosts `<Mascot ref>`; no tab semantics; old jump code removed |
| `README.md` | modify | Nav bar animation section |

---

### Task 1: Motion maths (TDD)

**Files:**
- Create: `src/__tests__/mascotMotion.test.ts`
- Create: `src/utils/mascotMotion.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { BREATH, breathCurve, clamp, dizzyOffset, randomBetween, wrap01 } from '../utils/mascotMotion';

describe('breathCurve', () => {
  const exhaleEnd = BREATH.inhale + BREATH.exhale;

  it('starts at rest, fills at the top of the inhale and is empty again before the pause', () => {
    expect(breathCurve(0)).toBeCloseTo(0, 6);
    expect(breathCurve(BREATH.inhale)).toBeCloseTo(1, 6);
    expect(breathCurve(exhaleEnd)).toBeCloseTo(0, 6);
    expect(breathCurve((exhaleEnd + 1) / 2)).toBe(0);
  });

  it('never jumps between frames, including the wrap into the next breath', () => {
    const steps = 2000;
    for (let i = 1; i <= steps; i++) {
      expect(Math.abs(breathCurve(i / steps) - breathCurve((i - 1) / steps))).toBeLessThan(0.01);
    }
  });

  it('rises through the inhale and falls through the exhale', () => {
    for (let p = 0.01; p <= BREATH.inhale; p += 0.01) {
      expect(breathCurve(p)).toBeGreaterThanOrEqual(breathCurve(p - 0.01));
    }
    for (let p = BREATH.inhale + 0.01; p <= exhaleEnd; p += 0.01) {
      expect(breathCurve(p)).toBeLessThanOrEqual(breathCurve(p - 0.01));
    }
  });

  it('lets most of the air out in the first half of the exhale', () => {
    expect(breathCurve(BREATH.inhale + BREATH.exhale / 2)).toBeLessThan(0.35);
  });

  it('treats phases outside 0..1 as the same breath', () => {
    expect(breathCurve(1.2)).toBeCloseTo(breathCurve(0.2), 10);
    expect(breathCurve(-0.8)).toBeCloseTo(breathCurve(0.2), 10);
  });
});

describe('wrap01', () => {
  it('wraps any phase into 0..1', () => {
    expect(wrap01(0.25)).toBeCloseTo(0.25);
    expect(wrap01(1.25)).toBeCloseTo(0.25);
    expect(wrap01(-0.25)).toBeCloseTo(0.75);
    expect(wrap01(1)).toBe(0);
  });
});

describe('dizzyOffset', () => {
  it('starts and ends with the eyes centred', () => {
    for (const t of [0, 1]) {
      expect(dizzyOffset(t).x).toBeCloseTo(0, 6);
      expect(dizzyOffset(t).y).toBeCloseTo(0, 6);
    }
  });

  it('stays inside the gaze range', () => {
    for (let t = 0; t <= 1; t += 0.01) {
      const { x, y } = dizzyOffset(t);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });

  it('rolls the eyes all the way around', () => {
    const points = Array.from({ length: 101 }, (_, i) => dizzyOffset(i / 100));
    expect(Math.max(...points.map(p => p.x))).toBeGreaterThan(0.5);
    expect(Math.min(...points.map(p => p.x))).toBeLessThan(-0.5);
    expect(Math.max(...points.map(p => p.y))).toBeGreaterThan(0.3);
    expect(Math.min(...points.map(p => p.y))).toBeLessThan(-0.3);
  });
});

describe('randomBetween', () => {
  it('maps the random source onto the range', () => {
    expect(randomBetween(2, 6, () => 0)).toBe(2);
    expect(randomBetween(2, 6, () => 0.5)).toBe(4);
    expect(randomBetween(-1, 1, () => 0.75)).toBe(0.5);
  });
});

describe('clamp', () => {
  it('limits a value to the range', () => {
    expect(clamp(5, -1, 1)).toBe(1);
    expect(clamp(-5, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx jest src/__tests__/mascotMotion.test.ts`
Expected: FAIL, "Cannot find module '../utils/mascotMotion'".

- [ ] **Step 3: Implement**

```ts
/**
 * Motion maths for the ghost mascot. Every function is a worklet, so the same code
 * runs inside Reanimated styles on the UI thread and in jest.
 */

export const BREATH = {
  /** One calm breath, ms. */
  period: 3800,
  /** Share of the cycle spent breathing in, then out; the rest is a pause. */
  inhale: 0.4,
  exhale: 0.45,
  /** At the top of a breath the cloud is this much taller and wider (fractions) and higher (pt). */
  grow: 0.03,
  widen: 0.015,
  rise: 0.5,
  /** The halo trails the cloud by this share of a breath (about 200 ms) and floats a little more (pt). */
  haloLag: 0.053,
  haloRise: 0.8,
  /** Fully out of breath (just after a turn), breaths come this much faster and deeper. */
  exertedRate: 0.45,
  exertedDepth: 0.6,
} as const;

export function clamp(x: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, x));
}

/** Wraps any phase into 0..1. */
export function wrap01(x: number): number {
  'worklet';
  return x - Math.floor(x);
}

function easeInOutSine(u: number): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

/**
 * How full the lungs are, 0 (rest) to 1, at a point in the breath (phase 0..1, wrapped).
 * The inhale eases in and out, the exhale is front-loaded like a passive breath out, then
 * a short pause. Every segment starts and ends at zero speed, so nothing snaps.
 */
export function breathCurve(phase: number): number {
  'worklet';
  const p = wrap01(phase);
  if (p < BREATH.inhale) return easeInOutSine(p / BREATH.inhale);
  const out = (p - BREATH.inhale) / BREATH.exhale;
  if (out < 1) return 1 - easeInOutSine(1 - Math.pow(1 - out, 1.6));
  return 0;
}

/**
 * Gaze offset (-1..1 per axis) for the dizzy swirl at progress t (0..1): one and a quarter
 * laps of a small ellipse that grows out of the centre and shrinks back into it.
 */
export function dizzyOffset(t: number): { x: number; y: number } {
  'worklet';
  const reach = Math.sin(Math.PI * clamp(t, 0, 1));
  const angle = 2.5 * Math.PI * t;
  return { x: reach * Math.sin(angle), y: -0.75 * reach * Math.cos(angle) };
}

/** A random number in [min, max). `rand` is injectable for tests. */
export function randomBetween(min: number, max: number, rand: () => number = Math.random): number {
  'worklet';
  return min + (max - min) * rand();
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx jest src/__tests__/mascotMotion.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/mascotMotion.ts src/__tests__/mascotMotion.test.ts
git commit -m "feat: worklet-safe motion maths for the ghost mascot (breath curve, dizzy swirl)"
```

### Task 2: Shared haptics helper

**Files:**
- Create: `src/utils/haptics.ts`

- [ ] **Step 1: Create the helper** (API checked against docs.expo.dev/versions/v57.0.0/sdk/haptics: `impactAsync(ImpactFeedbackStyle.Light | .Soft)`)

```ts
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  soft: Haptics.ImpactFeedbackStyle.Soft,
} as const;

/** Fire-and-forget impact feedback; skipped on web. */
export function haptic(style: keyof typeof IMPACT) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(IMPACT[style]);
}
```

(The nav bar switches to it in Task 3, so it is committed with Task 3.)

### Task 3: The mascot rig and the nav bar slot

**Files:**
- Rewrite: `src/components/Mascot.tsx`
- Modify: `src/components/FloatingNavBar.tsx`

- [ ] **Step 1: Rewrite `src/components/Mascot.tsx`** with the full rig. Geometry: the PNG is 340×400, so 10× the 34×40 pt box. The halo occupies rows 3.1–8.5 pt and the cloud 9.2–37.8 pt, so the layers split at 8.8. The pivot is the cloud centre at (17, 23.5). The eyes are ovals 4.2×6.6 pt at (15.7, 20.8) and (21.4, 19.9), tilted −8°. Pixel sampling showed the cloud is pure white around the eyes, so a white "cheek" inside each eye is invisible against the body.

```tsx
import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
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
import { BREATH, breathCurve, clamp, dizzyOffset, randomBetween } from '../utils/mascotMotion';

const ART = require('../../assets/mascot_body.png');

// Geometry in pt inside the 34 x 40 Figma box (the PNG is drawn at 10x).
const W = 34;
const H = 40;
/** The halo ends at y 8.5 and the cloud starts at 9.2, so one raster splits into two layers here. */
const SPLIT = 8.8;
/** Centre of the cloud: the pivot for the turn, the squash and the halo's lag. */
const PIVOT_Y = 23.5;
const RIG_PIVOT = PIVOT_Y - H / 2;
const HALO_PIVOT = PIVOT_Y - SPLIT / 2;

// Eyes: 4.2 x 6.6 ovals tilted -8deg, drawn as 6.6 circles squeezed on X so they stay true ellipses.
const EYE = 6.6;
const EYE_SX = 4.2 / 6.6;
const EYES = [
  { cx: 15.7, cy: 20.8 },
  { cx: 21.4, cy: 19.9 },
];
/** Gaze travel at full deflection, pt. */
const GAZE_X = 2.2;
const GAZE_Y = 1.4;
/** A body-white disc that rises inside each eye and leaves an arch: the happy face. */
const CHEEK = 10;
const CHEEK_TOP = EYE + 0.3;
const CHEEK_RISE = CHEEK_TOP - 2.2;
/** Catchlight diameter, pt. */
const LIGHT = 1.3;

const BLINK_CLOSE = { duration: 70, easing: Easing.in(Easing.quad) };
const BLINK_OPEN = { duration: 130, easing: Easing.out(Easing.quad) };
// Reanimated 4 springs default to mass 4, so every config here spells out mass 1.
const DART = { stiffness: 500, damping: 26, mass: 1 };
const DRIFT_BACK = { stiffness: 220, damping: 20, mass: 1 };
const BOB = { stiffness: 260, damping: 12, mass: 1 };
const PRESS = { stiffness: 500, damping: 26, mass: 1 };
const RELAX = { stiffness: 300, damping: 18, mass: 1 };
const SPIN = { stiffness: 70, damping: 11, mass: 1 };
/** Softer than SPIN: the halo trails the turn and overshoots a little more. */
const HALO_SPIN = { stiffness: 55, damping: 8.5, mass: 1 };
const LAND = { stiffness: 170, damping: 11, mass: 1 };
const SETTLE = { stiffness: 300, damping: 12, mass: 1 };

/** How long one turn's choreography runs; idle blinks and glances wait for it. */
const TURN_MS = 1400;
/** Turns a burst of taps can stack up. */
const MAX_TURNS = 3;

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
      period.value = BREATH.period * randomBetween(0.9, 1.1);
      depth.value = randomBetween(0.9, 1.1);
    }
    phase.value = p;
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
        if (!busy.current) blink.value = Math.random() < 0.2 ? blinkTwice() : blinkOnce();
        nextBlink();
      });
    const nextGlance = () =>
      after(randomBetween(4000, 9000), () => {
        if (busy.current) return nextGlance();
        // Dart somewhere (half the time behind a blink), hold, then come back.
        if (Math.random() < 0.5) blink.value = blinkOnce();
        gazeX.value = withSpring((Math.random() < 0.5 ? -1 : 1) * randomBetween(0.35, 0.9), DART);
        gazeY.value = withSpring(randomBetween(-0.6, 0.5), DART);
        after(randomBetween(900, 1800), () => {
          if (!busy.current) {
            gazeX.value = withSpring(0, DART);
            gazeY.value = withSpring(0, DART);
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
 * own, glances toward tabs when the nav bar asks, and does a full turn when tapped.
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
  const bob = useSharedValue(0);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const spin = useSharedValue(0); // degrees; every turn adds 360
  const haloSpin = useSharedValue(0);

  const busy = useRef(false);
  useIdleFace(!reduceMotion, busy, blink, gazeX, gazeY);

  const target = useRef(0);
  const queued = useRef(0);
  const handled = useRef(false);
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
      glance(direction: number) {
        if (reduceMotion) return;
        gazeX.value = withSpring(0, DART);
        gazeY.value = withSpring(0, DART);
        look.value = withSequence(withSpring(direction, DART), withDelay(650, withSpring(0, DRIFT_BACK)));
        wide.value = withSequence(withTiming(0.4, { duration: 120 }), withDelay(450, withTiming(0, { duration: 220 })));
        bob.value = withSequence(withTiming(-5, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(0, BOB));
      },
    }),
    [reduceMotion, gazeX, gazeY, look, wide, bob],
  );

  const relax = () => {
    squash.value = withSpring(1, RELAX);
    wide.value = withTiming(0, { duration: 160 });
    if (queued.current === 0) {
      spin.value = withSpring(target.current, RELAX);
      busy.current = false;
    }
  };

  const onPressIn = () => {
    handled.current = false;
    if (reduceMotion) return;
    busy.current = true;
    haptic('light');
    // Wind-up: squash, eyes wide, and lean back against the turn unless one is playing.
    squash.value = withSpring(0.88, PRESS);
    wide.value = withTiming(1, { duration: 120 });
    gazeX.value = withSpring(0, DART);
    gazeY.value = withSpring(0, DART);
    if (queued.current === 0) spin.value = withSpring(target.current - 12, PRESS);
  };

  // On a quick tap Pressability fires onPress first and holds onPressOut back to 130 ms.
  const onPressOut = () => {
    if (reduceMotion || handled.current) return;
    relax();
  };

  const onPress = () => {
    handled.current = true;
    if (reduceMotion) {
      // No movement: a moment of the happy face is the whole reaction.
      happy.value = 1;
      schedule(900, () => {
        happy.value = 0;
      });
      return;
    }
    if (queued.current >= MAX_TURNS) {
      relax();
      return;
    }
    queued.current += 1;
    target.current += 360;
    const to = target.current;
    // The turn: a spring that overshoots and wobbles back; the halo's softer spring trails it.
    spin.value = withSpring(to, SPIN);
    haloSpin.value = withSpring(to, HALO_SPIN);
    // Float up during the fast part, then land on a soft bounce.
    lift.value = withSequence(withTiming(-7, { duration: 240, easing: Easing.out(Easing.cubic) }), withSpring(0, LAND));
    // Stretch on take-off, squash on landing.
    squash.value = withSequence(
      withTiming(1.08, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.92, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, SETTLE),
    );
    // Face: wide turns happy while spinning, then a dizzy swirl, then a blink to recover.
    wide.value = withTiming(0, { duration: 150 });
    happy.value = withSequence(withTiming(1, { duration: 120 }), withDelay(380, withTiming(0, { duration: 160 })));
    dizzy.value = 0;
    dizzy.value = withDelay(520, withTiming(1, { duration: 650, easing: Easing.linear }));
    blink.value = withDelay(1180, blinkOnce());
    // Out of breath for a few breaths afterwards.
    exertion.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1200, withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.quad) })),
    );
    clearTurnTimers();
    schedule(430, () => haptic('soft'));
    schedule(TURN_MS, () => {
      queued.current = 0;
      busy.current = false;
    });
  };

  const rigStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value + bob.value + RIG_PIVOT },
      { rotate: `${spin.value}deg` },
      { scaleX: 1 + (1 - squash.value) * 0.7 },
      { scaleY: squash.value },
      { translateY: -RIG_PIVOT },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => {
    const b = breathCurve(phase.value - BREATH.haloLag) * depth.value * (1 + BREATH.exertedDepth * exertion.value);
    return {
      transform: [
        { translateY: HALO_PIVOT },
        { rotate: `${haloSpin.value - spin.value}deg` },
        { translateY: -HALO_PIVOT - BREATH.haloRise * b },
      ],
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

  const cheekStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -CHEEK_RISE * happy.value }] }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: (1 - happy.value) * (1 - blink.value) }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ghost"
      accessibilityHint="Spins the ghost"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      hitSlop={6}
      style={styles.press}
    >
      <Animated.View style={[styles.rig, rigStyle]}>
        <Animated.View style={[styles.halo, haloStyle]}>
          <Image source={ART} style={styles.art} contentFit="contain" transition={0} />
        </Animated.View>
        <Animated.View style={[styles.body, bodyStyle]}>
          <Image source={ART} style={[styles.art, styles.artBody]} contentFit="contain" transition={0} />
          {EYES.map((e, i) => (
            <Animated.View key={i} style={[styles.socket, { left: e.cx - EYE / 2, top: e.cy - SPLIT - EYE / 2 }, socketStyle]}>
              <Animated.View style={[styles.ball, ballStyle]}>
                <Animated.View style={[styles.cheek, cheekStyle]} />
                <Animated.View style={[styles.light, lightStyle]} />
              </Animated.View>
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  rig: { width: W, height: H },
  halo: { position: 'absolute', left: 0, top: 0, width: W, height: SPLIT, overflow: 'hidden' },
  body: { position: 'absolute', left: 0, top: SPLIT, width: W, height: H - SPLIT, overflow: 'hidden' },
  art: { position: 'absolute', left: 0, top: 0, width: W, height: H },
  artBody: { top: -SPLIT },
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
  // Pre-stretched on X so the ball's squeeze leaves it round.
  light: {
    position: 'absolute',
    left: 1.6,
    top: 1.3,
    width: LIGHT / EYE_SX,
    height: LIGHT,
    borderRadius: LIGHT,
    backgroundColor: colors.white,
  },
});
```

- [ ] **Step 2: Update `src/components/FloatingNavBar.tsx`**
  - Imports: drop `withDelay`, `withRepeat`, `withSequence` and `expo-haptics`; add `useRef`, `haptic` from `../utils/haptics` and `MascotHandle`.
  - Delete the local `haptic` function, the `look`/`blink`/`bob`/`squash` shared values, the idle-blink effect, `react()` and `mascotStyle`.
  - `NavButton`: drop the `bloom` prop (every remaining tab blooms).
  - `onPress` becomes:

```tsx
  const mascot = useRef<MascotHandle>(null);

  const onPress = useCallback(
    (index: number) => {
      // The ghost is paying attention: it glances toward the tapped tab.
      mascot.current?.glance(Math.sign(index - MASCOT_INDEX));
      haptic('light');
      onChange(index);
    },
    [onChange],
  );
```

  - The centre slot becomes:

```tsx
            <View style={[styles.slot, { left: navSlotCenter(MASCOT_INDEX) - SLOT_W / 2 }]}>
              <Mascot ref={mascot} />
            </View>
```

  - Update the component doc comment: the ghost glances and bobs on tab changes; it is a toy with its own life (see `Mascot`); tapping it never changes `active`.

- [ ] **Step 3: Typecheck and run tests**

Run: `npx tsc --noEmit` → no output. Then run `npx jest` → all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/haptics.ts src/components/Mascot.tsx src/components/FloatingNavBar.tsx
git commit -m "feat: ghost mascot breathes, blinks and glances on its own and spins a full turn on tap; no longer a tab"
```

### Task 4: Verify in the web preview and tune

- [ ] Start the `expo-web` preview from `.claude/launch.json`; check the console for errors.
- [ ] Find the ghost (`aria-label="Ghost"`). Record the pill's transform. Click the ghost. Sample the rig's computed transform every frame for 1.6 s through `javascript_tool`. Expected: the rotation reaches about 380° around 0.5 s and settles at 360°; the pill transform is unchanged; the halo layer's relative rotation stays within about ±35°.
- [ ] Screenshot at rest and during a turn (zoomed on the bar): nothing clipped by the bar, happy arches visible.
- [ ] Click a tab (Stats): `onChange` still moves the pill; the eyes glance right.
- [ ] Tune constants if anything reads wrong. Commit the tuning with a `fix:` message.

### Task 5: README

**Files:** Modify `README.md` ("Animation: the nav bar", item 2).

- [ ] Replace item 2 with a description of the ghost: not a tab, breathing on a UI-thread clock with per-breath variation and a trailing halo, idle blinks and glances, the eye rig and its expressions, the tab glance, the tap turn choreography and haptics, the three-turn cap and Reduce Motion behaviour.
- [ ] Commit: `docs: README describes the ghost's breathing, eyes and turn`.

### Task 6: Final checks

- [ ] `npx jest`, `npx tsc --noEmit`.
- [ ] ESLint is not configured in the repo (no config, no `eslint` package). Lint the changed files from a scratch install of `eslint` + `eslint-config-expo` without touching `package.json`, and report the result.
