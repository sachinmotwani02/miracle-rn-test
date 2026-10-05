import { navSlotCenter, navPillLeft, layout } from '../theme/layout';

describe('nav geometry', () => {
  it('uses the slot centres measured from the Figma', () => {
    expect(navSlotCenter(0)).toBe(36);
    expect(navSlotCenter(2)).toBe(layout.nav.width / 2);
    expect(navSlotCenter(4)).toBe(268);
  });

  it('is symmetric around the bar centre', () => {
    expect(navSlotCenter(0) + navSlotCenter(4)).toBe(layout.nav.width);
    expect(navSlotCenter(1) + navSlotCenter(3)).toBe(layout.nav.width);
  });

  it('centres the 56pt pill on the slot and keeps it inside the padding', () => {
    expect(navPillLeft(0)).toBe(8);
    expect(navPillLeft(4) + layout.nav.pillWidth).toBe(layout.nav.width - 8);
  });
});
