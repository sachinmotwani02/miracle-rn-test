import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AvatarKey } from '../data/types';
import { colors } from '../theme';
import { VerifiedBadge } from './VerifiedBadge';

const SOURCES: Record<AvatarKey, number> = {
  candlefox: require('../../assets/avatar_candlefox.png'),
  ethereal: require('../../assets/avatar_ethereal.png'),
};

interface Props {
  avatar: AvatarKey;
  /** Photo diameter. */
  size?: number;
  /** 1pt white ring drawn outside the photo (the carousel avatars have one). */
  ring?: boolean;
  verified?: boolean;
  badgeSize?: number;
  /** Where the seal sits relative to the photo's bottom-right corner. */
  badgeOffset?: { right: number; bottom: number };
}

export function Avatar({
  avatar,
  size = 36,
  ring = false,
  verified = false,
  badgeSize = 15,
  badgeOffset = { right: -1.3, bottom: -1.3 },
}: Props) {
  const inset = ring ? 1 : 0;
  const outer = size + inset * 2;
  return (
    <View style={[{ width: outer, height: outer, borderRadius: outer / 2 }, ring && styles.ring]}>
      <Image
        source={SOURCES[avatar]}
        style={{ position: 'absolute', left: inset, top: inset, width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={0}
        accessibilityIgnoresInvertColors
      />
      {verified && (
        <View style={[styles.badge, { right: badgeOffset.right + inset, bottom: badgeOffset.bottom + inset }]}>
          <VerifiedBadge size={badgeSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute' },
  ring: { backgroundColor: colors.white },
});
