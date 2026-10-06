import { TAB_RESOLVE, resolveDelay, slideDirection, slideFrame } from '../utils/tabResolve';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

const TABS = ['discover', 'following', 'rising', 'favourites'];

describe('tab switch slide', () => {
  it('slides towards the tapped tab: right for a tab to the right, left for one to the left', () => {
    expect(slideDirection(TABS, 'discover', 'following')).toBe(1);
    expect(slideDirection(TABS, 'rising', 'discover')).toBe(-1);
    expect(slideDirection(TABS, 'rising', 'rising')).toBe(0);
  });

  it('sits still and opaque at rest', () => {
    expect(slideFrame(1, 0, 1)).toEqual({ x: 0, opacity: 1 });
    expect(slideFrame(1, 0, -1).x).toBeCloseTo(0);
  });

  it('sends the old content out against the switch, dimming as it goes', () => {
    expect(slideFrame(1, 1, 1)).toEqual({ x: -TAB_RESOLVE.exit, opacity: TAB_RESOLVE.opacity });
    expect(slideFrame(1, 1, -1)).toEqual({ x: TAB_RESOLVE.exit, opacity: TAB_RESOLVE.opacity });
    expect(slideFrame(1, 0.5, 1).x).toBeCloseTo(-TAB_RESOLVE.exit / 2);
  });

  it('brings the new content in from the side of the tapped tab, as far along as the old had got', () => {
    // The commit hands over at progress = 1 - pending: the same dimness, on the far side.
    const out = slideFrame(1, 0.8, 1);
    const inn = slideFrame(0.2, 0.8, 1);
    expect(out.x).toBeLessThan(0);
    expect(inn.x).toBeCloseTo(TAB_RESOLVE.enter * 0.8);
    expect(inn.opacity).toBeCloseTo(out.opacity);
    expect(slideFrame(0, 0, -1)).toEqual({ x: -TAB_RESOLVE.enter, opacity: TAB_RESOLVE.opacity });
  });

  it('keeps arriving content on the side it came from when a new tap changes the direction', () => {
    expect(slideFrame(0.5, 0, -1, 1).x).toBeCloseTo(TAB_RESOLVE.enter / 2);
  });

  it('never overshoots, even if the easing hands it a value past either end', () => {
    const same = (a: { x: number; opacity: number }, b: { x: number; opacity: number }) => {
      expect(a.x).toBeCloseTo(b.x);
      expect(a.opacity).toBeCloseTo(b.opacity);
    };
    same(slideFrame(1.2, 0, 1), slideFrame(1, 0, 1));
    same(slideFrame(-0.2, 0, 1), slideFrame(0, 0, 1));
  });

  it('staggers the cards that can be on screen 30 ms apart and leaves the rest alone', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(resolveDelay)).toEqual([0, 30, 60, 90, 120, null, null]);
  });

  it('settles the last card well under half a second after the switch', () => {
    expect((TAB_RESOLVE.count - 1) * TAB_RESOLVE.stagger + TAB_RESOLVE.duration).toBeLessThan(500);
  });
});
