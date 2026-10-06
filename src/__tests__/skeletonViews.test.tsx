import React from 'react';
import { render } from '@testing-library/react-native';
import { FeedSkeleton } from '../components/skeleton/FeedSkeleton';
import { PortfolioBones } from '../components/skeleton/PortfolioBones';
import { TopTradesSkeleton } from '../components/skeleton/TopTradeSkeleton';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

describe('skeleton views', () => {
  it.each([
    ['Loading trades', <FeedSkeleton key="feed" />],
    ['Loading top trades', <TopTradesSkeleton key="carousel" />],
    ['Loading portfolio', <PortfolioBones key="portfolio" />],
  ])('announce "%s" once, as busy', async (label, element) => {
    const screen = await render(element);
    const region = screen.getByLabelText(label);
    expect(region.props.accessibilityState).toEqual({ busy: true });
    expect(screen.getAllByLabelText(label)).toHaveLength(1);
  });
});
