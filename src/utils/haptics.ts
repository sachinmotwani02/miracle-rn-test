import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  soft: Haptics.ImpactFeedbackStyle.Soft,
} as const;

/** Fire-and-forget feedback; skipped on web. `selection` is the lightest tick, for ramps. */
export function haptic(style: keyof typeof IMPACT | 'selection') {
  if (Platform.OS === 'web') return;
  if (style === 'selection') Haptics.selectionAsync();
  else Haptics.impactAsync(IMPACT[style]);
}
