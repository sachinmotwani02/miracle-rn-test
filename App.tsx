import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DialPanel } from './src/dev/DialPanel';
import { DIALS_ON } from './src/dev/dials';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { FONTS } from './src/theme/fonts';

/** Flip to false to hide the Dials, which tune the tab switch card animation. */
const SHOW_DIALS = false;

export default function App() {
  // iOS has no fonts to load, so it renders on the first frame. If loading fails, the text falls
  // back to the system font rather than leaving the screen blank.
  const [loaded, error] = useFonts(FONTS);
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DiscoverScreen />
        {/* Live animation controls (src/dev/dials.ts); never shipped in release builds. */}
        {DIALS_ON && SHOW_DIALS ? <DialPanel only={['Card animation']} startOpen /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
