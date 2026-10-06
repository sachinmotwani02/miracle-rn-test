import {
  SKY_BAR,
  bandEdge,
  barGeometry,
  barLift,
  chevronReveal,
  crossesIntoHeader,
  depositPinned,
  figmaHeader,
  foldProgress,
  foldedTab,
  nextPresence,
  settleTarget,
  skyOffset,
  statusDark,
  statusSky,
  tabsDocked,
} from '../utils/skyBar';

const T = 59;
const g = barGeometry(T, figmaHeader(T));

describe('sky bar geometry', () => {
  it('reads the Figma frame: Deposit pins at 24, the tabs rise from 190 and dock at 238', () => {
    expect(g.pin).toBe(24);
    expect(g.riseStart).toBe(190);
    expect(g.dock).toBe(238);
    expect(g.feed).toBe(290);
    expect(g.feedTop).toBe(236);
    expect(g.under).toBe(288);
  });

  it('keeps the same offsets for a taller status bar, since the header moves down with it', () => {
    const tall = barGeometry(T + 3, figmaHeader(T + 3));
    expect(tall.pin).toBe(g.pin);
    expect(tall.dock).toBe(g.dock);
    expect(tall.feedTop).toBe(g.feedTop);
    expect(tall.under).toBe(g.under);
  });
});

describe('presence', () => {
  it('is hidden at the very top', () => {
    expect(nextPresence(1, 0, 40, g)).toBe(0);
    expect(nextPresence(1, -12, 0, g)).toBe(0);
  });

  it('holds through the header whichever way the list moves', () => {
    expect(nextPresence(0, 150, 120, g)).toBe(0);
    expect(nextPresence(1, 120, 150, g)).toBe(1);
    expect(nextPresence(0, 260, 280, g)).toBe(0);
  });

  it('follows the finger 1:1 in the feed: the full band height (T + 52 pt) shows or hides it', () => {
    const full = T + SKY_BAR.height;
    expect(nextPresence(0, 700 - full / 2, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(0, 700 - full, 700, g)).toBe(1);
    expect(nextPresence(1, 700 + full / 2, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(1, 700 + full, 700, g)).toBe(0);
  });

  it('finishes sliding in when the list crosses back into the header partway', () => {
    expect(crossesIntoHeader(0.4, 270, 290, g)).toBe(true);
    expect(crossesIntoHeader(1, 270, 290, g)).toBe(false);
    expect(crossesIntoHeader(0, 270, 290, g)).toBe(false);
    expect(crossesIntoHeader(0.4, 300, 320, g)).toBe(false);
  });

  it('settles a partway bar at the nearer end', () => {
    expect(settleTarget(0.49)).toBe(0);
    expect(settleTarget(0.5)).toBe(1);
  });
});

describe('band edge', () => {
  it('sits under the status bar at rest and through the header with the bar hidden', () => {
    expect(bandEdge(0, 1, g)).toBe(T);
    expect(bandEdge(150, 0, g)).toBe(T);
  });

  it('is off the top of the screen from the dock on with the bar hidden', () => {
    expect(bandEdge(g.dock, 0, g)).toBe(0);
    expect(bandEdge(900, 0, g)).toBe(0);
  });

  it('slides down over the first 60 pt with the bar shown', () => {
    expect(bandEdge(30, 1, g)).toBe(T + SKY_BAR.height / 2);
    expect(bandEdge(60, 1, g)).toBe(T + SKY_BAR.height);
    expect(bandEdge(150, 1, g)).toBe(T + SKY_BAR.height);
  });

  it('rides 8 pt above the rising tab row, without a jump where the ride starts', () => {
    expect(bandEdge(g.riseStart, 1, g)).toBe(T + SKY_BAR.height);
    expect(bandEdge(218, 1, g)).toBe(309 - 218 - 8);
  });

  it('sits under the docked row, and slides in from the top of the screen in the feed', () => {
    expect(bandEdge(g.dock, 1, g)).toBe(T + SKY_BAR.height);
    expect(bandEdge(900, 0.5, g)).toBe((T + SKY_BAR.height) / 2);
    expect(bandEdge(900, 1, g)).toBe(T + SKY_BAR.height);
  });

  it('has no jump at the first card: the fade and the bar are separate layers', () => {
    for (const h of [0, 0.3, 0.7, 1]) {
      expect(bandEdge(g.under + 1e-9, h, g)).toBeCloseTo(bandEdge(g.under, h, g));
      expect(bandEdge(g.under + T - 1e-9, h, g)).toBeCloseTo(bandEdge(g.under + T, h, g));
    }
  });
});

describe('fold', () => {
  it('runs over the 48 pt rise, and only with the bar shown', () => {
    expect(foldProgress(g.riseStart, 1, g)).toBe(0);
    expect(foldProgress(214, 1, g)).toBeCloseTo(0.5);
    expect(foldProgress(g.dock, 1, g)).toBe(1);
    expect(foldProgress(214, 0, g)).toBe(0);
  });

  it('slides every tab to the start; only the active one stays solid', () => {
    const active = foldedTab(1, 172, 16, true);
    expect(active.translateX).toBe(-156);
    expect(active.scale).toBe(1);
    expect(active.opacity).toBe(1);
    const other = foldedTab(1, 229, 16, false);
    expect(other.translateX).toBe(-213);
    expect(other.scale).toBeCloseTo(0.85);
    expect(other.opacity).toBe(0);
    const rest = foldedTab(0, 229, 16, false);
    expect(rest.translateX).toBeCloseTo(0);
    expect(rest.scale).toBe(1);
    expect(rest.opacity).toBe(1);
  });

  it('brings the chevron in over the second half', () => {
    expect(chevronReveal(0.5)).toEqual({ opacity: 0, translateX: -6 });
    expect(chevronReveal(1)).toEqual({ opacity: 1, translateX: 0 });
  });
});

describe('sky and visibility', () => {
  it('follows the background parallax until the tabs dock, then holds', () => {
    expect(skyOffset(100, g)).toBeCloseTo(30);
    expect(skyOffset(g.dock, g)).toBeCloseTo(71.4);
    expect(skyOffset(900, g)).toBeCloseTo(71.4);
    expect(skyOffset(-40, g)).toBe(0);
  });

  it('lifts the controls under the status bar as the bar hides, keeping them on its edge', () => {
    expect(barLift(150, 1, g)).toBe(0);
    expect(barLift(150, 0, g)).toBe(SKY_BAR.height);
    for (const [s, h] of [[900, 0.5], [g.under + 20, 0.3], [g.dock, 0.6], [g.dock, 1]]) {
      // The controls' row bottom (T + row height - lift) sits on the band's bottom edge.
      expect(T + SKY_BAR.height - barLift(s, h, g)).toBeCloseTo(bandEdge(s, h, g));
    }
  });

  it('pins Deposit and docks the tabs only with the bar shown', () => {
    expect(depositPinned(23, 1, g)).toBe(false);
    expect(depositPinned(24, 1, g)).toBe(true);
    expect(depositPinned(400, 0, g)).toBe(false);
    expect(tabsDocked(237, 1, g)).toBe(false);
    expect(tabsDocked(238, 1, g)).toBe(true);
    expect(tabsDocked(600, 0, g)).toBe(false);
  });
});

describe('behind the status bar', () => {
  it('keeps the header sky until the first card reaches the status bar, then fades it out', () => {
    expect(statusSky(0, g)).toBe(1);
    expect(statusSky(g.under, g)).toBe(1);
    expect(statusSky(g.under + T / 2, g)).toBeCloseTo(0.5);
    expect(statusSky(g.under + T, g)).toBe(0);
    expect(statusSky(900, g)).toBe(0);
  });

  it('turns the icons dark once neither the header sky nor the bar covers half the status bar', () => {
    expect(statusDark(0, 0, g)).toBe(false);
    expect(statusDark(g.under + T / 2 - 1, 0, g)).toBe(false);
    expect(statusDark(g.under + T / 2 + 1, 0, g)).toBe(true);
    expect(statusDark(900, 0, g)).toBe(true);
    // In the feed the edge of the bar has to come down past the middle of the status bar.
    const half = T / 2 / (T + SKY_BAR.height);
    expect(statusDark(900, half - 0.01, g)).toBe(true);
    expect(statusDark(900, half + 0.01, g)).toBe(false);
  });

  it('keeps light icons without a status bar', () => {
    expect(statusDark(900, 0, barGeometry(0, figmaHeader(0)))).toBe(false);
    expect(statusSky(900, barGeometry(0, figmaHeader(0)))).toBe(1);
  });
});
