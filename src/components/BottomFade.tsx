import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Figma: a 114pt white gradient (0% -> 100%) over the feed, under the nav bar.
// iOS adds a masked progressive blur under it; MaskedView has no web build and
// Android blur is costly, so other platforms get the gradient alone.
let MaskedView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MaskedView = require('@react-native-masked-view/masked-view').default;
}

const FADE = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', '#FFFFFF'] as const;

export function BottomFade({ height }: { height: number }) {
  if (Platform.OS === 'ios' && MaskedView) {
    return (
      <View style={[styles.wrap, { height }]}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient colors={['transparent', 'black', 'black']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          }
        >
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        </MaskedView>
        <LinearGradient colors={FADE} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  return <LinearGradient colors={FADE} locations={[0, 0.5, 1]} style={[styles.wrap, { height }]} />;
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none' } });
