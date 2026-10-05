import { buildSparkline } from '../utils/sparkline';

describe('buildSparkline', () => {
  const values = [1, 3, 2, 5, 4, 8];
  const opts = { width: 90, height: 32, padding: 6 };

  it('maps points into the box with padding for the stroke and markers', () => {
    const s = buildSparkline(values, opts);
    expect(s.points).toHaveLength(6);
    expect(s.points[0].x).toBe(6);
    expect(s.points[5].x).toBe(84);
    expect(Math.min(...s.points.map(p => p.y))).toBeCloseTo(6, 5);
    expect(Math.max(...s.points.map(p => p.y))).toBeCloseTo(26, 5);
  });

  it('produces a cubic path starting at the first point', () => {
    const s = buildSparkline(values, opts);
    expect(s.path.startsWith('M6 26')).toBe(true);
    expect(s.path).toContain('C');
    expect((s.path.match(/C/g) ?? []).length).toBe(5);
  });

  it('estimates length as at least the straight-line polyline length', () => {
    const s = buildSparkline(values, opts);
    expect(s.length).toBeGreaterThanOrEqual(78);
  });

  it('handles flat series without NaN', () => {
    const s = buildSparkline([2, 2, 2], opts);
    expect(s.points.every(p => Number.isFinite(p.y))).toBe(true);
    expect(s.points[0].y).toBe(16);
  });

  it('handles empty input', () => {
    expect(buildSparkline([], opts)).toEqual({ points: [], path: '', length: 0 });
  });
});
