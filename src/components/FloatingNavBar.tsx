import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, navPillLeft, navSlotCenter } from '../theme';
import { BarsIcon, CompassIcon, HomeIcon, PersonIcon } from './NavIcons';
import { Mascot } from './Mascot';

export const NAV_ITEMS = ['home', 'explore', 'mascot', 'stats', 'profile'] as const;
const MASCOT_INDEX = 2;

interface Props {
  active: number;
  onChange: (index: number) => void;
  scrollY: SharedValue<number>;
  /** +1 scrolling down, -1 scrolling up, 0 idle. */
  scrollDirection: SharedValue<number>;
}

function haptic(style: 'light' | 'medium') {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
}

interface ButtonProps {
  index: number;
  active: boolean;
  onPress: (index: number) => void;
  children: React.ReactNode;
  bloom: boolean;
  label: string;
}

/** Each slot is absolutely positioned on the icon centres measured from the Figma. */
const SLOT_W = 56;

function NavButton({ index, active, onPress, children, bloom, label }: ButtonProps) {
  const pressed = useSharedValue(0);
  const bloomT = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.88 : 1, { damping: 14, stiffness: 320 }) }],
    opacity: withTiming(active ? 1 : 0.86, { duration: 200 }),
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - bloomT.value),
    transform: [{ scale: 0.4 + bloomT.value * 1.2 }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.slot, { left: navSlotCenter(index) - SLOT_W / 2 }]}
      onPressIn={() => {
        pressed.value = 1;
        if (bloom) {
          bloomT.value = 0;
          bloomT.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
        }
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => onPress(index)}
      hitSlop={6}
    >
      {bloom && <Animated.View style={[styles.bloom, bloomStyle]} />}
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * The nav bar's idea: the mascot is paying attention. The active pill slides and
 * stretches toward the tapped tab, the mascot glances that way and bobs, and
 * tapping the mascot itself makes it jump. The bar sinks a little while the feed
 * is being scrolled downward and springs back as soon as the scroll eases.
 */
export function FloatingNavBar({ active, onChange, scrollY, scrollDirection }: Props) {
  const insets = useSafeAreaInsets();
  const pillX = useSharedValue(navPillLeft(active));
  const target = useSharedValue(navPillLeft(active));
  const look = useSharedValue(0);
  const blink = useSharedValue(0);
  const bob = useSharedValue(0);
  const squash = useSharedValue(1);

  // Idle blink every ~4s, looping on the UI thread.
  useEffect(() => {
    blink.value = withRepeat(
      withSequence(withDelay(3800, withTiming(1, { duration: 70 })), withTiming(0, { duration: 110 })),
      -1,
      false,
    );
  }, [blink]);

  useEffect(() => {
    const next = navPillLeft(active);
    target.value = next;
    pillX.value = withSpring(next, { damping: 15, stiffness: 190, mass: 0.9 });
  }, [active, pillX, target]);

  const react = useCallback(
    (index: number) => {
      const dir = index === MASCOT_INDEX ? 0 : Math.sign(index - MASCOT_INDEX);
      look.value = withSequence(
        withSpring(dir, { damping: 12, stiffness: 260 }),
        withDelay(650, withSpring(0, { damping: 14, stiffness: 200 })),
      );
      if (index === MASCOT_INDEX) {
        bob.value = withSequence(
          withTiming(-14, { duration: 160, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 9, stiffness: 240 }),
        );
        squash.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 300 }));
        blink.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 120 }));
        haptic('medium');
      } else {
        bob.value = withSequence(
          withTiming(-5, { duration: 110, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 11, stiffness: 260 }),
        );
        haptic('light');
      }
    },
    [look, bob, squash, blink],
  );

  const onPress = useCallback(
    (index: number) => {
      react(index);
      onChange(index);
    },
    [react, onChange],
  );

  // Pill stretches along the direction of travel while it is far from its target.
  const pillStyle = useAnimatedStyle(() => {
    const dist = Math.abs(target.value - pillX.value);
    const stretch = 1 + Math.min(dist / layout.nav.pillWidth, 1) * 0.28;
    return {
      transform: [{ translateX: pillX.value }, { scaleX: stretch }, { scaleY: 1 / Math.sqrt(stretch) }],
    };
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

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scaleY: squash.value }, { scaleX: 1 + (1 - squash.value) * 0.6 }],
  }));

  const bottom = Math.max(insets.bottom, 16) + layout.nav.bottomGap;

  return (
    <Animated.View style={[styles.wrap, { bottom }, barStyle]}>
      <View style={styles.shadow}>
        <View style={styles.bar}>
          {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navBar }]} />
          <Animated.View style={[styles.pill, pillStyle]} />
          <View style={styles.slots}>
            <NavButton index={0} active={active === 0} onPress={onPress} bloom label="Home">
              <HomeIcon />
            </NavButton>
            <NavButton index={1} active={active === 1} onPress={onPress} bloom label="Explore">
              <CompassIcon />
            </NavButton>
            <NavButton index={2} active={active === 2} onPress={onPress} bloom={false} label="Mascot">
              <Animated.View style={mascotStyle}>
                <Mascot look={look} blink={blink} />
              </Animated.View>
            </NavButton>
            <NavButton index={3} active={active === 3} onPress={onPress} bloom label="Stats">
              <BarsIcon />
            </NavButton>
            <NavButton index={4} active={active === 4} onPress={onPress} bloom label="Profile">
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
  pill: {
    position: 'absolute',
    top: layout.nav.padding,
    left: 0,
    width: layout.nav.pillWidth,
    height: layout.nav.pillHeight,
    borderRadius: layout.nav.pillRadius,
    backgroundColor: colors.navPill,
    pointerEvents: 'none',
  },
  slots: { flex: 1 },
  slot: { position: 'absolute', top: 0, bottom: 0, width: SLOT_W, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, pointerEvents: 'none' },
});
