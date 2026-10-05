import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { DiscoverScreen } from './src/screens/DiscoverScreen';

export default function App() {
  const [loaded] = useFonts({ Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DiscoverScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
