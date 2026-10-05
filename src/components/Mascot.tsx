import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '../theme';

const BODY = require('../../assets/mascot_body.png');

// The Figma mascot box is 34 x 40. The eyes are ellipses ~4.2 x 6.6 centred at
// (15.7, 20.8) and (21.4, 19.9), tilted about -8deg. They are drawn as Views so
// they can glance and blink independently of the raster body.
export const MASCOT_W = 34;
export const MASCOT_H = 40;
const EYE_W = 4.2;
const EYE_H = 6.6;
const EYES = [
  { cx: 15.7, cy: 20.8 },
  { cx: 21.4, cy: 19.9 },
];

interface Props {
  /** -1 .. 1: where the mascot is looking. */
  look: SharedValue<number>;
  /** 0 .. 1: eyelid closure. */
  blink: SharedValue<number>;
  scale?: number;
}

export function Mascot({ look, blink, scale = 1 }: Props) {
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: look.value * 2.2 * scale }, { rotate: '-8deg' }, { scaleY: 1 - blink.value * 0.85 }],
  }));
  return (
    <View style={{ width: MASCOT_W * scale, height: MASCOT_H * scale }}>
      <Image source={BODY} style={{ width: MASCOT_W * scale, height: MASCOT_H * scale }} contentFit="contain" transition={0} />
      {EYES.map((e, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.eye,
            {
              width: EYE_W * scale,
              height: EYE_H * scale,
              borderRadius: (EYE_W * scale) / 2,
              left: (e.cx - EYE_W / 2) * scale,
              top: (e.cy - EYE_H / 2) * scale,
            },
            eyeStyle,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ eye: { position: 'absolute', backgroundColor: colors.eye } });
