import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDials } from '../dev/dials';
import { colors, layout, navPillLeft, navSlotCenter } from '../theme';
import { haptic } from '../utils/haptics';
import { PILL, PillStretch, moveStart, pillGlass, pillShape, pillSpring } from '../utils/pillMotion';
import { BarsIcon, CompassIcon, HomeIcon, PersonIcon } from './NavIcons';
import { Mascot, MascotHandle } from './Mascot';

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
  /** +1 scrolling down, -1 scrolling up, 0 idle. */
  scrollDirection: SharedValue<number>;
}

interface ButtonProps {
  index: number;
  active: boolean;
  onPress: (index: number) => void;
  children: React.ReactNode;
  label: string;
}

/** Each slot is absolutely positioned on the icon centres measured from the Figma. */
const SLOT_W = 56;


function NavButton({ index, active, onPress, children, label }: ButtonProps) {
  const pressed = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({
    // Critically damped like the pill: squeezes and springs back without overshooting.
    transform: [{ scale: withSpring(pressed.value ? 0.88 : 1, { duration: 150, dampingRatio: 1 }) }],
    // Figma keeps every icon full white; the pill alone marks the active slot.
    opacity: withTiming(active ? 1 : 0.96, { duration: 200 }),
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.slot, { left: navSlotCenter(index) - SLOT_W / 2 }]}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => onPress(index)}
      hitSlop={6}
    >
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * The nav bar's idea: the ghost is paying attention. The active pill slides and
 * stretches toward the tapped tab and the ghost glances that way with a tiny hop. The ghost
 * itself is a toy with a life of its own (see Mascot); tapping it never changes the
 * tab. The bar sinks a little while the feed is being scrolled downward and springs
 * back as soon as the scroll eases.
 */
export function FloatingNavBar({ active, onChange, scrollY, scrollDirection }: Props) {
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
    stretch.value = pill.stretch;
  }, [pill.stretch, stretch]);

  // Quick and critically damped by default: the pill lands on the tab without overshooting.
  const { duration, bounce } = pill.spring;
  const slowMo = replay.slowMo;
  useEffect(() => {
    const next = navPillLeft(active);
    start.value = moveStart(pillX.value, start.value, target.value, next, layout.nav.pillWidth, stretch.value);
    target.value = next;
    pillX.value = withSpring(next, pillSpring({ duration, bounce }, slowMo));
  }, [active, pillX, target, start, stretch, duration, bounce, slowMo]);

  // Pill stretches along the direction of travel, growing in as it leaves and letting go as it lands.
  const pillStyle = useAnimatedStyle(() => {
    const { scaleX, scaleY } = pillShape(pillX.value - start.value, target.value - pillX.value, layout.nav.pillWidth, stretch.value);
    return { transform: [{ translateX: pillX.value }, { scaleX }, { scaleY }] };
  });

  // Bar sinks while the list is being scrolled downward.
  const barStyle = useAnimatedStyle(() => {
    const down = scrollDirection.value > 0 && scrollY.value > 40;
    return {
      transform: [
        { translateY: withSpring(down ? 12 : 0, { damping: 18, stiffness: 180 }) },
        { scale: withSpring(down ? 0.97 : 1, { damping: 18, stiffness: 180 }) },
      ],
    };
  });

  const bottom = Math.max(insets.bottom, 16) + layout.nav.bottomGap;

  return (
    <Animated.View style={[styles.wrap, { bottom }, barStyle]}>
      <View style={styles.shadow}>
        <View style={styles.bar}>
          {/* Faked glass from the Figma values, identical on both platforms: the feed blurred
              behind (iOS; Android has no cheap live blur, so its fill is a little denser),
              the design's #22242A 80% fill, and a hairline rim highlight. */}
          {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? colors.navBar : colors.navBarAndroid }]} />
          <View style={styles.rim} />
          <Animated.View style={[styles.pill, pillGlass(pill.glass), pillStyle]} />
          <View style={styles.slots}>
            <NavButton index={0} active={active === 0} onPress={onPress} label="Home">
              <HomeIcon />
            </NavButton>
            <NavButton index={1} active={active === 1} onPress={onPress} label="Explore">
              <CompassIcon />
            </NavButton>
            <View style={[styles.slot, { left: navSlotCenter(MASCOT_INDEX) - SLOT_W / 2 }]}>
              <Mascot ref={mascot} />
            </View>
            <NavButton index={3} active={active === 3} onPress={onPress} label="Stats">
              <BarsIcon />
            </NavButton>
            <NavButton index={4} active={active === 4} onPress={onPress} label="Profile">
              <PersonIcon />
            </NavButton>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

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
