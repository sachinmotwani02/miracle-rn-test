import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { clearResources } from '../data/resources';
import { DiscoverScreen } from '../screens/DiscoverScreen';

// What a screen reader reaches. The sky bar holds copies of Deposit and the feed tabs, and only
// one copy of each may be reachable at a time: the one on screen. Role queries skip whatever is
// hidden from accessibility, as a screen reader does.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  const { useState } = jest.requireActual('react');
  return {
    ...mock,
    useSharedValue: (init: unknown) => useState(() => mock.useSharedValue(init))[0],
    useReducedMotion: () => false,
    useFrameCallback: () => ({ setActive: () => {}, isActive: false, callbackId: -1 }),
    useComposedEventHandler: () => () => {},
  };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => ({
  ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
  measureParentSize: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 852 })),
  measureFirstChildLayout: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 852 })),
  measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 393, height: 192 })),
}));
// The bar's flags come from scroll worklets, which do not run here, so each test sets them.
let mockBar: { docked?: boolean; pinned?: boolean } = {};
jest.mock('../hooks/useSkyBar', () => {
  const actual = jest.requireActual('../hooks/useSkyBar');
  return {
    ...actual,
    useSkyBar: (...args: unknown[]) => ({ ...actual.useSkyBar(...args), ...mockBar }),
  };
});

const settle = () => act(() => jest.advanceTimersByTimeAsync(5000));
const deposits = () => screen.queryAllByRole('button', { name: 'Deposit' });
const dropdown = () => screen.queryByRole('button', { name: /^Feed: / });
/** The feed tabs (the nav bar's icons are tabs too). */
const feedTabs = () => screen.queryAllByRole('tab', { name: /^(Discover|Following|Rising|Favourites)$/ });

beforeEach(() => {
  jest.useFakeTimers();
  clearResources();
  mockBar = {};
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The whole screen takes about 5 s to render and load here, jest's default limit.
jest.setTimeout(30000);

describe('what a screen reader reaches', () => {
  it("at the top: the header's Deposit and tabs, none of the sky bar's hidden copies", async () => {
    await render(<DiscoverScreen />);
    await settle();

    expect(deposits()).toHaveLength(1);
    expect(dropdown()).toBeNull();
    expect(screen.getByRole('tab', { name: 'Discover', selected: true })).toBeTruthy();
  });

  it("in the feed with the bar down: the bar's Deposit and dropdown instead of the header's", async () => {
    mockBar = { docked: true, pinned: true };
    await render(<DiscoverScreen />);
    await settle();

    expect(deposits()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Feed: Discover', expanded: false })).toBeTruthy();
    expect(feedTabs()).toHaveLength(0);
  });

  it('with the feed menu open: only the menu, starting on the current feed; escape closes it', async () => {
    mockBar = { docked: true, pinned: true };
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    // Where each focus move went, read off the target's props. Matching the views themselves would
    // have jest diff two view trees on a failure, which takes minutes.
    const focused = () =>
      focus.mock.calls.map(([view, event]) => {
        const props = (view as unknown as { props: Record<string, unknown> }).props;
        const selected = props['aria-selected'] ?? (props.accessibilityState as { selected?: boolean } | undefined)?.selected;
        return [event, props.accessibilityRole, props.accessibilityLabel, selected && '(selected)'].filter(Boolean).join(' ');
      });
    await render(<DiscoverScreen />);
    await settle();

    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(dropdown()!);

    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
    expect(screen.getByRole('menuitem', { name: 'Discover', selected: true })).toBeTruthy();
    expect(focused()).toEqual(['focus menuitem (selected)']);
    // Everything behind the menu is out of reach.
    expect(deposits()).toHaveLength(0);
    expect(dropdown()).toBeNull();

    // VoiceOver's escape gesture.
    const [menu] = screen.container.queryAll(node => node.props.onAccessibilityEscape != null);
    await fireEvent(menu, 'accessibilityEscape');
    await settle();

    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(deposits()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Feed: Discover', expanded: false })).toBeTruthy();
    // The screen reader is back on the dropdown that opened the menu.
    expect(focused()).toEqual(['focus menuitem (selected)', 'focus button Feed: Discover']);
  });
});
