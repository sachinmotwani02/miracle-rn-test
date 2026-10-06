# Ghost mascot motion — design

Date: 2026-10-05 · Status: approved in chat

## Goal

The cloud ghost in the centre of the floating nav bar is a toy, not a tab. Give it life:
more expressive eyes, a subtle, realistic breathing loop, and a fun 360° turn about its vertical axis
when it is tapped. The inspiration clip was used for principles only (eyes carry the emotion,
shape changes, gaze shifts hidden behind blinks, settle instead of stopping); nothing is copied.

## Behaviour change

- Tapping the ghost no longer selects it: the active pill and the `nav` state stay put.
- It is a plain button (`accessibilityRole="button"`, label "Ghost", hint "Spins the ghost").
- Tapping a real tab makes the ghost glance toward it with a barely-there 1.5 pt hop. (The first
  build bobbed 5 pt with a springy overshoot, which read as part of the selection; on review it was
  dropped, then brought back very subtle so the pill stays the main thing that moves.)

## Approach

A Reanimated rig over the existing raster (`assets/mascot_body.png`, 340×400 = 10× the 34×40 pt box).
No new dependencies; every animation runs on the UI thread; works in Expo Go and on web.
Rejected: rebuilding the body in react-native-svg (its five stacked inner shadows are not reliably
supported), Lottie/Rive (needs authored files plus a native dependency, and cannot easily take the
live glance-toward-tab input).

## Rig (34×40 pt box)

- **Halo layer:** the PNG clipped to y 0–8.8 (halo occupies rows 3.1–8.5 pt).
- **Body layer:** the same PNG clipped to y 8.8–40 (body occupies 9.2–37.8 pt). Eyes live inside it.
- **Pivot:** the body centre (17, 23.5) for the squash and stretch; the turn's axis runs
  vertically through x = 17.
- Everything stays inside the 64 pt bar while turning and lifting.

## Eyes

- At rest the eyes are exactly the Figma ellipses from `Ghost.svg`: 4.089×6.578 pt (a 6.578 pt
  circle scaled 0.6216 on X), tilted −8°, centres (15.685, 20.77) and (21.419, 19.925), plain
  `#131722`. (The first build added white catchlights; removed on review, the design has none.)
  The cloud and halo raster matches `Ghost.svg` pixel for pixel.
- **Blink:** close in 70 ms, open in 130 ms, the slit sits slightly low like a lid. Idle blinks
  every 2–6 s at random, one in five is a double blink.
- **Idle glances:** every 4–9 s the eyes dart (stiff spring, slight overshoot) to a random point,
  ±2.2 pt across and ±1.4 pt up and down; half of the darts hide behind a blink. Hold 0.9–1.8 s, return.
  Eyes narrow up to 12% when looking far to the side.
- **Expressions** (each 0..1, combinable): *wide* (eyes grow 20%), *happy ∩∩* (a body-white
  "cheek" rises inside each eye so the visible part is an arch),
  *dizzy* (gaze traces a small circle that grows and shrinks).
- **Tab glance:** eyes dart toward the tapped tab and widen a little (the head turns 12° after
  them), return after 650 ms. The body hops 1.5 pt (120 ms ease-out) and settles on a
  well-damped spring (`stiffness 300, damping 21`, under 0.15 pt overshoot), about 0.5 s in all.

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

The turn is about the ghost's own vertical axis (a pirouette), not a spin in the screen plane;
the first build spun it in the plane and was corrected after review on device.

1. **Press in:** squash (scaleY 0.88, scaleX compensates), turn −15° against the coming turn,
   eyes wide, light haptic.
2. **Release:** spring to the next full turn (`stiffness 55, damping 10, mass 1`): about 360° in
   0.42 s, overshoot about 20°, settle by about 1 s. Lift 7 pt (240 ms ease-out) then settle on a
   soft spring; stretch to 1.08 on take-off, squash to 0.92 on landing. Eyes go happy ∩∩.
3. **Fake 3D from one front-view raster:** in plan view the cloud is an ellipse 0.6 as deep as it
   is wide (`turnPose` in `mascotMotion.ts`). Its silhouette narrows to 0.6 side-on instead of
   collapsing like a card; the face (both eyes) slides round the ellipse, foreshortens by its
   surface normal and is hidden while the ghost faces away.
4. **Halo:** a ring around that axis, so it does not turn. It lags the take-off, floats on past
   the top, settles on a loose spring and tilts a few degrees on landing.
5. **Trails** (added after review): two white comet trails on horizontal rings round the cloud
   (heights 19 and 28.5 pt, half-widths 20 and 22 pt). Each is a ribbon from a tail angle that
   chases the turn over 700 ms (ease in-out cubic) to the turn's own angle, capped at 140° of arc,
   1.8 pt thick at the head and tapering to a point. Drawn behind the cloud, so they only show
   round its sides; they fade as the tail catches up and are gone by about 0.65 s.
6. **Landing (≈0.45 s):** soft haptic; eyes open into the dizzy swirl (0.65 s), then a blink.
- The head also follows the eyes: 12° toward a tapped tab, up to 6° with idle glances.
- Tapping again during a turn adds one more turn (the spring keeps its velocity); a burst of taps
  stacks up to three turns.
- The idle blink and glance scheduler pauses while a turn is playing.

## Hold: colourful swirl and big spin (added after review)

Hold only; quick taps are unchanged and three quick taps still just stack turns.

- **Charge:** once a press has lasted 300 ms, five coloured ribbons (halo gold, pink `#FF5FA2`,
  violet `#9B6BFF`, sky blue, mint `#3DDC97`) fade in on tilted orbits round the cloud (tilts
  −55° to 52°, 19–23 pt wide), each at its own speed. The swirl speeds up to 650°/s over 900 ms
  and the ribbons lengthen with speed (40° → up to 200° of arc). The ghost hunkers down (squash
  0.84), grins (happy 0.55) and turns away to −32°. Three selection ticks: at the start, halfway
  and at full charge. Holding longer keeps it charged; it never fires on its own.
- **Depth:** each ribbon is drawn twice: its near half over the cloud and its far half behind
  it (`ribbonPaths` in `mascotMotion.ts`), so the swirl reads as rings round the ghost.
- **Let go** with at least 30% charge (about 0.57 s of holding): medium haptic, a double turn
  (720°, `stiffness 60, damping 12.5, mass 1`), lift 9 pt, stretch 1.1 and squash 0.9 on landing,
  halo lifts 5 pt late and tilts 7°. The swirl whips round at 1100°/s; the white trails stay off.
  At the landing (480 ms) a soft haptic and the swirl bursts outward (orbits grow 1.45×) and fades
  over 420 ms. Then happy eyes, a 1 s dizzy swirl, a blink and quicker breathing; about 2 s in all.
  Taps during the big spin are ignored.
- **Let go early** (under 30%): the swirl fades and it is an ordinary turn. **Slide off**: the
  swirl fizzles out and the ghost relaxes.
- The swirl's clock only runs while it is showing, so it costs nothing at rest.

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
