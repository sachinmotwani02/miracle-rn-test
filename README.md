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
npm run lint              # expo lint (ESLint 9, eslint-config-expo)
```

Every native dependency is in Expo Go's module list (Reanimated 4, Gesture Handler, SVG, Blur, Linear
Gradient, Image, Haptics, Masked View, Safe Area Context, FlashList 2), so no dev build is needed.

## What is on the screen

| Area | Implementation |
| --- | --- |
| Sky/cloud header | The Figma raster export (`assets/sky.png`, 393×504 pt), pinned to the top, parallaxed at 0.3× scroll on the UI thread. |
| Sky bar | That sky behind the status bar while the header scrolls under it, and a light fade there over the feed; on scroll up in the feed it brings a feed dropdown and Deposit (see below). |
| Portfolio header | Label, value and 24h change (bones until the portfolio loads, then the loaded figures, which hold still), glass Deposit pill (the Figma's white gradient with its drop shadow and inner glow). |
| Top trades carousel | Horizontal `FlatList`, 204×92 cards with radius 24, 4 pt gap, snapping. |
| Tab row | Discover / Following / Rising / Favourites with 18 pt gaps; active label white, inactive white 70%, a 100 ms crossfade; it folds into the sky bar's feed dropdown on scroll. Each tab shows a different slice of the mock feed. |
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
portfolio value, Bold 15 for Deposit, Bold 11 for the Buy pill, Medium 13 for the note). On iOS
the app uses the real thing: it is a system font there, reached with `fontFamily: 'ui-rounded'`
(UIFontDescriptorSystemDesignRounded), so nothing is bundled and the Figma weights and tracking apply
unchanged. Apple's licence forbids shipping the font files, so Android and web use **Nunito** (OFL),
the closest rounded match, via `@expo-google-fonts/nunito`. Nunito is one step lighter and ~3% wider
than SF Pro Rounded at the same nominal weight (checked against the Figma at 6× zoom), so there each
Figma weight maps one step up (Medium→SemiBold, SemiBold→Bold, Bold→ExtraBold) and tracking is
pulled in by 1%. Both live in the `family` map in `src/theme/typography.ts`.

## Animation: the nav bar

The idea: **the mascot is paying attention.**

1. The active pill is a spring-driven 56×48 lens that slides to the tapped slot on a quick,
   critically damped spring (250 ms perceptual, no overshoot). It stretches along the direction of
   travel (scaleX up to 1.23, scaleY compensates), growing in over its first pill width of travel and
   letting go over the last 0.65, smoothstepped so the shape never snaps. It is the Figma's
   12% white capsule, with its Glass effect faked by inset white shadows (a top catch-light, a
   fainter bottom one and a soft inner glow).
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
   - **Rare spin:** every fourth tap the turn is a special one. Once the finger has lifted, so it
     can be seen, the ghost crouches as five colourful rings (halo gold, pink, violet, sky blue,
     mint) start to orbit it on tilted paths, crossing like a gyroscope and passing in front of
     and behind the cloud. Then it launches into a double spin with the rings whipping round it,
     and as it lands they burst outward like a small firework while four little twinkles pop
     round it. (It began as hold-to-charge, but a finger holding the ghost hides it, so the
     charge-up could not be seen.)
3. Press feedback: the pressed icon squeezes to 0.88 and back on a quick, critically damped spring
   (150 ms perceptual, no overshoot).
4. Scroll-linked: the bar sinks 12 pt and shrinks to 0.9 on a scroll down, and rises and grows
   back as soon as the scroll turns upward (or at the top). A pause leaves it as it is, so it never
   bobs while you read, and 6 pt of travel is needed to flip it so a pixel of jitter doesn't. The
   rule is a pure worklet (`src/utils/navShrink.ts`, tested); one critically damped 350 ms spring
   drives both.

The motion above runs on the UI thread as Reanimated worklets (`useAnimatedStyle`, `withSpring`,
`withSequence`, `withDelay`, `useAnimatedScrollHandler`, `useFrameCallback`), so it does not wait on
the JS thread while the list scrolls. JS decides when a motion starts (a press, a tab change, the
ghost's next idle blink or glance) and fires the haptics. The rare spin's whole timeline, from the
wind-up to the burst, is queued as the finger lifts, so a busy JS thread cannot stall it halfway.

### Tuning the pill live

The pill's spring, stretch and glass defaults live in `PILL` (`src/utils/pillMotion.ts`). With `SHOW_DIALS` on in `App.tsx`
(off by default), a **Dials** chip sits top right in dev builds; it opens a DialKit-style panel (`src/dev/`, plain React Native, so it
works on iOS, Android and web):

- **Pill replay**: `Home ↔ Profile` (the longest jump) and `Next tab` replay the switch exactly as a
  tap does, glance and haptic included; `Slow mo` stretches the spring up to 10× to inspect it.
- **Pill**: spring duration and bounce, stretch amount, ease-in, reach and squash, and the glass fill and inset
  lights. A tick marks each default; a changed value turns blue, and tapping it resets that dial.
- **Copy** prints the panel's values in `PILL`'s shape (share sheet on a phone, clipboard on web), ready to
  paste back over the constant. Release builds never mount the panel, so the defaults ship.

Any other component can get a panel the same way: `useDials('Name', { size: [1, 0, 2], on: true,
folder: { … }, replay: { type: 'action' } }, { onAction })`.

### Recording close-ups

With the web dev server running, `/craft.html` (`public/craft.html`) frames the app in a 390 × 844
iframe for screen recordings: camera shots, slow motion down to ⅒× (`,` and `.`), keyboard taps,
a soft touch cursor (`T`) and a record mode without controls (`H`). The app's half,
`src/dev/craftFrame.ts`, rescales its clock and only installs inside that iframe. `V` switches the
rare spin between the orbit rings that shipped and two rejected looks, a silk ribbon and comets
(`src/dev/rareStyles.ts`); the app itself always uses the orbit rings.

## Animation: the sky bar

The header lives in the list, so without help it scrolled straight under a transparent status bar:
"Your portfolio" and Deposit collided with the clock, and the white cards then made the white status
bar text disappear. Now the status bar sits on sky over the header and on a light fade over the feed:

1. **Scrolling down from the top, nothing sticks.** The portfolio block, Deposit, the carousel and the
   tabs scroll away under the sky behind the status bar. As the first card reaches the top, that sky
   fades into a light fade like the one above the nav bar, and the status bar icons turn dark.
2. **In the feed, a scroll up brings the bar.** One sheet of sky slides down from the top of the
   screen, covering the status bar and then a 52 pt row holding a "Discover ⌄" feed dropdown and the
   Deposit pill, which ride its bottom edge. It follows the finger 1:1 (the icons turn light after
   ~30 pt, not on a nudge), the same scroll down pushes it back off, and stopping halfway snaps it to
   the nearer end.
3. **Heading back to the top, it hands its controls back.** Over the last 48 pt the dropdown drops out
   of the bar and unfolds into the four tabs (the other tabs slide out of the active one and fade in,
   the chevron fades), and at 24 pt Deposit drops back into the portfolio row. Scrolling down from
   there plays it in reverse: the tabs fold into the dropdown as they rise into the bar.
4. **The dropdown** opens a frosted light menu, like the cards it opens over (160 ms, a strong
   ease-out), with a soft lens on the current feed. Tap a feed, or press and drag over the rows: the
   lens follows the finger row by row with a selection tick, and lifting on a row picks it (lifting off
   the rows picks nothing). Picking switches the feed and lands on its first card with the bar still
   docked.

How: every layer of the bar is a window onto the background sky (`SkyWindow`), so it shows exactly
the pixels behind it and cannot be seen until content slides under it; no colours are matched. The
bar's sky follows the 0.3× parallax until the tabs dock, then holds, so it stays blue however far
down you are. The edge is a flat, crisp line: no gradient and no rounding. Every threshold comes
from worklet maths in
`src/utils/skyBar.ts` (unit-tested) fed by measured header positions, so Dynamic Type and other
insets move it with the layout. It all runs on the UI thread; JS only hears threshold crossings, for
touch and screen readers. Spec: `docs/superpowers/specs/2026-10-06-sky-bar-header-design.md`.

## Other motion, deliberately limited

- Sparkline draws in once per card (stroke-dash offset through `animatedProps` on an SVG `Path`),
  entry markers pop as the line reaches them, the end dot lands last. A module-level set of ids makes
  sure recycled FlashList rows never replay it.
- The portfolio numbers are plain text: the bones hand over to the loaded figures and they hold
  still. A rolling-digit version (`number-flow-react-native`) was tried, rolling up from the 24h-ago
  figures on open and to a simulated fresh value on return to the app. On a phone the opening roll ran
  while the bones were still crossfading into the carousel and cards, and two arrivals at once read as
  a mess; with mock data no fresh value ever really arrives, so the library and its patch went too.
- Cards that replace the loading bones crossfade in place (below); cards that arrive without bones
  on the first load enter with a staggered fade and 12 pt rise, the first five only.
- Tab switches are instant, because they happen all the time. The tapped label brightens with a
  100 ms ease-out (more than half of it on the first frame), and a loaded feed drops into the cards
  already on screen: FlashList recycles them, so nothing is rebuilt, and the list keeps its scroll
  position for the sky bar. The cards answer the tap itself: the press handler starts them
  softening (a faint blur, 0.97 scale, 45% opacity, 160 ms) on the UI thread, before React renders
  anything, while the new feed renders into them underneath. When it lands, each of the first five
  sharpens back from wherever the softening had got to, over 300 ms, 45 ms apart, with the same
  strong ease-out. One motion from the tap, and the time spent soft is time the render takes anyway,
  so nothing waits on the animation; tapped away and back before the cards change, they ease back.
  Only what is inside a card softens: its white shell stays solid and its edge crisp (a faded shell
  let the sky show through and turned the cards into blue frosted panes). The blur is an expo-blur
  overlay inside the card's 4 pt rim, mounted only while a card softens or resolves, since iOS
  cannot blur a view with `filter`. Android, whose BlurView needs a blur target, does scale and fade only,
  and Reduce Motion skips it. A new card that is taller or shorter than the old one (a note's line
  count) eases to its height over 220 ms, and the cards below glide with it: from the tap until the
  cards settle, FlashList's cell containers (`FeedCell`, its `CellRendererComponent`) carry a
  Reanimated layout transition, and clip their card so a growing one unrolls. A cell FlashList hands
  over from more than 160 pt away snaps instead of flying in. `LayoutAnimation` was tried first and
  did nothing on the phone (Reanimated's frame-by-frame commits during the resolve consume it), and
  FlashList's `prepareForLayoutAnimationRender` turns recycling off, rebuilding every card. Custom
  layout transitions do not run on the web, where heights still jump. Once the first feed is in, the feeds behind the other tabs load
  quietly, so a tab's first visit resolves like any other; one tapped before its feed lands keeps
  the old cards up, soft (no bones, no empty list), and resolves when it arrives. Only the cold start shows the skeleton. Rebuilding every card and replaying the entrance
  made each switch wait on a burst of work and then on the fade.
- "Read more" eases the note box open to its measured full height (320 ms, a strong ease-out with
  no bounce). An invisible copy of the full text gives the target, measured synchronously on mount,
  so a card mounts at its final height instead of growing mid-entrance.
- Deposit button and nav icons scale on press (Deposit's springs spell out mass 1, since
  Reanimated 4 defaults to mass 4); sky parallax at 0.3×.

Nothing else moves. Apart from the sky bar's scroll-linked
motion and the loading skeleton (below), the header, carousel and cards are static by design.

## Loading skeleton

The mock data arrives the way a network would (`src/data/api.ts`): portfolio, top trades and each
tab's feed load on their own (600 / 900 / 1300 ms on a cold start, then 700 ms for each other tab's feed, loaded ahead)
and are cached for the session by a small store that also owns the loading timing
(`src/data/resources.ts`). Before building it I looked at how premium apps do it on Mobbin
(Coinbase, Uniswap, Revolut, Wise, Bluesky, Substack, Perplexity); the rules below come from there.

- **Only data becomes bones.** The sky, labels, Deposit, tabs, card shells, the thread line, the note
  box and the nav bar stay real. Bones (`src/components/skeleton/`) mirror the real rows to the
  point (measured in the web build: same card boxes, same avatar, coin, thread and note positions),
  so nothing moves when the content arrives. They are 7% ink on white and glass, 30% white on the
  sky, fully rounded, cap-height tall, with seeded widths, and lower feed cards fade with distance.
- **One quick, very subtle sweep.** While anything loads, a faint white glint (100 pt, 35% white at
  its peak, 20% on the sky) snaps across the screen in 0.65 s on an ease-in-out cubic, so what
  shows is the fast middle of the pass, then rests off screen for 1.1 s. It is one shared value for
  the whole screen; each bone draws its slice of the band offset by its own measured window x, so
  every bone lights up in step, as one light crossing the page. It is parked off screen when
  nothing loads, and off with Reduce Motion.
- **Handover in place.** Each card mounts over its own skeleton, which stays solid underneath;
  the content fades in on top (240 ms, 70 ms stagger) while only the bones fade out, so shells and
  chrome never dip. Cached content and quick replies skip the bones.
- **Timing rules.** Bones belong to the cold start; once drawn they stay at least 400 ms. The other
  tabs' feeds load quietly behind it, and a tab tapped before its feed lands keeps the cards it had
  (see the tab switch above). The store's 150 ms show delay remains for any delayed load.
- **Dials > Skeleton** (with `SHOW_DIALS` on, as above): latency per section, **Hold loading**
  (inspect the bones for as long as you like) and **Replay cold start**.

## Performance

- `FlashList` v2 with a memoised `renderItem`, stable `keyExtractor`, `extraData` for the expanded
  set, `drawDistance` of one screen.
- The Reanimated `createAnimatedComponent(FlashList)` wrapper registers the worklet scroll handler
  on the underlying scroll view directly. (Passing the handler as a plain `onScroll` prop crashes:
  FlashList calls it as a function.)
- Sparkline geometry (`src/utils/sparkline.ts`) is computed once per item with `useMemo` and
  rendered with `react-native-svg`, not images.
- No per-frame JS work: scroll, sky bar, pill, mascot, and draw-in are all worklets.
  The portfolio figures re-render the list header once, as the portfolio loads.
- A tab tap lights its label in a commit of its own; the cards follow in a deferred render
  (`useDeferredValue`), so the label never waits for them. The nav bar is memoised, so feed tab
  switches leave it and the ghost alone.
- Mock data is generated once at module load from a seeded PRNG, so renders are deterministic.

## Robustness

- `SafeAreaProvider` drives the header top padding and the nav bar's bottom offset (`max(inset, 16) + 2`,
  which lands the bar 36 pt above the bottom on an iPhone with a home indicator, as in the Figma).
- The feed has bottom padding so the last card clears the bar; layout is flex-based so other widths
  reflow (cards keep 4 pt margins, the carousel keeps its 204 pt cards and snaps).
- Dense rows clamp Dynamic Type with `maxFontSizeMultiplier` 1.2–1.3, and rows that hold text take
  their Figma heights as minimums, so larger text grows them instead of being clipped; the note's
  two-line clamp is sized from the font scale.
- On a 320 pt phone a trade's size and price wrap as text and its change drops to a line of its own,
  clear of the note.
- Screen readers reach only the copy of each control that is on screen, and the feed menu is modal
  for them: focus moves to the current feed, the platform's escape gesture, back button or Escape
  closes it, and focus returns to the dropdown. Deposit, the feed tabs and Read more have 44 pt tall
  touch targets.
- Only the three Nunito weights in use are bundled (Android and web); iOS draws SF Pro Rounded from
  the system and loads none. If the fonts fail to load, the text falls back to the system font
  rather than leaving the screen blank.
- Android: the nav bar uses a solid colour instead of `BlurView` and the bottom edge uses a plain
  gradient instead of the masked progressive blur. Web gets the same fallbacks.

## Tests

`npm test` runs unit tests for the formatters (worklet-safe, no `Intl`), the sparkline geometry,
the mock data (determinism, per-tab subsets, Figma values on the first card), the nav geometry and
the sky bar's scroll maths (thresholds from the Figma, presence, band edge, fold), plus the loading
skeleton: the mock api and its hold switch, the resource store's timing (cold
start, cache hit, show delay, minimum time, reveal window, clear) with fake timers, the bone maths,
and that each skeleton region is announced once as busy. The portfolio figures are covered too (the
loaded values, a signed loss).
The motion maths has its own tests: the ghost's breath, eyes and turns (and its press handling
through the real Pressability), the card entrance, the nav pill's stretch, nav shrink, the Deposit
springs' overshoot and settle, and the Dials store.
`tabSwitch.test.tsx` renders the real screen and FlashList and checks that a tab tap lights its
label before the cards change, reuses the mounted cards of a loaded feed, resolves them in place
(on a first visit too, and after holding the old cards while a feed loads), starts softening them
in the commit that lights the tab, ignores a tap on the tab already shown, never replays the
entrance and leaves the nav bar alone.
`tabResolve.test.ts` pins the resolve's start, end and stagger. `feedTabs.test.ts` steps the label's fade frame by frame.
`feedMenu.test.tsx` drags across the menu's rows (a tick per row, lifting on a row picks it,
drifting past the sides keeps the row, lifting off the rows picks nothing). `screenReader.test.tsx`
checks what a screen reader reaches at the top, with the bar docked and with the menu open. The
ghost's tests also check that the rare spin is queued in full as the finger lifts, so no stage
waits on a JS timer. `noteBox.test.tsx` sizes the note's clamp from the font scale, and
`rareStyles.test.ts` covers the craft page's silk and comet geometry.

## Trade-offs and honest notes

- **Verification.** No iOS or Android device was attached to the machine this was built on, so the
  app was verified with the unit tests, `tsc`, and the Expo web build, where DOM measurements were
  compared against the exact Figma geometry (every measured box lands within 1 pt). The native-only paths
  (`BlurView`, `MaskedView`, haptics) follow the documented APIs. A later pass on an iPhone
  confirmed the layout and caught two things: the count-up not applying on the new architecture
  (since replaced by static figures) and native Liquid Glass drifting from the design (replaced by
  the faked glass above). A real-device recording is still to do.
- **Assets.** The verified seal, swap badge, coin logos and nav icons are hand-drawn SVGs matched to
  the capture rather than exported vectors. Two avatar photos are reused across the mock feed.
- **Fonts.** iOS renders the design's SF Pro Rounded; Android and web substitute Nunito (see
  above), whose glyph widths differ by a few points, which shows most in the tab row.
- **Glass effects.** The Figma uses Glass + inner-shadow effects on the carousel cards, the Deposit
  button and the nav bar. I tried native Liquid Glass (`expo-glass-effect`, iOS 26) first: it looks
  great but cannot be tuned to the design (Apple's material is brighter and more frosted, the dark
  bar came out mid-grey, the active state a milky blob), it is iOS 26 only, and Android gets nothing.
  Since the brief grades fidelity and parity on both platforms, the glass is faked from the Figma's
  own values and renders identically everywhere: the 92% white card body with a white hairline, the
  Deposit gradient (white 32→64% at 32%) with the Figma's soft white drop shadow and its inner
  shadows as inset glows (a bottom glow and two 1 pt catch-lights), and the `#22242A` 80%
  bar over an iOS blur (a denser fill on Android) with a hairline rim and a 12% white lens lit by inset white shadows. The
  native-glass version is in git history (`88badf4`) if a future iOS-only build wants it.
- **Tabs filter the same mock set**, served through a simulated async API so the loading state is
  real; the brief asked for mock data only.
- **Android blur.** A solid bar was chosen over `experimentalBlurMethod` to keep scrolling smooth.

## What I would do next

1. Record on a real iPhone and Android phone and tune spring constants by feel.
2. Add Sell-side sparkline colouring, and virtualise the carousel with FlashList if the data set
   grows.
3. Replace the hand-drawn SVG badges and logos with the Figma vector exports once the file can be
   exported.
4. Add gesture-driven dismissal of the nav bar and a pull-to-refresh that reuses the mascot.
5. More component tests with `@testing-library/react-native`, for the note's expand animation and
   the carousel (the screen, the ghost, the menu, the note's clamp and the portfolio figures have
   them).
