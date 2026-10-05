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
| Portfolio header | Label, value (counts up on mount through a `TextInput` driven by `animatedProps`, no React re-render per frame), delta line, glass Deposit pill (white 20% + 1 pt white 35% border). |
| Top trades carousel | Horizontal `FlatList`, 204×92 cards with radius 24, 4 pt gap, snapping. |
| Tab row | Discover / Following / Rising / Favourites with 18 pt gaps; active label white, inactive white 70%, animated crossfade. Each tab shows a different slice of the mock feed. |
| Feed | `FlashList` v2 with a memoised `TradeCard`: 36 pt avatar + verified seal, Buy/Sell pill, stats line, coin logo with the swap badge, size/price/change line, 90×32 SVG sparkline with entry markers, and the expandable note. |
| Floating nav bar | 300×64 pill, five equal slots, 56 pt active circle, cloud mascot in the centre, progressive blur/fade behind it. |

## How the Figma was measured

The Figma MCP server refused the file (view-only access), so the screen was measured from lossless
captures of the Figma web viewer's WebGL canvas at 200% and 400% zoom (3.5 and 7 device px per pt).
Every spacing, radius, type size and colour in `src/theme` comes from those captures; the spec lists
them. The avatar photos were cropped from the 400% capture; the sky export and the mascot SVG were
supplied afterwards and replaced the reproductions.

Typeface: the Figma uses SF Pro. iOS renders it as the system font; Android and web load Inter
(the closest metric match) through `@expo-google-fonts/inter`. The `font(weight)` helper in
`src/theme/typography.ts` hides the split.

## Animation: the nav bar

The idea: **the mascot is paying attention.**

1. The active pill is a spring-driven circle that slides to the tapped slot. While it is far from its
   target it stretches along the direction of travel (scaleX up to 1.28, scaleY compensates) and
   settles with a small overshoot.
2. Every tab change makes the mascot glance toward the tapped tab (its eyes are separate animated
   views over the raster body) and do a short bob. Tapping the mascot itself makes it jump with
   squash-and-stretch, blink, and fire a medium haptic. It also blinks idly every few seconds.
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
- Portfolio value counts up over 900 ms.
- The first five cards enter with a staggered fade and 12 pt rise on the first mount only.
- Tab switch crossfades the list; active label opacity animates.
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
- No per-frame JS work: scroll, pill, mascot, bloom, draw-in and count-up are all worklets.
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
  compared against the Figma numbers (everything lands within ~1 pt). The native-only paths
  (`BlurView`, `MaskedView`, haptics, the `TextInput` count-up) follow the documented APIs but were
  not exercised on a device from here. A real-device recording is still to do.
- **Assets.** The verified seal, swap badge, coin logos and nav icons are hand-drawn SVGs matched to
  the capture rather than exported vectors. Two avatar photos are reused across the mock feed.
- **Fonts.** SF Pro is only available on iOS; Inter is a close but not identical substitute on
  Android, so glyph widths differ slightly there.
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
