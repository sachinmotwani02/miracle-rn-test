import { flowStyle } from '../utils/flowStyle';

const style = { fontSize: 24, lineHeight: 28, letterSpacing: -0.96, fontFamily: 'Nunito_800ExtraBold', color: '#fff' };

describe('flowStyle', () => {
  it('leaves the style as it is at or below the cap, tracking included', () => {
    expect(flowStyle(style, 1, 1.2)).toEqual(style);
    expect(flowStyle(style, 1.2, 1.2)).toEqual(style);
  });

  it('shrinks the type above the cap so system scaling lands exactly on it, like maxFontSizeMultiplier', () => {
    const scale = 2.5;
    const capped = flowStyle(style, scale, 1.2);
    expect(capped.fontSize! * scale).toBeCloseTo(24 * 1.2, 6);
    expect((capped.lineHeight as number) * scale).toBeCloseTo(28 * 1.2, 6);
    expect(capped.fontFamily).toBe(style.fontFamily);
  });

  it('keeps the tracking in points above the cap, as iOS applies letterSpacing at any text size', () => {
    expect(flowStyle(style, 2.5, 1.2).letterSpacing).toBe(-0.96);
  });
});
