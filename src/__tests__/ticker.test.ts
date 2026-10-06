import { mulberry32 } from '../utils/random';
import { TICK, nextValue, openingValue, portfolioAt, stepsAway, valueAfter } from '../utils/ticker';

const start = { valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 };

/** Runs the walk from the starting value and returns every value it visits. */
function walk(ticks: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const values = [start.valueUsd];
  for (let i = 0; i < ticks; i++) values.push(nextValue(values[i], start.valueUsd, rand));
  return values;
}

const steps = (values: number[]) => values.slice(1).map((v, i) => Math.abs(v - values[i]));

describe('openingValue', () => {
  it('is the value 24 hours ago: the current value minus the change', () => {
    expect(openingValue(start)).toBeCloseTo(11993.5, 6);
  });
});

describe('portfolioAt', () => {
  it('reproduces the starting portfolio at the starting value', () => {
    expect(portfolioAt(openingValue(start), start.valueUsd)).toEqual(start);
  });

  it('measures the change against the opening value, in cents and hundredths of a percent', () => {
    expect(portfolioAt(11993.5, 12100)).toEqual({ valueUsd: 12100, deltaUsd: 106.5, deltaPct: 0.89 });
    expect(portfolioAt(11993.5, 11900.25)).toEqual({ valueUsd: 11900.25, deltaUsd: -93.25, deltaPct: -0.78 });
  });

  it('shows no change at the opening value itself', () => {
    expect(portfolioAt(11993.5, 11993.5)).toEqual({ valueUsd: 11993.5, deltaUsd: 0, deltaPct: 0 });
  });
});

describe('nextValue', () => {
  it('lands on whole cents and always moves by at least a cent', () => {
    const values = walk(2000, 7);
    for (const v of values) expect(Math.abs(v * 100 - Math.round(v * 100))).toBeLessThan(1e-6);
    for (const step of steps(values)) expect(step).toBeGreaterThanOrEqual(0.01 - 1e-9);
  });

  it('usually rolls the dollars and rarely the hundreds', () => {
    const sorted = steps(walk(5000, 11)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeGreaterThan(0.5);
    expect(median).toBeLessThan(6);
    expect(sorted.filter((s) => s > 20).length / sorted.length).toBeLessThan(0.01);
  });

  it('wanders but is pulled back toward where it started', () => {
    const values = walk(10000, 23);
    const furthest = Math.max(...values.map((v) => Math.abs(v - start.valueUsd)));
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(furthest).toBeGreaterThan(start.valueUsd * 0.0005);
    expect(furthest).toBeLessThan(start.valueUsd * 0.004);
    expect(Math.abs(mean - start.valueUsd)).toBeLessThan(start.valueUsd * 0.0005);
  });
});

describe('stepsAway', () => {
  it('counts one step of the simulated market per tick away, and at least one', () => {
    expect(stepsAway(0)).toBe(1);
    expect(stepsAway(TICK.every * 10)).toBe(10);
  });

  it('stops counting once the walk has long settled', () => {
    expect(stepsAway(60 * 60 * 1000)).toBe(TICK.maxSteps);
  });
});

describe('valueAfter', () => {
  /** Median distance moved over many absences of `ms`, all starting from the starting value. */
  const medianMove = (ms: number) => {
    const rand = mulberry32(13);
    const moves = Array.from({ length: 2000 }, () =>
      Math.abs(valueAfter(start.valueUsd, start.valueUsd, ms, rand) - start.valueUsd),
    ).sort((a, b) => a - b);
    return moves[1000];
  };

  it('is a single step of the walk after a moment away', () => {
    expect(valueAfter(start.valueUsd, start.valueUsd, 1000, mulberry32(4))).toBe(
      nextValue(start.valueUsd, start.valueUsd, mulberry32(4)),
    );
  });

  it('always comes back to a different value', () => {
    const rand = mulberry32(8);
    for (let i = 0; i < 500; i++) {
      const value = Math.round((12000 + i * 0.37) * 100) / 100;
      expect(valueAfter(value, start.valueUsd, (i % 40) * 1000, rand)).not.toBe(value);
    }
  });

  it('moves further after a long absence than a short one', () => {
    expect(medianMove(60 * 1000)).toBeGreaterThan(2 * medianMove(TICK.every));
  });

  it('stays near where it started however long the app was away', () => {
    const rand = mulberry32(21);
    for (let i = 0; i < 500; i++) {
      const value = valueAfter(start.valueUsd, start.valueUsd, 60 * 60 * 1000, rand);
      expect(Math.abs(value - start.valueUsd)).toBeLessThan(start.valueUsd * 0.004);
    }
  });
});
