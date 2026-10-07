# Miracle Discover

The Discover feed from the Miracle take-home, rebuilt in Expo (SDK 57) + TypeScript.

<p align="center">
  <a href="assets/readme-assets/hero.mp4"><img src="assets/readme-assets/hero.gif" width="520" alt="App tour" /></a>
</p>

[Figma](https://www.figma.com/design/JbobRQFbjv9tU37hT4ak9a/Untitled?node-id=694-310) · [Brief](docs/reference/brief.pdf)

```bash
npm ci
npm start
```

## The nav bar

The pill stretches to where you tap and springs back into shape. You can also drag it. The ghost in the middle looks at whichever tab is active, follows the pill while you drag, and spins when you tap it. Every fourth tap it does something rarer.

<p align="center">
  <a href="assets/readme-assets/nav.mp4"><img src="assets/readme-assets/nav.gif" width="640" alt="Nav bar" /></a>
  <br/>
  <a href="assets/readme-assets/nav-slowmo.mp4"><img src="assets/readme-assets/nav-slowmo.gif" width="640" alt="Nav bar, slow motion" /></a>
  <br/>
  <a href="assets/readme-assets/rare-animations-prototype.mp4"><img src="assets/readme-assets/rare-spins.gif" width="640" alt="Rare ghost spins" /></a>
</p>

## Other motion

Switching feeds blurs and shrinks the cards slightly, then the new ones resolve in, staggered. The sky header hides on scroll and comes back with a feed picker. Sparklines draw in. Notes expand. That's about it; I left the portfolio numbers still because nothing is actually updating them.

## How it's built

FlashList for the feed, memoized cards, Reanimated worklets for everything that moves, SVG sparklines. Blur on iOS; Android gets a denser fill instead. SF Pro Rounded on iOS, Nunito elsewhere. Layout was measured off the Figma file directly.

<p align="center">
  <img src="assets/readme-assets/android-screenshot.jpg" width="260" alt="Android" />
</p>

## Trade-offs

- The bottom fade and a few icons are hand-drawn, not Figma exports. Close, not pixel-identical.
- No on-device frame timing yet, only recordings. Phones felt smooth; I haven't measured.
- Sparkline replay and menu cancel are a bit rough when FlashList recycles a cell.

`npm run typecheck`, `npm run lint`, `npm test` all pass (176 tests).
