# Miracle — Discover feed

A 1:1 rebuild of the "Discover" feed screen from the Miracle Figma file in React Native (Expo SDK 57,
TypeScript), with UI-thread animation and a floating nav bar that has an idea behind it.

- Brief: `docs/reference/brief.pdf`
- Figma reference capture: `docs/reference/figma-discover@2x.png`
- Design spec (every measured size and colour): `docs/superpowers/specs/2026-10-05-discover-feed-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-05-discover-feed.md`

## Running it

```bash
npm install
npx expo start            # scan with Expo Go (iOS or Android), or press i / a for a simulator
npx expo start --web      # browser preview (used for the fidelity pass below)
npm test                  # jest unit tests
npm run typecheck         # tsc --noEmit
```

Every dependency is in Expo Go's module list (Reanimated 4, Gesture Handler, SVG, Blur, Linear
Gradient, Image, Haptics, Masked View, Safe Area Context, FlashList 2), so no dev build is needed.

## What is on the screen

| Area | Implementation |
| --- | --- |
| Sky/cloud header | The Figma raster export (`assets/sky.png`, 393×504 pt), pinned to the top, parallaxed at 0.3× scroll on the UI thread. |
| Portfolio header | Label, value (counts up on mount), delta line, glass Deposit pill (the Figma's white gradient, rim and top highlight). |
| Top trades carousel | Horizontal `FlatList`, 204×92 cards with radius 24, 4 pt gap, snapping. |
| Tab row | Discover / Following / Rising / Favourites with 18 pt gaps; active label white, inactive white 70%, animated crossfade. Each tab shows a different slice of the mock feed. |
| Feed | `FlashList` v2 with a memoised `TradeCard`: 36 pt avatar + verified seal, Buy/Sell pill, stats line with 2 pt dot separators, a 2 pt thread line down to the coin logo with its swap badge, size/price/change line, 90×32 SVG sparkline (2.2 pt stroke, lifted "+" markers over ringed dots), and the expandable note (radius 20). |
| Floating nav bar | 304×64 pill (`#22242A` at 80%), icons on the measured slot centres, 56×48 active pill, cloud mascot in the centre, a 114 pt white fade behind it. |

## How the Figma was measured

Two passes. First, with view-only access, the screen was measured from lossless captures of the
Figma web viewer's WebGL canvas at 200% and 400% zoom. Second, with an editable copy of the file,
the Feed frame was copied as SVG and parsed (every rect, path, fill and opacity), and each text
layer's Typography panel was read. Every value in `src/theme` now comes from that second pass;
the spec lists them. The avatar photos were cropped from the capture; the sky export and the mascot
SVG are the designer's files.

Typeface: the Figma is set in **SF Pro Rounded** (Semibold almost everywhere; Bold 24 for the
portfolio value, Bold 15 for Deposit, Bold 11 for the Buy pill, Medium 13 for the note). Apple does
not expose the rounded design through React Native's `fontFamily` and its licence is Apple-only, so
the app ships **Nunito** (OFL), the closest rounded match, on every platform via
`@expo-google-fonts/nunito`. To use the real thing on iOS: put Apple's `SF-Pro-Rounded-*.otf` files
in `assets/fonts`, load them in `App.tsx`, and point the `family` map in `src/theme/typography.ts`
at them.

## Animation: the nav bar

The idea: **the mascot is paying attention.**

1. The active pill is a spring-driven 56×48 lens that slides to the tapped slot. While it is far from
   its target it stretches along the direction of travel (scaleX up to 1.28, scaleY compensates) and
   settles with a small overshoot. It is the Figma's 12% white capsule with a hairline rim so it
   reads as a lifted lens.
2. The ghost in the centre is a toy, not a tab: tapping it never moves the pill. It has a life of
   its own (`src/components/Mascot.tsx`, maths in `src/utils/mascotMotion.ts`):
   - **Breathing** runs on a UI-thread clock (`useFrameCallback`): about 3.8 s a breath (in for 40%,
     out for 45% and front-loaded like a passive exhale, then a pause), each breath a little
     different in length and depth. The cloud grows 3% taller breathing in; the halo follows
     ~200 ms later.
   - **Eyes** are a small rig over the raster: true ovals with catchlights that blink at random
     (sometimes twice), glance around now and then (often behind a blink, the head turning a little
     after them), widen, go happy (a body-white cheek rises inside each eye and leaves an arch) or
     roll in a dizzy swirl. Every tab change makes the ghost glance toward the tapped tab and bob.
   - **Tap:** pressing squashes it and winds it up; releasing spins it a full turn about its
     vertical axis on a spring. Side-on the cloud narrows to its depth instead of collapsing like a
     card, the face slides round and disappears while it faces away, then comes back smiling,
     overshoots and settles. It floats up 7 pt and lands with squash and stretch; the halo, a ring
     around that axis, stays level, lifts off a beat late and jiggles back. White comet trails
     whip round its middle while it turns: tapered SVG ribbons on two rings whose tail chases the
     turn on a slower clock, drawn behind the cloud so they only show round its sides, gone once
     it settles. Then a dizzy swirl, a blink, and a few quicker breaths. Light and soft haptics
     mark the press and the landing; a burst of taps stacks up to three turns. With Reduce Motion
     on it stays still and only smiles.
3. Press feedback: the pressed icon scales to 0.88 on a stiff spring and a soft white bloom expands
   and fades behind it.
4. Scroll-linked: while the feed is being scrolled downward the bar sinks 12 pt and shrinks to 0.97,
   springing back as soon as the scroll pauses or reverses.

Everything above is a Reanimated worklet (`useAnimatedStyle`, `withSpring`, `withSequence`,
`useAnimatedScrollHandler`), so it runs on the UI thread and keeps running at 60 fps while the list
scrolls.

## Other motion, deliberately limited

- Sparkline draws in once per card (stroke-dash offset through `animatedProps` on an SVG `Path`),
  entry markers pop as the line reaches them, the end dot lands last. A module-level set of ids makes
  sure recycled FlashList rows never replay it.
- Portfolio value counts up over 900 ms. This is the one JS-driven animation: text content cannot
  be set from the UI thread on the new architecture (the TextInput `text` animatedProps trick does
  not apply there), so a single Text re-renders per frame for under a second on mount.
- The first five cards enter with a staggered fade and 12 pt rise on the first mount only.
- Tab switch remounts the list so the first cards replay their entrance; active label opacity animates.
- "Read more" springs the note box open to its measured full height (an invisible copy of the full
  text provides the target so the spring has a real end value).
- Deposit button and nav icons scale on press; sky parallax at 0.3×.

Nothing else moves. The header, carousel and cards are static by design.

## Performance

- `FlashList` v2 with a memoised `renderItem`, stable `keyExtractor`, `extraData` for the expanded
  set, `drawDistance` of one screen.
- The Reanimated `createAnimatedComponent(FlashList)` wrapper registers the worklet scroll handler
  on the underlying scroll view directly. (Passing the handler as a plain `onScroll` prop crashes:
  FlashList calls it as a function.)
- Sparkline geometry (`src/utils/sparkline.ts`) is computed once per item with `useMemo` and
  rendered with `react-native-svg`, not images.
- No per-frame JS work while scrolling: scroll, pill, mascot, bloom and draw-in are all worklets.
  The only JS-driven motion is the 900 ms count-up on mount.
- Mock data is generated once at module load from a seeded PRNG, so renders are deterministic.

## Robustness

- `SafeAreaProvider` drives the header top padding and the nav bar's bottom offset (`max(inset, 16) + 2`,
  which lands the bar 36 pt above the bottom on an iPhone with a home indicator, as in the Figma).
- The feed has bottom padding so the last card clears the bar; layout is flex-based so other widths
  reflow (cards keep 4 pt margins, the carousel keeps its 204 pt cards and snaps).
- Dense rows clamp Dynamic Type with `maxFontSizeMultiplier` 1.2–1.3.
- Android: the nav bar uses a solid colour instead of `BlurView` and the bottom edge uses a plain
  gradient instead of the masked progressive blur. Web gets the same fallbacks.

## Tests

`npm test` runs unit tests for the formatters (worklet-safe, no `Intl`), the sparkline geometry,
the mock data (determinism, per-tab subsets, Figma values on the first card) and the nav geometry.

## Trade-offs and honest notes

- **Verification.** No iOS or Android device was attached to the machine this was built on, so the
  app was verified with the unit tests, `tsc`, and the Expo web build, where DOM measurements were
  compared against the exact Figma geometry (every measured box lands within 1 pt). The native-only paths
  (`BlurView`, `MaskedView`, haptics) follow the documented APIs. A later pass on an iPhone
  confirmed the layout and caught two things: the count-up not applying on the new architecture
  (now JS-driven) and native Liquid Glass drifting from the design (replaced by the faked glass
  above). A real-device recording is still to do.
- **Assets.** The verified seal, swap badge, coin logos and nav icons are hand-drawn SVGs matched to
  the capture rather than exported vectors. Two avatar photos are reused across the mock feed.
- **Fonts.** The design's SF Pro Rounded is replaced by Nunito on every platform (see above);
  letterforms are close but glyph widths differ by a few points, which shows most in the tab row.
- **Glass effects.** The Figma uses Glass + inner-shadow effects on the carousel cards, the Deposit
  button and the nav bar. I tried native Liquid Glass (`expo-glass-effect`, iOS 26) first: it looks
  great but cannot be tuned to the design (Apple's material is brighter and more frosted, the dark
  bar came out mid-grey, the active state a milky blob), it is iOS 26 only, and Android gets nothing.
  Since the brief grades fidelity and parity on both platforms, the glass is faked from the Figma's
  own values and renders identically everywhere: the 92% white card body with a white hairline, the
  Deposit gradient (white 32→64% at 32%) with a rim and a 1 pt top highlight, and the `#22242A` 80%
  bar over an iOS blur (a denser fill on Android) with a hairline rim and a 12% white lens. The
  native-glass version is in git history (`88badf4`) if a future iOS-only build wants it.
- **Tabs filter the same mock set** rather than fetching anything; the brief asked for mock data only.
- **Android blur.** A solid bar was chosen over `experimentalBlurMethod` to keep scrolling smooth.

## What I would do next

1. Record on a real iPhone and Android phone and tune spring constants by feel.
2. Add Sell-side sparkline colouring and a loading skeleton, and virtualise the carousel with
   FlashList if the data set grows.
3. Replace the hand-drawn SVG badges and logos with the Figma vector exports once the file can be
   exported.
4. Add gesture-driven dismissal of the nav bar and a pull-to-refresh that reuses the mascot.
5. Component tests with `@testing-library/react-native` for the card and nav bar interactions.
