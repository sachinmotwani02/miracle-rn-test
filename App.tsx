import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DiscoverScreen } from './src/screens/DiscoverScreen';

// iOS renders SF Pro (the Figma typeface) as the system font; everywhere else we load Inter.
const FONTS = Platform.OS === 'ios' ? {} : { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };

export default function App() {
  const [loaded] = useFonts(FONTS);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DiscoverScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
