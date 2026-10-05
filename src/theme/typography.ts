import { Platform, TextStyle } from 'react-native';

export type Weight = '400' | '500' | '600' | '700';

const interFamily: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

/**
 * The Figma uses SF Pro. iOS renders SF Pro as the system font, so we only set
 * the weight there. Everywhere else we ship Inter, the closest metric match.
 */
export function font(weight: Weight): TextStyle {
  if (Platform.OS === 'ios') return { fontWeight: weight };
  return { fontFamily: interFamily[weight], fontWeight: weight };
}

function t(size: number, weight: Weight, lineHeight: number, extra?: TextStyle): TextStyle {
  return { fontSize: size, lineHeight, ...font(weight), ...extra };
}

/** Type scale measured from the Figma (cap heights / 0.72). */
export const text = {
  portfolioLabel: t(11, '500', 14),
  portfolioValue: t(22, '700', 28, { letterSpacing: -0.2 }),
  delta: t(12, '600', 16),
  deltaMuted: t(12, '400', 16),
  button: t(14, '600', 18),
  sectionTitle: t(14, '600', 18),
  name: t(15, '600', 18),
  meta: t(12, '400', 16),
  pill: t(11, '600', 14),
  asset: t(19, '700', 22, { letterSpacing: -0.2 }),
  price: t(12, '400', 16),
  priceStrong: t(12, '600', 16),
  note: t(13, '400', 16),
  link: t(13, '600', 16),
  tab: t(15, '600', 20),
  gain: t(18, '600', 22),
} as const;
