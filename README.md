# Miracle — Discover

A React Native recreation of Miracle’s Discover feed, built with Expo SDK 57 and TypeScript.

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

The 7 October 2026 review passed typecheck, lint, all 176 tests, and JavaScript exports for iOS and Android. Browser checks covered 320 pt and 393 pt widths. Native frame-rate measurements and a real-device recording are still outstanding; bundle exports do not establish native performance.

## Next steps

- Finish menu selection cancellation and sparkline replay behavior when list cells are reused.
- Tighten the remaining Figma differences, including the bottom fade and reconstructed vectors.
- Verify larger text, screen readers, rapid gestures, and scrolling performance on iPhone and Android; record the result.

## Development tools

Set `SHOW_DIALS` to `true` in `App.tsx` to tune animation and loading values in development. With the web server running, open `/craft.html` for close-up recording and slow-motion playback.

Detailed notes: [screen design](docs/superpowers/specs/2026-10-05-discover-feed-design.md), [mascot motion](docs/superpowers/specs/2026-10-05-ghost-mascot-motion-design.md), [sky header](docs/superpowers/specs/2026-10-06-sky-bar-header-design.md), and [loading states](docs/superpowers/specs/2026-10-06-feed-skeleton-design.md).

