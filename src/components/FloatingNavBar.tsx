import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, interpolate, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useDials } from '../dev/dials';
import { colors, layout, navPillLeft, navSlotCenter } from '../theme';
import { haptic } from '../utils/haptics';
import { NavShrinkState, navShrinkStep } from '../utils/navShrink';
import {
  PILL,
  PillStretch,
  dragPillLeft,
  dragStretch,
  moveStart,
  nearestTab,
  pillGlass,
  pillShape,
  pillSpring,
  stretchScale,
  stretchedStart,
} from '../utils/pillMotion';
import { BarsIcon, CompassIcon, HomeIcon, PersonIcon } from './NavIcons';
import { Mascot, MascotHandle, MascotWatch } from './Mascot';

export const NAV_ITEMS = ['home', 'explore', 'mascot', 'stats', 'profile'] as const;
/** The ghost's slot. It is a toy, not a tab: tapping it never changes `active`. */
const MASCOT_INDEX = 2;
const TABS = [0, 1, 3, 4];

/** Live controls for the pill in dev builds (the Dials chip, top right); defaults come from PILL. */
const PILL_DIALS = {
  spring: {
    duration: [PILL.spring.duration, 50, 1000, 10],
    bounce: [PILL.spring.bounce, 0, 0.9, 0.01],
  },
  stretch: {
    amount: [PILL.stretch.amount, 0, 0.8, 0.01],
    easeIn: [PILL.stretch.easeIn, 0, 4, 0.05],
    reach: [PILL.stretch.reach, 0.25, 4, 0.05],
    squash: [PILL.stretch.squash, 0, 1, 0.05],
  },
  glass: {
    fill: [PILL.glass.fill, 0, 0.4, 0.01],
    topLight: [PILL.glass.topLight, 0, 1, 0.01],
    bottomLight: [PILL.glass.bottomLight, 0, 1, 0.01],
    glow: [PILL.glass.glow, 0, 0.5, 0.01],
    glowBlur: [PILL.glass.glowBlur, 0, 20, 1],
  },
  drag: {
    lift: [PILL.drag.lift, 1, 1.3, 0.01],
    follow: [PILL.drag.follow, 0, 300, 5],
    fullSpeed: [PILL.drag.fullSpeed, 100, 3000, 50],
  },
} as const;

/** Replays the switch as a real tap would (glance, haptic, tab change); slow-mo stretches the spring. */
const REPLAY_DIALS = {
  longJump: { type: 'action', label: 'Home ↔ Profile' },
  nextTab: { type: 'action', label: 'Next tab' },
  slowMo: [1, 1, 10, 0.5],
} as const;

interface Props {
  active: number;
  onChange: (index: number) => void;
  scrollY: SharedValue<number>;
}

interface ButtonProps {
  index: number;
  active: boolean;
  onPress: (index: number) => void;
  Icon: React.ComponentType<{ scale: SharedValue<number> }>;
  label: string;
}

/** Each slot is absolutely positioned on the icon centres measured from the Figma. */
const SLOT_W = 56;

/** How far (pt) the dragged pill is from the ghost when the ghost looks fully to that side. */
const WATCH_RANGE = 90;
const GHOST_CENTER = navSlotCenter(MASCOT_INDEX);

/** A dragged pill stays between the end tabs. */
const DRAG_MIN = navPillLeft(TABS[0]);
const DRAG_MAX = navPillLeft(TABS[TABS.length - 1]);

/** The bar's size while shrunk (see navShrink). */
const NAV_SCROLLED_SCALE = 0.9;
/** How far (pt) the bar sinks while shrunk. */
const NAV_SCROLLED_SINK = 12;


function NavButton({ index, active, onPress, Icon, label }: ButtonProps) {
  const pressed = useSharedValue(0);
  // Critically damped like the pill: squeezes and springs back without overshooting. The icon
  // scales its own vectors (see NavIcons): a view transform here left the glyph jaggy on iOS.
  const squeeze = useDerivedValue<number>(() => withSpring(pressed.value ? 0.88 : 1, { duration: 150, dampingRatio: 1 }));
  const iconStyle = useAnimatedStyle(() => ({
    // Figma keeps every icon full white; the pill alone marks the active slot.
    opacity: withTiming(active ? 1 : 0.96, { duration: 200 }),
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      // aria-* rather than accessibilityState, which react-native-web ignores.
      aria-selected={active}
      style={[styles.slot, { left: navSlotCenter(index) - SLOT_W / 2 }]}
      onPressIn={() => {
        pressed.set(1);
      }}
      onPressOut={() => {
        pressed.set(0);
      }}
      onPress={() => onPress(index)}
      hitSlop={6}
    >
      <Animated.View style={iconStyle}>
        <Icon scale={squeeze} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * The nav bar's idea: the ghost is paying attention. The active pill slides and
 * stretches toward the tapped tab and the ghost glances that way with a tiny hop. The ghost
 * itself is a toy with a life of its own (see Mascot); tapping it never changes the
 * tab. The bar sinks and shrinks out of the way on a scroll down and rises back on a scroll up
 * (see navShrink).
 * The pill can also be dragged: it lifts, follows the finger across the bar (ticking as it
 * crosses each tab) and settles on the nearest tab when let go, switching to it as a tap would.
 * Memoised: a feed tab switch re-renders the screen, and the bar and its ghost have nothing to redo.
 */
export const FloatingNavBar = React.memo(function FloatingNavBar({ active, onChange, scrollY }: Props) {
  const insets = useSafeAreaInsets();
  const pillX = useSharedValue(navPillLeft(active));
  const target = useSharedValue(navPillLeft(active));
  /** Where the current move counts its travel from, for the stretch's ease-in. */
  const start = useSharedValue(navPillLeft(active));
  const mascot = useRef<MascotHandle>(null);

  const onPress = useCallback(
    (index: number) => {
      mascot.current?.glance(Math.sign(index - MASCOT_INDEX));
      haptic('light');
      onChange(index);
    },
    [onChange],
  );

  const onReplay = useCallback(
    (action: string) => {
      if (action === 'longJump') onPress(active === 0 ? 4 : 0);
      if (action === 'nextTab') onPress(TABS[(TABS.indexOf(active) + 1) % TABS.length]);
    },
    [active, onPress],
  );
  const replay = useDials('Pill replay', REPLAY_DIALS, { onAction: onReplay });
  const pill = useDials('Pill', PILL_DIALS);

  const stretch = useSharedValue<PillStretch>({ ...PILL.stretch });
  useEffect(() => {
    stretch.set(pill.stretch);
  }, [pill.stretch, stretch]);

  // Quick and critically damped by default: the pill lands on the tab without overshooting.
  const { duration, bounce } = pill.spring;
  const slowMo = replay.slowMo;
  useEffect(() => {
    const next = navPillLeft(active);
    start.set(moveStart(pillX.value, start.value, target.value, next, layout.nav.pillWidth, stretch.value));
    target.set(next);
    pillX.set(withSpring(next, pillSpring({ duration, bounce }, slowMo)));
  }, [active, pillX, target, start, stretch, duration, bounce, slowMo]);

  /** True while a drag holds the pill. */
  const dragging = useSharedValue(false);
  /** The held pill's stretch, 0..1, from the finger's speed. */
  const dragT = useSharedValue(0);
  /** The pill's scale: lifted while held, 1 at rest. */
  const lift = useSharedValue(1);
  /** The tab nearest the finger. */
  const hover = useSharedValue(active);
  /** The tab a drag let go on, counted so that every drop registers. */
  const dropped = useSharedValue({ tab: active, count: 0 });
  // A drop switches tabs as a tap would. It comes back through a reaction because onPress reads
  // the ghost's ref, which the gesture builder must not capture during render.
  useAnimatedReaction(
    () => dropped.value,
    (drop, prev) => {
      if (prev !== null && drop.count !== prev.count) scheduleOnRN(onPress, drop.tab);
    },
  );

  const drag = useMemo(() => {
    const { pillWidth } = layout.nav;
    const centers = layout.nav.slotCenters;
    const dragP = pill.drag;
    const follow = { duration: dragP.follow, dampingRatio: 1 };
    const settle = pillSpring({ duration, bounce }, slowMo);
    const track = (x: number, velocity: number) => {
      'worklet';
      pillX.set(withSpring(dragPillLeft(x, pillWidth, DRAG_MIN, DRAG_MAX), follow));
      dragT.set(withSpring(dragStretch(velocity, dragP), follow));
      const tab = nearestTab(x, centers, TABS);
      if (tab !== hover.value) {
        hover.set(tab);
        scheduleOnRN(haptic, 'selection');
      }
    };
    return (
      Gesture.Pan()
        // Sideways only, and only past a few points: a tap still reaches the tab (or the ghost).
        .activeOffsetX([-10, 10])
        .failOffsetY([-14, 14])
        // The ghost is a toy to tap, not a handle: a touch that starts on it never drags the pill.
        .onTouchesDown((e, manager) => {
          const touch = e.changedTouches[0];
          if (touch && Math.abs(touch.x - GHOST_CENTER) <= SLOT_W / 2) manager.fail();
        })
        .onStart((e) => {
          dragging.set(true);
          hover.set(nearestTab(pillX.value + pillWidth / 2, centers, TABS));
          lift.set(withSpring(dragP.lift, follow));
          track(e.x, e.velocityX);
        })
        .onUpdate((e) => track(e.x, e.velocityX))
        .onFinalize(() => {
          if (!dragging.value) return;
          dragging.set(false);
          const tab = hover.value;
          const left = centers[tab] - pillWidth / 2;
          const changed = left !== target.value;
          // Hand over to the tap's motion, keeping the stretch the pill had under the finger.
          start.set(stretchedStart(pillX.value, left, dragT.value, pillWidth, stretch.value));
          target.set(left);
          pillX.set(withSpring(left, settle));
          lift.set(withSpring(1, settle));
          if (changed) dropped.set({ tab, count: dropped.value.count + 1 });
        })
    );
  }, [pill.drag, duration, bounce, slowMo, pillX, dragT, hover, dragging, lift, start, target, stretch, dropped]);

  // The ghost keeps its eyes on a dragged pill.
  const pillSide = useDerivedValue(() => {
    const dx = pillX.value + layout.nav.pillWidth / 2 - GHOST_CENTER;
    return Math.min(Math.max(dx / WATCH_RANGE, -1), 1);
  });
  const watch = useMemo<MascotWatch>(() => ({ x: pillSide, on: dragging }), [pillSide, dragging]);

  // Pill stretches along the direction of travel, growing in as it leaves and letting go as it lands.
  // A held pill stretches with the finger's speed instead.
  const pillStyle = useAnimatedStyle(() => {
    const { scaleX, scaleY } = dragging.value
      ? stretchScale(dragT.value, stretch.value)
      : pillShape(pillX.value - start.value, target.value - pillX.value, layout.nav.pillWidth, stretch.value);
    return { transform: [{ translateX: pillX.value }, { scaleX: scaleX * lift.value }, { scaleY: scaleY * lift.value }] };
  });

  const bottom = Math.max(insets.bottom, 16) + layout.nav.bottomGap;
  const shrink = useSharedValue<NavShrinkState>({ shrunk: false, travel: 0 });
  useAnimatedReaction(
    () => scrollY.value,
    (y, prev) => {
      if (prev !== null) shrink.set(navShrinkStep(shrink.value, y, y - prev));
    },
  );

  // One spring drives both the sink and the shrink so they move as one. Critically damped like
  // the pill, so a quick reversal turns around without a bounce.
  const shrunk = useDerivedValue(() => withSpring(shrink.value.shrunk ? 1 : 0, { duration: 350, dampingRatio: 1 }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(shrunk.value, [0, 1], [0, NAV_SCROLLED_SINK]) },
      { scale: interpolate(shrunk.value, [0, 1], [1, NAV_SCROLLED_SCALE]) },
    ],
  }));

  return (
    <Animated.View style={[styles.wrap, { bottom }, barStyle]}>
      <View style={styles.shadow}>
        <GestureDetector gesture={drag}>
          <View style={styles.bar}>
            {/* Faked glass from the Figma values, identical on both platforms: the feed blurred
                behind (iOS; Android has no cheap live blur, so its fill is a little denser),
                the design's #22242A 80% fill, and a hairline rim highlight. */}
            {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid }]} />
            <View style={styles.rim} />
            {/* Keep the glass in a local texture on Android so fractional scale/translation
                transforms the finished surface instead of redrawing its inset shadows. */}
            <Animated.View
              renderToHardwareTextureAndroid={Platform.OS === 'android'}
              style={[styles.pill, pillGlass(pill.glass), pillStyle]}
            />
            <View style={styles.slots}>
              <NavButton index={0} active={active === 0} onPress={onPress} Icon={HomeIcon} label="Home" />
              <NavButton index={1} active={active === 1} onPress={onPress} Icon={CompassIcon} label="Explore" />
              <View style={[styles.slot, { left: navSlotCenter(MASCOT_INDEX) - SLOT_W / 2 }]}>
                <Mascot ref={mascot} watch={watch} />
              </View>
              <NavButton index={3} active={active === 3} onPress={onPress} Icon={BarsIcon} label="Stats" />
              <NavButton index={4} active={active === 4} onPress={onPress} Icon={PersonIcon} label="Profile" />
            </View>
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' },
  shadow: {
    borderRadius: layout.nav.height / 2,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.18)',
  },
  bar: {
    width: layout.nav.width,
    height: layout.nav.height,
    borderRadius: layout.nav.height / 2,
    overflow: 'hidden',
  },
  // Fill and glass come from pillGlass (PILL.glass).
  pill: {
    position: 'absolute',
    top: layout.nav.padding,
    left: 0,
    width: layout.nav.pillWidth,
    height: layout.nav.pillHeight,
    borderRadius: layout.nav.pillRadius,
    pointerEvents: 'none',
  },
  rim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: layout.nav.height / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    pointerEvents: 'none',
  },
  slots: { flex: 1 },
  slot: { position: 'absolute', top: 0, bottom: 0, width: SLOT_W, alignItems: 'center', justifyContent: 'center' },
});
