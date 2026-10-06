import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SKELETON, sweepTrack } from '../../utils/skeleton';
import { SweepContext } from './Bone';

/**
 * Ease-in-out cubic: the band picks up speed while still off screen, so what shows is the fast
 * middle of the pass, a snappy glint rather than a glide.
 */
const SNAP = Easing.bezier(0.645, 0.045, 0.355, 1);

/**
 * Runs the skeleton's one light sweep while `active`: a faint band snaps across the screen, rests
 * off screen, and crosses again. Every bone below reads the same band, so they light up in step.
 * Off with Reduce Motion, and parked off screen whenever nothing is loading.
 */
export function SkeletonSweep({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { from, to } = sweepTrack(width);
  const sweep = useSharedValue(from);

  useEffect(() => {
    cancelAnimation(sweep);
    sweep.set(from);
    if (!active || reduceMotion) return;
    const { duration, pause } = SKELETON.sweep;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(to, { duration, easing: SNAP }),
          // Rest past the right edge, then jump back to the left while out of sight.
          withDelay(pause, withTiming(from, { duration: 0 })),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [active, reduceMotion, from, to, sweep]);

  return <SweepContext.Provider value={sweep}>{children}</SweepContext.Provider>;
}
