import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, text } from '../theme';
import { formatMoney, formatPct, formatSignedMoney } from '../utils/format';

/**
 * The portfolio value and its 24h change, as plain text: they hold still (the skeleton's reveal is
 * their arrival). The line boxes match the bones' (28 pt value, 16 pt delta 6 pt below), so nothing
 * moves when the bones hand over.
 */
export function PortfolioFigures({ portfolio }: { portfolio: Portfolio }) {
  return (
    <>
      <View style={styles.value}>
        <Text style={[text.portfolioValue, styles.valueText]} maxFontSizeMultiplier={1.2}>
          {formatMoney(portfolio.valueUsd)}
        </Text>
      </View>
      <Text style={[text.delta, styles.delta]} maxFontSizeMultiplier={1.3}>
        <Text style={[text.delta, styles.deltaStrong]}>{formatSignedMoney(portfolio.deltaUsd)}</Text>
        <Text style={[text.deltaMuted, styles.deltaMuted]}>{` · ${formatPct(portfolio.deltaPct)} 24h`}</Text>
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  value: { height: 28 },
  valueText: { color: colors.white88 },
  delta: { marginTop: 6 },
  deltaStrong: { color: colors.white },
  deltaMuted: { color: colors.white64 },
});
