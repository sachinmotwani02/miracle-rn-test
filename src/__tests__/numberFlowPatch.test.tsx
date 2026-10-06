/**
 * patches/number-flow-react-native+0.5.1.patch teaches NumberFlow to lay out `letterSpacing`
 * (0.5.1 ignores it). These run against the installed library, so they also fail if the patch
 * was not applied (`npm install` runs it through the postinstall script). The library exports its
 * internals as extensionless source paths TypeScript cannot resolve, so the source is imported directly.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { NumberFlow } from 'number-flow-react-native';
import { computeKeyedLayout } from '../../node_modules/number-flow-react-native/src/core/layout';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// Reanimated's mock has no useReducedMotion (Reduce Motion is off here), and its makeMutable returns
// the bare initial value, so NumberFlow's slots would read `.value` as undefined; build the same
// shared value its useSharedValue does.
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  return {
    __esModule: true,
    ...mock,
    useReducedMotion: () => false,
    makeMutable: (init: unknown) => mock.useSharedValue(init),
  };
});

const metrics = {
  charWidths: { $: 14, '1': 9, '2': 13 },
  maxDigitWidth: 13,
  lineHeight: 32,
  ascent: -24,
  descent: 8,
  charBounds: {},
};

const parts = [
  { key: 'prefix:0', type: 'symbol' as const, char: '$', digitValue: -1 },
  { key: 'integer:1', type: 'digit' as const, char: '1', digitValue: 1 },
  { key: 'integer:0', type: 'digit' as const, char: '2', digitValue: 2 },
];

describe('NumberFlow layout (patched)', () => {
  it('advances each glyph by its width plus the tracking, as a tracked Text does', () => {
    const layout = computeKeyedLayout(parts, metrics, 0, 'left', { letterSpacing: -1 });
    expect(layout.map((entry) => entry.x)).toEqual([0, 13, 21]);
  });

  it('keeps each glyph its own width, so a rolling digit is never clipped', () => {
    const layout = computeKeyedLayout(parts, metrics, 0, 'left', { letterSpacing: -1 });
    expect(layout.map((entry) => entry.width)).toEqual([14, 9, 13]);
  });

  it('lays glyphs edge to edge without tracking, as before', () => {
    const layout = computeKeyedLayout(parts, metrics, 0, 'left');
    expect(layout.map((entry) => entry.x)).toEqual([0, 14, 23]);
  });
});

describe('NumberFlow (patched)', () => {
  /** Advance widths the fake text layout reports; every other glyph is 12. */
  const ADVANCE: Record<string, number> = { $: 14, '1': 9, ',': 6, '2': 13, '3': 13, '4': 14, '.': 6, '5': 13, '0': 14 };

  /** Renders $1,234.50 and answers NumberFlow's glyph measurement the way the native text layout would. */
  async function renderMeasured(letterSpacing: number, fontSize: number) {
    jest.useFakeTimers();
    const screen = await render(
      <NumberFlow
        value={1234.5}
        format={{ minimumFractionDigits: 2 }}
        locales="en-US"
        prefix="$"
        style={{ fontSize, letterSpacing }}
      />,
    );
    const placeholder = StyleSheet.flatten(screen.getByText('$1,234.50').props.style);
    const measure = screen.container.queryAll((node) => typeof node.props.onTextLayout === 'function')[0];
    const glyphs = String(measure.props.children).split('\n');
    await act(async () => {
      measure.props.onTextLayout({
        nativeEvent: {
          lines: glyphs.map((glyph) => ({ width: ADVANCE[glyph] ?? 12, height: 32, ascender: 24, descender: 8 })),
        },
      });
    });
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    const slot = (char: string) => StyleSheet.flatten(screen.getByText(char).props.style);
    const x = (char: string) => (slot(char).transform as { translateX: number }[])[0].translateX;
    jest.useRealTimers();
    return { placeholder, slot, x };
  }

  it('places the symbols with the tracking, where a tracked Text puts them', async () => {
    // $ 1 , 2 3 4 . 5 0 with 1 pt pulled out after every glyph.
    const { x } = await renderMeasured(-1, 24);
    expect([x('$'), x(','), x('.')]).toEqual([0, 21, 63]);
  });

  it('draws its first frame, before the glyphs are measured, with the same tracking', async () => {
    const { placeholder } = await renderMeasured(-1, 25);
    expect(placeholder.letterSpacing).toBe(-1);
  });

  it('leaves tracking off the glyphs themselves, which their positions already carry', async () => {
    const { slot } = await renderMeasured(-1, 26);
    expect(slot(',').letterSpacing).toBeUndefined();
  });
});
