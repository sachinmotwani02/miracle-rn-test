# Discover feed loading skeleton — design

Date: 2026-10-06. Builds on the Discover feed (`2026-10-05-discover-feed-design.md`) and the ghost
mascot motion (`2026-10-05-ghost-mascot-motion-design.md`).

## Goal

Give the Discover screen a real loading state: what the screen shows between launch (or opening a
tab for the first time) and its data arriving. It should read as the same screen, quietly waiting
under one soft sweep of light, and hand over to the real content without anything jumping.

## Decisions (agreed 2026-10-06)

1. **Loading is simulated in the data layer.** The mock data now arrives through async fetchers
   with a per-section latency: portfolio, top trades and each tab's feed load on their own. Cold
   start loads all three; the first visit to a tab loads that tab's feed; anything loaded before
   comes back instantly from a session cache. A real backend would replace the fetchers only.
2. **One very subtle sweep** (revised the same day: the first build pulsed the bones on the
   ghost's breath and had the ghost react to loading; Sachin preferred a plain, quiet shimmer with
   no mascot link, quick and snappy). A faint band of light snaps across every bone in step. With Reduce Motion the bones
   are static.
3. **Loading only.** No failure or empty states in this pass.
4. **Approach: dedicated bones components on shared primitives** (not a loading mode inside the
   real components, not automatic redaction).

## What Mobbin says premium apps do (research, 2026-10-06)

- Only data becomes a bone; chrome stays live (Bluesky keeps its action icons, Perplexity its
  tabs, Uniswap shows the price and bones only the 24h change).
- Bones have the exact shape of what they replace (Wealthsimple, Wise, Public rows).
- Very low contrast: ink at 5-7% on white (Substack, Mercury). Solid grey blocks read cheap.
- One light for the whole screen, in sync (Coinbase, Careem), never per-bone flicker.
- Fade with distance (Uniswap): no wall of grey.
- On colour or glass, bones are translucent white (Revolut, Crypto.com).
- Brands with a mascot make loading a mascot moment (Phantom, Jomo).

## What stays real, what becomes bones

| Area | While loading |
| --- | --- |
| Sky, status bar, "Your portfolio" label, Deposit pill | Real, always |
| Portfolio value and 24h delta | Two bones on the sky (white 30%) |
| "Top trades last 24h" title | Real |
| Carousel | Two real glass cards (shell, hairline) with bones inside; the row does not scroll |
| Tabs | Real and tappable |
| Feed | Three real white cards (shell, thread line, note box) with bones inside |
| Nav bar and ghost | Real, unchanged |

## Bones

- `Bone`: a fully rounded View. Text bones are `round(fontSize * 0.72)` tall (15 pt text gets an
  11 pt bone) and vertically centred in the text's line box, so rows keep their real heights.
- Tones: `colors.boneInk` = `rgba(34,36,42,0.07)` on white and glass, `colors.boneSky` =
  `rgba(255,255,255,0.3)` on the sky.
- Widths vary per card from a seeded PRNG (`mulberry32`), within ranges that match real content,
  so cards never look cloned and renders stay deterministic.
- The sparkline bone is a faint wave (2.6 pt stroke, bone ink) in the 90 x 32 slot; the real line
  draws in over it on reveal.
- Feed card bones fade with distance: card opacity 1, 0.7, 0.4 (only three cards are drawn; the
  third already runs under the nav bar).

Geometry mirrors the real components row by row (feed card: 10 top padding, 40 header, 11 thread,
38 asset row + 11, 74 note box, 4 bottom = 188 pt; carousel card: fixed 204 x 92). It is checked
by
measuring skeleton and real cards in the web preview (they must match to the point).

## Motion

- **Sweep.** One shared value holds the window x of a 100 pt white band (35% white at its peak on
  ink bones, 20% on the sky). While anything loads it snaps from fully off screen left to fully off
  screen right in 650 ms on an ease-in-out cubic (it gathers speed off screen, so the visible part
  is the quick middle), rests 1.1 s and repeats; otherwise it is parked off screen. Each bone clips a
  gradient band translated by `sweep - its own window x` (measured once in a layout effect), so all
  bones show the same band at the same place: one glint crossing the page, never per-bone flicker.
  Off with Reduce Motion. (Tuned the same day to "quick and snappy and very subtle": it was a
  140 pt, 50% band gliding for 1.6 s.)
- **Reveal.** When data arrives after bones were shown, each component mounts over its own
  skeleton, which stays solid underneath, so the swap frame is invisible; then the content fades in
  on top (240 ms, ease-out, staggered 70 ms per card) while only the bones fade out (a
  `BoneFadeContext` drives them), so card shells and chrome never dip. No movement, no layout
  shift. The glass carousel card shares its translucent shell with its skeleton (two would stack
  denser), so only its inside hands over. Content that arrives without bones having been shown
  (cache hit, fast response) uses the existing card entrance (fade + 12 pt rise) instead.

## Timing rules

- Cold start shows bones from the first frame.
- A tab's first load waits 150 ms before showing bones; data that arrives sooner skips them.
- Once shown, bones stay at least 400 ms.
- Default simulated latency: portfolio 600 ms, top trades 900 ms, feed 1300 ms on cold start, a new
  tab's feed 700 ms.
- Reveal window: components that mount within 480 ms of the handover ((3 - 1) x 70 stagger + 240
  + 100 margin) play it; anything later (recycled rows, scrolling back) renders plainly.

## Architecture

```
src/data/api.ts            async mock fetchers with latency; hold switch for the Dials
src/data/resources.ts      tiny external store: load(key, fetcher), useResource(key, ...),
                           clearResources(); owns the timing rules (phase: blank | skeleton |
                           content, revealing window) with timers, so components only read
src/utils/skeleton.ts      constants (SKELETON), boneHeight, sweepTrack, seeded bone widths
src/components/skeleton/
  Bone.tsx                 Bone (with its slice of the sweep), BoneGroup, SweepContext,
                           BoneFadeContext
  Sweep.tsx                SkeletonSweep: runs the shared band while anything loads
  Reveal.tsx               crossfade from a bones layer to content, on mount
  FeedSkeleton.tsx         TradeCardBones, TradeCardSkeleton, FeedSkeleton (3 cards)
  TopTradeSkeleton.tsx     TopTradeCardBones, TopTradesSkeleton (2 cards)
  PortfolioBones.tsx       value + delta bones on the sky
```

Integration (small, delimited edits):

- `DiscoverScreen`: a thin wrapper owns the Skeleton dials and remounts the screen for Replay;
  the screen reads three resources, passes `portfolio?`, `trades?` and the feed state down, uses
  `ListEmptyComponent` for the feed bones, and wraps everything in `SkeletonSweep active={loading}`.
- `PortfolioHeader` (`portfolio?`, `reveal?`), `TopTradesCarousel` (`trades?`, `reveal?`) and
  `TopTradeCard` (`index`, `reveal?`) wrap their data in `Reveal`. `TradeCard` is untouched: the
  screen wraps each feed card in `Reveal` with that card's `TradeCardSkeleton`. Props stay primitive
  so `React.memo` holds; the index picks the bones' seed, fade and stagger.
- The mascot and nav bar are untouched.

## Dev controls

A **Skeleton** panel in the Dials: latency sliders per section (0-3000 ms), **Hold loading**
(fetches never resolve until switched off), and **Replay cold start** (clears the cache and
remounts the screen, back on Discover).

## Accessibility

Each skeleton region is one accessible element ("Loading portfolio", "Loading top trades",
"Loading trades") with `accessibilityState={{ busy: true }}`; bones are plain views with nothing to
announce.

## Testing

- jest: the resource store with fake timers (cold start, cache hit, show delay skip, minimum
  visible time, reveal window, clear), the fetchers and hold, `sweepTrack` (the band starts
  and ends off screen) and the bone widths' determinism and ranges.
- Web preview: cold start and tab switch with Hold loading; DOM measurement that skeleton and real
  cards match; reveal has no layout shift.
- `npx tsc --noEmit`, `npx expo lint` (no new findings beyond the 16 already on the base).

## Coordination

The base is a snapshot of `main`'s working tree at 12:10 IST (uncommitted work from other sessions:
Dials, pill motion, card entrance, count-up removal). `feat/ghost-swirl` is changing `Mascot.tsx`
in parallel; this branch leaves the mascot alone. When that work lands on `main`, this
branch's commits are rebased onto it (`git rebase --onto main <snapshot> feat/feed-skeleton`).
