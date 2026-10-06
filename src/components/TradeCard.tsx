import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FeedItem } from '../data/types';
import { colors, layout, text } from '../theme';
import { cardEntrance } from '../utils/cardEntrance';
import { formatAge, formatCompactMoney, formatMoney, formatPct } from '../utils/format';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';
import { NoteBox } from './NoteBox';
import { Sparkline } from './Sparkline';

interface Props {
  item: FeedItem;
  index: number;
  expanded: boolean;
  onToggleNote: (id: string) => void;
  /** Staggered entrance for the first cards; plays when the card mounts (first load or a tab switch). */
  animateIn: boolean;
}

function Triangle({ up }: { up: boolean }) {
  return <View style={[styles.tri, up ? styles.triUp : styles.triDown]} />;
}

/** The "·" separators in the stats line are 2pt dots in the Figma, not glyphs. */
function Dot() {
  return <View style={styles.dot} />;
}

export const TradeCard = React.memo(function TradeCard({ item, index, expanded, onToggleNote, animateIn }: Props) {
  const up = item.changePct >= 0;
  const isBuy = item.side === 'Buy';
  return (
    <Animated.View
      entering={animateIn ? cardEntrance(index) : undefined}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Avatar avatar={item.trader.avatar} size={layout.avatar} verified={item.trader.verified} badgeSize={layout.badge} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={[text.name, styles.name]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {item.trader.name}
            </Text>
            <View style={[styles.pill, { backgroundColor: isBuy ? colors.buyPillBg : colors.sellPillBg }]}>
              <Text style={[text.pill, { color: isBuy ? colors.green : colors.red }]} maxFontSizeMultiplier={1.2}>
                {item.side}
              </Text>
            </View>
            <Text style={[text.meta, styles.meta, styles.age]} maxFontSizeMultiplier={1.2}>
              {formatAge(item.ageMinutes)}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={[text.meta, styles.meta]} maxFontSizeMultiplier={1.2}>{`Top ${item.trader.rank}`}</Text>
            <Dot />
            <Text style={[text.meta, styles.meta]} maxFontSizeMultiplier={1.2}>{`${item.trader.winRate}% WR`}</Text>
            <Dot />
            <Text style={[text.meta, styles.meta]} maxFontSizeMultiplier={1.2}>
              {formatCompactMoney(item.trader.volumeUsd)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.thread} />

      <View style={styles.assetRow}>
        <CoinLogo asset={item.asset} size={layout.coinLogo} badgeSize={layout.buyBadge} />
        <View style={styles.assetText}>
          <Text style={[text.asset, styles.assetName]} maxFontSizeMultiplier={1.2}>
            {item.asset}
          </Text>
          <View style={styles.priceRow}>
            {/* One run of text, so where the row is too narrow it wraps as text. */}
            <Text style={[text.priceStrong, styles.priceDark]} maxFontSizeMultiplier={1.2}>
              {formatCompactMoney(item.sizeUsd)}
              <Text style={[text.price, styles.priceMuted]}>{' at '}</Text>
              {formatMoney(item.price)}
            </Text>
            <View style={styles.changeRow}>
              <Triangle up={up} />
              <Text style={[text.priceStrong, { color: up ? colors.green : colors.red }]} maxFontSizeMultiplier={1.2}>
                {formatPct(item.changePct)}
              </Text>
            </View>
          </View>
        </View>
        <Sparkline id={item.id} values={item.sparkline} entryIndices={item.entryIndices} />
      </View>

      <NoteBox note={item.note} expanded={expanded} onToggle={() => onToggleNote(item.id)} />
    </Animated.View>
  );
});

const INNER = layout.cardPadding - layout.noteInset;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.cardRadius,
    marginHorizontal: layout.cardMargin,
    paddingTop: layout.cardPaddingTop,
    paddingHorizontal: layout.noteInset,
    paddingBottom: layout.noteInset,
  },
  // Figma: 40pt text column (name 20 + 4 + stats 16) with the 36pt avatar centred on it.
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: INNER, height: 40 },
  avatar: { marginTop: 2 },
  headerText: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', height: 20 },
  name: { color: colors.textPrimary, flexShrink: 1 },
  pill: { height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  age: { marginLeft: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center', height: 16 },
  meta: { color: colors.textSecondary },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.dot, marginHorizontal: 4 },
  thread: {
    width: 2,
    height: 11,
    backgroundColor: colors.thread,
    marginLeft: INNER + layout.avatar / 2 - 1,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
    paddingHorizontal: INNER,
  },
  assetText: { flex: 1 },
  assetName: { color: colors.textPrimary, height: 22 },
  // On a narrow phone the change drops to a line of its own and the row grows to fit it, so the
  // note below never covers it. A column gap rather than a margin, so the wrapped line is not indented.
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 5, minHeight: 16 },
  priceDark: { color: colors.textPrimary },
  priceMuted: { color: colors.textTertiary },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tri: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triUp: { borderBottomWidth: 5, borderBottomColor: colors.green },
  triDown: { borderTopWidth: 5, borderTopColor: colors.red },
});
