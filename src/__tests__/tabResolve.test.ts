import { CELL_GLIDE_LIMIT, TAB_RESOLVE, cellMoveDuration, resolveDelay, resolveFrame } from '../utils/tabResolve';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

describe('tab switch resolve', () => {
  it('starts soft, slightly small and see-through', () => {
    expect(resolveFrame(0)).toEqual({ opacity: 0.45, scale: 0.97, intensity: 12 });
  });

  it('lands crisp, full size and opaque', () => {
    expect(resolveFrame(1)).toEqual({ opacity: 1, scale: 1, intensity: 0 });
  });

  it('never overshoots, even if the easing hands it a value past either end', () => {
    expect(resolveFrame(1.2)).toEqual(resolveFrame(1));
    expect(resolveFrame(-0.2)).toEqual(resolveFrame(0));
  });

  it('staggers the cards that can be on screen 45 ms apart and leaves the rest alone', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(i => resolveDelay(i))).toEqual([0, 45, 90, 135, 180, null, null]);
  });

  it('settles the last card well under half a second after the switch', () => {
    expect((TAB_RESOLVE.count - 1) * TAB_RESOLVE.stagger + TAB_RESOLVE.duration).toBeLessThan(500);
  });
});

describe('tab switch resolve with a tuned look', () => {
  it('starts from the look it is given', () => {
    expect(resolveFrame(0, { opacity: 0.2, scale: 0.9, blur: 20 })).toEqual({ opacity: 0.2, scale: 0.9, intensity: 20 });
  });

  it('staggers by the given gap and count', () => {
    expect([0, 1, 2, 3].map(i => resolveDelay(i, { count: 2, stagger: 100 }))).toEqual([0, 100, null, null]);
  });
});

describe('feed cells on a switch', () => {
  it('glide over the height duration when a height change shifts them', () => {
    expect(cellMoveDuration(22, 220)).toBe(220);
    expect(cellMoveDuration(-88, 220)).toBe(220);
  });

  it('snap when FlashList hands them over from far down the list', () => {
    expect(cellMoveDuration(CELL_GLIDE_LIMIT + 1, 220)).toBe(0);
    expect(cellMoveDuration(-1400, 220)).toBe(0);
  });
});
