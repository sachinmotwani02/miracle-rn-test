import { TAB_RESOLVE, resolveDelay, resolveFrame } from '../utils/tabResolve';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

describe('tab switch resolve', () => {
  it('starts soft, slightly small and see-through', () => {
    expect(resolveFrame(0)).toEqual({ opacity: 0.45, scale: 0.97, intensity: 30 });
  });

  it('lands crisp, full size and opaque', () => {
    expect(resolveFrame(1)).toEqual({ opacity: 1, scale: 1, intensity: 0 });
  });

  it('never overshoots, even if the easing hands it a value past either end', () => {
    expect(resolveFrame(1.2)).toEqual(resolveFrame(1));
    expect(resolveFrame(-0.2)).toEqual(resolveFrame(0));
  });

  it('staggers the cards that can be on screen 45 ms apart and leaves the rest alone', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(resolveDelay)).toEqual([0, 45, 90, 135, 180, null, null]);
  });

  it('settles the last card well under half a second after the switch', () => {
    expect((TAB_RESOLVE.count - 1) * TAB_RESOLVE.stagger + TAB_RESOLVE.duration).toBeLessThan(500);
  });
});
