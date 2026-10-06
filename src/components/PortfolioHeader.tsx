import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Portfolio } from '../data/types';
import { colors, layout, text } from '../theme';
import { DepositButton } from './DepositButton';
import { PortfolioFigures } from './PortfolioFigures';
import { PortfolioBones } from './skeleton/PortfolioBones';
import { Reveal } from './skeleton/Reveal';

/**
 * Until the portfolio arrives the value and delta are bones; the label and Deposit stay real.
 */
export function PortfolioHeader({ portfolio, reveal = false }: { portfolio?: Portfolio; reveal?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[text.portfolioLabel, styles.label]} maxFontSizeMultiplier={1.3}>
          Your portfolio
        </Text>
        {portfolio ? (
          <Reveal active={reveal} bones={<PortfolioBones />}>
            <PortfolioFigures portfolio={portfolio} />
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
});
