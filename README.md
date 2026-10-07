# Miracle — Discover

A React Native recreation of Miracle’s Discover feed, built with Expo SDK 57 and TypeScript, with a floating nav bar and a mascot that pays attention to you.

<p align="center">
  <a href="assets/readme-assets/hero.mp4">
    <img src="assets/readme-assets/hero.gif" width="560" alt="A 40 second tour of the Discover screen on an iPhone: the feed loads in, tabs switch, the feed selector opens, the header returns on scroll, and the ghost in the nav bar reacts" />
  </a>
</p>
<p align="center"><sub>Full tour · <a href="assets/readme-assets/hero.mp4">hero.mp4</a> (1080 × 1080, 60 fps, 40 s)</sub></p>

[Figma design](https://www.figma.com/design/JbobRQFbjv9tU37hT4ak9a/Untitled?node-id=694-310) · [Assignment brief](docs/reference/brief.pdf)

## Run

```bash
npm ci
npm start
```

`npm run web` for a browser preview.

## What to try

- **Switch feeds:** Discover, Following, Rising, Favourites.
- **Scroll:** the nav bar recedes on the way down; the sky header returns with a feed selector on the way up.
- **Use the bottom bar:** tap a destination, or drag the active pill between icons.
- **Tap the ghost:** it spins, reacts to repeated taps, and performs a special spin every fourth tap. It looks toward the active destination and follows the dragged pill.

Single screen, mock data. Deposit gives press feedback; the bottom bar changes selection without opening other screens.

## Recordings

**The nav bar.** The pill stretches toward its destination and settles with a spring. The ghost turns to look at the active tab, and follows the finger when the pill is dragged.

<p align="center">
  <a href="assets/readme-assets/nav.mp4">
    <img src="assets/readme-assets/nav.gif" width="720" alt="The active pill moving between the five nav icons by tap and by drag, with the ghost turning toward it" />
  </a>
</p>

**Slow motion.** The pill stretches as it leaves, squashes as it lands, and the ghost tilts a beat later.

<p align="center">
  <a href="assets/readme-assets/nav-slowmo.mp4">
    <img src="assets/readme-assets/nav-slowmo.gif" width="720" alt="Slow-motion close-up of the pill stretching from Home to Explore and the ghost turning toward it" />
  </a>
</p>

**Rare ghost spins.** Every fourth tap plays one of these. Prototype grid, every tap forced rare.

<p align="center">
  <a href="assets/readme-assets/rare-animations-prototype.mp4">
    <img src="assets/readme-assets/rare-spins.gif" width="720" alt="A grid of nav bars, each ghost performing a different rare spin" />
  </a>
</p>

**Android.** Same screen on a Samsung phone. No native blur; glass surfaces use a denser fill and a plain gradient under the nav bar.

<p align="center">
  <img src="assets/readme-assets/android-screenshot.jpg" width="300" alt="The Discover screen on an Android phone: portfolio header, top trades carousel, feed tabs, trade cards, and the floating nav bar" />
</p>

## Decisions and trade-offs

**Motion.** One idea: the mascot pays attention to the user. The pill stretches as it moves, the ghost reacts, the bar recedes while scrolling. A feed change softens the cards on screen from the tap itself (a faint blur, a dip in scale and opacity, on the UI thread) and the new feed resolves into them, three cards a beat apart, so nothing is rebuilt and nothing waits on the animation. Loading placeholders, sparkline draw-ins, and note expansion complete it. Portfolio figures do not count up: with no live price stream, a count-up would be decoration.

**Performance.** FlashList recycles feed rows, cards are memoized, and Reanimated runs the animations on the native UI thread. JavaScript handles selection, loading, haptics, and cleanup. Sparklines are SVG. Other feeds preload after the first arrives; existing cards stay visible while a selection loads.

**Fidelity.** The Figma was measured from lossless captures of the viewer and from the SVG of the feed frame; every text layer's type panel was read. iOS uses SF Pro Rounded; Android and web use three Nunito weights. Glass is approximated with gradients and inset shadows; iOS adds blur. Some icons and badges are custom SVGs rather than Figma exports, and the bottom fade is not yet an exact match. The platforms are close, not identical.

**Robustness.** Safe areas, font-scale-aware note expansion, screen-reader labels and selection states, menu focus handling, and reduced-motion alternatives for the mascot and feed transitions. Browser checks covered 320 pt and 393 pt widths.

## Checks

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Typecheck, lint, and all 176 tests pass. The recordings above come from a real iPhone and a real Android phone; on-device frame-rate numbers are still outstanding.

## Next

- Finish menu selection cancellation and sparkline replay when list cells are reused.
- Close the remaining Figma gaps: the bottom fade and the reconstructed vectors.
- Profile scrolling and rapid gestures on iPhone and Android with instrumentation, and test larger text and screen readers on device.

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
| `src/dev/` | Animation tuning and recording tools (development only) |
