import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  soft: Haptics.ImpactFeedbackStyle.Soft,
} as const;

/** Fire-and-forget impact feedback; skipped on web. */
export function haptic(style: keyof typeof IMPACT) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(IMPACT[style]);
}
