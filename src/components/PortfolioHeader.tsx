import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { DepositButton } from './DepositButton';
import { PortfolioTicker } from './PortfolioTicker';

/** `shown` is what the numbers draw while they roll in (see useRollIn); screen readers hear `portfolio`. */
export function PortfolioHeader({ portfolio, shown }: { portfolio: Portfolio; shown?: Portfolio }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        <PortfolioTicker portfolio={portfolio} shown={shown} />
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
});
