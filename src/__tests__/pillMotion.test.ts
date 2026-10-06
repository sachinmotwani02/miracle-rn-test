import { PILL, moveStart, pillGlass, pillShape, pillSpring } from '../utils/pillMotion';

describe('pillShape', () => {
  const width = 56;
  const p = { amount: 0.28, easeIn: 1, reach: 1, squash: 0.5 };
  const far = width * 4;

  it('is its resting shape at both ends of a move', () => {
    expect(pillShape(0, far, width, p)).toEqual({ scaleX: 1, scaleY: 1 });
    expect(pillShape(far, 0, width, p)).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('is fully stretched mid-move, whichever way it travels', () => {
    expect(pillShape(width * 2, width * 2, width, p).scaleX).toBeCloseTo(1.28);
    expect(pillShape(-width * 2, -width * 2, width, p).scaleX).toBeCloseTo(1.28);
  });

  it('grows in over `easeIn` and lets go over `reach`, smoothstepped', () => {
    expect(pillShape(width / 2, far, width, p).scaleX).toBeCloseTo(1.14);
    expect(pillShape(far, width / 2, width, p).scaleX).toBeCloseTo(1.14);
    expect(pillShape(width, far, width, { ...p, easeIn: 2 }).scaleX).toBeCloseTo(1.14);
    // Smoothstep starts flat: a tenth of the way in it is far below a linear ramp.
    expect(pillShape(width / 10, far, width, p).scaleX - 1).toBeCloseTo(0.028 * 0.28);
  });

  it('gives up height by the squash exponent', () => {
    const mid = (q = p) => pillShape(width * 2, width * 2, width, q);
    expect(mid().scaleY).toBeCloseTo(1 / Math.sqrt(1.28));
    expect(mid({ ...p, squash: 0 }).scaleY).toBe(1);
    const area = mid({ ...p, squash: 1 });
    expect(area.scaleX * area.scaleY).toBeCloseTo(1);
  });
});

describe('moveStart', () => {
  const width = 56;
  const p = { amount: 0.28, easeIn: 1, reach: 1, squash: 0.5 };

  it('counts a move from rest from where the pill is', () => {
    expect(moveStart(8, 8, 8, 240, width, p)).toBe(8);
  });

  it('carries the current stretch into a move started mid-flight', () => {
    // Half an ease-in into a long move, then retargeted to another tab.
    const x = 8 + width / 2;
    const before = pillShape(x - 8, 240 - x, width, p);
    const start = moveStart(x, 8, 240, 64 + width * 3, width, p);
    const after = pillShape(x - start, 64 + width * 3 - x, width, p);
    expect(after.scaleX).toBeCloseTo(before.scaleX);
  });
});

describe('pillSpring', () => {
  it('is critically damped with no bounce', () => {
    expect(pillSpring({ duration: 200, bounce: 0 })).toEqual({ duration: 200, dampingRatio: 1 });
    expect(pillSpring({ duration: 200, bounce: 0.3 }).dampingRatio).toBeCloseTo(0.7);
  });

  it('slows down by the slow-mo factor', () => {
    expect(pillSpring({ duration: 200, bounce: 0 }, 4).duration).toBe(800);
  });
});

describe('pillGlass', () => {
  it('builds the fill and the three inset shadows from the defaults', () => {
    expect(pillGlass(PILL.glass)).toEqual({
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      boxShadow:
        'inset 0 1px 1px rgba(255, 255, 255, 0.32), inset 0 -1px 1px rgba(255, 255, 255, 0.15), inset 0 0 6px rgba(255, 255, 255, 0.08)',
    });
  });
});
