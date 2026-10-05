import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';
import { Glass } from './Glass';

export const TopTradeCard = React.memo(function TopTradeCard({ trade }: { trade: TopTrade }) {
  return (
    <Glass style={styles.card} tint="rgba(255,255,255,0.72)" fallback={styles.fallback}>
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
    </Glass>
  );
});

const styles = StyleSheet.create({
  // Figma: white 92% with the Glass + inner-shadow effects. Native Liquid Glass on
  // iOS 26; a flat fill with a white hairline elsewhere.
  card: {
    width: layout.carouselCardWidth,
    height: layout.carouselCardHeight,
    borderRadius: layout.cardRadius,
    paddingHorizontal: 11,
    paddingTop: 11,
    overflow: 'hidden',
  },
  fallback: { backgroundColor: colors.carouselCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  // Figma: photo at (12,12) with a 1pt ring outside it; name box starts at x 40.
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 22 },
  name: { color: colors.textPrimary },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 10, marginLeft: 1 },
  texts: { flex: 1 },
  gain: { color: colors.green },
  meta: { color: colors.textTertiary },
});
