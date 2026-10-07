import React, { useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { SKELETON } from '../utils/skeleton';
import { TopTradesSkeleton } from './skeleton/TopTradeSkeleton';
import { TopTradeCard } from './TopTradeCard';

const SNAP = layout.carouselCardWidth + layout.carouselGap;

/** Until the trades arrive the row shows glass cards with bones and does not scroll. */
export function TopTradesCarousel({ trades, reveal = false }: { trades?: TopTrade[]; reveal?: boolean }) {
  const renderItem = useCallback<ListRenderItem<TopTrade>>(
    ({ item, index }) => <TopTradeCard trade={item} index={index} reveal={reveal && index < SKELETON.carouselCards} />,
    [reveal],
  );
  return (
    <View>
      <Text style={[text.sectionTitle, styles.title]} maxFontSizeMultiplier={1.3}>
        Top trades last 24h
      </Text>
      {trades ? (
        <FlatList
          horizontal
          data={trades}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={reveal}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={Separator}
          snapToInterval={SNAP}
          snapToAlignment="start"
          decelerationRate="fast"
          nestedScrollEnabled
          // This short horizontal list lives inside a moving vertical header. Android's
          // default clipping can detach its content during layout/reveal updates.
          removeClippedSubviews={false}
        />
      ) : (
        <TopTradesSkeleton />
      )}
    </View>
  );
}

const keyExtractor = (t: TopTrade) => t.id;

function Separator() {
  return <View style={{ width: layout.carouselGap }} />;
}

const styles = StyleSheet.create({
  title: { color: colors.white, paddingHorizontal: layout.screenPadding, marginBottom: 8, minHeight: 20 },
  content: { paddingHorizontal: layout.screenPadding },
});
