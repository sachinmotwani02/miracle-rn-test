import { useEffect, useSyncExternalStore } from 'react';
import { REVEAL_WINDOW, SKELETON } from '../utils/skeleton';

/**
 * A small session cache for the mock API that also owns the loading UI's timing, so components
 * only read a snapshot:
 * - `blank`: a tab's first moments; nothing is drawn, so a quick reply never flashes bones.
 * - `skeleton`: bones, kept for at least SKELETON.gate.minVisible once drawn.
 * - `content`: the data. `revealing` stays true for REVEAL_WINDOW after content replaces bones,
 *   so the components that mount then crossfade from their bones. Content that never had bones
 *   (a cache hit, a reply inside the show delay) is not revealing.
 * Timers and the fetch callback make every change; rendering never does.
 */
export type LoadPhase = 'blank' | 'skeleton' | 'content';

export interface Resource<T> {
  phase: LoadPhase;
  data: T | undefined;
  revealing: boolean;
}

export interface LoadOptions {
  /** Wait this long before drawing bones; 0 draws them at once (cold start). */
  showDelay?: number;
}

interface Entry {
  snapshot: Resource<unknown>;
  shownAt: number | null;
  timers: Set<ReturnType<typeof setTimeout>>;
}

const BLANK: Resource<never> = { phase: 'blank', data: undefined, revealing: false };
const BONES: Resource<never> = { phase: 'skeleton', data: undefined, revealing: false };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(entry: Entry, patch: Partial<Resource<unknown>>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  listeners.forEach(listener => listener());
}

function after(entry: Entry, ms: number, run: () => void) {
  const id = setTimeout(() => {
    entry.timers.delete(id);
    run();
  }, ms);
  entry.timers.add(id);
}

/** Starts loading `key` unless it is loading or loaded already. Safe to call on every render. */
export function load<T>(key: string, fetcher: () => Promise<T>, { showDelay = 0 }: LoadOptions = {}) {
  if (entries.has(key)) return;
  // The new entry reads exactly like the pending snapshot, so nobody needs telling yet.
  const entry: Entry = {
    snapshot: showDelay > 0 ? BLANK : BONES,
    shownAt: showDelay > 0 ? null : Date.now(),
    timers: new Set(),
  };
  entries.set(key, entry);
  if (showDelay > 0) {
    after(entry, showDelay, () => {
      entry.shownAt = Date.now();
      update(entry, { phase: 'skeleton' });
    });
  }
  fetcher().then(data => {
    if (entries.get(key) !== entry) return; // cleared while loading
    if (entry.shownAt === null) {
      // Answered inside the show delay: the bones were never drawn, so there is nothing to reveal.
      entry.timers.forEach(clearTimeout);
      entry.timers.clear();
      update(entry, { phase: 'content', data });
      return;
    }
    const reveal = () => {
      update(entry, { phase: 'content', data, revealing: true });
      after(entry, REVEAL_WINDOW, () => update(entry, { revealing: false }));
    };
    const wait = entry.shownAt + SKELETON.gate.minVisible - Date.now();
    if (wait > 0) after(entry, wait, reveal);
    else reveal();
  });
}

/** What a component sees for `key` right now; a key nobody has loaded yet reads as pending. */
export function readResource<T>(key: string, { showDelay = 0 }: LoadOptions = {}): Resource<T> {
  return (entries.get(key)?.snapshot ?? (showDelay > 0 ? BLANK : BONES)) as Resource<T>;
}

/** Forgets every load, cached or in flight (the Dials' "Replay cold start"). */
export function clearResources() {
  entries.forEach(entry => entry.timers.forEach(clearTimeout));
  entries.clear();
  listeners.forEach(listener => listener());
}

/** Loads `key` once per session and re-renders as it goes from blank to bones to content. */
export function useResource<T>(key: string, fetcher: () => Promise<T>, options: LoadOptions = {}): Resource<T> {
  const showDelay = options.showDelay ?? 0;
  useEffect(() => {
    load(key, fetcher, { showDelay });
  }, [key, fetcher, showDelay]);
  return useSyncExternalStore(subscribe, () => readResource<T>(key, { showDelay }));
}
