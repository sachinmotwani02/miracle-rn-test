# Discover Feed Screen — Design Spec

Date: 2026-10-05
Source brief: `docs/reference/brief.pdf` (Miracle React Native practical)
Figma: https://www.figma.com/design/FqHthI6SKqN395WuD3ze9y/Miracle-Test?node-id=0-1
Reference capture (lossless, from the Figma web viewer): `docs/reference/figma-discover@2x.png`

## Goal

Rebuild the "Discover" feed screen 1:1 in React Native (Expo, TypeScript) and bring it to
life with UI-thread animation, with the floating nav bar as the creative centrepiece.
Mock data only. Runs on iOS and Android with safe areas and no layout breakage.

## Revision (2026-10-05, second pass)

An editable copy of the file was later available. The Feed frame was copied as SVG and parsed, and
every text layer's Typography panel was read. Corrections over the first pass:

- Typeface is SF Pro Rounded (`ui-rounded` system font on iOS, Nunito elsewhere; see README). Sizes/line heights: label 12/16 600,
  value 24/28 700 white 88% (-3% tracking), delta 12/16 600 (white / white 64%), Deposit 15/20 700,
  section title 15/20 600, names 15/20 600, meta 12/16 600 at 64% (48% for "Bought … at"/"at"),
  Buy 11/14 700, asset 19/22 600, price 12/16 600, note 13/16 500, Read more 13/20 600, tabs 15/20 600
  (inactive 72% opacity), carousel gain 15/20 600. Letter spacing 1% except the value.
- Header line boxes at y 70 / 90 / 125; section title at 167; carousel at 195; tabs at 309;
  first card at 347 (height 188, gap 4).
- Carousel: avatar 20 with a 1 pt white ring outside, name box at x 40 (card-relative), card fill
  white 92% with Figma Glass + inner shadow (approximated); logo badge 15 (13.5 disc + 1.5 white
  stroke, glyph #42D578) overhanging the logo by 1.5 pt.
- Feed card: padding top 10, header row 40 (name 20 + 4 + stats 16) with the avatar centred, 2 pt
  dot separators (black 24%), a 2 pt vertical thread (black 10%) from avatar to logo, asset row 38,
  gap 11, note box radius 20 with padding 12/12/8 and a 2 pt gap before the 20 pt "Read more".
- Sparkline: 2.2 pt stroke, 12 pt "+" markers lifted 10 pt above 6 pt ringed dots, 9 pt end dot.
- Nav bar: 304×64 at x 45, fill #22242A 80%, 8 pt inset, active pill 56×48 radius 24, icon centres
  at bar-local x 36 / 92 / 152 / 212 / 268, bottom edge 37 pt above the frame bottom. Bottom fade is
  a 114 pt white gradient (0 → 100%).
- Deposit fill is a white gradient (32% → 64%) at 32% layer opacity.

## Constraints and how the Figma was measured (first pass)

The Figma MCP server refused the file (the account only has view access), so the design
was measured from lossless captures of the Figma web viewer at 200% and 400% zoom
(3.5 and 7 device px per pt). All numbers below are in pt on a 393 × 852 frame
(iPhone 14 Pro). Where a value was ambiguous it is rounded to the nearest 1 pt or 0.5 pt.

Raster assets (two avatar photos, the mascot) were cropped from the 400% capture and
keyed/masked. The sky/cloud header is a raster in Figma that cannot be exported from
view-only access, so it is reproduced procedurally (gradient + soft cloud blobs) and
shipped as a generated PNG.

## Stack

- Expo (latest SDK via `create-expo-app`), TypeScript, React Native new architecture.
- `react-native-reanimated` (v4 worklets) + `react-native-gesture-handler` for all motion.
- `@shopify/flash-list` for the feed, memoised `renderItem`.
- `react-native-svg` for sparklines, verified/buy badges, coin logos and nav icons.
- `expo-blur` (iOS) with solid-colour fallback on Android; `expo-linear-gradient`;
  `@react-native-masked-view/masked-view` for the progressive blur mask on iOS.
- `expo-image` for raster assets, `expo-haptics` for press feedback,
  `react-native-safe-area-context` for insets.
- Fonts: SF Pro (system) on iOS; Inter (`@expo-google-fonts/inter`) on Android as the
  closest metric match. A `font(weight)` helper in the theme hides the split.
- Jest + `@testing-library/react-native` for unit tests of pure logic (sparkline path,
  number formatting, mock data, nav geometry).

## Layout spec (pt, measured)

Frame 393 × 852. Status bar is the OS one.

Background: base `#E9EEF6`; sky image (393 × 460, 3x PNG) pinned to the top, parallaxes
at 0.3× scroll. Sky gradient stops (top → bottom): 0 `#8ACAF3`, 45 `#70BFF2`,
65 `#5FB8EF`, 150 `#2BA6F0`, 200 `#2EA7F1`, 340 `#48ABE8`, 370 `#8CC8EE`, 450 `#E9EEF6`.
Soft white clouds concentrated top-right and in a band around y 280–320.

Portfolio header (left margin 20):
- "Your portfolio" 11 pt medium, white; cap top 74.
- "$12,057.70" 22 pt bold, white; cap top 97 (rolls up to it from the 24h-ago value once the portfolio loads, see below).
- "+$64.20" 12 pt semibold white, then " · 0.54% 24h" 12 pt white 70%; cap top 129.
- Deposit button: 86 × 36 pill at x 291, y 89 (right margin 16). Fill white 20%,
  1 pt border white 35%, text "Deposit" 14 pt semibold white.

"Top trades last 24h": 14 pt semibold white at x 16, cap top 172.

Top trades carousel: horizontal list, cards 204 × 92, radius 24, first card at x 16,
gap 4, snap to card. Card fill white 85% with 1 pt white border. Inside (relative to card):
- Avatar 24 at (12, 8) with verified badge (15 incl. 1.5 white ring) at its bottom-right.
- Name 15 pt semibold `#22242A` at x 40, line centred with avatar.
- Coin logo 36 at (12, 44) with buy badge (dark `#121212` circle 17 + 1.5 white ring,
  green swap glyph) at the logo's bottom-right.
- "+$3.2K" 18 pt semibold `#0FAA55` at x 58; "Bought SOL at $141.20" 12 pt `#727377`.

Tab row at cap-centre y 321.5: Discover / Following / Rising / Favourites, 15 pt semibold,
x starts 16 / 92 / 172 / 229 (18 pt gaps), active white, inactive white 70%.

Feed cards: x 4 → 389 (width 385), radius 24, white, first card top 348, gap 4.
Padding 12 (top/left/right), 4 (bottom). Rows:
- Header: avatar 36 + verified badge 15 at bottom-right; name 15 pt semibold at x 64
  (gap 12), "Buy" pill (28 × 16, fill `#D8F1E4`, text 11 pt semibold `#0FAA55`, gap 6),
  "2m" 12 pt `#727377`; second line "Top 100 · 64% WR · $842K" 12 pt `#727377`.
- Gap 12.
- Asset row: logo 36 (+ buy badge 21 at bottom-right); "SOL" 19 pt bold `#22242A` at
  x 62; "$18.4K at $148.60 ▲12.84%" 12 pt (dark / `#727377` / dark / green `#0FAA55`).
  Sparkline 90 × 32 right-aligned (right padding 12), green `#14BF62`, 3 pt round stroke,
  entry markers = 13 pt green circle with white "+" above a 5 pt dot on the line,
  end dot 10 pt.
- Gap 12.
- Note box: inset 4 from card edges, fill `#F3F8FF`, radius 16, padding 12/12/10.
  Text 13 pt `#22242A`, line height 16, 2-line clamp; "Read more" 13 pt semibold
  `#2398FF` on its own line (gap 4). Tap toggles full note (animated height).
- Card height 188 when collapsed.

Floating nav bar: 300 × 64 pill (radius 32) centred, bottom edge 36 pt above the frame
bottom (= safe-area bottom + 2). Fill `#4E5055` at 96% over a blurred backdrop
(iOS BlurView dark; Android solid). Inner padding 4, five equal 58.4 pt slots:
home, compass, mascot (centre), bars, person. Icons ~18 pt white 2 pt strokes.
Active pill: 56 pt circle, white 10% (`#626468` on the bar). Mascot: cloud ghost
30 × 28 with a 19 × 5 halo above (raster asset with alpha).
A progressive blur/fade (transparent → `#F5F5F5`) covers the bottom ~110 pt behind the bar.

## Component breakdown

```
src/
  theme/           colors.ts, typography.ts (font helper), spacing.ts, index.ts
  data/            types.ts, mock.ts (deterministic generator, 4 tab subsets)
  utils/           format.ts (money/percent), sparkline.ts (points → path, markers)
  components/
    SkyBackground, PortfolioHeader, DepositButton,
    TopTradesCarousel, TopTradeCard, FeedTabs, TradeCard, TradeCardHeader,
    AssetRow, Sparkline, NoteBox, Avatar, VerifiedBadge, CoinLogo, BuyBadge,
    FloatingNavBar, NavIcon(s), Mascot, BottomFade
  screens/DiscoverScreen.tsx
App.tsx
```

Data flow: `mock.ts` produces `TradeFeedItem[]` per tab. `DiscoverScreen` owns the
selected tab and nav state and a shared `scrollY` value (Reanimated). FlashList renders
`TradeCard` (memoised; receives plain data + a stable `onToggleNote`). The header
(portfolio, carousel, tabs) is the list header so everything scrolls together.

## Animation design (all Reanimated worklets, UI thread)

Nav bar — "the mascot is paying attention":
1. Active pill is a spring-driven circle that slides to the tapped slot; it stretches
   along the direction of travel while moving (scaleX up to 1.25) and settles with a
   small overshoot.
2. The mascot reacts to every tab change: a short bob (translateY −6 → 0 spring) and its
   eyes glance toward the chosen tab (eye group translateX ±3), returning to centre after
   ~600 ms. Tapping the mascot itself makes it jump with squash-and-stretch and fires a
   light haptic.
3. Press feedback: the pressed icon scales to 0.9; released icon springs back.
4. Scroll-linked: when scrolling down quickly the bar sinks 12 pt and shrinks to 0.97,
   springing back as soon as scrolling slows or reverses.

Elsewhere (deliberately limited):
- Sparkline draw-in (stroke dash offset, 700 ms ease-out) with markers popping in as the
  line reaches them; runs once per item id, not on list recycling.
- Portfolio value and 24h change roll (`number-flow-react-native`, 900 ms) up from the 24h-ago
  figures once the portfolio loads (a beat after its bones hand over), and to a fresh value when the
  app returns from the background (a mean-reverting random walk for the time away); otherwise they
  hold still.
- First five cards enter with a staggered fade + 12 pt rise.
- Tab switch: active label crossfades; the list content fades/slides 8 pt on tab change.
- Note box expands/collapses with a spring on height.
- Deposit and card press: 0.97 scale spring.
- Sky parallax at 0.3× scroll.

## Robustness

Safe areas via `SafeAreaProvider`; nav bar bottom offset derives from insets; the feed
has bottom padding so the last card clears the bar. Layout uses flex, not absolute
positions, except for the nav bar, the sky and the bottom fade. Dynamic text sizes
clamp with `maxFontSizeMultiplier` 1.3 on dense rows. Android gets a solid nav bar
colour instead of blur and a gradient fade instead of a progressive blur.

## Testing

Unit tests for `sparkline.ts` (path and marker maths), `format.ts`, `mock.ts`
(deterministic, per-tab counts), and the nav geometry helper. Rendering checked on an
iOS simulator or Android emulator/device by running the app.

## Deliverables

Repo with README (decisions, trade-offs, next steps), the app, this spec, and the
reference captures. A real-device screen recording is left to the submitter.
