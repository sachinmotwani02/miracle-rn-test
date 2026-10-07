import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, layout } from '../theme';
import { ResolveLook, TAB_RESOLVE, resolveDelay, resolveFrame } from '../utils/tabResolve';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// iOS and web blur whatever sits under the overlay. Android's BlurView needs a BlurTargetView
// around the content and would only paint a tint here, so Android resolves with scale and fade.
const CAN_BLUR = Platform.OS !== 'android';

/**
 * The screen's side of the resolve. `pending` (0 = sharp, 1 = fully soft) starts rising on the tap,
 * straight from the press handler, so the cards soften on the UI thread while the new feed renders.
 * `softening` is true from the tap until the tapped feed is on screen; it mounts the blur overlays.
 * `look` is TAB_RESOLVE, or the Dials' live values in a dev build.
 */
export interface TabSoften {
  pending: SharedValue<number>;
  softening: boolean;
  look: ResolveLook;
}

export const TabSoftenContext = createContext<TabSoften | null>(null);

interface Props {
  /** Bumped by the screen when a switch puts a new feed in the cards; a change plays the resolve. */
  resolveKey: number;
  index: number;
  children: React.ReactNode;
}

/**
 * Plays the tab switch resolve (see TAB_RESOLVE) around one feed card. Only what is inside the card
 * softens: a solid white shell sits behind it, so the card never turns see-through to the sky, and
 * the blur stops at the card's 4 pt rim, so its edge stays crisp; the whole card only scales. The
 * fade is on the content, and the blur is a sibling overlay outside it (a blur view under a
 * see-through ancestor renders wrong on iOS), mounted only while the card softens or resolves. The screen hands the softening over through
 * context, so the tap re-renders these wrappers and not the list.
 */
export function TabResolve({ resolveKey, index, children }: Props) {
  const soften = useContext(TabSoftenContext);
  const reduced = useReducedMotion();
  const look = soften?.look ?? TAB_RESOLVE;
  const delay = resolveDelay(index, look);
  const takesPart = delay !== null && !reduced;
  const progress = useSharedValue(1);
  const sharp = useSharedValue(0);
  const pending = soften && takesPart ? soften.pending : sharp;
  const [seenKey, setSeenKey] = useState(resolveKey);
  // A run keeps the timing it started with, so a dial moved mid-run applies from the next switch.
  const [run, setRun] = useState<{ id: number; delay: number; duration: number; easing: ResolveLook['easing'] } | null>(null);
  // The blur stays up while the screen eases `pending` back (tapped away and back before the cards
  // changed), so it fades with the scale and the opacity instead of vanishing in one frame.
  const softening = !!soften?.softening;
  const [wasSoftening, setWasSoftening] = useState(softening);
  const [settling, setSettling] = useState(false);
  // The card's height is held from the tap (see `onContentLayout`), and only with motion on.
  const glideMs = reduced ? 0 : look.height;
  const [holding, setHolding] = useState(false);
  if (softening !== wasSoftening) {
    setWasSoftening(softening);
    setSettling(!softening);
    if (softening && glideMs > 0) setHolding(true);
  }

  // A mount (or a recycled card that scrolls in) takes the current key quietly; only a change
  // while mounted is a switch.
  if (resolveKey !== seenKey) {
    setSeenKey(resolveKey);
    if (takesPart) setRun({ id: resolveKey, delay, duration: look.duration, easing: look.easing });
  }

  // Before paint, and before the screen lets go of `pending` (parents' layout effects run after
  // their children's): the card takes over from however soft the tap had made it, so the new
  // content's first frame matches the last frame of the old.
  useLayoutEffect(() => {
    if (!run) return;
    progress.set(1 - pending.get());
    progress.set(withDelay(run.delay, withTiming(1, { duration: run.duration, easing: run.easing })));
  }, [run, progress, pending]);

  useEffect(() => {
    if (!run) return;
    const id = setTimeout(() => setRun(null), run.delay + run.duration + 50);
    return () => clearTimeout(id);
  }, [run]);

  useEffect(() => {
    if (!settling) return;
    const id = setTimeout(() => setSettling(false), look.duration + 50);
    return () => clearTimeout(id);
  }, [settling, look.duration]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resolveFrame(Math.min(progress.value, 1 - pending.value), look).scale }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: resolveFrame(Math.min(progress.value, 1 - pending.value), look).opacity,
  }));
  const blurProps = useAnimatedProps(() => ({
    intensity: resolveFrame(Math.min(progress.value, 1 - pending.value), look).intensity,
  }));

  // Height. The new feed's card is often taller or shorter than the old one (a note's line count).
  // From the tap the card keeps its height; when the new content lays out, the card eases to the
  // new height on the UI thread, and FlashList moves the cards below as the card resizes, as it
  // does when "Read more" opens a note. Then the card lets go and sizes to its content again.
  // `box` is the held height, -1 when the card sizes itself.
  const box = useSharedValue(-1);
  const natural = useRef(0);
  const held = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = useCallback(
    (after: number) => {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        held.current = false;
        box.set(-1);
        setHolding(false);
      }, after);
    },
    [box],
  );
  useLayoutEffect(() => {
    held.current = holding;
    if (holding && natural.current > 0) box.set(natural.current);
  }, [holding, box]);
  // Once the new feed is in (or the tap was taken back), let go a moment after any glide.
  useEffect(() => {
    if (holding && !softening) release(glideMs + 250);
  }, [holding, softening, glideMs, release]);
  useEffect(() => () => clearTimeout(releaseTimer.current), []);
  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      if (held.current && natural.current > 0 && height !== natural.current) {
        box.set(withTiming(height, { duration: glideMs, easing: look.easing }));
        release(glideMs + 80);
      }
      natural.current = height;
    },
    [box, glideMs, look.easing, release],
  );
  const heightStyle = useAnimatedStyle(() => ({ height: box.value < 0 ? 'auto' : box.value }));

  const blurring = CAN_BLUR && takesPart && (run !== null || softening || settling);
  return (
    <Animated.View style={scaleStyle}>
      {/* The card's slot: rounded like the card, so while it clips a growing card the corners stay round. */}
      <Animated.View style={[styles.slot, holding && styles.clip, heightStyle]} testID={holding ? 'tab-resolve-hold' : undefined}>
        {takesPart ? <View style={styles.shell} /> : null}
        <Animated.View style={[styles.content, fadeStyle]} onLayout={onContentLayout}>
          {children}
        </Animated.View>
        {blurring ? (
          <View style={styles.overlay} testID="tab-resolve-blur">
            {/* Starts unblurred: the animated props take it to the live value from the first frame. */}
            <AnimatedBlurView animatedProps={blurProps} intensity={0} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Exactly the card's box: TradeCard's slot margin and radius.
  slot: { marginHorizontal: layout.cardMargin, borderRadius: layout.cardRadius },
  clip: { overflow: 'hidden' },
  // The card brings its own side margins; it sits full width, so it lines up with the slot.
  content: { marginHorizontal: -layout.cardMargin },
  // Fills the slot and stays opaque while the content fades.
  shell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.card,
  },
  // Inside the card's rim, on the note box's inset and radius, so the blur never reaches the edge.
  overlay: {
    position: 'absolute',
    top: layout.noteInset,
    bottom: layout.noteInset,
    left: layout.noteInset,
    right: layout.noteInset,
    borderRadius: layout.noteRadius,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
});
