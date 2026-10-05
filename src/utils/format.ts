/**
 * Number formatting without Intl so the functions can run inside Reanimated
 * worklets (used by the count-up header).
 */

function groupThousands(intPart: string): string {
  'worklet';
  let out = '';
  for (let i = 0; i < intPart.length; i++) {
    const fromEnd = intPart.length - i;
    out += intPart[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += ',';
  }
  return out;
}

function trimZeros(s: string): string {
  'worklet';
  if (s.indexOf('.') < 0) return s;
  let end = s.length;
  while (end > 0 && s[end - 1] === '0') end--;
  if (end > 0 && s[end - 1] === '.') end--;
  return s.slice(0, end);
}

export function formatMoney(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const fixed = abs.toFixed(2);
  const dot = fixed.indexOf('.');
  const intPart = fixed.slice(0, dot);
  const dec = fixed.slice(dot + 1);
  return `${value < 0 ? '-' : ''}$${groupThousands(intPart)}.${dec}`;
}

export function formatCompactMoney(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${trimZeros((abs / 1000000).toFixed(2))}M`;
  if (abs >= 1000) return `${sign}$${trimZeros((abs / 1000).toFixed(1))}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatSignedMoney(value: number, compact = false): string {
  'worklet';
  const body = compact ? formatCompactMoney(Math.abs(value)) : formatMoney(Math.abs(value));
  return `${value < 0 ? '-' : '+'}${body}`;
}

export function formatPct(value: number): string {
  'worklet';
  return `${Math.abs(value).toFixed(2)}%`;
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (60 * 24))}d`;
}
