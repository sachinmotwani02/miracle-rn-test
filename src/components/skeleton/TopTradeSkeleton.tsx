import React, { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { colors, layout, text } from '../../theme';
import { SKELETON, boneHeight, topTradeWidths } from '../../utils/skeleton';
import { Bone, BoneGroup } from './Bone';

const lineBone = (style: TextStyle) => boneHeight(style.fontSize ?? 12);

/** The inside of a carousel card while it loads, row for row with TopTradeCard. */
export function TopTradeCardBones({ seed }: { seed: number }) {
  const w = useMemo(() => topTradeWidths(seed), [seed]);
  return (
    <BoneGroup>
      <View style={styles.header}>
        {/* The 20 pt photo plus its 1 pt ring. */}
        <Bone width={layout.avatarSmall + 2} height={layout.avatarSmall + 2} />
        <Bone width={w.name} height={lineBone(text.name)} />
      </View>
      <View style={styles.body}>
        <Bone width={layout.coinLogo} height={layout.coinLogo} />
        <View style={styles.texts}>
          <View style={styles.gainLine}>
            <Bone width={w.gain} height={lineBone(text.gain)} />
          </View>
          <View style={styles.metaLine}>
            <Bone width={w.meta} height={lineBone(text.meta)} />
          </View>
        </View>
      </View>
    </BoneGroup>
  );
}

/** The carousel while it loads: real glass cards with bones inside; the row does not scroll. */
export function TopTradesSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading top trades" accessibilityState={{ busy: true }} style={styles.row}>
      {Array.from({ length: SKELETON.carouselCards }, (_, i) => (
        <View key={i} style={styles.card}>
          <TopTradeCardBones seed={i} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: layout.carouselGap, paddingHorizontal: layout.screenPadding, overflow: 'hidden' },
  // TopTradeCard's glass shell.
  card: {
    width: layout.carouselCardWidth,
    height: layout.carouselCardHeight,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.carouselCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 11,
    paddingTop: 11,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 22 },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 10, marginLeft: 1 },
  texts: { flex: 1 },
  gainLine: { height: 20, justifyContent: 'center' },
  metaLine: { height: 16, justifyContent: 'center' },
});
