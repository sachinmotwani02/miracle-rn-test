import { REVEAL_WINDOW, SKELETON, boneHeight, sweepTrack, topTradeWidths, tradeCardWidths } from '../utils/skeleton';

describe('boneHeight', () => {
  it('sizes a text bone to about the cap height of the text it stands for', () => {
    expect(boneHeight(12)).toBe(9);
    expect(boneHeight(13)).toBe(9);
    expect(boneHeight(15)).toBe(11);
    expect(boneHeight(19)).toBe(14);
    expect(boneHeight(24)).toBe(17);
  });
});

describe('sweepTrack', () => {
  it('starts and ends with the light band fully off screen, so it never pops in or out', () => {
    for (const width of [320, 393, 430]) {
      const { from, to } = sweepTrack(width);
      expect(from + SKELETON.sweep.band).toBeLessThanOrEqual(0);
      expect(to).toBeGreaterThanOrEqual(width);
    }
  });
});

describe('bone widths', () => {
  it('are stable for a seed and differ between cards', () => {
    expect(tradeCardWidths(0)).toEqual(tradeCardWidths(0));
    expect(tradeCardWidths(0)).not.toEqual(tradeCardWidths(1));
    expect(topTradeWidths(0)).not.toEqual(topTradeWidths(1));
  });

  it('stay inside the range real content covers', () => {
    for (let seed = 0; seed < 50; seed++) {
      const w = tradeCardWidths(seed);
      expect(w.name).toBeGreaterThanOrEqual(64);
      expect(w.name).toBeLessThanOrEqual(100);
      expect(w.stats).toBeGreaterThanOrEqual(128);
      expect(w.stats).toBeLessThanOrEqual(168);
      expect(w.asset).toBeGreaterThanOrEqual(38);
      expect(w.asset).toBeLessThanOrEqual(50);
      expect(w.price).toBeGreaterThanOrEqual(132);
      expect(w.price).toBeLessThanOrEqual(164);
      expect(w.note).toBeGreaterThanOrEqual(58);
      expect(w.note).toBeLessThanOrEqual(86);
      const t = topTradeWidths(seed);
      expect(t.name).toBeGreaterThanOrEqual(52);
      expect(t.name).toBeLessThanOrEqual(76);
      expect(t.gain).toBeGreaterThanOrEqual(48);
      expect(t.gain).toBeLessThanOrEqual(64);
      expect(t.meta).toBeGreaterThanOrEqual(104);
      expect(t.meta).toBeLessThanOrEqual(132);
    }
  });
});

describe('REVEAL_WINDOW', () => {
  it("outlasts the last placeholder card's crossfade", () => {
    const last = (SKELETON.feedFade.length - 1) * SKELETON.reveal.stagger + SKELETON.reveal.duration;
    expect(REVEAL_WINDOW).toBeGreaterThan(last);
  });
});
