import { Easing, FadeInDown } from 'react-native-reanimated';

/** Strong ease-out (quint): most of the rise lands in the first ~90 ms, then it stops dead. */
const EASE_OUT_QUINT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Staggered entrance for the first feed cards: each fades in and rises 12 pt into its slot.
 *
 * Timing, not a spring, on purpose. The earlier critically damped spring (420 ms) reached 90% at
 * 200 ms but crawled through the last 10% until ~630 ms, and with a 70 ms stagger the fifth card
 * stayed invisible for 280 ms, so the switch read as floaty. A short ease-out has no tail, and the
 * 40 ms stagger keeps the cascade readable while the last card is in place by ~420 ms.
 */
export function cardEntrance(index: number) {
  return FadeInDown.delay(index * 40)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .duration(260)
    .easing(EASE_OUT_QUINT);
}
