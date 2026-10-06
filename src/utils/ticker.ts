import { Portfolio } from '../data/types';

/**
 * A simulated market for the portfolio header. The value only changes when the app comes back
 * from the background: by then the market has taken a step every `every` ms, each a small random
 * move pulled gently back toward where it started, so the value never wanders far. The 24h change
 * is always recomputed against the value 24 hours ago, so the two lines agree.
 */
export const TICK = {
  /** The simulated market takes one step about this often while the app is away, ms. */
  every: 2500,
  /** Most steps one absence adds; by then the walk has long settled around where it started. */
  maxSteps: 60,
  /** A fresh value lands this long after the app returns, as a fetch would, ms. */
  refreshDelay: 400,
  /** Typical size of one step as a fraction of the starting value (about $3 on $12k): the dollars roll, the hundreds rarely. */
  volatility: 0.00025,
  /** Share of the way back to the starting value the walk is pulled on every step. */
  pull: 0.08,
} as const;

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The portfolio's value 24 hours ago: the value now minus the 24h change. */
export function openingValue(portfolio: Portfolio): number {
  return cents(portfolio.valueUsd - portfolio.deltaUsd);
}

/** The portfolio at `value`, its 24h change measured against `opening` (cents, hundredths of a percent). */
export function portfolioAt(opening: number, value: number): Portfolio {
  const change = value - opening;
  return {
    valueUsd: value,
    deltaUsd: cents(change),
    deltaPct: Math.round((change / opening) * 10000) / 100,
  };
}

/**
 * One step of the walk: a random move (roughly normal, from the sum of three uniforms, so it is
 * bounded at three deviations) plus a pull back toward `anchor`. Always lands on whole cents and
 * always moves at least a cent.
 */
export function nextValue(value: number, anchor: number, rand: () => number): number {
  const z = (rand() + rand() + rand() - 1.5) * 2;
  const step = TICK.pull * (anchor - value) + TICK.volatility * anchor * z;
  const next = cents(value + step);
  return next === value ? cents(value + (step < 0 ? -0.01 : 0.01)) : next;
}

/** How many steps the simulated market took while the app was away for `ms`. */
export function stepsAway(ms: number): number {
  return Math.min(TICK.maxSteps, Math.max(1, Math.round(ms / TICK.every)));
}

/** Where the walk has got to after the app was away for `ms`; never back where it was, so a return always shows a change. */
export function valueAfter(value: number, anchor: number, ms: number, rand: () => number): number {
  let next = value;
  for (let i = stepsAway(ms); i > 0; i--) next = nextValue(next, anchor, rand);
  return next === value ? nextValue(next, anchor, rand) : next;
}
