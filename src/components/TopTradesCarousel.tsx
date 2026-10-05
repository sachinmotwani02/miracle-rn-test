import React, { useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { TopTrade } from '../data/types';
import { colors, layout, text } from '../theme';
import { TopTradeCard } from './TopTradeCard';

const SNAP = layout.carouselCardWidth + layout.carouselGap;

export function TopTradesCarousel({ trades }: { trades: TopTrade[] }) {
  const renderItem = useCallback<ListRenderItem<TopTrade>>(({ item }) => <TopTradeCard trade={item} />, []);
  return (
    <View>
      <Text style={[text.sectionTitle, styles.title]} maxFontSizeMultiplier={1.3}>
        Top trades last 24h
      </Text>
      <FlatList
        horizontal
        data={trades}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
      />
    </View>
  );
}

const keyExtractor = (t: TopTrade) => t.id;

function Separator() {
  return <View style={{ width: layout.carouselGap }} />;
}

const styles = StyleSheet.create({
  title: { color: colors.white, paddingHorizontal: layout.screenPadding, marginBottom: 10 },
  content: { paddingHorizontal: layout.screenPadding },
});
