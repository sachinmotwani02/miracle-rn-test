import { RefObject, useCallback, useEffect, useRef } from 'react';
import type { LoadPhase } from '../data/resources';
import type { TabKey } from '../data/types';

interface Scrollable {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

/**
 * Lands the list at `offset` (the first card right under the sky bar) when a feed picked from the
 * bar's menu is shown. Returns `land(tab)`, for the pick.
 *
 * A loaded feed lands as soon as it is shown. A feed's first visit shows blank, then bones, then
 * its cards, so its landing holds until the cards are in: it lands as the feed is shown, so the bar
 * stays docked over the bones, and again once the cards have rendered. Landing once, before the
 * cards came, left the list wherever the empty feed had clamped it: at the top, under the header.
 */
export function useFeedLanding(list: RefObject<Scrollable | null>, tab: TabKey, phase: LoadPhase, offset: number) {
  const pending = useRef<TabKey | null>(null);
  useEffect(() => {
    if (pending.current !== tab) return;
    if (phase === 'content') pending.current = null;
    // A frame later, once the list has laid out what this render drew.
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset, animated: false }));
  }, [list, tab, phase, offset]);
  return useCallback((next: TabKey) => {
    pending.current = next;
  }, []);
}
