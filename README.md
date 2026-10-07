# Miracle Discover

The Discover feed from the Miracle take-home, rebuilt in Expo SDK 57 + TypeScript. Reanimated 4, FlashList, SVG. Mock data.

<p align="center">
  <a href="assets/readme-assets/hero.mp4"><img src="assets/readme-assets/hero.gif" width="520" alt="App tour" /></a>
</p>

[Figma](https://www.figma.com/design/JbobRQFbjv9tU37hT4ak9a/Untitled?node-id=694-310) · [Brief](docs/reference/brief.pdf)

```bash
npm ci
npm start
```

## The nav bar

The idea: the ghost in the middle is paying attention. It breathes, blinks and glances around on its own. Tap a tab and the pill stretches along its travel and lands critically damped (no bounce), while the ghost turns its head to look at the tab you picked. You can drag the pill too; the ghost follows it with its eyes and you get a haptic tick at each tab you cross.

Tap the ghost and it does a pirouette about its vertical axis, with comet trails, a little dizzy face and a blink. Every fourth tap is a rare one: a crouch, a double spin, and coloured orbit rings that burst into sparkles on landing. The rare moment fires on a tap rather than a hold because your finger would be covering it.

<p align="center">
  <a href="assets/readme-assets/nav.mp4"><img src="assets/readme-assets/nav.gif" width="640" alt="Nav bar" /></a>
  <br/>
  <a href="assets/readme-assets/nav-slowmo.mp4"><img src="assets/readme-assets/nav-slowmo.gif" width="640" alt="Nav bar, slow motion" /></a>
  <br/>
  <a href="assets/readme-assets/rare-animations-prototype.mp4"><img src="assets/readme-assets/rare-spins.gif" width="640" alt="Rare spins" /></a>
</p>

The bar shrinks a little when you scroll down and comes back when you scroll up.

## Everything else that moves

- **Tab switch.** The tap itself softens the cards on the UI thread (slight blur, 0.96 scale, fade) before React has rendered anything, so it feels instant. The new cards land in the same recycled cells and sharpen in, three of them 45 ms apart. The other feeds load quietly in the background after the first one, so a switch never shows a skeleton. I tried a slide, a pager and a changed-cards-only version before coming back to this one.
- **Sky header.** Scrolling hides the portfolio header. On the way back up a thin bar slides in with Deposit pinned and the four tabs folded into a dropdown. You can drag across the dropdown to pick.
- **Loading.** A skeleton with one subtle light sweep, then the content crossfades in. Simulated latency per section.
- **Cards.** Sparklines draw in once (not again when a cell is recycled), markers pop as the line reaches them, Read more eases open.

Deliberately not animated: the portfolio numbers. I had a count-up on mount and removed it. It fought with the skeleton reveal, and without real prices it's just decoration.

## Fidelity and platforms

The file was view-only, so the layout was measured from lossless captures and, later, the frame's SVG, then checked at 6x. SF Pro Rounded on iOS via the system rounded font; Nunito on Android and web. I tried native Liquid Glass for the bar and Deposit button and dropped it for glass faked from the Figma's own shadows, so both platforms match. iOS blurs the nav bar, the feed menu and the tab switch; Android gets denser fills and scale + fade only.

<p align="center">
  <img src="assets/readme-assets/android-screenshot.jpg" width="260" alt="Android" />
</p>

Safe areas, 320 pt widths, text scaling up to 1.2x, screen reader roles and focus for the menu. Reduced motion calms the ghost, the tab switch, the menu and the loading sweep; the pill still moves.

## Trade-offs

- Frame times are judged from phone recordings, not measured. It felt smooth; I have no numbers.
- The bottom fade and a few icons are redrawn, not exported. Close, not identical.
- Sparkline replay and cancelling a menu pick are a bit rough when FlashList recycles a cell.

## Next

- Live number animation on the portfolio and prices, driven by real data.
- Measure on device: frame times for scrolling and the tab switch.
- Reduced-motion handling for the pill and the sky bar.

`npm run typecheck`, `npm run lint`, `npm test`: 182 tests in 25 suites, all passing. There's a dev-only Dials panel for tuning the animations live (`SHOW_DIALS` in App.tsx) and a `/craft.html` page on the web build that I used to record the close-ups.
