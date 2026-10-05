import { navSlotCenter, navPillLeft } from '../theme/layout';

describe('nav geometry', () => {
  it('spaces five slots evenly inside the padded 300pt bar', () => {
    expect(navSlotCenter(0)).toBeCloseTo(33.2, 1);
    expect(navSlotCenter(2)).toBeCloseTo(150, 1);
    expect(navSlotCenter(4)).toBeCloseTo(266.8, 1);
  });

  it('centres the 56pt pill on the slot', () => {
    expect(navPillLeft(0)).toBeCloseTo(5.2, 1);
    expect(navPillLeft(2)).toBeCloseTo(122, 1);
  });
});
