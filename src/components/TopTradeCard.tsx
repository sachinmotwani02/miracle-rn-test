import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { Avatar } from './Avatar';
import { CoinLogo } from './CoinLogo';

export const TopTradeCard = React.memo(function TopTradeCard({ trade }: { trade: TopTrade }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar avatar={trade.trader.avatar} size={layout.avatarSmall} verified={trade.trader.verified} badgeSize={layout.badge} />
        <Text style={[text.name, styles.name]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {trade.trader.name}
        </Text>
      </View>
      <View style={styles.body}>
        <CoinLogo asset={trade.asset} size={layout.coinLogo} badgeSize={layout.buyBadgeSmall} />
        <View style={styles.texts}>
          <Text style={[text.gain, styles.gain]} maxFontSizeMultiplier={1.2}>
            {formatSignedMoney(trade.gainUsd, true)}
          </Text>
          <Text style={[text.meta, styles.meta]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {`Bought ${trade.asset} at ${formatMoney(trade.price)}`}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: layout.carouselCardWidth,
    height: layout.carouselCardHeight,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.white85,
    borderWidth: 1,
    borderColor: colors.white,
    paddingHorizontal: 11,
    paddingTop: 7,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24 },
  name: { color: colors.textPrimary },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  texts: { flex: 1 },
  gain: { color: colors.green },
  meta: { color: colors.textSecondary },
});
