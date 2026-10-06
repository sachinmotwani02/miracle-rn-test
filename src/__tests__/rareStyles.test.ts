import { COMETS, comet, cometPoint, confetti, getRareStyle, setRareStyle, silkBand, subscribeRareStyle } from '../dev/rareStyles';

describe('rare spin looks for the craft showcase', () => {
  afterEach(() => setRareStyle('orbit'));

  it('defaults to the shipped orbit rings and notifies on a switch', () => {
    expect(getRareStyle()).toBe('orbit');
    const listener = jest.fn();
    const unsubscribe = subscribeRareStyle(listener);
    setRareStyle('silk');
    expect(getRareStyle()).toBe('silk');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setRareStyle('comets');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('winds the silk ribbon round the cloud and floats it up as it unravels', () => {
    const wound = silkBand(2, 90, 650, 0, 85, 75);
    expect(wound.front + wound.back).not.toBe('M0 0M0 0');
    const topOf = (d: string) => Math.min(...[...d.matchAll(/[ML]\s*[-\d.]+\s+([-\d.]+)/g)].map(m => Number(m[1])));
    const loose = silkBand(2, 90, 650, 1, 85, 75);
    expect(topOf(loose.front + loose.back)).toBeLessThan(topOf(wound.front + wound.back));
  });

  it('throws each comet outward from where it was, falling and fading out', () => {
    const o = comet(4);
    const head = 40 * o.rate + o.phase;
    const from = cometPoint(4, head, 85, 75);
    const start = confetti(4, head, 0, 85, 75);
    expect(start.x).toBeCloseTo(from.x);
    expect(start.y).toBeCloseTo(from.y);
    expect(start.opacity).toBe(1);
    const away = (p: { x: number; y: number }) => Math.hypot(p.x - 85, p.y - 75);
    expect(away(confetti(4, head, 300, 85, 75))).toBeGreaterThan(away(start));
    const end = confetti(4, head, COMETS.confettiMs, 85, 75);
    expect(end.opacity).toBe(0);
    // Gravity bends every path downward, whichever way the piece was thrown.
    const mid = confetti(4, head, COMETS.confettiMs / 2, 85, 75);
    expect(start.y + end.y - 2 * mid.y).toBeGreaterThan(0);
  });
});
