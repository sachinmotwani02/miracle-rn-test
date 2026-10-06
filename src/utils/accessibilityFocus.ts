import { AccessibilityInfo, Platform, View } from 'react-native';

/** Puts the screen reader on `view`; on the web, keyboard focus too (a DOM element there). */
export function moveAccessibilityFocus(view: View | null) {
  if (!view) return;
  if (Platform.OS === 'web') (view as unknown as HTMLElement).focus?.();
  else AccessibilityInfo.sendAccessibilityEvent(view, 'focus');
}
