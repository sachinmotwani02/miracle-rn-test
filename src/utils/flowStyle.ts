import { TextStyle } from 'react-native';

/**
 * Adapts a theme text style for NumberFlow, which has no `maxFontSizeMultiplier`: above `max`,
 * size and line height shrink so the system's font scaling lands exactly on `max`, as
 * `maxFontSizeMultiplier={max}` does for a Text. `letterSpacing` passes through in points, as iOS
 * applies it at any text size (NumberFlow lays it out through patches/number-flow-react-native+0.5.1.patch).
 */
export function flowStyle(style: TextStyle, fontScale: number, max: number): TextStyle {
  if (fontScale <= max) return style;
  const shrink = max / fontScale;
  return {
    ...style,
    fontSize: style.fontSize === undefined ? undefined : style.fontSize * shrink,
    lineHeight: style.lineHeight === undefined ? undefined : style.lineHeight * shrink,
  };
}
