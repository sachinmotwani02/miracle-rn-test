import { renderHook } from '@testing-library/react-native';
import type { LoadPhase } from '../data/resources';
import type { TabKey } from '../data/types';
import { useFeedLanding } from '../hooks/useFeedLanding';

// A feed picked from the sky bar's menu opens on its first card, right under the bar. A first visit
// shows blank, then bones, then cards, and the list cannot reach that offset until the cards are in,
// so landing once, as the feed was shown, left the list at the top under the whole header.

interface Props {
  tab: TabKey;
  phase: LoadPhase;
  offset: number;
}

let frames: FrameRequestCallback[] = [];
const nextFrame = () => {
  const run = frames;
  frames = [];
  run.forEach(cb => cb(0));
};

beforeEach(() => {
  frames = [];
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function setup() {
  const list = { current: { scrollToOffset: jest.fn() } };
  const hook = await renderHook((p: Props) => useFeedLanding(list, p.tab, p.phase, p.offset), {
    initialProps: { tab: 'discover', phase: 'content', offset: 244 } as Props,
  });
  const landings = () => list.current.scrollToOffset.mock.calls.map(([arg]) => arg.offset);
  return { ...hook, landings };
}

describe('landing on a feed picked from the sky bar', () => {
  it('lands a loaded feed on its first card as soon as it is shown', async () => {
    const { result, rerender, landings } = await setup();
    result.current('following');
    await rerender({ tab: 'following', phase: 'content', offset: 244 });
    nextFrame();
    expect(landings()).toEqual([244]);

    // Landed: later renders leave the list alone.
    await rerender({ tab: 'following', phase: 'content', offset: 250 });
    nextFrame();
    expect(landings()).toEqual([244]);
  });

  it("holds a first visit's landing through blank and bones, then lands once the cards are in", async () => {
    const { result, rerender, landings } = await setup();
    result.current('favourites');
    await rerender({ tab: 'favourites', phase: 'blank', offset: 244 });
    nextFrame();
    await rerender({ tab: 'favourites', phase: 'skeleton', offset: 244 });
    nextFrame();
    // Holds the first card's place while it loads, so the bar stays docked over the bones.
    expect(landings()).toEqual([244, 244]);

    await rerender({ tab: 'favourites', phase: 'content', offset: 244 });
    nextFrame();
    expect(landings()).toEqual([244, 244, 244]);

    await rerender({ tab: 'favourites', phase: 'content', offset: 250 });
    nextFrame();
    expect(landings()).toHaveLength(3);
  });

  it('follows the latest pick when another comes before the first feed loads', async () => {
    const { result, rerender, landings } = await setup();
    result.current('favourites');
    await rerender({ tab: 'favourites', phase: 'blank', offset: 244 });
    nextFrame();
    result.current('rising');
    await rerender({ tab: 'rising', phase: 'blank', offset: 244 });
    nextFrame();
    await rerender({ tab: 'rising', phase: 'content', offset: 244 });
    nextFrame();
    expect(landings()).toEqual([244, 244, 244]);

    // Favourites finishing later does not pull the list anywhere.
    await rerender({ tab: 'favourites', phase: 'content', offset: 244 });
    nextFrame();
    expect(landings()).toHaveLength(3);
  });

  it('leaves the list alone for a tab tapped in the header', async () => {
    const { rerender, landings } = await setup();
    await rerender({ tab: 'following', phase: 'blank', offset: 244 });
    await rerender({ tab: 'following', phase: 'content', offset: 244 });
    nextFrame();
    expect(landings()).toEqual([]);
  });
});
