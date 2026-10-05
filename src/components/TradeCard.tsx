import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FeedItem } from '../data/types';
import { colors, layout, text } from '../theme';
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
  /** Staggered entrance for the first cards on the initial mount only. */
  animateIn: boolean;
}

function Triangle({ up }: { up: boolean }) {
  return <View style={[styles.tri, up ? styles.triUp : styles.triDown]} />;
}

export const TradeCard = React.memo(function TradeCard({ item, index, expanded, onToggleNote, animateIn }: Props) {
  const up = item.changePct >= 0;
  const isBuy = item.side === 'Buy';
  return (
    <Animated.View
      entering={animateIn ? FadeInDown.delay(index * 70).duration(420).springify().damping(18) : undefined}
      style={styles.card}
    >
      <View style={styles.header}>
        <Avatar avatar={item.trader.avatar} size={layout.avatar} verified={item.trader.verified} badgeSize={layout.badge} />
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
            <Text style={[text.meta, styles.meta]} maxFontSizeMultiplier={1.2}>
              {formatAge(item.ageMinutes)}
            </Text>
          </View>
          <Text style={[text.meta, styles.meta]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {`Top ${item.trader.rank} · ${item.trader.winRate}% WR · ${formatCompactMoney(item.trader.volumeUsd)}`}
          </Text>
        </View>
      </View>

      <View style={styles.assetRow}>
        <CoinLogo asset={item.asset} size={layout.coinLogo} badgeSize={layout.buyBadge} />
        <View style={styles.assetText}>
          <Text style={[text.asset, styles.assetName]} maxFontSizeMultiplier={1.2}>
            {item.asset}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[text.priceStrong, styles.priceDark]} maxFontSizeMultiplier={1.2}>
              {formatCompactMoney(item.sizeUsd)}
            </Text>
            <Text style={[text.price, styles.priceMuted]} maxFontSizeMultiplier={1.2}>
              {' at '}
            </Text>
            <Text style={[text.priceStrong, styles.priceDark]} maxFontSizeMultiplier={1.2}>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.cardRadius,
    marginHorizontal: layout.cardMargin,
    paddingTop: layout.cardPadding,
    paddingHorizontal: layout.noteInset,
    paddingBottom: layout.noteInset,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.cardPadding - layout.noteInset },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.textPrimary, flexShrink: 1 },
  pill: { height: 16, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  meta: { color: colors.textSecondary },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: layout.cardPadding - layout.noteInset,
  },
  assetText: { flex: 1 },
  assetName: { color: colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  priceDark: { color: colors.textPrimary },
  priceMuted: { color: colors.textSecondary },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 6, gap: 3 },
  tri: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triUp: { borderBottomWidth: 6, borderBottomColor: colors.green },
  triDown: { borderTopWidth: 6, borderTopColor: colors.red },
});
