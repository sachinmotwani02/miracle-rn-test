import { act, renderHook } from '@testing-library/react-native';
import { clearResources, load, readResource, useResource } from '../data/resources';
import { REVEAL_WINDOW, SKELETON } from '../utils/skeleton';

/** A fetcher that answers `value` after `ms` (fake timers). */
const reply =
  <T,>(value: T, ms: number) =>
  () =>
    new Promise<T>(resolve => setTimeout(() => resolve(value), ms));

beforeEach(() => {
  jest.useFakeTimers();
  clearResources();
});
afterEach(() => jest.useRealTimers());

describe('resources', () => {
  it('cold start: bones at once, then content with a reveal window', async () => {
    load('a', reply('A', 600));
    expect(readResource('a')).toEqual({ phase: 'skeleton', data: undefined, revealing: false });
    await jest.advanceTimersByTimeAsync(600);
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: true });
    await jest.advanceTimersByTimeAsync(REVEAL_WINDOW);
    expect(readResource('a').revealing).toBe(false);
  });

  it('serves a loaded key from the cache, with no bones and no reveal', async () => {
    load('a', reply('A', 600));
    await jest.advanceTimersByTimeAsync(600 + REVEAL_WINDOW);
    const fetcher = jest.fn(reply('B', 600));
    load('a', fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: false });
  });

  it('keeps bones up for the minimum time when the data comes straight after them', async () => {
    load('a', reply('A', 50));
    await jest.advanceTimersByTimeAsync(50);
    expect(readResource('a').phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(SKELETON.gate.minVisible - 50);
    expect(readResource('a')).toEqual({ phase: 'content', data: 'A', revealing: true });
  });

  it('skips the bones when a delayed load answers inside the show delay', async () => {
    const delayed = { showDelay: SKELETON.gate.showDelay };
    load('b', reply('B', 100), delayed);
    expect(readResource('b', delayed).phase).toBe('blank');
    await jest.advanceTimersByTimeAsync(100);
    expect(readResource('b', delayed)).toEqual({ phase: 'content', data: 'B', revealing: false });
    await jest.advanceTimersByTimeAsync(1000);
    expect(readResource('b', delayed).phase).toBe('content');
  });

  it('draws bones after the show delay and holds them for the minimum time', async () => {
    const delayed = { showDelay: 150 };
    load('c', reply('C', 300), delayed);
    await jest.advanceTimersByTimeAsync(150);
    expect(readResource('c', delayed).phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(150); // data at 300; bones drawn at 150 stay until 550
    expect(readResource('c', delayed).phase).toBe('skeleton');
    await jest.advanceTimersByTimeAsync(250);
    expect(readResource('c', delayed)).toEqual({ phase: 'content', data: 'C', revealing: true });
  });

  it('never draws bones for a quiet load, however long it takes, and lands without a reveal', async () => {
    const quiet = { quiet: true };
    expect(readResource('q', quiet).phase).toBe('blank');
    load('q', reply('Q', 2000), quiet);
    await jest.advanceTimersByTimeAsync(1999);
    expect(readResource('q', quiet).phase).toBe('blank');
    await jest.advanceTimersByTimeAsync(1);
    expect(readResource('q', quiet)).toEqual({ phase: 'content', data: 'Q', revealing: false });
  });

  it('reads an unknown key as pending: bones, or blank under a show delay', () => {
    expect(readResource('nope').phase).toBe('skeleton');
    expect(readResource('nope', { showDelay: 150 }).phase).toBe('blank');
  });

  it('forgets everything on clear; a load still in flight lands nowhere', async () => {
    load('d', reply('D', 500));
    clearResources();
    await jest.advanceTimersByTimeAsync(500);
    expect(readResource('d').phase).toBe('skeleton');
  });

  it('re-renders a component as its resource moves from bones to content', async () => {
    // Slower than the bones' minimum time, so the content lands the moment the data does.
    const fetcher = reply('H', 600);
    const { result } = await renderHook(() => useResource('h', fetcher));
    expect(result.current.phase).toBe('skeleton');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(600);
    });
    expect(result.current).toEqual({ phase: 'content', data: 'H', revealing: true });
  });
});
