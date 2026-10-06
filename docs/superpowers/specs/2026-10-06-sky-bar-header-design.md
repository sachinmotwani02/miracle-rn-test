# Sky bar: status bar and header on scroll — design spec

Date: 2026-10-06
Approved in conversation from an interactive mock ("On scroll up", option 1: the sky bar as shown).

## Problem

The whole header lives inside the FlashList, so it scrolls straight under a transparent status bar:
"Your portfolio" and the Deposit pill collide with the clock and battery, and further down the white
feed cards end up behind white status bar text, which then disappears.

## Behaviour

Scrolling down from the top, nothing sticks: the portfolio block, Deposit, the carousel and the tabs
scroll away under a strip of sky behind the status bar. In the feed, any scroll up slides a sky bar
down from under the status bar holding a "Discover ⌄" feed dropdown (left) and the Deposit pill
(right); scrolling down slides it back. Heading back to the top with the bar showing, the bar hands
its controls back: the dropdown drops out of the bar and unfolds into the four tabs, and Deposit
drops back into the portfolio row. The status bar stays light because it always sits on sky.

Everything is scroll-linked (it follows the finger both ways) except two short settles: the bar
snaps fully in or out when scrolling stops halfway, and it finishes sliding in when the list
crosses back into the header while the bar is partway shown.

## Geometry

`s` is the list's scroll offset, `T` the safe-area top inset, `BAR = 52` the bar row under the
status bar (44 at first; 8 pt more room went under Deposit and the dropdown). Positions inside the list header are measured at runtime (`onLayout`), so Dynamic Type
and other insets move the thresholds with the layout. Values in brackets are the Figma frame
(T = 59).

| Name | Meaning | Value |
| --- | --- | --- |
| `PIN` | Deposit's top reaches its bar slot (`T + 4`, the 36 pt pill, 12 pt of room below it) | depositTop − (T + 4) [24] |
| `DOCK` | the tab row's top reaches its bar slot (`T + 12`, the 20 pt row, 20 pt of room below it) | tabsTop − (T + 12) [238] |
| `RISE` | start of the tab row's 48 pt rise into the bar (BAR − 12 + the 8 pt ride gap), which is also the fold | DOCK − 48 [190] |
| `FEED` | past this the bar answers scroll direction | DOCK + BAR [290] |
| `FEED_TOP` | puts the first card right under the bar | firstCardTop − (T + BAR) [236] |

## Presence

`h` in [0, 1] says how much of the bar is shown.

- `s <= 0`: `h = 0`. At the very top the header is the bar.
- `s >= FEED`: `h -= Δs / BAR`, clamped. 52 pt of upward scroll shows the bar fully; 52 pt of
  downward scroll hides it. When scroll events stop for 160 ms with `h` partway, it eases to the
  nearer end (180 ms).
- `0 < s < FEED`: `h` holds, so the hand-back always runs with a settled bar. If the list crosses
  `FEED` upward while `h` is partway, it eases to 1.

Scrolling down from the top therefore keeps `h = 0` until the feed (nothing sticks), and a scroll up
in the feed brings it to 1 (the bar is there for the hand-back).

## The sky bar

- **Sky window.** The bar is a window onto the background sky: it shows exactly what
  `SkyBackground` draws at the same screen position, so it cannot be seen until content slides under
  it. The background keeps its 0.3x parallax; the bar's sky follows it until `DOCK`, then holds
  (offset `0.3 · min(s, DOCK)`) so the bar stays blue however far down you are.
- **Band edge** (screen y of the bar's bottom), with `E_full` scaled by `h` as `T + (E_full − T)·h`:
  - `s < RISE`: `E_full = T + BAR · clamp(s / 60)`, sliding down from under the status bar over the
    first 60 pt as the portfolio block scrolls up into it.
  - `RISE <= s < DOCK`: `E_full = tabTop(s) − 8`, riding 8 pt above the rising tab row so the row
    stays visible all the way into its slot.
  - `s >= DOCK`: `E = T + BAR · h`.
- **Flat edge.** No gradient and no rounding: the band ends in a crisp straight line. (A first build
  added 24 pt concave sky corners so the edge read as the top of a sheet; on the device the user
  preferred it flat.)
- **Status strip.** A sky window over the status bar area sits above the bar's controls, so they
  slide in and out from under it.
- The band absorbs touches like a nav bar; the strip does not.

## Deposit

A pinned copy shows while `s >= PIN` and `h > 0`, at the bar slot (`T + 4`, right 16), lifted by
`(1 − h) · BAR` under the status strip. It is backed by the sky, so it covers the header's own
Deposit scrolling up beneath it; the in-list one is left untouched. Same component, same press
feedback and action.

## Tabs and the dropdown

Fold progress `m = clamp((s − RISE) / 40) · h`, so the tabs only fold when the bar is there to
receive them.

- Every tab slides toward the row's start (x 16) on an ease-in-out; inactive tabs fade
  (0.72 → 0 by `m = 0.625`) and shrink to 0.85; the active one stays solid.
- A chevron fades in after the active label from `m = 0.5`, sliding 6 pt into place.
- At `DOCK` the folded row sits exactly in the bar slot and an identical "Discover ⌄" in the bar
  takes over; the band closes beneath it. Scrolling back reverses all of it.
- Folded-away tabs stop taking taps. Tapping the folded row before it docks jumps to `FEED_TOP`
  and opens the menu.

The docked dropdown shows while `s >= DOCK` and `h > 0`, lifted by `(1 − h) · BAR`; tapping it opens
the menu.

## Feed menu

- A dark glass card in the nav bar's material: `#22242A` at 80% over an iOS blur, denser on
  Android. It is anchored 4 pt under the bar at x 10, 180 wide, with four 40 pt rows.
- The nav bar's 12% white lens sits behind the current feed.
- It opens with a fade and a scale from 0.92 at its top-left on a quick, critically damped spring;
  Reduce Motion fades only. Tapping outside closes it.
- Picking a feed fires a selection haptic, slides the lens to the pick, closes the menu, switches the
  feed (the cards replay their entrance) and puts the list at `FEED_TOP` with the bar still docked.

Tab switches keep the list mounted: the cards are keyed by tab and FlashList's
`maintainVisibleContentPosition` is off, matching `feat/feed-skeleton` and the shared folder's
uncommitted work, so the scroll position and bar state survive a switch.

## Accessibility

- While pinned, the header's portfolio block is hidden from screen readers.
- While docked, the in-list tab row is hidden.
- The dropdown is a button labelled "Feed: Discover" with an expanded state.
- Menu rows report their selected state.

## Architecture

- `src/utils/skyBar.ts`: pure worklet maths (geometry, presence step, band edge, fold progress,
  sky offset, visibility, fold transforms), unit-tested.
- `src/components/SkyBackground.tsx`: also exports `SkyWindow`, a view that shows the background sky
  at its own screen position, sharing the sky's size and parallax constant.
- `src/components/SkyBar.tsx`: the overlay (band, status strip, pinned Deposit,
  docked dropdown).
- `src/components/FeedMenu.tsx`: the menu.
- `src/hooks/useSkyBar.ts`: shared values, a scroll handler composed with the screen's own
  (`useComposedEventHandler`), layout callbacks, and JS flags for touch and accessibility flipped by
  `useAnimatedReaction` only at thresholds.
- `src/components/FeedTabs.tsx`: optional `fold` progress, the chevron, measured tab positions.
- `src/screens/DiscoverScreen.tsx`: wiring, list ref, keyed cards.

All motion is transforms and opacity on the UI thread. JS only hears about threshold crossings.

## Testing

- jest: geometry from the Figma numbers; presence rules (top reset, hold in the header, follow in the
  feed); band edge continuity at `RISE` and `DOCK`; fold progress scaled by presence.
- `tsc`, the existing suites, and ESLint via the `chore/expo-lint` recipe.
- Web preview: DOM positions at key offsets.
- Device: Expo Go on the user's iPhone from this worktree's Metro (port 8082).

## Known overlaps

- `DiscoverScreen.tsx` is also changed by `feat/feed-skeleton`, `feat/ticking-portfolio`,
  `chore/expo-lint` and the shared folder's uncommitted work, so expect merge conflicts there.
  The keyed-cards change is the same one they make.
- The dev-only Dials chip (`src/dev/DialPanel.tsx`, not on `main`) sits where the pinned Deposit
  parks; move the chip when those branches meet.
