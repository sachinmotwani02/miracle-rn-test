import { TextStyle } from 'react-native';

/** Figma weights. */
export type Weight = '500' | '600' | '700';

/**
 * The Figma is set in SF Pro Rounded. Apple does not expose that design through
 * React Native's `fontFamily`, and its licence only allows it on Apple platforms,
 * so the app ships Nunito (OFL), the closest rounded match, on every platform.
 *
 * Nunito is one step lighter and ~3% wider than SF Pro Rounded at the same
 * nominal weight (checked against the Figma at 6x), so each Figma weight maps one
 * step up and tracking is pulled in by 1%. To use SF Pro Rounded on iOS, drop
 * Apple's .otf files into assets/fonts, load them in App.tsx and point this map
 * at them with the original weights.
 */
const family: Record<Weight, { fontFamily: string; fontWeight: TextStyle['fontWeight'] }> = {
  '500': { fontFamily: 'Nunito_600SemiBold', fontWeight: '600' },
  '600': { fontFamily: 'Nunito_700Bold', fontWeight: '700' },
  '700': { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' },
};

export function font(weight: Weight): TextStyle {
  return { ...family[weight] };
}

const WIDTH_COMPENSATION = -0.01;

function t(size: number, weight: Weight, lineHeight: number, tracking = 0.01): TextStyle {
  const spacing = (tracking + WIDTH_COMPENSATION) * size;
  return { fontSize: size, lineHeight, letterSpacing: Math.round(spacing * 100) / 100, ...font(weight) };
}

/** Type scale read from the Figma Typography panel (size / line height / weight). */
export const text = {
  portfolioLabel: t(12, '600', 16),
  portfolioValue: t(24, '700', 28, -0.03),
  delta: t(12, '600', 16),
  deltaMuted: t(12, '600', 16),
  button: t(15, '700', 20, 0),
  sectionTitle: t(15, '600', 20, 0),
  name: t(15, '600', 20, 0),
  meta: t(12, '600', 16),
  pill: t(11, '700', 14),
  asset: t(19, '600', 22),
  price: t(12, '600', 16),
  priceStrong: t(12, '600', 16),
  note: t(13, '500', 16),
  link: t(13, '600', 20, 0),
  tab: t(15, '600', 20, 0),
  gain: t(15, '600', 20, 0),
} as const;
