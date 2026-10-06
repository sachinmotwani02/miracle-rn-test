# Miracle — Discover feed

A 1:1 rebuild of the "Discover" feed screen from the Miracle Figma file in React Native (Expo SDK 57,
TypeScript), with UI-thread animation and a floating nav bar that has an idea behind it.

- Brief: `docs/reference/brief.pdf`
- Figma reference capture: `docs/reference/figma-discover@2x.png`
- Design spec (every measured size and colour): `docs/superpowers/specs/2026-10-05-discover-feed-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-05-discover-feed.md`

## Running it

```bash
npm install               # also applies patches/ (patch-package, see Trade-offs)
npx expo start            # scan with Expo Go (iOS or Android), or press i / a for a simulator
npx expo start --web      # browser preview (used for the fidelity pass below)
npm test                  # jest unit tests
npm run typecheck         # tsc --noEmit
```

Every native dependency is in Expo Go's module list (Reanimated 4, Gesture Handler, SVG, Blur, Linear
Gradient, Image, Haptics, Masked View, Safe Area Context, FlashList 2), and the one addition,
`number-flow-react-native`, is plain JavaScript on Reanimated, so no dev build is needed.

## What is on the screen

| Area | Implementation |
| --- | --- |
| Sky/cloud header | The Figma raster export (`assets/sky.png`, 393×504 pt), pinned to the top, parallaxed at 0.3× scroll on the UI thread. |
| Portfolio header | Label, value and 24h change (they roll up from the 24h-ago figures when the screen opens, and to a fresh value when you come back to the app), glass Deposit pill (the Figma's white gradient, rim and top highlight). |
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
`@expo-google-fonts/nunito`. Nunito is one step lighter and ~3% wider than SF Pro Rounded at the
same nominal weight (checked against the Figma at 6× zoom), so each Figma weight maps one step up
(Medium→SemiBold, SemiBold→Bold, Bold→ExtraBold) and tracking is pulled in by 1%. To use the real thing on iOS: put Apple's `SF-Pro-Rounded-*.otf` files
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
   - **Eyes** are a small rig over the raster (exactly the Figma ovals at rest) that blink at random
     (sometimes twice), glance around now and then (often behind a blink, the head turning a little
     after them), widen, go happy (a body-white cheek rises inside each eye and leaves an arch) or
     roll in a dizzy swirl. Every tab change makes the ghost glance toward the tapped tab with a
     barely-there 1.5 pt hop.
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
   - **Hold:** after 300 ms a colourful swirl charges up round it: five ribbons (halo gold, pink,
     violet, sky blue, mint) on tilted orbits, passing in front of and behind the cloud, faster and
     longer the longer you hold, with three light haptic ticks. Let go and it does a double spin
     with the swirl whipping round it, which bursts outward and fades as it lands. Slide off and
     the swirl fizzles out.
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
- The portfolio numbers move only when their data does. When the screen opens they start where the
  portfolio stood 24 hours ago ($11,993.50, +$0.00) and a beat later roll up to now, so the first
  motion says how the day went. When you come back to the app, a fresh value lands 400 ms later: a
  simulated market (`src/data/live.ts`, maths in `src/utils/ticker.ts`) has walked on for as long as
  you were away, pulled back toward where it started so it never strays far, and the 24h change is
  recomputed against the value 24 hours ago so the two lines always agree. `number-flow-react-native`
  rolls only the digits that changed (900 ms, on the UI thread), upward when the value rises. Screen
  readers always hear the current figures; with Reduce Motion on the screen opens on them. Both live
  in `DiscoverScreen`, above the list that remounts on every tab switch, so a tab change neither
  replays the roll nor drops a refresh.
- The first five cards enter with a staggered fade and 12 pt rise on the first mount only.
- Tab switch remounts the list so the first cards replay their entrance; active label opacity animates.
- "Read more" springs the note box open to its measured full height (an invisible copy of the full
  text provides the target so the spring has a real end value).
- Deposit button and nav icons scale on press; sky parallax at 0.3×.

Nothing else moves. Apart from those two moments for the numbers, the header, carousel and cards are
static by design.

## Performance

- `FlashList` v2 with a memoised `renderItem`, stable `keyExtractor`, `extraData` for the expanded
  set, `drawDistance` of one screen.
- The Reanimated `createAnimatedComponent(FlashList)` wrapper registers the worklet scroll handler
  on the underlying scroll view directly. (Passing the handler as a plain `onScroll` prop crashes:
  FlashList calls it as a function.)
- Sparkline geometry (`src/utils/sparkline.ts`) is computed once per item with `useMemo` and
  rendered with `react-native-svg`, not images.
- No per-frame JS work: scroll, pill, mascot, bloom, draw-in and the digit rolls are all worklets.
  The portfolio figures re-render the list header only when they change: once as the screen opens
  and once per return to the app.
- Mock data is generated once at module load from a seeded PRNG, so renders are deterministic.

## Robustness

- `SafeAreaProvider` drives the header top padding and the nav bar's bottom offset (`max(inset, 16) + 2`,
  which lands the bar 36 pt above the bottom on an iPhone with a home indicator, as in the Figma).
- The feed has bottom padding so the last card clears the bar; layout is flex-based so other widths
  reflow (cards keep 4 pt margins, the carousel keeps its 204 pt cards and snaps).
- Dense rows clamp Dynamic Type with `maxFontSizeMultiplier` 1.2–1.3. NumberFlow has no such prop,
  so the live numbers pre-shrink their type above the cap to the same effect (`src/utils/flowStyle.ts`).
- Android: the nav bar uses a solid colour instead of `BlurView` and the bottom edge uses a plain
  gradient instead of the masked progressive blur. Web gets the same fallbacks.

## Tests

`npm test` runs unit tests for the formatters (worklet-safe, no `Intl`), the sparkline geometry,
the mock data (determinism, per-tab subsets, Figma values on the first card) and the nav geometry,
plus the portfolio numbers: the random walk (whole cents, step sizes, pull back to the start, how far
it gets for the time away), the live hook (still while open, a refresh on return but not after a trip
to inactive, cleanup), the opening roll (24h-ago figures first, Reduce Motion) and the screen-reader
labels, and the patched NumberFlow (glyphs placed with the tracking, clips untouched; these fail if
the patch was not applied).

## Trade-offs and honest notes

- **Verification.** No iOS or Android device was attached to the machine this was built on, so the
  app was verified with the unit tests, `tsc`, and the Expo web build, where DOM measurements were
  compared against the exact Figma geometry (every measured box lands within 1 pt). The native-only paths
  (`BlurView`, `MaskedView`, haptics) follow the documented APIs. A later pass on an iPhone
  confirmed the layout and caught two things: the count-up not applying on the new architecture
  (since replaced by the live value) and native Liquid Glass drifting from the design (replaced by
  the faked glass above). A real-device recording is still to do.
- **Live value: a patched library.** `number-flow-react-native` 0.5.1 ignores `letterSpacing`: it
  places each glyph at the sum of the measured widths before it, so the value lost the Figma's −3%
  tracking and rendered about 10 pt wider than the static text. `patches/number-flow-react-native+0.5.1.patch`
  (applied by `patch-package` on every `npm install`) adds the tracking to those positions only; each
  rolling digit keeps its full glyph width as its clip, so nothing is shaved. On web every glyph now
  lands within about 1 px of a tracked Text (`src/__tests__/numberFlowPatch.test.tsx` covers the maths
  and the component). The library is pinned to exactly 0.5.1 because a patch is tied to one version.
  Its edge fade needs a masked view (`@expo/ui`), so without one each rolling digit fades on its own
  instead. 0.5.1 can also leave a fading digit stuck if a roll is interrupted; the numbers change only
  as the screen opens and on each return to the app, seconds apart, so every roll finishes first.
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
6. Offer the `letterSpacing` support upstream to number-flow-react-native and drop the local patch
   once a release includes it.
