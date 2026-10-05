import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatPct, formatSignedMoney } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { DepositButton } from './DepositButton';

export function PortfolioHeader({ portfolio }: { portfolio: Portfolio }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        <AnimatedNumber value={portfolio.valueUsd} style={[text.portfolioValue, styles.value]} />
        <Text style={[text.delta, styles.delta]} maxFontSizeMultiplier={1.3}>
          <Text style={[text.delta, styles.deltaStrong]}>{formatSignedMoney(portfolio.deltaUsd)}</Text>
          <Text style={[text.deltaMuted, styles.deltaMuted]}>{` · ${formatPct(portfolio.deltaPct)} 24h`}</Text>
        </Text>
      </View>
      <DepositButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: layout.headerPadding,
    paddingRight: layout.screenPadding,
  },
  left: { flex: 1, paddingRight: 12 },
  label: { color: colors.white, marginBottom: 4 },
  value: { color: colors.white88, height: 28 },
  delta: { marginTop: 6 },
  deltaStrong: { color: colors.white },
  deltaMuted: { color: colors.white64 },
});
