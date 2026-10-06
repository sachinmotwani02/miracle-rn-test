import React, { Profiler } from 'react';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as MascotModule from '../components/Mascot';
import { clearResources } from '../data/resources';
import { DiscoverScreen } from '../screens/DiscoverScreen';

// The feed tabs must feel instant: the tapped label lights up on its own commit, and a loaded feed
// changes in place (no rebuild, no entrance) right after it. Feeds load through the resource store
// with simulated latency (src/data/api.ts), so the tests run the clock with fake timers.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  const { useState } = jest.requireActual('react');
  return {
    ...mock,
    // The mock builds a new shared value on every render; the real hook keeps one per component,
    // which is what lets a memoised component skip a re-render.
    useSharedValue: (init: unknown) => useState(() => mock.useSharedValue(init))[0],
    useReducedMotion: () => false,
    useFrameCallback: () => ({ setActive: () => {}, isActive: false, callbackId: -1 }),
    // Missing from the mock too; the sky bar composes its scroll handler with the screen's.
    useComposedEventHandler: () => () => {},
  };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
// The real FlashList, with its layout measurements stubbed to a phone-sized viewport of 192 pt cards
// (as in @shopify/flash-list/jestSetup, whose FlashList remap is stale in 2.0.2: FlashList is
// already the RecyclerView, and RecyclerView is not exported).
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => ({
  ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
  measureParentSize: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 852 })),
  measureFirstChildLayout: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 852 })),
  measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 192 })),
}));

/** Runs out every pending load, show delay and reveal window. */
const settle = () => act(() => jest.advanceTimersByTimeAsync(5000));
const press = async (label: string) =>
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(screen.getByRole('tab', { name: label }));
const isLit = (label: string) => screen.queryByRole('tab', { name: label, selected: true }) !== null;
/** moonpilot only trades in the Discover feed (Following is candlefox, ethereal and quietalpha). */
const showsDiscoverCards = () => screen.queryAllByText('moonpilot').length > 0;
/** Card views carrying an entrance animation, which plays when they mount. */
const entering = () => screen.container.queryAll(node => node.props.entering != null);
/** Blur overlays of cards resolving after a switch (mounted only while they play). */
const resolving = () => screen.queryAllByTestId('tab-resolve-blur').length;

beforeEach(() => {
  jest.useFakeTimers();
  clearResources();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('switching feed tabs', () => {
  it('lights up the tapped tab before the cards change', async () => {
    const commits: { lit: boolean; discoverCards: boolean }[] = [];
    let recording = false;
    const record = () => {
      if (recording) commits.push({ lit: isLit('Following'), discoverCards: showsDiscoverCards() });
    };
    await render(
      <Profiler id="feed" onRender={record}>
        <DiscoverScreen />
      </Profiler>,
    );
    await settle();
    expect(showsDiscoverCards()).toBe(true);

    recording = true;
    await press('Following');
    await settle();

    // The commit that lights the label still shows the Discover cards; Following's arrive in a later one.
    expect(commits.find(c => c.lit)).toEqual({ lit: true, discoverCards: true });
    expect(commits[commits.length - 1]).toEqual({ lit: true, discoverCards: false });
  });

  it('keeps a card that is in both feeds mounted when switching to a loaded feed', async () => {
    await render(<DiscoverScreen />);
    await settle();
    // candlefox's $18.4K SOL buy heads both feeds.
    const card = screen.getAllByText('$18.4K')[0];

    await press('Following');

    // Compared by identity: a rebuilt card is a new host view (and diffing two views takes minutes).
    const sameView = screen.getAllByText('$18.4K')[0] === card;
    expect(sameView).toBe(true);
  });

  it('reveals the first cards from their bones on a cold start instead of playing the entrance', async () => {
    await render(<DiscoverScreen />);
    await settle();

    expect(showsDiscoverCards()).toBe(true);
    expect(entering()).toHaveLength(0);
  });

  it('does not replay the entrance when switching tabs', async () => {
    await render(<DiscoverScreen />);
    await settle();

    await press('Following');
    await settle();
    expect(entering()).toHaveLength(0);

    await press('Discover');
    await settle();
    expect(entering()).toHaveLength(0);
  });

  it('resolves the cards on screen in place when switching to a loaded feed', async () => {
    await render(<DiscoverScreen />);
    await settle();
    await press('Following');
    await settle();
    await press('Discover');
    await settle();
    const card = screen.getAllByText('$18.4K')[0];

    await press('Following');
    await act(() => jest.advanceTimersByTimeAsync(50));

    expect(resolving()).toBeGreaterThan(0);
    expect(resolving()).toBeLessThanOrEqual(5);
    expect(screen.getAllByText('$18.4K')[0] === card).toBe(true);

    await settle();
    expect(resolving()).toBe(0);
  });

  it("resolves the cards on a tab's first visit too, from its feed loaded ahead", async () => {
    await render(<DiscoverScreen />);
    await settle();

    await press('Following');
    await act(() => jest.advanceTimersByTimeAsync(50));

    expect(showsDiscoverCards()).toBe(false);
    expect(resolving()).toBeGreaterThan(0);
  });

  it("keeps the cards up when a tab's feed is still loading, then resolves into it", async () => {
    await render(<DiscoverScreen />);
    // Tap the moment the first feed is in, before the feeds behind the tabs have landed.
    while (!showsDiscoverCards()) await act(() => jest.advanceTimersByTimeAsync(50));
    await press('Following');
    await act(() => jest.advanceTimersByTimeAsync(50));

    expect(isLit('Following')).toBe(true);
    expect(showsDiscoverCards()).toBe(true);
    expect(resolving()).toBe(0);

    await act(() => jest.advanceTimersByTimeAsync(1000));
    expect(showsDiscoverCards()).toBe(false);
    expect(resolving()).toBeGreaterThan(0);
  });

  it('leaves the nav bar and its ghost alone', async () => {
    const ghost = jest.spyOn(MascotModule, 'Mascot');
    await render(<DiscoverScreen />);
    await settle();
    ghost.mockClear();

    await press('Following');
    await settle();

    expect(ghost).not.toHaveBeenCalled();
  });
});
