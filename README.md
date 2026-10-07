# Miracle — Discover

A React Native recreation of Miracle’s Discover feed, built with Expo SDK 57 and TypeScript, with a floating nav bar and a mascot that pays attention to you.

<p align="center">
  <a href="assets/readme-assets/hero.mp4">
    <img src="assets/readme-assets/hero.gif" width="560" alt="A 40 second tour of the Discover screen on an iPhone: the feed loads in, tabs switch, the feed selector opens, the header returns on scroll, and the ghost in the nav bar reacts" />
  </a>
</p>
<p align="center"><sub>Full tour · <a href="assets/readme-assets/hero.mp4">hero.mp4</a> (1080 × 1080, 60 fps, 40 s)</sub></p>

[Figma design](https://www.figma.com/design/JbobRQFbjv9tU37hT4ak9a/Untitled?node-id=694-310) · [Assignment brief](docs/reference/brief.pdf) · [Reference image](docs/reference/figma-discover@2x.png)

## Run

Install Node.js and npm, then:

```bash
npm ci
npm start
```

For a browser preview:

```bash
npm run web
```

## What to try

- **Browse the feed:** switch between Discover, Following, Rising, and Favourites.
- **Explore trades:** swipe the top-trades carousel and expand a card’s note.
- **Scroll up in the feed:** the sky header returns with a feed selector and Deposit button.
- **Use the bottom bar:** tap a destination or drag the active pill between icons.
- **Tap the ghost:** it spins, reacts to repeated taps, and performs a special spin every fourth tap. It also looks toward the active destination and follows the dragged pill.

This is a single-screen demo with mock data. Deposit provides press feedback; the bottom bar changes its selected state without opening other screens. The ghost is an independent interaction.

## Recordings

### The nav bar

The pill stretches toward its destination and settles with a spring. The ghost turns to look at the active tab, and when the pill is dragged, the ghost follows the finger.

<p align="center">
  <a href="assets/readme-assets/nav.mp4">
    <img src="assets/readme-assets/nav.gif" width="720" alt="The active pill moving between the five nav icons by tap and by drag, with the ghost turning toward it" />
  </a>
</p>

The same motion at a fraction of the speed, recorded from the craft showcase. The pill stretches as it leaves, squashes as it lands, and the ghost tilts a beat later.

<p align="center">
  <a href="assets/readme-assets/nav-slowmo.mp4">
    <img src="assets/readme-assets/nav-slowmo.gif" width="720" alt="Slow-motion close-up of the pill stretching from Home to Explore and the ghost turning toward it" />
  </a>
</p>

### Rare ghost spins

Every fourth tap on the ghost plays one of the rare spins: a pirouette, a swirl trail, a halo toss. This prototype grid shows every look, one frame per tap, with every tap forced rare.

<p align="center">
  <a href="assets/readme-assets/rare-animations-prototype.mp4">
    <img src="assets/readme-assets/rare-spins.gif" width="720" alt="A grid of nav bars, each ghost performing a different rare spin" />
  </a>
</p>

### Android

The same screen on a Samsung phone. Android skips the native blur and uses a denser fill for the glass surfaces and a plain gradient under the nav bar.

<p align="center">
  <img src="assets/readme-assets/android-screenshot.jpg" width="300" alt="The Discover screen on an Android phone: portfolio header, top trades carousel, feed tabs, trade cards, and the floating nav bar" />
</p>

## Design and implementation

**Motion.** The idea is that the mascot pays attention to the user. The nav pill stretches as it moves, the ghost reacts, and the bar recedes while scrolling down. A feed change softens the cards on screen from the tap itself (a faint blur, a dip in scale and opacity, on the UI thread) and the new feed resolves into them, three cards a beat apart, so nothing is rebuilt and nothing waits on the animation. Loading placeholders, chart draw-ins, and note expansion complete the experience.

**Performance.** FlashList recycles feed rows, cards are memoized, and Reanimated runs the main animations on the native UI thread. JavaScript handles selection, loading, haptics, and cleanup. Other feeds preload after the first feed arrives; existing cards stay visible while a selection loads.

**Typography and materials.** iOS uses SF Pro Rounded; Android and web use three Nunito weights. Glass is approximated with gradients and inset shadows. iOS adds blur; Android and web use denser fills and a plain bottom gradient. These choices mean the platforms are close, but not visually identical.

**Accessibility.** The app includes safe-area handling, font-scale-aware note expansion, screen-reader labels and selection states, menu focus handling, and reduced-motion alternatives for the mascot and feed transitions.

**Scope.** Data is deterministic and cached for the session. Portfolio figures remain still after loading because there is no live price stream. Several icons and badges are custom SVGs rather than original Figma exports.

## Code map

| Folder | Purpose |
| --- | --- |
| `src/screens/` | Screen composition and feed coordination |
| `src/components/` | Cards, navigation, mascot, charts, and loading UI |
| `src/hooks/` | Scroll-driven header behavior |
| `src/data/` | Mock data, simulated requests, and session cache |
| `src/theme/` | Colors, typography, dimensions, and fonts |
| `src/utils/` | Motion calculations, geometry, and formatting |
| `src/__tests__/` | Unit and component tests |
| `src/dev/` | Animation tuning and recording tools |

## Checks

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

The 7 October 2026 review passed typecheck, lint, all 176 tests, and JavaScript exports for iOS and Android. Browser checks covered 320 pt and 393 pt widths. The recordings above come from a real iPhone and a real Android phone; frame-rate measurements on device are still outstanding.

## Next steps

- Finish menu selection cancellation and sparkline replay behavior when list cells are reused.
- Tighten the remaining Figma differences, including the bottom fade and reconstructed vectors.
- Verify larger text, screen readers, rapid gestures, and scrolling performance on iPhone and Android with instrumentation; record the numbers.

## Development tools

Set `SHOW_DIALS` to `true` in `App.tsx` to tune animation and loading values in development. With the web server running, open `/craft.html` for close-up recording and slow-motion playback; the nav close-ups above were recorded there.

Detailed notes: [screen design](docs/superpowers/specs/2026-10-05-discover-feed-design.md), [mascot motion](docs/superpowers/specs/2026-10-05-ghost-mascot-motion-design.md), [sky header](docs/superpowers/specs/2026-10-06-sky-bar-header-design.md), and [loading states](docs/superpowers/specs/2026-10-06-feed-skeleton-design.md).
