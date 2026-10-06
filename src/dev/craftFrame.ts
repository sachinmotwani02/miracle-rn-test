import { RareStyle, setRareStyle } from './rareStyles';

/**
 * The app's half of the craft showcase (public/craft.html), which frames the app in an iframe to
 * record close-ups. Only active on web, inside that iframe (`?craft-frame`); a no-op everywhere else.
 *
 * Slow motion: the app's clock runs at `scale` x real time. performance.now, Date.now, rAF
 * timestamps and timers are all rescaled, so Reanimated animations, springs, frame callbacks and
 * JS timers (the ghost's turns and blinks, the loading gates) slow down together; CSS animations
 * (web layout animations) follow through their playbackRate. Imported first in index.ts so
 * nothing captures the real clock before it is replaced.
 */

interface CraftFrame {
  setTimeScale: (scale: number) => void;
  timeScale: () => number;
  /** Which look the ghost's rare spin wears (the app always uses the orbit rings). */
  setRareStyle: (style: RareStyle) => void;
}

interface CraftParent {
  /** Initial slow-motion factor and rare-spin look, read when the frame loads (a cold start reloads it). */
  __craftSpeed?: number;
  __craftRare?: RareStyle;
  /** Key presses inside the frame, so the page's shortcuts work while the app has focus. */
  __craftKey?: (key: string, shift: boolean, code: string) => boolean;
}

interface Timer {
  run: () => void;
  due: number;
  interval: number | null;
  real: ReturnType<typeof setTimeout>;
}

function install(initial: number): CraftFrame {
  const realNow = performance.now.bind(performance);
  const realDateNow = Date.now.bind(Date);
  const realSetTimeout = window.setTimeout.bind(window);
  const realClearTimeout = window.clearTimeout.bind(window);
  const realRaf = window.requestAnimationFrame.bind(window);

  let scale = initial;
  let realAnchor = realNow();
  let appAnchor = realAnchor;
  const now = () => appAnchor + (realNow() - realAnchor) * scale;
  const dateOffset = realDateNow() - realNow();

  performance.now = now;
  Date.now = () => Math.floor(dateOffset + now());
  window.requestAnimationFrame = callback => realRaf(() => callback(now()));

  // Timers keep their due time on the app clock, so a speed change re-arms them at the new rate.
  const timers = new Map<number, Timer>();
  let nextId = 1_000_000;
  const arm = (id: number, timer: Timer) => {
    timer.real = realSetTimeout(() => fire(id), Math.max(0, (timer.due - now()) / scale));
  };
  const fire = (id: number) => {
    const timer = timers.get(id);
    if (!timer) return;
    if (timer.interval === null) timers.delete(id);
    else {
      timer.due += timer.interval;
      arm(id, timer);
    }
    timer.run();
  };
  const schedule = (handler: TimerHandler, ms: number | undefined, args: unknown[], repeat: boolean) => {
    if (typeof handler !== 'function') return realSetTimeout(handler, ms);
    const id = nextId++;
    const delay = Math.max(0, ms ?? 0);
    const timer: Timer = {
      run: () => handler(...args),
      due: now() + delay,
      interval: repeat ? Math.max(delay, 1) : null,
      real: 0 as unknown as ReturnType<typeof setTimeout>,
    };
    timers.set(id, timer);
    arm(id, timer);
    return id;
  };
  const cancel = (id: number | undefined) => {
    const timer = id === undefined ? undefined : timers.get(id);
    if (timer) {
      realClearTimeout(timer.real);
      timers.delete(id!);
    } else realClearTimeout(id);
  };
  window.setTimeout = ((handler: TimerHandler, ms?: number, ...args: unknown[]) => schedule(handler, ms, args, false)) as typeof window.setTimeout;
  window.setInterval = ((handler: TimerHandler, ms?: number, ...args: unknown[]) => schedule(handler, ms, args, true)) as typeof window.setInterval;
  window.clearTimeout = cancel as typeof window.clearTimeout;
  window.clearInterval = cancel as typeof window.clearInterval;

  const syncCss = () => {
    for (const animation of document.getAnimations()) {
      if (animation.playbackRate !== scale) animation.playbackRate = scale;
    }
  };
  const loop = () => {
    syncCss();
    realRaf(loop);
  };
  realRaf(loop);

  return {
    setTimeScale: next => {
      appAnchor = now();
      realAnchor = realNow();
      scale = next;
      timers.forEach((timer, id) => {
        realClearTimeout(timer.real);
        arm(id, timer);
      });
      syncCss();
    },
    timeScale: () => scale,
    setRareStyle,
  };
}

if (typeof document !== 'undefined' && typeof location !== 'undefined' && window.parent !== window && new URLSearchParams(location.search).has('craft-frame')) {
  const parent = window.parent as unknown as CraftParent;
  (window as unknown as { __craft: CraftFrame }).__craft = install(parent.__craftSpeed ?? 1);
  setRareStyle(parent.__craftRare ?? 'orbit');
  // The page zooms the frame on every camera frame, which changes only the pixel ratio but fires
  // `resize`; React Native Web would re-render the screen each time. The frame's size never
  // changes, so those events stop here (registered before anything else listens).
  const size = { w: window.innerWidth, h: window.innerHeight };
  window.addEventListener('resize', event => {
    if (window.innerWidth === size.w && window.innerHeight === size.h) event.stopImmediatePropagation();
    size.w = window.innerWidth;
    size.h = window.innerHeight;
  });
  document.addEventListener(
    'keydown',
    event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (parent.__craftKey?.(event.key, event.shiftKey, event.code)) event.preventDefault();
    },
    true,
  );
}

export {};
