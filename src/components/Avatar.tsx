import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AvatarKey } from '../data/types';
import { VerifiedBadge } from './VerifiedBadge';

const SOURCES: Record<AvatarKey, number> = {
  candlefox: require('../../assets/avatar_candlefox.png'),
  ethereal: require('../../assets/avatar_ethereal.png'),
};

interface Props {
  avatar: AvatarKey;
  size?: number;
  verified?: boolean;
  badgeSize?: number;
}

export function Avatar({ avatar, size = 36, verified = false, badgeSize = 15 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={SOURCES[avatar]}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={0}
        accessibilityIgnoresInvertColors
      />
      {verified && (
        <View style={[styles.badge, { right: -badgeSize * 0.1, bottom: -badgeSize * 0.1 }]}>
          <VerifiedBadge size={badgeSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ badge: { position: 'absolute' } });
