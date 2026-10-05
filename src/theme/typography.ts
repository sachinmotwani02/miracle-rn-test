import { TextStyle } from 'react-native';

export type Weight = '500' | '600' | '700';

/**
 * The Figma is set in SF Pro Rounded. Apple does not expose that design through
 * React Native's `fontFamily`, and its licence only allows it on Apple platforms,
 * so the app ships Nunito (OFL), the closest rounded match, on every platform.
 * To use SF Pro Rounded on iOS, drop Apple's .otf files into assets/fonts and
 * point this map at them (see README).
 */
const family: Record<Weight, string> = {
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
};

export function font(weight: Weight): TextStyle {
  return { fontFamily: family[weight], fontWeight: weight };
}

function t(size: number, weight: Weight, lineHeight: number, tracking = 0.01): TextStyle {
  return { fontSize: size, lineHeight, letterSpacing: Math.round(size * tracking * 100) / 100, ...font(weight) };
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
