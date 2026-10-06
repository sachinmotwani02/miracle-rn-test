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
  tabsDocked,
} from '../utils/skyBar';

const T = 59;
const g = barGeometry(T, figmaHeader(T));

describe('sky bar geometry', () => {
  it('reads the Figma frame: Deposit pins at 24, the tabs rise from 198 and dock at 238', () => {
    expect(g.pin).toBe(24);
    expect(g.riseStart).toBe(198);
    expect(g.dock).toBe(238);
    expect(g.feed).toBe(282);
    expect(g.feedTop).toBe(244);
  });

  it('keeps the same offsets for a taller status bar, since the header moves down with it', () => {
    const tall = barGeometry(T + 3, figmaHeader(T + 3));
    expect(tall.pin).toBe(g.pin);
    expect(tall.dock).toBe(g.dock);
    expect(tall.feedTop).toBe(g.feedTop);
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

  it('follows the finger in the feed: 44 pt up shows it, 44 pt down hides it', () => {
    expect(nextPresence(0, 678, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(0, 600, 700, g)).toBe(1);
    expect(nextPresence(1, 722, 700, g)).toBeCloseTo(0.5);
    expect(nextPresence(1, 800, 700, g)).toBe(0);
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
  it('sits under the status bar at rest and whenever the bar is hidden', () => {
    expect(bandEdge(0, 1, g)).toBe(T);
    expect(bandEdge(150, 0, g)).toBe(T);
    expect(bandEdge(600, 0, g)).toBe(T);
  });

  it('slides down over the first 60 pt with the bar shown', () => {
    expect(bandEdge(30, 1, g)).toBe(T + 22);
    expect(bandEdge(60, 1, g)).toBe(T + 44);
    expect(bandEdge(150, 1, g)).toBe(T + 44);
  });

  it('rides 8 pt above the rising tab row, without a jump where the ride starts', () => {
    expect(bandEdge(g.riseStart, 1, g)).toBe(T + 44);
    expect(bandEdge(218, 1, g)).toBe(309 - 218 - 8);
  });

  it('sits under the docked row, and slides with presence in the feed', () => {
    expect(bandEdge(g.dock, 1, g)).toBe(T + 44);
    expect(bandEdge(600, 0.5, g)).toBe(T + 22);
  });
});

describe('fold', () => {
  it('runs over the 40 pt rise, and only with the bar shown', () => {
    expect(foldProgress(g.riseStart, 1, g)).toBe(0);
    expect(foldProgress(218, 1, g)).toBeCloseTo(0.5);
    expect(foldProgress(g.dock, 1, g)).toBe(1);
    expect(foldProgress(218, 0, g)).toBe(0);
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

  it('lifts the controls under the status bar as the bar hides', () => {
    expect(barLift(1)).toBe(0);
    expect(barLift(0)).toBe(SKY_BAR.height);
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
