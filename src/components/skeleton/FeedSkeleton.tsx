import React, { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, layout, text } from '../../theme';
import { SKELETON, boneHeight, tradeCardWidths } from '../../utils/skeleton';
import { Bone, BoneGroup } from './Bone';

const INNER = layout.cardPadding - layout.noteInset;
const lineBone = (style: TextStyle) => boneHeight(style.fontSize ?? 12);
/** A gentle wave in the sparkline's 90 x 32 slot, where the real line draws in later. */
const WAVE = 'M5 22 C 17 15, 25 27, 37 21 S 57 13, 67 17 S 79 13, 85 11';

/**
 * The inside of a feed card while it loads, row for row with TradeCard: the 40 pt header, the
 * 11 pt thread, the 38 pt asset row and the collapsed note box (74 pt). The card's chrome (thread
 * line, note box) is drawn for real; only data becomes bones. `seed` varies the widths per card,
 * `fade` dims the bones of lower cards.
 */
export function TradeCardBones({ seed, fade = 1 }: { seed: number; fade?: number }) {
  const w = useMemo(() => tradeCardWidths(seed), [seed]);
  return (
    <View>
      <BoneGroup opacity={fade} style={styles.header}>
        <Bone width={layout.avatar} height={layout.avatar} style={styles.avatar} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Bone width={w.name} height={lineBone(text.name)} />
            <Bone width={28} height={16} style={styles.after} />
            <Bone width={16} height={lineBone(text.meta)} style={styles.after} />
          </View>
          <View style={styles.statsRow}>
            <Bone width={w.stats} height={lineBone(text.meta)} />
          </View>
        </View>
      </BoneGroup>
      <View style={styles.thread} />
      <BoneGroup opacity={fade} style={styles.assetRow}>
        <Bone width={layout.coinLogo} height={layout.coinLogo} />
        <View style={styles.assetText}>
          <View style={styles.assetLine}>
            <Bone width={w.asset} height={lineBone(text.asset)} />
          </View>
          <View style={styles.priceLine}>
            <Bone width={w.price} height={lineBone(text.price)} />
          </View>
        </View>
        <Svg width={layout.sparklineWidth} height={layout.sparklineHeight}>
          <Path d={WAVE} stroke={colors.boneInk} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </Svg>
      </BoneGroup>
      <View style={styles.note}>
        <BoneGroup opacity={fade}>
          <View style={styles.noteLine}>
            <Bone width="100%" height={lineBone(text.note)} />
          </View>
          <View style={styles.noteLine}>
            <Bone width={`${w.note}%`} height={lineBone(text.note)} />
          </View>
          <View style={styles.more}>
            <Bone width={64} height={lineBone(text.link)} />
          </View>
        </BoneGroup>
      </View>
    </View>
  );
}

/** A whole placeholder feed card: TradeCard's white shell with bones inside. */
export function TradeCardSkeleton({ seed, fade }: { seed: number; fade?: number }) {
  return (
    <View style={styles.card}>
      <TradeCardBones seed={seed} fade={fade} />
    </View>
  );
}

/** The feed while it loads: three cards fading with distance, announced once as busy. */
export function FeedSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading trades" accessibilityState={{ busy: true }} style={styles.feed}>
      {SKELETON.feedFade.map((fade, i) => (
        <TradeCardSkeleton key={i} seed={i} fade={fade} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { gap: layout.cardGap },
  // TradeCard's shell.
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.cardRadius,
    marginHorizontal: layout.cardMargin,
    paddingTop: layout.cardPaddingTop,
    paddingHorizontal: layout.noteInset,
    paddingBottom: layout.noteInset,
  },
  // TradeCard: 36 pt avatar nudged 2 pt down, then a 20 + 4 + 16 text column, all in 40 pt.
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: INNER, height: 40 },
  avatar: { marginTop: 2 },
  headerText: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', height: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', height: 16 },
  after: { marginLeft: 6 },
  thread: { width: 2, height: 11, backgroundColor: colors.thread, marginLeft: INNER + layout.avatar / 2 - 1 },
  // 36 pt coin, a 22 + 16 pt text column (the row is 38 pt), the 90 x 32 sparkline, 11 pt below.
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11, paddingHorizontal: INNER },
  assetText: { flex: 1 },
  assetLine: { height: 22, justifyContent: 'center' },
  priceLine: { height: 16, justifyContent: 'center' },
  // NoteBox, collapsed: 12 top, two 16 pt lines, 2 + 20 pt "Read more", 8 bottom.
  note: {
    backgroundColor: colors.noteBg,
    borderRadius: layout.noteRadius,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  noteLine: { height: 16, justifyContent: 'center' },
  more: { height: 20, marginTop: 2, justifyContent: 'center' },
});
