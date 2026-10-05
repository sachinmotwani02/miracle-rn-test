import { BREATH, breathCurve, clamp, dizzyOffset, randomBetween, wrap01 } from '../utils/mascotMotion';

describe('breathCurve', () => {
  const exhaleEnd = BREATH.inhale + BREATH.exhale;

  it('starts at rest, fills at the top of the inhale and is empty again before the pause', () => {
    expect(breathCurve(0)).toBeCloseTo(0, 6);
    expect(breathCurve(BREATH.inhale)).toBeCloseTo(1, 6);
    expect(breathCurve(exhaleEnd)).toBeCloseTo(0, 6);
    expect(breathCurve((exhaleEnd + 1) / 2)).toBe(0);
  });

  it('never jumps between frames, including the wrap into the next breath', () => {
    const steps = 2000;
    for (let i = 1; i <= steps; i++) {
      expect(Math.abs(breathCurve(i / steps) - breathCurve((i - 1) / steps))).toBeLessThan(0.01);
    }
  });

  it('rises through the inhale and falls through the exhale', () => {
    for (let p = 0.01; p <= BREATH.inhale; p += 0.01) {
      expect(breathCurve(p)).toBeGreaterThanOrEqual(breathCurve(p - 0.01));
    }
    for (let p = BREATH.inhale + 0.01; p <= exhaleEnd; p += 0.01) {
      expect(breathCurve(p)).toBeLessThanOrEqual(breathCurve(p - 0.01));
    }
  });

  it('lets most of the air out in the first half of the exhale', () => {
    expect(breathCurve(BREATH.inhale + BREATH.exhale / 2)).toBeLessThan(0.35);
  });

  it('treats phases outside 0..1 as the same breath', () => {
    expect(breathCurve(1.2)).toBeCloseTo(breathCurve(0.2), 10);
    expect(breathCurve(-0.8)).toBeCloseTo(breathCurve(0.2), 10);
  });
});

describe('wrap01', () => {
  it('wraps any phase into 0..1', () => {
    expect(wrap01(0.25)).toBeCloseTo(0.25);
    expect(wrap01(1.25)).toBeCloseTo(0.25);
    expect(wrap01(-0.25)).toBeCloseTo(0.75);
    expect(wrap01(1)).toBe(0);
  });
});

describe('dizzyOffset', () => {
  it('starts and ends with the eyes centred', () => {
    for (const t of [0, 1]) {
      expect(dizzyOffset(t).x).toBeCloseTo(0, 6);
      expect(dizzyOffset(t).y).toBeCloseTo(0, 6);
    }
  });

  it('stays inside the gaze range', () => {
    for (let t = 0; t <= 1; t += 0.01) {
      const { x, y } = dizzyOffset(t);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });

  it('rolls the eyes all the way around', () => {
    const points = Array.from({ length: 101 }, (_, i) => dizzyOffset(i / 100));
    expect(Math.max(...points.map(p => p.x))).toBeGreaterThan(0.5);
    expect(Math.min(...points.map(p => p.x))).toBeLessThan(-0.5);
    expect(Math.max(...points.map(p => p.y))).toBeGreaterThan(0.3);
    expect(Math.min(...points.map(p => p.y))).toBeLessThan(-0.3);
  });
});

describe('randomBetween', () => {
  it('maps the random source onto the range', () => {
    expect(randomBetween(2, 6, () => 0)).toBe(2);
    expect(randomBetween(2, 6, () => 0.5)).toBe(4);
    expect(randomBetween(-1, 1, () => 0.75)).toBe(0.5);
  });
});

describe('clamp', () => {
  it('limits a value to the range', () => {
    expect(clamp(5, -1, 1)).toBe(1);
    expect(clamp(-5, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
  });
});
