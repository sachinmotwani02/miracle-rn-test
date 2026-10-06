import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NoteBox } from '../components/NoteBox';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 393, height: 852, scale: 3, fontScale: mockFontScale }),
}));

const NOTE = 'Added to SOL on the dip into the daily demand zone.';

/** Renders the note and reports the full text's measured height, as layout would. */
async function renderNote(fullHeight: number) {
  await render(<NoteBox note={NOTE} expanded={false} onToggle={() => {}} />);
  const [shown, measure] = screen.getAllByText(NOTE, { includeHiddenElements: true });
  await fireEvent(measure, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 353, height: fullHeight } } });
  const clip = StyleSheet.flatten(shown.parent?.props.style);
  return { clipHeight: clip.height as number, readMore: screen.queryByText('Read more') };
}

afterEach(() => {
  mockFontScale = 1;
});

describe('the note clamp at the system text size', () => {
  it('is the Figma two lines at the default size', async () => {
    const twoLines = await renderNote(32);
    expect(twoLines.clipHeight).toBe(32);
    expect(twoLines.readMore).toBeNull();
  });

  it('fits two whole lines of larger text, so the second is not cut off', async () => {
    mockFontScale = 1.2;
    // Two 16 pt lines at 1.2x are 38.4 pt.
    const twoLines = await renderNote(38.4);
    expect(twoLines.clipHeight).toBeGreaterThanOrEqual(38.4);
    expect(twoLines.readMore).toBeNull();
  });

  it('still offers Read more when larger text runs past two lines', async () => {
    mockFontScale = 1.2;
    const threeLines = await renderNote(57.6);
    expect(threeLines.clipHeight).toBeGreaterThanOrEqual(38.4);
    expect(threeLines.readMore).not.toBeNull();
  });

  it('stops growing at the 1.2x cap the text itself stops at', async () => {
    mockFontScale = 2;
    const twoLines = await renderNote(38.4);
    expect(twoLines.clipHeight).toBe(39);
    expect(twoLines.readMore).toBeNull();
  });
});
