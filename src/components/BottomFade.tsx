import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// MaskedView has no web implementation and Android blur is costly, so the
// progressive blur is iOS-only. Other platforms get a plain gradient fade.
let MaskedView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MaskedView = require('@react-native-masked-view/masked-view').default;
}

export function BottomFade({ height }: { height: number }) {
  if (Platform.OS === 'ios' && MaskedView) {
    return (
      <View pointerEvents="none" style={[styles.wrap, { height }]}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient colors={['transparent', 'black', 'black']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          }
        >
          <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        </MaskedView>
        <LinearGradient
          colors={['rgba(245,245,245,0)', 'rgba(245,245,245,0.6)', colors.bottomFade]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(245,245,245,0)', 'rgba(245,245,245,0.85)', colors.bottomFade]}
      locations={[0, 0.55, 1]}
      style={[styles.wrap, { height }]}
    />
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 } });
