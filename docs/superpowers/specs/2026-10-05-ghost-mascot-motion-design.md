# Ghost mascot motion — design

Date: 2026-10-05 · Status: approved in chat

## Goal

The cloud ghost in the centre of the floating nav bar is a toy, not a tab. Give it life:
more expressive eyes, a subtle, realistic breathing loop, and a fun 360° turn on the Z axis
when it is tapped. The inspiration clip was used for principles only (eyes carry the emotion,
shape changes, gaze shifts hidden behind blinks, settle instead of stopping); nothing is copied.

## Behaviour change

- Tapping the ghost no longer selects it: the active pill and the `nav` state stay put.
- It is a plain button (`accessibilityRole="button"`, label "Ghost", hint "Spins the ghost").
- Tapping a real tab still makes the ghost glance toward it and bob, as before.

## Approach

A Reanimated rig over the existing raster (`assets/mascot_body.png`, 340×400 = 10× the 34×40 pt box).
No new dependencies; every animation runs on the UI thread; works in Expo Go and on web.
Rejected: rebuilding the body in react-native-svg (its five stacked inner shadows are not reliably
supported), Lottie/Rive (needs authored files plus a native dependency, and cannot easily take the
live glance-toward-tab input).

## Rig (34×40 pt box)

- **Halo layer:** the PNG clipped to y 0–8.8 (halo occupies rows 3.1–8.5 pt).
- **Body layer:** the same PNG clipped to y 8.8–40 (body occupies 9.2–37.8 pt). Eyes live inside it.
- **Pivot:** the body centre (17, 23.5) for the spin and for the halo's lag.
- Everything stays inside the 64 pt bar while spinning (maximum reach about 22 pt from the pivot).

## Eyes

- True ellipses 4.2×6.6 pt (a 6.6 pt circle scaled 0.636 on X), tilted −8°, centres (15.7, 20.8)
  and (21.4, 19.9), colour `#131722`. Each has a 1.3 pt white catchlight at the upper left.
- **Blink:** close in 70 ms, open in 130 ms, the slit sits slightly low like a lid. Idle blinks
  every 2–6 s at random, one in five is a double blink.
- **Idle glances:** every 4–9 s the eyes dart (stiff spring, slight overshoot) to a random point,
  ±2.2 pt across and ±1.4 pt up and down; half of the darts hide behind a blink. Hold 0.9–1.8 s, return.
  Eyes narrow up to 12% when looking far to the side.
- **Expressions** (each 0..1, combinable): *wide* (eyes grow 20%), *happy ∩∩* (a body-white
  "cheek" rises inside each eye so the visible part is an arch; catchlight fades out),
  *dizzy* (gaze traces a small circle that grows and shrinks).
- **Tab glance:** eyes dart toward the tapped tab and widen a little, return after 650 ms;
  the ghost bobs 5 pt.

## Breathing

- Driven by a UI-thread clock (`useFrameCallback`): phase advances by `dt / period`.
- Cycle about 3.8 s: inhale 40% (ease in-out), exhale 45% (front-loaded, like a passive exhale),
  rest 15%. Each breath draws a new period (±10%) and depth (±10%) at the rest point, so there
  is never a visible jump.
- Inhale: body scaleY +3%, scaleX +1.5%, rises 0.5 pt. The halo follows about 200 ms later and
  rises 0.8 pt (follow-through).
- After a spin, "exertion" goes to 1 and decays over about 6 s: breaths run up to 45% faster and
  up to 60% deeper, then calm down.

## Tap: the turn (about 1.2 s)

1. **Press in:** squash (scaleY 0.88, scaleX compensates), wind up −12°, eyes wide, light haptic.
2. **Release:** spring clockwise to the next full turn (`stiffness 70, damping 11, mass 1`): about 360° in
   0.36 s, overshoot about 20°, settle by 0.9 s. Lift 7 pt (240 ms ease-out) then settle on a soft
   spring; stretch to 1.08 on take-off, squash to 0.92 on landing. Eyes go happy ∩∩.
3. **Halo:** its own softer spring to the same angle, so it trails behind during the spin and
   overshoots a little more at the end (relative angle stays within about ±35°).
4. **Landing (≈0.45 s):** soft haptic; eyes open into the dizzy swirl (0.65 s), then a blink.
- Tapping again during a turn adds one more turn (the spring keeps its velocity), at most three
  turns ahead of the current angle.
- The idle blink and glance scheduler pauses while a turn is playing.

## Reduce Motion

`useReducedMotion()`: no breathing, no idle blinks or glances, no spin, no lift. A tap shows the
happy eyes for 0.9 s (a state change, not movement).

## Code

- `src/utils/mascotMotion.ts`: pure, worklet-safe helpers (breath curve, next turn target,
  dizzy offset, random range) with jest tests in `src/__tests__/mascotMotion.test.ts`.
- `src/utils/haptics.ts`: the `haptic(style)` helper shared by the nav bar and the mascot.
- `src/components/Mascot.tsx`: renders the rig and owns breathing, blinking, idle gaze, the turn
  and its own press handling. Exposes `glance(direction)` through its `ref` for the nav bar.
- `src/components/FloatingNavBar.tsx`: the centre slot hosts the mascot directly (no tab
  semantics, no `onChange`); the old jump and squash code goes away.
- README: the nav bar animation section describes the new behaviour.

## Verification

jest, `tsc --noEmit`, `expo lint`; the Expo web preview with frames captured during a turn to
check that nothing clips and the pill does not move. Haptics and the final feel need a device.
