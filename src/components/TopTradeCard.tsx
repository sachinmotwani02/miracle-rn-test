import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { SKELETON } from '../utils/skeleton';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';
import { Reveal } from './skeleton/Reveal';
import { TopTradeCardBones } from './skeleton/TopTradeSkeleton';

interface Props {
  trade: TopTrade;
  index?: number;
  /** Mount over this card's loading bones and crossfade (the cards that replace the skeleton). */
  reveal?: boolean;
}

export const TopTradeCard = React.memo(function TopTradeCard({ trade, index = 0, reveal = false }: Props) {
  // The glass shell is shared with the skeleton (two translucent shells would stack up denser),
  // so only the inside hands over.
  return (
    <View style={styles.card}>
      <Reveal active={reveal} delay={index * SKELETON.reveal.stagger} bones={<TopTradeCardBones seed={index} />}>
        <View style={styles.header}>
          <Avatar
            avatar={trade.trader.avatar}
            size={layout.avatarSmall}
            ring
            verified={trade.trader.verified}
            badgeSize={layout.badge}
            badgeOffset={{ right: -5, bottom: -3 }}
          />
          <Text style={[text.name, styles.name]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {trade.trader.name}
          </Text>
        </View>
        <View style={styles.body}>
          <CoinLogo asset={trade.asset} size={layout.coinLogo} badgeSize={layout.buyBadge} />
          <View style={styles.texts}>
            <Text style={[text.gain, styles.gain]} maxFontSizeMultiplier={1.2}>
              {formatSignedMoney(trade.gainUsd, true)}
            </Text>
            <Text style={[text.meta, styles.meta]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {`Bought ${trade.asset} at ${formatMoney(trade.price)}`}
            </Text>
          </View>
        </View>
      </Reveal>
    </View>
  );
});

const styles = StyleSheet.create({
  // Figma: white 92% with Glass + inner-shadow effects. Over the static sky a blur is
  // invisible, so the fill plus a white hairline (the inner highlight) reproduces it
  // identically on both platforms. 92 pt is exactly its contents at the Figma's text size; a
  // larger system text size grows it, keeping the bottom inset.
  card: {
    width: layout.carouselCardWidth,
    minHeight: layout.carouselCardHeight,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.carouselCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  // Figma: photo at (12,12) with a 1pt ring outside it; name box starts at x 40.
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 22 },
  name: { color: colors.textPrimary },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 10, marginLeft: 1 },
  texts: { flex: 1 },
  gain: { color: colors.green },
  meta: { color: colors.textTertiary },
});
