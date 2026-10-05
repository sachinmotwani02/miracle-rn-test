import { formatMoney, formatCompactMoney, formatSignedMoney, formatPct, formatAge } from '../utils/format';

describe('format', () => {
  it('formats money with thousands separators and 2 decimals', () => {
    expect(formatMoney(12057.7)).toBe('$12,057.70');
    expect(formatMoney(148.6)).toBe('$148.60');
    expect(formatMoney(2501)).toBe('$2,501.00');
    expect(formatMoney(1234567.891)).toBe('$1,234,567.89');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('formats compact money', () => {
    expect(formatCompactMoney(18400)).toBe('$18.4K');
    expect(formatCompactMoney(842000)).toBe('$842K');
    expect(formatCompactMoney(3200)).toBe('$3.2K');
    expect(formatCompactMoney(1250000)).toBe('$1.25M');
    expect(formatCompactMoney(3400000)).toBe('$3.4M');
    expect(formatCompactMoney(950)).toBe('$950');
  });

  it('formats signed money', () => {
    expect(formatSignedMoney(64.2)).toBe('+$64.20');
    expect(formatSignedMoney(-12)).toBe('-$12.00');
    expect(formatSignedMoney(3200, true)).toBe('+$3.2K');
  });

  it('formats percentages', () => {
    expect(formatPct(12.84)).toBe('12.84%');
    expect(formatPct(0.54)).toBe('0.54%');
    expect(formatPct(-3.1)).toBe('3.10%');
  });

  it('formats ages', () => {
    expect(formatAge(2)).toBe('2m');
    expect(formatAge(75)).toBe('1h');
    expect(formatAge(60 * 30)).toBe('1d');
  });
});
