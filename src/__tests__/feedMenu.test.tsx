import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FeedMenu } from '../components/FeedMenu';
import { haptic } from '../utils/haptics';

// Drag to pick in the sky bar's feed menu, driven through the card's responder handlers with page
// coordinates (rows are 40 pt from 8 pt below the card's top, which is `top` on screen).
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('../utils/haptics', () => ({ haptic: jest.fn() }));

const TOP = 100;
/** Page y of the middle of row `i` (Discover, Following, Rising, Favourites). */
const rowY = (i: number) => TOP + 8 + 40 * i + 20;
const at = (pageY: number, pageX = 60) => ({ nativeEvent: { pageX, pageY } });

async function setup() {
  const onSelect = jest.fn();
  await render(<FeedMenu open active="discover" top={TOP} onSelect={onSelect} onClose={() => {}} />);
  // The card carries the menu role without being an accessibility element itself, so find it by prop.
  const [card] = screen.container.queryAll(node => node.props.accessibilityRole === 'menu');
  return { onSelect, card };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(haptic).mockClear();
});
afterEach(() => jest.useRealTimers());

describe('feed menu drag to pick', () => {
  it('takes every touch on the card, so a press can travel across rows', async () => {
    const { card } = await setup();
    expect(card.props.onStartShouldSetResponderCapture()).toBe(true);
    expect(card.props.onMoveShouldSetResponderCapture()).toBe(true);
    expect(card.props.onResponderTerminationRequest()).toBe(false);
  });

  it('picks the row the finger lifts on, ticking once per new row on the way', async () => {
    const { onSelect, card } = await setup();

    await fireEvent(card, 'responderGrant', at(rowY(0)));
    await fireEvent(card, 'responderMove', at(rowY(0) + 10));
    await fireEvent(card, 'responderMove', at(rowY(1)));
    await fireEvent(card, 'responderMove', at(rowY(2)));
    expect(haptic).toHaveBeenCalledTimes(2);

    await fireEvent(card, 'responderRelease', at(rowY(2)));
    await act(() => jest.advanceTimersByTimeAsync(100));
    expect(onSelect).toHaveBeenCalledWith('rising');
  });

  it('picks the pressed row on a plain tap', async () => {
    const { onSelect, card } = await setup();

    await fireEvent(card, 'responderGrant', at(rowY(3)));
    await fireEvent(card, 'responderRelease', at(rowY(3)));
    await act(() => jest.advanceTimersByTimeAsync(100));

    expect(onSelect).toHaveBeenCalledWith('favourites');
  });

  it('keeps the row when the thumb wanders a little past the card side', async () => {
    const { onSelect, card } = await setup();

    await fireEvent(card, 'responderGrant', at(rowY(1)));
    await fireEvent(card, 'responderRelease', at(rowY(1), 10 + 180 + 20));
    await act(() => jest.advanceTimersByTimeAsync(100));

    expect(onSelect).toHaveBeenCalledWith('following');
  });

  it('picks nothing when the finger lifts off the rows', async () => {
    const { onSelect, card } = await setup();

    await fireEvent(card, 'responderGrant', at(rowY(1)));
    await fireEvent(card, 'responderMove', at(rowY(4) + 40));
    await fireEvent(card, 'responderRelease', at(rowY(4) + 40));
    await fireEvent(card, 'responderGrant', at(rowY(2)));
    await fireEvent(card, 'responderRelease', at(rowY(2), 400));
    await act(() => jest.advanceTimersByTimeAsync(100));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
