import React from 'react';
import { StyleSheet, View } from 'react-native';
import { text } from '../../theme';
import { boneHeight } from '../../utils/skeleton';
import { Bone, BoneGroup } from './Bone';

/** The portfolio value (28 pt line) and 24h delta (16 pt line, 6 pt below) as bones on the sky. */
export function PortfolioBones() {
  return (
    <BoneGroup>
      <View accessible accessibilityLabel="Loading portfolio" accessibilityState={{ busy: true }}>
        <View style={styles.value}>
          <Bone width={132} height={boneHeight(text.portfolioValue.fontSize ?? 24)} tone="sky" />
        </View>
        <View style={styles.delta}>
          <Bone width={112} height={boneHeight(text.delta.fontSize ?? 12)} tone="sky" />
        </View>
      </View>
    </BoneGroup>
  );
}

const styles = StyleSheet.create({
  value: { height: 28, justifyContent: 'center' },
  delta: { height: 16, marginTop: 6, justifyContent: 'center' },
});
