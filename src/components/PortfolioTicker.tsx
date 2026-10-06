import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { NumberFlow } from 'number-flow-react-native';
import { Portfolio } from '../data/types';
import { colors, text } from '../theme';
import { flowStyle } from '../utils/flowStyle';
import { formatMoney, formatPct, formatSignedMoney } from '../utils/format';
import { openingValue, portfolioAt } from '../utils/ticker';

/** Two decimals with thousands separators, as `formatMoney` writes them; signs and `$` are prefixes. */
const CENTS: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/** Caps on Dynamic Type, as the plain Texts had them (`maxFontSizeMultiplier`). */
const VALUE_MAX_SCALE = 1.2;
const DELTA_MAX_SCALE = 1.3;

/** The opening figures hold this long before rolling up to now, ms: a beat to read them. */
export const ROLL_IN_DELAY = 400;

/**
 * What the portfolio numbers should draw: on opening, the portfolio as it stood 24 hours ago (its
 * change +$0.00), and a beat later `live`, so the first motion says how the day went; then every
 * fresh value as it lands. With Reduce Motion on it opens on `live`. Call it where the portfolio
 * outlives remounts (the screen): the list remounts the header on every tab switch, and neither the
 * roll-in nor the live value may restart there.
 */
export function useRollIn(live: Portfolio): Portfolio {
  const reduceMotion = useReducedMotion();
  const [rolled, setRolled] = useState(reduceMotion);

  useEffect(() => {
    if (rolled) return;
    const timer = setTimeout(() => setRolled(true), ROLL_IN_DELAY);
    return () => clearTimeout(timer);
  }, [rolled]);

  const dayAgo = useMemo(() => {
    const opening = openingValue(live);
    return portfolioAt(opening, opening);
  }, [live]);
  return rolled ? live : dayAgo;
}

/**
 * The portfolio value and its 24h change. Screen readers hear `portfolio`; the numbers draw
 * `shown` (by default the same), and NumberFlow rolls only the digits that change, on the UI thread.
 * The wrappers keep the plain Texts' line boxes (NumberFlow's own is the font's natural height),
 * so nothing around them moves.
 */
export function PortfolioTicker({ portfolio, shown = portfolio }: { portfolio: Portfolio; shown?: Portfolio }) {
  const { fontScale } = useWindowDimensions();

  const flow = useMemo(
    () => ({
      value: flowStyle({ ...text.portfolioValue, color: colors.white88 }, fontScale, VALUE_MAX_SCALE),
      deltaStrong: flowStyle({ ...text.delta, color: colors.white }, fontScale, DELTA_MAX_SCALE),
      deltaMuted: flowStyle({ ...text.deltaMuted, color: colors.white64 }, fontScale, DELTA_MAX_SCALE),
      deltaRow: { height: (text.delta.lineHeight ?? 16) * Math.min(fontScale, DELTA_MAX_SCALE) },
    }),
    [fontScale],
  );

  // Each NumberFlow labels itself with what it draws; they are hidden so each line is read once,
  // with the current figures.
  return (
    <>
      <View style={styles.value} accessible accessibilityLabel={formatMoney(portfolio.valueUsd)}>
        <View aria-hidden>
          <NumberFlow value={shown.valueUsd} format={CENTS} locales="en-US" prefix="$" style={flow.value} />
        </View>
      </View>
      <View
        style={[styles.delta, flow.deltaRow]}
        accessible
        accessibilityLabel={`${formatSignedMoney(portfolio.deltaUsd)} · ${formatPct(portfolio.deltaPct)} 24h`}
      >
        <View style={styles.deltaParts} aria-hidden>
          <NumberFlow
            value={Math.abs(shown.deltaUsd)}
            format={CENTS}
            locales="en-US"
            prefix={shown.deltaUsd < 0 ? '-$' : '+$'}
            style={flow.deltaStrong}
          />
          <NumberFlow
            value={Math.abs(shown.deltaPct)}
            format={CENTS}
            locales="en-US"
            prefix=" · "
            suffix="% 24h"
            style={flow.deltaMuted}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  value: { height: 28 },
  delta: { marginTop: 6 },
  deltaParts: { flexDirection: 'row' },
});
