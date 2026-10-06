/**
 * A pocket DialKit for React Native. Declare live controls next to the code that uses them,
 * tune them in the Dials panel (dev builds only, see DialPanel), then Copy the values back
 * into the constants. `dialkit` itself renders DOM, so it cannot run on iOS or Android.
 *
 *   const d = useDials('Card', {
 *     scale: [1, 0.5, 2],             // slider: [default, min, max, step?]
 *     glow: true,                     // toggle
 *     shadow: { blur: [16, 0, 48] },  // folder
 *     replay: { type: 'action' },     // button, handled by onAction('replay')
 *   }, { onAction });
 *   d.scale; d.shadow.blur;
 *
 * In release builds the panel is never mounted, so every dial keeps its default.
 */
import { useEffect, useSyncExternalStore } from 'react';

export type SliderDial = readonly [def: number, min: number, max: number, step?: number];
export interface ActionDial {
  readonly type: 'action';
  readonly label?: string;
}
export type Dial = SliderDial | boolean | ActionDial | DialConfig;
export interface DialConfig {
  readonly [key: string]: Dial;
}

export type DialValues<C> = {
  -readonly [K in keyof C as C[K] extends ActionDial ? never : K]: C[K] extends boolean
    ? boolean
    : C[K] extends SliderDial
      ? number
      : DialValues<C[K]>;
};

interface RowBase {
  /** Dotted path from the panel root, e.g. `spring.duration`; what onAction receives. */
  path: string;
  label: string;
  depth: number;
}
export type DialRow =
  | (RowBase & { kind: 'folder' })
  | (RowBase & { kind: 'slider'; def: number; min: number; max: number; step: number })
  | (RowBase & { kind: 'toggle'; def: boolean })
  | (RowBase & { kind: 'action' });

export interface DialPanel {
  name: string;
  rows: DialRow[];
  values: Readonly<Record<string, number | boolean>>;
  version: number;
}

interface Panel extends DialPanel {
  config: DialConfig;
  onAction?: (path: string) => void;
  nested?: { version: number; values: unknown };
}

const isSlider = (d: Dial): d is SliderDial => Array.isArray(d);
const isAction = (d: Dial): d is ActionDial => typeof d === 'object' && !Array.isArray(d) && 'type' in d && d.type === 'action';
const humanize = (key: string) => key.replace(/[A-Z]/g, c => ` ${c.toLowerCase()}`).replace(/^./, c => c.toUpperCase());

/** A power-of-ten step giving about a hundred stops across the range. */
export function inferStep(min: number, max: number): number {
  const range = Math.abs(max - min);
  return range === 0 ? 1 : 10 ** Math.round(Math.log10(range / 100));
}

export function decimals(step: number): number {
  const [, exp] = String(step).split('e-');
  return exp ? Number(exp) : (String(step).split('.')[1] ?? '').length;
}

/** Snap onto the step grid inside [min, max], without float noise like 0.30000000000000004. */
export function snap(value: number, min: number, max: number, step: number): number {
  const v = Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step));
  return Number(v.toFixed(decimals(step)));
}

/** The config as panel rows, in declaration order. */
export function flatten(config: DialConfig, prefix = '', depth = 0): DialRow[] {
  return Object.entries(config).flatMap(([key, dial]): DialRow[] => {
    const base = { path: prefix + key, label: humanize(key), depth };
    if (isSlider(dial)) {
      const [def, min, max, step = inferStep(min, max)] = dial;
      return [{ ...base, kind: 'slider', def, min, max, step }];
    }
    if (typeof dial === 'boolean') return [{ ...base, kind: 'toggle', def: dial }];
    if (isAction(dial)) return [{ ...base, kind: 'action', label: dial.label ?? base.label }];
    return [{ ...base, kind: 'folder' }, ...flatten(dial, `${base.path}.`, depth + 1)];
  });
}

/** Flat path -> value back into the config's nested shape. */
export function nest(rows: DialRow[], values: Readonly<Record<string, number | boolean>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (row.kind === 'action') continue;
    const keys = row.path.split('.');
    const last = keys.pop()!;
    let node = out;
    for (const k of keys) node = node[k] as Record<string, unknown>;
    node[last] = row.kind === 'folder' ? {} : values[row.path];
  }
  return out;
}

const panels = new Map<string, Panel>();
const listeners = new Set<() => void>();
let storeVersion = 0;

function emit() {
  storeVersion++;
  listeners.forEach(l => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getStoreVersion = () => storeVersion;
export const listPanels = (): DialPanel[] => [...panels.values()];

/**
 * Create the panel, or rebuild it when its config changed (fast refresh). Tweaks survive a
 * rebuild unless that dial's default changed in code, so editing a constant takes effect.
 */
export function registerDials(name: string, config: DialConfig): DialPanel {
  const existing = panels.get(name);
  if (existing?.config === config) return existing;
  const rows = flatten(config);
  const values: Record<string, number | boolean> = {};
  for (const row of rows) {
    if (row.kind !== 'slider' && row.kind !== 'toggle') continue;
    const old = existing?.rows.find(o => o.path === row.path && o.kind === row.kind);
    const kept = old && 'def' in old && old.def === row.def;
    values[row.path] = kept ? existing!.values[row.path] : row.def;
  }
  const panel: Panel = { name, config, rows, values, version: (existing?.version ?? 0) + 1, onAction: existing?.onAction };
  panels.set(name, panel);
  // Registration happens during render, where other components must not be updated.
  queueMicrotask(emit);
  return panel;
}

function update(name: string, values: Record<string, number | boolean>) {
  const panel = panels.get(name);
  if (!panel) return;
  panel.values = { ...panel.values, ...values };
  panel.version++;
  emit();
}

export function setDial(name: string, path: string, value: number | boolean) {
  update(name, { [path]: value });
}

/** Back to the defaults: one dial, or the whole panel. */
export function resetDials(name: string, path?: string) {
  const rows = panels.get(name)?.rows ?? [];
  const defaults: Record<string, number | boolean> = {};
  for (const row of rows) if ((row.kind === 'slider' || row.kind === 'toggle') && (!path || row.path === path)) defaults[row.path] = row.def;
  update(name, defaults);
}

export function fireAction(name: string, path: string) {
  panels.get(name)?.onAction?.(path);
}

/** Current values as JSON in the config's shape, for pasting back over the constants. */
export function dialsSnapshot(name: string): string {
  const panel = panels.get(name);
  return panel ? JSON.stringify(nest(panel.rows, panel.values), null, 2) : '{}';
}

function valuesOf(panel: Panel): unknown {
  if (panel.nested?.version !== panel.version) panel.nested = { version: panel.version, values: nest(panel.rows, panel.values) };
  return panel.nested.values;
}

export function useDials<C extends DialConfig>(
  name: string,
  config: C,
  options?: { onAction?: (path: string) => void },
): DialValues<C> {
  const panel = registerDials(name, config) as Panel;
  useSyncExternalStore(subscribe, () => panels.get(name)?.version ?? 0);
  const onAction = options?.onAction;
  useEffect(() => {
    const current = panels.get(name);
    if (current) current.onAction = onAction;
  }, [name, panel, onAction]);
  return valuesOf(panels.get(name) ?? panel) as DialValues<C>;
}
