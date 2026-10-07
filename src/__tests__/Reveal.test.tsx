import React from 'react';
import { Platform, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { Reveal } from '../components/skeleton/Reveal';

let mockReducedMotion = false;
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  const { useState } = jest.requireActual('react');
  return {
    ...mock,
    // Simulate an animation whose native opacity never advances beyond its initial value.
    useSharedValue: (value: number) => useState(() => ({ value, set: jest.fn() }))[0],
    useReducedMotion: () => mockReducedMotion,
  };
});

const originalOS = Platform.OS;
beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion = false;
});
afterEach(() => {
  Platform.OS = originalOS;
  jest.useRealTimers();
});

const content = (
  <Reveal active delay={70} bones={<Text>Loading</Text>}>
    <Text>$12,057.70</Text>
  </Reveal>
);

it('shows loaded Android content without waiting for an opacity animation', async () => {
  Platform.OS = 'android';
  const screen = await render(content);
  expect(screen.getByText('$12,057.70')).toBeVisible();
  expect(screen.queryByText('Loading')).toBeNull();
});

it('settles to visible content even when the animation never delivers its final frame', async () => {
  Platform.OS = 'ios';
  const screen = await render(content);
  expect(screen.getByText('$12,057.70')).not.toBeVisible();
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(screen.getByText('$12,057.70')).toBeVisible();
  expect(screen.queryByText('Loading')).toBeNull();
});

it('shows content immediately with reduced motion enabled', async () => {
  Platform.OS = 'ios';
  mockReducedMotion = true;
  const screen = await render(content);
  expect(screen.getByText('$12,057.70')).toBeVisible();
  expect(screen.queryByText('Loading')).toBeNull();
});
