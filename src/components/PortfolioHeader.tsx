import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { formatMoney, formatPct, formatSignedMoney } from '../utils/format';
import { DepositButton } from './DepositButton';
import { PortfolioBones } from './skeleton/PortfolioBones';
import { Reveal } from './skeleton/Reveal';

/** Until the portfolio arrives the value and delta are bones; the label and Deposit stay real. */
export function PortfolioHeader({ portfolio, reveal = false }: { portfolio?: Portfolio; reveal?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        {portfolio ? (
          <Reveal active={reveal} bones={<PortfolioBones />}>
            <Text style={[text.portfolioValue, styles.value]} maxFontSizeMultiplier={1.2}>
              {formatMoney(portfolio.valueUsd)}
            </Text>
            <Text style={[text.delta, styles.delta]} maxFontSizeMultiplier={1.3}>
              <Text style={[text.delta, styles.deltaStrong]}>{formatSignedMoney(portfolio.deltaUsd)}</Text>
              <Text style={[text.deltaMuted, styles.deltaMuted]}>{` · ${formatPct(portfolio.deltaPct)} 24h`}</Text>
            </Text>
          </Reveal>
        ) : (
          <PortfolioBones />
        )}
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
