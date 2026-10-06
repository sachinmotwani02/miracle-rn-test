import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { DialPanel } from './src/dev/DialPanel';
import { DiscoverScreen } from './src/screens/DiscoverScreen';

/** Flip to true to bring back the Dials chip for tuning animations. */
const SHOW_DIALS = false;

export default function App() {
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DiscoverScreen />
        {/* Live animation controls (src/dev/dials.ts); never shipped in release builds. */}
        {__DEV__ && SHOW_DIALS ? <DialPanel /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
