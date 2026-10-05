import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, navPillLeft, navSlotCenter } from '../theme';
import { haptic } from '../utils/haptics';
import { BarsIcon, CompassIcon, HomeIcon, PersonIcon } from './NavIcons';
import { Mascot, MascotHandle } from './Mascot';

export const NAV_ITEMS = ['home', 'explore', 'mascot', 'stats', 'profile'] as const;
/** The ghost's slot. It is a toy, not a tab: tapping it never changes `active`. */
const MASCOT_INDEX = 2;

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
  const bloomT = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.88 : 1, { damping: 14, stiffness: 320 }) }],
    // Figma keeps every icon full white; the pill alone marks the active slot.
    opacity: withTiming(active ? 1 : 0.96, { duration: 200 }),
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
        bloomT.value = 0;
        bloomT.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => onPress(index)}
      hitSlop={6}
    >
      <Animated.View style={[styles.bloom, bloomStyle]} />
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * The nav bar's idea: the ghost is paying attention. The active pill slides and
 * stretches toward the tapped tab and the ghost glances that way and bobs. The ghost
 * itself is a toy with a life of its own (see Mascot); tapping it never changes the
 * tab. The bar sinks a little while the feed is being scrolled downward and springs
 * back as soon as the scroll eases.
 */
export function FloatingNavBar({ active, onChange, scrollY, scrollDirection }: Props) {
  const insets = useSafeAreaInsets();
  const pillX = useSharedValue(navPillLeft(active));
  const target = useSharedValue(navPillLeft(active));
  const mascot = useRef<MascotHandle>(null);

  useEffect(() => {
    const next = navPillLeft(active);
    target.value = next;
    pillX.value = withSpring(next, { damping: 15, stiffness: 190, mass: 0.9 });
  }, [active, pillX, target]);

  const onPress = useCallback(
    (index: number) => {
      mascot.current?.glance(Math.sign(index - MASCOT_INDEX));
      haptic('light');
      onChange(index);
    },
    [onChange],
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
          <Animated.View style={[styles.pill, pillStyle]} />
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
  // Figma: 12% white capsule. A hairline rim highlight sells it as a lifted glass lens.
  pill: {
    position: 'absolute',
    top: layout.nav.padding,
    left: 0,
    width: layout.nav.pillWidth,
    height: layout.nav.pillHeight,
    borderRadius: layout.nav.pillRadius,
    backgroundColor: colors.navPill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
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
  bloom: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, pointerEvents: 'none' },
});
