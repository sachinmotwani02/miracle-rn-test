import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// The top edge's counterpart to BottomFade: white over the feed, densest behind the clock and gone by
// the status bar's bottom edge. iOS adds a masked progressive blur under it; MaskedView has no web
// build and Android blur is costly, so other platforms get the gradient alone.
let MaskedView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MaskedView = require('@react-native-masked-view/masked-view').default;
}

const FADE = ['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.86)', 'rgba(255,255,255,0)'] as const;

/** The light fade behind the status bar, which is `height` pt tall. */
export function StatusFade({ height }: { height: number }) {
  if (height <= 0) return null;
  const fade = <LinearGradient colors={FADE} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />;
  if (Platform.OS === 'ios' && MaskedView) {
    return (
      <View style={[styles.wrap, { height }]}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient colors={['black', 'black', 'transparent']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          }
        >
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        </MaskedView>
        {fade}
      </View>
    );
  }
  return <View style={[styles.wrap, { height }]}>{fade}</View>;
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0, top: 0, pointerEvents: 'none' } });
